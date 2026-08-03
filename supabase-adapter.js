(function () {
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok"
  });

  let cachedClient = null;
  let cachedShop = null;

  function config() {
    return window.FAH_NAIL_CONFIG || {};
  }

  function isConfigured() {
    const current = config();
    return Boolean(window.supabase && current.supabaseUrl && current.supabaseAnonKey);
  }

  function client() {
    if (!isConfigured()) return null;
    if (!cachedClient) {
      cachedClient = window.supabase.createClient(config().supabaseUrl, config().supabaseAnonKey);
    }
    return cachedClient;
  }

  async function getShop() {
    if (cachedShop) return cachedShop;
    const db = client();
    if (!db) return null;

    const { data, error } = await db
      .from("public_shops")
      .select("id,name,slug")
      .eq("slug", config().shopSlug || "fah-nail")
      .single();

    if (error) throw error;
    cachedShop = data;
    return cachedShop;
  }

  async function loadPublicState(defaultState) {
    const db = client();
    if (!db) return null;

    const shop = await getShop();
    const [{ data: services, error: servicesError }, { data: slots, error: slotsError }, { data: closedDays, error: closedError }, { data: busy, error: busyError }] = await Promise.all([
      db.from("public_services").select("id,name,is_active,sort_order").eq("shop_id", shop.id).order("sort_order"),
      db.from("public_booking_time_slots").select("id,start_time,end_time,is_active,sort_order").eq("shop_id", shop.id).order("sort_order"),
      db.from("public_booking_day_overrides").select("date,is_closed").eq("shop_id", shop.id).eq("is_closed", true),
      db.from("public_busy_time_windows").select("appointment_date,time_window").eq("shop_id", shop.id)
    ]);

    if (servicesError || slotsError || closedError || busyError) {
      throw servicesError || slotsError || closedError || busyError;
    }

    return {
      ...structuredClone(defaultState),
      services: services.map((item) => ({ id: item.id, name: item.name, active: item.is_active })),
      timeSlots: slots.map((item) => ({
        id: item.id,
        startTime: normalizeTime(item.start_time),
        endTime: normalizeTime(item.end_time),
        active: item.is_active
      })),
      closedDates: closedDays.map((item) => item.date),
      appointments: busy.map((item) => ({
        id: `busy-${item.appointment_date}-${item.time_window}`,
        bookingDate: item.appointment_date,
        timeWindow: item.time_window,
        status: "confirmed",
        source: "remote"
      }))
    };
  }

  async function createBookingRequest(request, state) {
    const db = client();
    if (!db) return false;

    const shop = await getShop();
    const serviceIds = state.services
      .filter((service) => request.services.includes(service.name))
      .map((service) => service.id)
      .filter(Boolean);

    const { error } = await db.from("booking_requests").insert({
      shop_id: shop.id,
      customer_name: request.customerName,
      contact_snapshot: request.contact,
      booking_date: request.bookingDate,
      preferred_time_window: request.timeWindow,
      selected_service_ids: serviceIds,
      customer_note: request.note,
      status: "pending_request",
      source: "customer_request"
    });

    if (error) throw error;
    return true;
  }

  async function ownerSession() {
    const db = client();
    if (!db) return { configured: false, session: null };
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    if (!data.session) {
      return { configured: true, session: null, member: null };
    }

    const shop = await getShop();
    const { data: membership, error: membershipError } = await db
      .from("shop_members")
      .select("shop_id,role")
      .eq("shop_id", shop.id)
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    return { configured: true, session: data.session, member: membership };
  }

  async function signInWithGoogle() {
    const db = client();
    if (!db) return;

    await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: config().ownerRedirectUrl || window.location.href
      }
    });
  }

  async function signOut() {
    const db = client();
    if (!db) return;
    await db.auth.signOut();
  }

  function normalizeTime(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 5);
    return timeFormatter.format(new Date(value));
  }

  window.FahNailSupabase = {
    client,
    isConfigured,
    loadPublicState,
    createBookingRequest,
    ownerSession,
    signInWithGoogle,
    signOut
  };
}());
