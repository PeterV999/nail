(function () {
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok"
  });

  let cachedClient = null;
  const cachedShops = new Map();

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

  function routeShopSlug() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if ((parts[0] === "book" || parts[0] === "dashboard") && parts[1]) return parts[1];

    const params = new URLSearchParams(window.location.search);
    return params.get("shop") || config().shopSlug || "fah-nail";
  }

  function shopUrls(slug = routeShopSlug()) {
    return {
      booking: `/book/${encodeURIComponent(slug)}`,
      dashboard: `/dashboard/${encodeURIComponent(slug)}`,
      register: "/register"
    };
  }

  async function getShop(slug = routeShopSlug()) {
    if (cachedShops.has(slug)) return cachedShops.get(slug);
    const db = client();
    if (!db) return null;

    const { data, error } = await db
      .from("public_shops")
      .select("id,name,slug")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    cachedShops.set(slug, data);
    return data;
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
      shop,
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

  async function listMemberShops() {
    const db = client();
    if (!db) return [];

    const { data, error } = await db
      .from("shop_members")
      .select("role, shops(id,name,slug,status)")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || [])
      .map((item) => ({ role: item.role, ...(item.shops || {}) }))
      .filter((shop) => shop.id);
  }

  async function ownerSession(slug = routeShopSlug()) {
    const db = client();
    if (!db) return { configured: false, session: null };
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    if (!data.session) {
      return { configured: true, session: null, member: null };
    }

    const shop = await getShop(slug);
    const { data: membership, error: membershipError } = await db
      .from("shop_members")
      .select("shop_id,role")
      .eq("shop_id", shop.id)
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    return { configured: true, session: data.session, member: membership, shop };
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

  async function loadOwnerState(defaultState, slug = routeShopSlug()) {
    const db = client();
    if (!db) return null;

    const shop = await getShop(slug);
    const [
      { data: ownerShop, error: ownerShopError },
      { data: services, error: servicesError },
      { data: slots, error: slotsError },
      { data: closedDays, error: closedError },
      { data: requests, error: requestsError },
      { data: appointments, error: appointmentsError },
      { data: customers, error: customersError },
      { data: calendarIntegrations, error: calendarError }
    ] = await Promise.all([
      db.from("shops").select("id,name,slug,phone,line_id,facebook_page,status").eq("id", shop.id).single(),
      db.from("services").select("id,name,is_active,sort_order").eq("shop_id", shop.id).order("sort_order"),
      db.from("booking_time_slots").select("id,start_time,end_time,is_active,sort_order").eq("shop_id", shop.id).order("sort_order"),
      db.from("booking_day_overrides").select("id,date,is_closed,note").eq("shop_id", shop.id),
      db.from("booking_requests")
        .select("id,customer_name,contact_snapshot,booking_date,preferred_time_window,selected_service_ids,customer_note,status,source,created_at")
        .eq("shop_id", shop.id)
        .in("status", ["pending_request", "contacted", "no_answer"])
        .order("created_at", { ascending: false }),
      db.from("appointments")
        .select("id,appointment_date,start_time,end_time,selected_service_ids,status,source,google_calendar_event_id,google_calendar_name,customers(name,phone,line_id,facebook_name,note),booking_requests(customer_name,contact_snapshot)")
        .eq("shop_id", shop.id)
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true }),
      db.from("customers")
        .select("id,name,phone,line_id,facebook_name,note,created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false })
        .limit(12),
      db.from("calendar_integrations")
        .select("provider,calendar_id,connected_at")
        .eq("shop_id", shop.id)
        .eq("provider", "google")
        .maybeSingle()
    ]);

    const error = ownerShopError || servicesError || slotsError || closedError || requestsError || appointmentsError || customersError || calendarError;
    if (error) throw error;

    const serviceNameById = new Map((services || []).map((service) => [service.id, service.name]));
    const toServiceNames = (ids) => (ids || []).map((id) => serviceNameById.get(id) || id).filter(Boolean);

    return {
      ...structuredClone(defaultState),
      shop: {
        id: ownerShop.id,
        name: ownerShop.name,
        slug: ownerShop.slug,
        phone: ownerShop.phone || "",
        lineId: ownerShop.line_id || "",
        facebookPage: ownerShop.facebook_page || "",
        status: ownerShop.status
      },
      services: (services || []).map((item) => ({
        id: item.id,
        name: item.name,
        active: item.is_active,
        sortOrder: item.sort_order
      })),
      timeSlots: (slots || []).map((item) => ({
        id: item.id,
        startTime: normalizeTime(item.start_time),
        endTime: normalizeTime(item.end_time),
        active: item.is_active,
        sortOrder: item.sort_order
      })),
      closedDates: (closedDays || []).filter((item) => item.is_closed).map((item) => item.date),
      requests: (requests || []).map((item) => ({
        id: item.id,
        customerName: item.customer_name,
        contact: item.contact_snapshot,
        services: toServiceNames(item.selected_service_ids),
        serviceIds: item.selected_service_ids || [],
        bookingDate: item.booking_date,
        timeWindow: item.preferred_time_window,
        note: item.customer_note || "",
        status: item.status,
        source: item.source || "customer_request"
      })),
      appointments: (appointments || []).map((item) => {
        const request = Array.isArray(item.booking_requests) ? item.booking_requests[0] : item.booking_requests;
        const customer = Array.isArray(item.customers) ? item.customers[0] : item.customers;
        return {
          id: item.id,
          customerName: customer?.name || request?.customer_name || "ลูกค้า",
          contact: customerContact(customer, request?.contact_snapshot),
          services: toServiceNames(item.selected_service_ids),
          serviceIds: item.selected_service_ids || [],
          bookingDate: item.appointment_date,
          timeWindow: `${normalizeTime(item.start_time)}-${normalizeTime(item.end_time)}`,
          status: item.status,
          source: item.source || "admin",
          googleCalendarEventId: item.google_calendar_event_id,
          googleCalendarName: item.google_calendar_name
        };
      }),
      customers: (customers || []).map((item) => ({
        id: item.id,
        name: item.name,
        contact: customerContact(item),
        note: item.note || "",
        createdAt: item.created_at
      })),
      calendarIntegration: calendarIntegrations ? {
        connected: true,
        provider: calendarIntegrations.provider,
        accountEmail: "",
        calendarId: calendarIntegrations.calendar_id,
        calendarName: calendarIntegrations.calendar_id
      } : structuredClone(defaultState.calendarIntegration)
    };
  }

  async function confirmBookingRequest(request, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const customerId = await createCustomer(shop.id, request.customerName, request.contact);
    const [startTime, endTime] = request.timeWindow.split("-");
    const { error: appointmentError } = await db.from("appointments").insert({
      shop_id: shop.id,
      customer_id: customerId,
      booking_request_id: request.id,
      appointment_date: request.bookingDate,
      start_time: startTime,
      end_time: endTime,
      selected_service_ids: request.serviceIds || [],
      status: "confirmed",
      source: "customer_request"
    });

    if (appointmentError) throw appointmentError;

    const { error: requestError } = await db
      .from("booking_requests")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", request.id)
      .eq("shop_id", shop.id);

    if (requestError) throw requestError;
    return true;
  }

  async function rejectBookingRequest(requestId, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { error } = await db
      .from("booking_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("shop_id", shop.id);

    if (error) throw error;
    return true;
  }

  async function updateBookingRequestStatus(requestId, status, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const allowedStatuses = new Set(["pending_request", "contacted", "no_answer", "rejected"]);
    if (!allowedStatuses.has(status)) {
      throw new Error("Unsupported booking request status");
    }

    const shop = await getShop(slug);
    const { error } = await db
      .from("booking_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("shop_id", shop.id);

    if (error) throw error;
    return true;
  }

  async function updateShopSettings(changes, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const payload = {
      name: changes.name,
      phone: changes.phone || null,
      line_id: changes.lineId || null,
      facebook_page: changes.facebookPage || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from("shops")
      .update(payload)
      .eq("id", shop.id)
      .select("id,name,slug,phone,line_id,facebook_page,status")
      .single();

    if (error) throw error;
    cachedShops.set(data.slug, { id: data.id, name: data.name, slug: data.slug });
    return true;
  }

  async function createOwnerAppointment(appointment, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const customerId = await createCustomer(shop.id, appointment.customerName, appointment.contact);
    const [startTime, endTime] = appointment.timeWindow.split("-");
    const { error } = await db.from("appointments").insert({
      shop_id: shop.id,
      customer_id: customerId,
      appointment_date: appointment.bookingDate,
      start_time: startTime,
      end_time: endTime,
      selected_service_ids: appointment.serviceId ? [appointment.serviceId] : [],
      status: "confirmed",
      source: appointment.source || "admin"
    });

    if (error) throw error;
    return true;
  }

  async function cancelAppointment(appointmentId, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { error } = await db
      .from("appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", appointmentId)
      .eq("shop_id", shop.id);

    if (error) throw error;
    return true;
  }

  async function setCalendarIntegration(calendarId, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { error } = await db.from("calendar_integrations").upsert({
      shop_id: shop.id,
      provider: "google",
      calendar_id: calendarId,
      updated_at: new Date().toISOString()
    }, { onConflict: "shop_id,provider" });

    if (error) throw error;
    return true;
  }

  async function removeCalendarIntegration(slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { error } = await db
      .from("calendar_integrations")
      .delete()
      .eq("shop_id", shop.id)
      .eq("provider", "google");

    if (error) throw error;
    return true;
  }

  async function createService(name, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { count } = await db
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id);
    const { error } = await db.from("services").insert({
      shop_id: shop.id,
      name,
      sort_order: ((count || 0) + 1) * 10
    });

    if (error) throw error;
    return true;
  }

  async function updateService(serviceId, changes) {
    const db = client();
    if (!db) return false;
    const payload = {};
    if ("active" in changes) payload.is_active = changes.active;
    if ("name" in changes) payload.name = changes.name;
    payload.updated_at = new Date().toISOString();

    const { error } = await db.from("services").update(payload).eq("id", serviceId);
    if (error) throw error;
    return true;
  }

  async function deleteService(serviceId) {
    const db = client();
    if (!db) return false;
    const { error } = await db.from("services").delete().eq("id", serviceId);
    if (error) throw error;
    return true;
  }

  async function createTimeSlot(startTime, endTime, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { count } = await db
      .from("booking_time_slots")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id);
    const { error } = await db.from("booking_time_slots").insert({
      shop_id: shop.id,
      start_time: startTime,
      end_time: endTime,
      sort_order: ((count || 0) + 1) * 10
    });

    if (error) throw error;
    return true;
  }

  async function updateTimeSlot(slotId, changes) {
    const db = client();
    if (!db) return false;
    const payload = {};
    if ("active" in changes) payload.is_active = changes.active;
    payload.updated_at = new Date().toISOString();

    const { error } = await db.from("booking_time_slots").update(payload).eq("id", slotId);
    if (error) throw error;
    return true;
  }

  async function deleteTimeSlot(slotId) {
    const db = client();
    if (!db) return false;
    const { error } = await db.from("booking_time_slots").delete().eq("id", slotId);
    if (error) throw error;
    return true;
  }

  async function setDayClosed(date, closed, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    if (!closed) {
      const { error } = await db
        .from("booking_day_overrides")
        .delete()
        .eq("shop_id", shop.id)
        .eq("date", date);
      if (error) throw error;
      return true;
    }

    const { error } = await db.from("booking_day_overrides").upsert({
      shop_id: shop.id,
      date,
      is_closed: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "shop_id,date" });

    if (error) throw error;
    return true;
  }

  async function registerShop(shopName, requestedSlug) {
    const db = client();
    if (!db) return null;

    const { data, error } = await db
      .rpc("register_shop", { shop_name: shopName, requested_slug: requestedSlug })
      .single();

    if (error) throw error;
    return data;
  }

  async function createCustomer(shopId, name, contact) {
    const db = client();
    const { data, error } = await db
      .from("customers")
      .insert({
        shop_id: shopId,
        name,
        note: contact
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  function customerContact(customer, fallback = "") {
    if (!customer) return fallback || "";
    return customer.phone || customer.line_id || customer.facebook_name || customer.note || fallback || "";
  }

  function normalizeTime(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 5);
    return timeFormatter.format(new Date(value));
  }

  window.FahNailSupabase = {
    client,
    isConfigured,
    routeShopSlug,
    shopUrls,
    getShop,
    loadPublicState,
    createBookingRequest,
    listMemberShops,
    ownerSession,
    signInWithGoogle,
    signOut,
    loadOwnerState,
    confirmBookingRequest,
    rejectBookingRequest,
    updateBookingRequestStatus,
    updateShopSettings,
    createOwnerAppointment,
    cancelAppointment,
    setCalendarIntegration,
    removeCalendarIntegration,
    createService,
    updateService,
    deleteService,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    setDayClosed,
    registerShop
  };
}());
