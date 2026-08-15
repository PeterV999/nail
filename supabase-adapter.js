(function () {
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok"
  });

  let cachedClient = null;
  let authTokenListenerAttached = false;
  const cachedShops = new Map();
  const GOOGLE_PROVIDER_TOKEN_KEY = "fah_nail_google_provider_token";
  const GOOGLE_LOGIN_SCOPES = "email profile";
  const SHOP_LOGO_BUCKET = "shop-logos";
  const SHOP_LOGO_MAX_BYTES = 2 * 1024 * 1024;
  const SHOP_LOGO_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  };
  const latestProviderTokens = {
    accessToken: ""
  };

  function config() {
    return window.FAH_NAIL_CONFIG || {};
  }

  function isConfigured() {
    const current = config();
    return Boolean(window.supabase && current.supabaseUrl && current.supabaseAnonKey);
  }

  function isLocalPreview() {
    return ["file:", "http:"].includes(window.location.protocol)
      && ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
  }

  function localPageUrl(fileName, slug) {
    const url = new URL(fileName, window.location.href);
    if (slug) url.searchParams.set("shop", slug);
    url.hash = "";
    return url.href;
  }

  function client() {
    if (!isConfigured()) return null;
    if (!cachedClient) {
      cachedClient = window.supabase.createClient(config().supabaseUrl, config().supabaseAnonKey);
      attachAuthTokenStorage(cachedClient);
    }
    return cachedClient;
  }

  function shopLogoPublicUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const db = client();
    if (!db) return "";
    return db.storage.from(SHOP_LOGO_BUCKET).getPublicUrl(path).data?.publicUrl || "";
  }

  function mapShopProfile(item = {}) {
    const logoPath = item.logo_path || item.logoPath || "";
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      status: item.status || "active",
      phone: item.phone || "",
      lineId: item.line_id || item.lineId || "",
      facebookPage: item.facebook_page || item.facebookPage || "",
      tagline: item.tagline || "",
      logoPath,
      logoUrl: item.logo_url || item.logoUrl || shopLogoPublicUrl(logoPath)
    };
  }

  function attachAuthTokenStorage(db) {
    if (authTokenListenerAttached) return;
    authTokenListenerAttached = true;
    db.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) rememberProviderToken(session.provider_token);

      if (event === "SIGNED_OUT") {
        window.localStorage.removeItem(GOOGLE_PROVIDER_TOKEN_KEY);
        window.sessionStorage.removeItem(GOOGLE_PROVIDER_TOKEN_KEY);
        latestProviderTokens.accessToken = "";
      }
    });
  }

  function rememberProviderToken(accessToken) {
    if (accessToken) {
      latestProviderTokens.accessToken = accessToken;
      window.localStorage.removeItem(GOOGLE_PROVIDER_TOKEN_KEY);
      window.sessionStorage.setItem(GOOGLE_PROVIDER_TOKEN_KEY, accessToken);
    }
  }

  const reservedRouteSegments = new Set([
    "",
    "admin",
    "assets",
    "index.html",
    "manifest.webmanifest",
    "fah-owner.html",
    "privacy",
    "register",
    "terms"
  ]);

  const publicShopAliases = {
    fah: "fah-nail",
    "fah-nail": "fah-nail"
  };

  function routeParts() {
    return window.location.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  }

  function shopSlugFromPublicPath(publicSlug) {
    const cleanSlug = String(publicSlug || "").trim().replace(/\/+$/g, "");
    if (!cleanSlug || reservedRouteSegments.has(cleanSlug)) return "";
    return publicShopAliases[cleanSlug] || cleanSlug;
  }

  function publicPathFromShopSlug(slug) {
    return slug === "fah-nail" ? "fah" : slug;
  }

  function routeShopSlug() {
    const parts = routeParts();
    const firstPart = parts[0] || "";
    const params = new URLSearchParams(window.location.search);
    const queryShop = params.get("shop");
    if (queryShop) return queryShop;

    if (firstPart.endsWith("-owner")) {
      return shopSlugFromPublicPath(firstPart.slice(0, -6)) || config().shopSlug || "fah-nail";
    }

    return shopSlugFromPublicPath(firstPart) || config().shopSlug || "fah-nail";
  }

  function shopUrls(slug = routeShopSlug()) {
    if (isLocalPreview()) {
      return {
        booking: localPageUrl("index.html", slug),
        dashboard: localPageUrl("fah-owner.html", slug),
        register: "/register"
      };
    }

    const publicSlug = publicPathFromShopSlug(slug);
    if (publicSlug !== "fah") {
      const querySlug = encodeURIComponent(slug);
      return {
        booking: `/?shop=${querySlug}`,
        dashboard: `/fah-owner?shop=${querySlug}`,
        register: "/register/"
      };
    }

    return {
      booking: "/fah",
      dashboard: "/fah-owner",
      register: "/register/"
    };
  }

  async function getShop(slug = routeShopSlug()) {
    if (cachedShops.has(slug)) return cachedShops.get(slug);
    const db = client();
    if (!db) return null;

    const { data, error } = await db
      .from("public_shops")
      .select("id,name,slug,status,phone,line_id,facebook_page,tagline,logo_path")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    const shop = mapShopProfile(data);
    cachedShops.set(slug, shop);
    return shop;
  }

  async function listPublicShops() {
    const db = client();
    if (!db) return [];

    const { data, error } = await db
      .from("public_shops")
      .select("id,name,slug,status,phone,line_id,facebook_page,tagline,logo_path")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => {
      const shop = mapShopProfile(item);
      cachedShops.set(shop.slug, shop);
      return shop;
    });
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

  async function createBookingRequest(request, state, options = {}) {
    const db = client();
    if (!db) return false;

    const shop = await getShop();
    const serviceIds = state.services
      .filter((service) => request.services.includes(service.name))
      .map((service) => service.id)
      .filter(Boolean);

    if (options.turnstileToken && config().bookingRequestEndpoint) {
      const response = await fetch(config().bookingRequestEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopSlug: shop.slug,
          customerName: request.customerName,
          contact: request.contact,
          bookingDate: request.bookingDate,
          timeWindow: request.timeWindow,
          serviceIds,
          note: request.note,
          turnstileToken: options.turnstileToken
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || "BOOKING_REQUEST_FAILED");
        error.code = data.error;
        throw error;
      }
      return true;
    }

    const { error } = await db.rpc("create_booking_request", {
      shop_slug: shop.slug,
      customer_name: request.customerName,
      contact_snapshot: request.contact,
      booking_date: request.bookingDate,
      preferred_time_window: request.timeWindow,
      selected_service_ids: serviceIds,
      customer_note: request.note
    });

    if (error) throw error;
    return true;
  }

  async function listMemberShops() {
    const db = client();
    if (!db) return [];

    const { data, error } = await db.rpc("list_accessible_shops");
    if (!error) return (data || []).map(mapAccessibleShop);

    const { data: memberships, error: membershipError } = await db
      .from("shop_members")
      .select("role, shops(id,name,slug,status,phone,line_id,facebook_page,tagline,logo_path)")
      .order("created_at", { ascending: true });

    if (membershipError) throw membershipError;
    return (memberships || [])
      .map((item) => ({ role: item.role, ...(item.shops || {}) }))
      .filter((shop) => shop.id);
  }

  async function ownerSession(slug = routeShopSlug()) {
    const db = client();
    if (!db) return { configured: false, session: null };
    const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] = await Promise.all([
      db.auth.getSession(),
      db.auth.getUser()
    ]);
    if (sessionError || userError) throw sessionError || userError;

    if (!sessionData.session || !userData.user) {
      return { configured: true, session: null, member: null };
    }

    const { data: access, error: accessError } = await db
      .rpc("get_shop_access", { shop_slug: slug })
      .maybeSingle();

    if (!accessError) {
      const shop = access ? {
        id: access.id,
        name: access.name,
        slug: access.slug,
        status: access.status
      } : await getShop(slug).catch(() => null);
      return {
        configured: true,
        session: sessionData.session,
        user: userData.user,
        member: access ? { shop_id: access.id, role: access.role } : null,
        shop
      };
    }

    const shop = await getShop(slug);
    const { data: membership, error: membershipError } = await db
      .from("shop_members")
      .select("shop_id,role")
      .eq("shop_id", shop.id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    return { configured: true, session: sessionData.session, user: userData.user, member: membership, shop };
  }

  async function signInWithGoogle(options = {}) {
    const db = client();
    if (!db) return;
    const dashboardUrl = shopUrls(routeShopSlug()).dashboard;
    const redirectTo = options.redirectTo
      || (isLocalPreview() ? localPageUrl("fah-owner.html", routeShopSlug()) : new URL(dashboardUrl, window.location.origin).href)
      || config().ownerRedirectUrl
      || window.location.href;

    await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: GOOGLE_LOGIN_SCOPES
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
      { data: customers, error: customersError }
    ] = await Promise.all([
      db.from("shops").select("id,name,slug,phone,line_id,facebook_page,tagline,logo_path,status").eq("id", shop.id).single(),
      db.from("services").select("id,name,is_active,sort_order").eq("shop_id", shop.id).order("sort_order"),
      db.from("booking_time_slots").select("id,start_time,end_time,is_active,sort_order").eq("shop_id", shop.id).order("sort_order"),
      db.from("booking_day_overrides").select("id,date,is_closed,note").eq("shop_id", shop.id),
      db.from("booking_requests")
        .select("id,customer_name,contact_snapshot,booking_date,preferred_time_window,selected_service_ids,customer_note,status,source,created_at")
        .eq("shop_id", shop.id)
        .in("status", ["pending_request", "contacted", "no_answer"])
        .order("created_at", { ascending: false }),
      db.from("appointments")
        .select("id,appointment_date,start_time,end_time,selected_service_ids,status,source,customers(name,phone,line_id,facebook_name,note),booking_requests(customer_name,contact_snapshot)")
        .eq("shop_id", shop.id)
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true }),
      db.from("customers")
        .select("id,name,phone,line_id,facebook_name,note,created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

    const error = ownerShopError || servicesError || slotsError || closedError || requestsError || appointmentsError || customersError;
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
        tagline: ownerShop.tagline || "",
        logoPath: ownerShop.logo_path || "",
        logoUrl: shopLogoPublicUrl(ownerShop.logo_path || ""),
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
          source: item.source || "admin"
        };
      }),
      customers: (customers || []).map((item) => ({
        id: item.id,
        name: item.name,
        contact: customerContact(item),
        note: item.note || "",
        createdAt: item.created_at
      }))
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
      tagline: changes.tagline || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from("shops")
      .update(payload)
      .eq("id", shop.id)
      .select("id,name,slug,phone,line_id,facebook_page,tagline,logo_path,status")
      .single();

    if (error) throw error;
    const updatedShop = mapShopProfile(data);
    cachedShops.set(data.slug, updatedShop);
    return updatedShop;
  }

  function validateShopLogoFile(file) {
    if (!file) throw new Error("SHOP_LOGO_REQUIRED");
    if (!SHOP_LOGO_EXTENSIONS[file.type]) throw new Error("SHOP_LOGO_TYPE_INVALID");
    if (file.size > SHOP_LOGO_MAX_BYTES) throw new Error("SHOP_LOGO_TOO_LARGE");
  }

  async function updateShopLogoPath(shop, logoPath) {
    const db = client();
    const { data, error } = await db
      .from("shops")
      .update({
        logo_path: logoPath || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", shop.id)
      .select("id,name,slug,phone,line_id,facebook_page,tagline,logo_path,status")
      .single();

    if (error) throw error;
    const updatedShop = mapShopProfile(data);
    cachedShops.set(updatedShop.slug, updatedShop);
    return updatedShop;
  }

  function canDeleteLogoPath(path, shopId) {
    return Boolean(path && shopId && path.startsWith(`${shopId}/`));
  }

  async function uploadShopLogo(file, slug = routeShopSlug()) {
    const db = client();
    if (!db) return null;
    validateShopLogoFile(file);

    const shop = await getShop(slug);
    const extension = SHOP_LOGO_EXTENSIONS[file.type];
    const logoPath = `${shop.id}/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from(SHOP_LOGO_BUCKET)
      .upload(logoPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;
    const updatedShop = await updateShopLogoPath(shop, logoPath);

    if (canDeleteLogoPath(shop.logoPath, shop.id) && shop.logoPath !== logoPath) {
      const { error: removeError } = await db.storage.from(SHOP_LOGO_BUCKET).remove([shop.logoPath]);
      if (removeError) console.warn("Remove previous shop logo failed", removeError);
    }

    return updatedShop;
  }

  async function removeShopLogo(slug = routeShopSlug()) {
    const db = client();
    if (!db) return null;
    const shop = await getShop(slug);
    if (canDeleteLogoPath(shop.logoPath, shop.id)) {
      const { error } = await db.storage.from(SHOP_LOGO_BUCKET).remove([shop.logoPath]);
      if (error) throw error;
    }
    return updateShopLogoPath(shop, "");
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

  async function completeAppointment(appointmentId, slug = routeShopSlug()) {
    const db = client();
    if (!db) return false;

    const shop = await getShop(slug);
    const { error } = await db
      .from("appointments")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", appointmentId)
      .eq("shop_id", shop.id);

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

  async function isPlatformAdmin() {
    const db = client();
    if (!db) return false;
    const { data, error } = await db.rpc("current_user_is_platform_admin");
    if (error) throw error;
    return Boolean(data);
  }

  async function loadPlatformAdminOverview() {
    const db = client();
    if (!db) return null;

    const [{ data: userData, error: userError }, { data: adminData, error: adminError }, { data: shops, error: shopsError }] = await Promise.all([
      db.auth.getUser(),
      db.rpc("current_user_is_platform_admin"),
      db.rpc("list_accessible_shops")
    ]);

    if (userError || adminError || shopsError) throw userError || adminError || shopsError;

    const mappedShops = (shops || []).map(mapAccessibleShop);
    const platformAdmin = Boolean(adminData);
    const visibleShops = platformAdmin ? mappedShops : [];

    return {
      user: userData.user,
      isPlatformAdmin: platformAdmin,
      shops: visibleShops,
      stats: platformAdmin ? platformAdminStats(visibleShops) : platformAdminStats([])
    };
  }

  async function updatePlatformShopSettings(shopId, changes) {
    const db = client();
    if (!db) return null;

    const { data, error } = await db
      .rpc("update_platform_shop_settings", {
        target_shop_id: shopId,
        shop_name: changes.name,
        shop_phone: changes.phone || null,
        shop_line_id: changes.lineId || null,
        shop_facebook_page: changes.facebookPage || null,
        shop_status: changes.status || "active",
        shop_tagline: changes.tagline || null
      })
      .single();

    if (error) throw error;
    if (data?.slug) {
      cachedShops.set(data.slug, mapShopProfile(data));
    }
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      status: data.status,
      phone: data.phone || "",
      lineId: data.line_id || "",
      facebookPage: data.facebook_page || "",
      tagline: data.tagline || "",
      logoPath: data.logo_path || "",
      logoUrl: shopLogoPublicUrl(data.logo_path || ""),
      updatedAt: data.updated_at
    };
  }

  async function listShopMembers(shopId) {
    const db = client();
    if (!db) return [];

    const { data, error } = await db.rpc("list_shop_members_for_admin", { target_shop_id: shopId });
    if (error) throw error;
    return (data || []).map(mapShopMember);
  }

  async function upsertShopMember(shopId, email, role) {
    const db = client();
    if (!db) return null;

    const { data, error } = await db
      .rpc("upsert_shop_member_by_email", {
        target_shop_id: shopId,
        member_email: email,
        member_role: role || "staff"
      })
      .single();

    if (error) throw error;
    return mapShopMember(data);
  }

  async function removeShopMember(shopId, userId) {
    const db = client();
    if (!db) return false;

    const { error } = await db
      .rpc("remove_shop_member_for_admin", {
        target_shop_id: shopId,
        member_user_id: userId
      });

    if (error) throw error;
    return true;
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

  function mapAccessibleShop(item) {
    return {
      ...mapShopProfile(item),
      role: item.role || "owner",
      pendingRequests: Number(item.pending_requests || 0),
      todayAppointments: Number(item.today_appointments || 0),
      tomorrowAppointments: Number(item.tomorrow_appointments || 0),
      upcomingAppointments: Number(item.upcoming_appointments || 0),
      createdAt: item.created_at || "",
      updatedAt: item.updated_at || ""
    };
  }

  function mapShopMember(item) {
    return {
      userId: item.user_id,
      email: item.email || "",
      role: item.role || "staff",
      createdAt: item.created_at || ""
    };
  }

  function platformAdminStats(shops) {
    return {
      totalShops: shops.length,
      activeShops: shops.filter((shop) => shop.status === "active").length,
      inactiveShops: shops.filter((shop) => shop.status !== "active").length,
      pendingRequests: shops.reduce((sum, shop) => sum + Number(shop.pendingRequests || 0), 0),
      todayAppointments: shops.reduce((sum, shop) => sum + Number(shop.todayAppointments || 0), 0),
      tomorrowAppointments: shops.reduce((sum, shop) => sum + Number(shop.tomorrowAppointments || 0), 0),
      upcomingAppointments: shops.reduce((sum, shop) => sum + Number(shop.upcomingAppointments || 0), 0),
      needsAttention: shops.filter((shop) => (
        Number(shop.pendingRequests || 0) > 0
        || shop.status !== "active"
      )).length
    };
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
    listPublicShops,
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
    uploadShopLogo,
    removeShopLogo,
    createOwnerAppointment,
    cancelAppointment,
    completeAppointment,
    createService,
    updateService,
    deleteService,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    setDayClosed,
    registerShop,
    isPlatformAdmin,
    loadPlatformAdminOverview,
    updatePlatformShopSettings,
    listShopMembers,
    upsertShopMember,
    removeShopMember
  };
}());
