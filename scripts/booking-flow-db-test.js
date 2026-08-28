const SUPABASE_URL = (process.env.SUPABASE_URL || "https://punzqhfrhdgimvmczspv.supabase.co").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SHOP_SLUG = process.env.SHOP_SLUG || "fah-nail";

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY before running the real booking flow test.");
  process.exit(1);
}

async function supabaseFetch(path, key, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.code || text || `Supabase ${response.status}`);
  }
  return data;
}

async function main() {
  const [shop] = await supabaseFetch(`/rest/v1/shops?slug=eq.${encodeURIComponent(SHOP_SLUG)}&select=id,slug,status`, SUPABASE_SERVICE_ROLE_KEY);
  if (!shop?.id || shop.status !== "active") throw new Error(`Shop ${SHOP_SLUG} is not active`);

  const [service] = await supabaseFetch(`/rest/v1/services?shop_id=eq.${shop.id}&is_active=eq.true&select=id,name&limit=1`, SUPABASE_SERVICE_ROLE_KEY);
  const [slot] = await supabaseFetch(`/rest/v1/booking_time_slots?shop_id=eq.${shop.id}&is_active=eq.true&select=start_time,end_time&limit=1`, SUPABASE_SERVICE_ROLE_KEY);
  if (!service?.id || !slot?.start_time || !slot?.end_time) throw new Error("Shop needs one active service and one active time slot");

  const bookingDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startTime = String(slot.start_time).slice(0, 5);
  const endTime = String(slot.end_time).slice(0, 5);
  const timeWindow = `${startTime}-${endTime}`;
  const contact = `test-${Date.now()}@bookingnail.local`;
  let requestId;
  let customerId;
  let appointmentId;

  try {
    requestId = await supabaseFetch("/rest/v1/rpc/create_booking_request", SUPABASE_ANON_KEY, {
      method: "POST",
      body: JSON.stringify({
        shop_slug: SHOP_SLUG,
        customer_name: "Automated Test",
        contact_snapshot: contact,
        booking_date: bookingDate,
        preferred_time_window: timeWindow,
        selected_service_ids: [service.id],
        customer_note: "automated production-safe flow test"
      })
    });

    const [customer] = await supabaseFetch("/rest/v1/customers?select=id", SUPABASE_SERVICE_ROLE_KEY, {
      method: "POST",
      body: JSON.stringify({
        shop_id: shop.id,
        name: "Automated Test",
        note: contact
      })
    });
    customerId = customer.id;

    const [appointment] = await supabaseFetch("/rest/v1/appointments?select=id,status", SUPABASE_SERVICE_ROLE_KEY, {
      method: "POST",
      body: JSON.stringify({
        shop_id: shop.id,
        customer_id: customerId,
        booking_request_id: requestId,
        appointment_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        selected_service_ids: [service.id],
        status: "confirmed",
        source: "customer_request"
      })
    });
    appointmentId = appointment.id;

    await supabaseFetch(`/rest/v1/booking_requests?id=eq.${requestId}&select=id,status`, SUPABASE_SERVICE_ROLE_KEY, {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmed", updated_at: new Date().toISOString() })
    });

    const [verified] = await supabaseFetch(`/rest/v1/appointments?id=eq.${appointmentId}&select=id,status,booking_request_id`, SUPABASE_SERVICE_ROLE_KEY);
    if (verified?.status !== "confirmed" || verified.booking_request_id !== requestId) {
      throw new Error("Confirmed appointment was not saved correctly");
    }

    console.log(`Real booking DB flow passed for ${SHOP_SLUG}: request ${requestId} -> appointment ${appointmentId}`);
  } finally {
    if (appointmentId) await supabaseFetch(`/rest/v1/appointments?id=eq.${appointmentId}`, SUPABASE_SERVICE_ROLE_KEY, { method: "DELETE" }).catch(() => undefined);
    if (requestId) await supabaseFetch(`/rest/v1/booking_requests?id=eq.${requestId}`, SUPABASE_SERVICE_ROLE_KEY, { method: "DELETE" }).catch(() => undefined);
    if (customerId) await supabaseFetch(`/rest/v1/customers?id=eq.${customerId}`, SUPABASE_SERVICE_ROLE_KEY, { method: "DELETE" }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
