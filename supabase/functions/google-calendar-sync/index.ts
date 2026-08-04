import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CalendarAction = "connect" | "status" | "syncAppointment";

type RequestBody = {
  action?: CalendarAction;
  shopSlug?: string;
  calendarId?: string;
  accessToken?: string;
  refreshToken?: string;
  appointmentId?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (request.method !== "POST") {
      throw httpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const authHeader = request.headers.get("Authorization") || "";
    const body = await readBody(request);
    const { supabaseUrl, anonKey, serviceRoleKey } = supabaseEnv();
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      throw httpError("UNAUTHORIZED", "Login required", 401);
    }

    const { shop, member } = await requireShopMember(admin, body.shopSlug, userData.user.id);

    if (body.action === "status") {
      return json(await calendarStatus(admin, shop.id));
    }

    if (body.action === "connect") {
      return json(await connectCalendar(admin, shop.id, userData.user.id, body));
    }

    if (body.action === "syncAppointment") {
      return json(await syncAppointment(admin, shop, member.role, body));
    }

    throw httpError("UNKNOWN_ACTION", "Unsupported calendar action", 400);
  } catch (rawError) {
    const error = rawError as { status?: number; code?: string; message?: string };
    const status = Number(error?.status || 500);
    return json({
      ok: false,
      code: error?.code || "GOOGLE_CALENDAR_SYNC_FAILED",
      message: error?.message || "Google Calendar sync failed"
    }, status);
  }
});

async function readBody(request: Request): Promise<RequestBody> {
  try {
    return await request.json();
  } catch {
    throw httpError("INVALID_JSON", "Invalid JSON body", 400);
  }
}

async function requireShopMember(admin: any, shopSlug = "", userId: string) {
  const slug = shopSlug || "fah-nail";
  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("id,name,slug")
    .eq("slug", slug)
    .single();

  if (shopError || !shop) throw httpError("SHOP_NOT_FOUND", "Shop not found", 404);

  const { data: member, error: memberError } = await admin
    .from("shop_members")
    .select("role")
    .eq("shop_id", shop.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) throw httpError("SHOP_MEMBER_REQUIRED", "No access to this shop", 403);

  return { shop, member };
}

async function calendarStatus(admin: any, shopId: string) {
  const integration = await getIntegration(admin, shopId);
  return {
    ok: true,
    connected: Boolean(integration),
    hasRefreshToken: Boolean(integration?.refresh_token_encrypted),
    needsReconnect: needsReconnect(integration?.last_sync_error || ""),
    calendarId: integration?.calendar_id || "",
    lastSyncError: integration?.last_sync_error || "",
    connectedAt: integration?.connected_at || ""
  };
}

async function connectCalendar(admin: any, shopId: string, userId: string, body: RequestBody) {
  const calendarId = body.calendarId || "primary";
  const existing = await getIntegration(admin, shopId);
  const refreshToken = body.refreshToken || "";
  const accessToken = body.accessToken || "";

  if (!existing?.refresh_token_encrypted && !refreshToken) {
    throw httpError(
      "GOOGLE_REFRESH_TOKEN_REQUIRED",
      "Reconnect Google with offline Calendar access",
      400
    );
  }

  const payload: Record<string, unknown> = {
    calendar_id: calendarId,
    connected_by: userId,
    last_sync_error: null,
    updated_at: new Date().toISOString()
  };

  if (accessToken) {
    payload.access_token_encrypted = await encrypt(accessToken);
  }

  if (refreshToken) {
    payload.refresh_token_encrypted = await encrypt(refreshToken);
  }

  if (existing) {
    const { error } = await admin
      .from("calendar_integrations")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("calendar_integrations").insert({
      ...payload,
      shop_id: shopId,
      provider: "google"
    });
    if (error) throw error;
  }

  return {
    ok: true,
    connected: true,
    hasRefreshToken: true,
    calendarId
  };
}

async function syncAppointment(admin: any, shop: any, _role: string, body: RequestBody) {
  if (!body.appointmentId) {
    throw httpError("APPOINTMENT_ID_REQUIRED", "appointmentId is required", 400);
  }

  const integration = await getIntegration(admin, shop.id);
  if (!integration?.refresh_token_encrypted) {
    throw httpError("GOOGLE_REFRESH_TOKEN_REQUIRED", "Connect Google Calendar again", 400);
  }

  const { data: appointment, error: appointmentError } = await admin
    .from("appointments")
    .select("id,appointment_date,start_time,end_time,selected_service_ids,status,source,google_calendar_event_id,google_calendar_name,customers(name,phone,line_id,facebook_name,note)")
    .eq("id", body.appointmentId)
    .eq("shop_id", shop.id)
    .single();

  if (appointmentError || !appointment) {
    throw httpError("APPOINTMENT_NOT_FOUND", "Appointment not found", 404);
  }

  if (appointment.status !== "confirmed") {
    throw httpError("APPOINTMENT_NOT_CONFIRMED", "Only confirmed appointments can be synced", 400);
  }

  if (appointment.google_calendar_event_id) {
    return {
      ok: true,
      skipped: true,
      eventId: appointment.google_calendar_event_id
    };
  }

  const accessToken = await refreshGoogleAccessToken(admin, integration);
  const eventPayload = await calendarEventPayload(admin, shop, appointment);
  const calendarId = integration.calendar_id || "primary";
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventPayload)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await saveSyncError(admin, integration.id, detail || "Google Calendar API failed");
    throw httpError("GOOGLE_CALENDAR_API_FAILED", "Google Calendar API failed", 502);
  }

  const event = await response.json();
  const { error: updateError } = await admin
    .from("appointments")
    .update({
      google_calendar_event_id: event.id,
      google_calendar_name: calendarId,
      updated_at: new Date().toISOString()
    })
    .eq("id", appointment.id)
    .eq("shop_id", shop.id);

  if (updateError) throw updateError;

  await saveSyncError(admin, integration.id, null);
  return {
    ok: true,
    eventId: event.id,
    calendarId
  };
}

