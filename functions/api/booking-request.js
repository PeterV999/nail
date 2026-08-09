const FALLBACK_SUPABASE_URL = "https://punzqhfrhdgimvmczspv.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InB1bnpxaGZyaGRnaW12bWN6c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NzAzMzcsImV4cCI6MjEwMTM0NjMzN30.xlfjpyEWkI6UUNwcVbPgIcM8ZjnLV9_bQAC-c94XES8";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TEXT_LENGTH = 240;

export async function onRequestOptions() {
  return jsonResponse({ ok: true });
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "BAD_REQUEST" }, 400);
  }

  const turnstile = await verifyTurnstile(request, env, payload?.turnstileToken);
  if (!turnstile.ok) return jsonResponse({ error: turnstile.error }, turnstile.status);

  const cleanPayload = normalizePayload(payload);
  if (!cleanPayload.ok) return jsonResponse({ error: cleanPayload.error }, 400);

  const supabase = await createBookingRequest(env, cleanPayload.value);
  if (!supabase.ok) return jsonResponse({ error: supabase.error }, supabase.status);

  return jsonResponse({ ok: true, id: supabase.id });
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) return { ok: false, status: 500, error: "TURNSTILE_NOT_CONFIGURED" };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, status: 403, error: "TURNSTILE_REQUIRED" };
  }

  let result;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || ""
      })
    });
    result = await response.json();
  } catch {
    return { ok: false, status: 403, error: "TURNSTILE_VERIFY_FAILED" };
  }

  if (!result?.success) return { ok: false, status: 403, error: "TURNSTILE_VERIFY_FAILED" };
  if (result.action !== "booking_request") return { ok: false, status: 403, error: "TURNSTILE_ACTION_MISMATCH" };
  if (!isAllowedHostname(result.hostname, env.TURNSTILE_HOSTNAMES || "bookingnail.pages.dev")) {
    return { ok: false, status: 403, error: "TURNSTILE_HOST_MISMATCH" };
  }

  return { ok: true };
}

function normalizePayload(payload) {
  const value = {
    shop_slug: cleanText(payload?.shopSlug, 80),
    customer_name: cleanText(payload?.customerName, MAX_TEXT_LENGTH),
    contact_snapshot: cleanText(payload?.contact, MAX_TEXT_LENGTH),
    booking_date: cleanText(payload?.bookingDate, 32),
    preferred_time_window: cleanText(payload?.timeWindow, 32),
    selected_service_ids: Array.isArray(payload?.serviceIds) ? payload.serviceIds.filter(isUuid) : [],
    customer_note: cleanText(payload?.note || "", 500)
  };

  if (!value.shop_slug || !value.customer_name || !value.contact_snapshot || !value.booking_date || !value.preferred_time_window) {
    return { ok: false, error: "BOOKING_REQUEST_REQUIRED_FIELDS" };
  }

  if (value.selected_service_ids.length === 0) {
    return { ok: false, error: "BOOKING_REQUEST_SERVICE_REQUIRED" };
  }

  return { ok: true, value };
}

async function createBookingRequest(env, payload) {
  const supabaseUrl = (env.SUPABASE_URL || FALLBACK_SUPABASE_URL).replace(/\/+$/, "");
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_booking_request`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    const error = parseSupabaseError(text);
    return { ok: false, status: response.status >= 500 ? 502 : 400, error };
  }

  return { ok: true, id: parseResponseId(text) };
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function isAllowedHostname(hostname, allowedHostnames) {
  const allowed = allowedHostnames.split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.some((item) => hostname === item || hostname.endsWith(`.${item}`));
}

function parseSupabaseError(text) {
  try {
    const data = JSON.parse(text);
    return data.message || data.code || "BOOKING_REQUEST_FAILED";
  } catch {
    return text || "BOOKING_REQUEST_FAILED";
  }
}

function parseResponseId(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text.replace(/^"|"$/g, "");
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