async function getIntegration(admin: any, shopId: string) {
  const { data, error } = await admin
    .from("calendar_integrations")
    .select("id,calendar_id,access_token_encrypted,refresh_token_encrypted,connected_at,last_sync_error")
    .eq("shop_id", shopId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function refreshGoogleAccessToken(admin: any, integration: any) {
  const refreshToken = await decrypt(integration.refresh_token_encrypted);
  const { googleClientId, googleClientSecret } = googleOAuthEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    await saveSyncError(admin, integration.id, detail || "Google token refresh failed");
    throw httpError("GOOGLE_TOKEN_REFRESH_FAILED", "Google token refresh failed", 401);
  }

  const token = await response.json();
  const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString();
  const { error } = await admin
    .from("calendar_integrations")
    .update({
      access_token_encrypted: await encrypt(token.access_token),
      token_type: token.token_type || "Bearer",
      scope: token.scope || null,
      access_token_expires_at: expiresAt,
      last_sync_error: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", integration.id);

  if (error) throw error;
  return token.access_token;
}

async function calendarEventPayload(admin: any, shop: any, appointment: any) {
  const customer = Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
  const serviceNames = await serviceNamesByIds(admin, shop.id, appointment.selected_service_ids || []);
  const [startTime, endTime] = [normalizeTime(appointment.start_time), normalizeTime(appointment.end_time)];
  const customerName = customer?.name || "ลูกค้า";
  const contact = [customer?.phone, customer?.line_id, customer?.facebook_name, customer?.note].filter(Boolean).join(" / ");

  return {
    summary: `${shop.name || "Fah Nail"} - ${customerName}`,
    description: [
      serviceNames.length ? `บริการ: ${serviceNames.join(", ")}` : "",
      contact ? `ติดต่อ: ${contact}` : "",
      "สร้างจากระบบจองคิว Fah Nail"
    ].filter(Boolean).join("\n"),
    start: {
      dateTime: `${appointment.appointment_date}T${startTime}:00+07:00`,
      timeZone: "Asia/Bangkok"
    },
    end: {
      dateTime: `${appointment.appointment_date}T${endTime}:00+07:00`,
      timeZone: "Asia/Bangkok"
    },
    extendedProperties: {
      private: {
        fahNailAppointmentId: appointment.id,
        fahNailShopSlug: shop.slug
      }
    }
  };
}

async function serviceNamesByIds(admin: any, shopId: string, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await admin
    .from("services")
    .select("id,name")
    .eq("shop_id", shopId)
    .in("id", ids);

  if (error) throw error;
  const namesById = new Map((data || []).map((item: any) => [item.id, item.name]));
  return ids.map((id) => namesById.get(id)).filter(Boolean);
}

async function saveSyncError(admin: any, integrationId: string, message: string | null) {
  const { error } = await admin
    .from("calendar_integrations")
    .update({
      last_sync_error: message,
      updated_at: new Date().toISOString()
    })
    .eq("id", integrationId);

  if (error) throw error;
}

async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), encoded);
  return `v1:${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
}

async function decrypt(value: string) {
  if (!value.startsWith("v1:")) return value;
  const [, ivText, dataText] = value.split(":");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivText) },
    await encryptionKey(),
    fromBase64(dataText)
  );
  return new TextDecoder().decode(decrypted);
}

async function encryptionKey() {
  const tokenSecret = requiredEnv("GOOGLE_TOKEN_ENCRYPTION_KEY");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenSecret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeTime(value: string) {
  return String(value || "").slice(0, 5);
}

function needsReconnect(message: string) {
  return /invalid_grant|invalid_token|revoked|expired/i.test(message || "");
}

function httpError(code: string, message: string, status: number) {
  const error = new Error(message) as Error & { code: string; status: number };
  error.code = code;
  error.status = status;
  return error;
}

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function supabaseEnv() {
  return {
    supabaseUrl: requiredEnv("SUPABASE_URL"),
    anonKey: requiredEnv("SUPABASE_ANON_KEY"),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}

function googleOAuthEnv() {
  return {
    googleClientId: requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    googleClientSecret: requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET")
  };
}
