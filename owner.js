const STORAGE_KEY = "fah-nail-booking-demo";
const today = new Date().toISOString().slice(0, 10);

const defaultTimeSlots = [
  { id: "slot-0800", startTime: "08:00", endTime: "10:00", active: true },
  { id: "slot-1000", startTime: "10:00", endTime: "12:00", active: true },
  { id: "slot-1200", startTime: "12:00", endTime: "14:00", active: true },
  { id: "slot-1400", startTime: "14:00", endTime: "16:00", active: true },
  { id: "slot-1600", startTime: "16:00", endTime: "18:00", active: true },
  { id: "slot-1800", startTime: "18:00", endTime: "20:00", active: true },
  { id: "slot-2000", startTime: "20:00", endTime: "22:00", active: true }
];

const defaultState = {
  shop: {
    name: "Fah Nail",
    slug: "fah-nail",
    phone: "",
    lineId: "",
    facebookPage: ""
  },
  timeSlots: defaultTimeSlots,
  closedDates: [],
  calendarIntegration: {
    connected: false,
    provider: "google",
    accountEmail: "",
    calendarId: "",
    calendarName: ""
  },
  services: [
    { id: "gel", name: "สีเจล", active: true },
    { id: "art", name: "เพ้นท์ลาย", active: true },
    { id: "extension", name: "ต่อเล็บ", active: true },
    { id: "hand-spa", name: "สปามือ", active: true },
    { id: "foot-spa", name: "สปาเท้า", active: true }
  ],
  requests: [
    {
      id: "REQ-1001",
      customerName: "คุณมายด์",
      contact: "LINE mind.nail",
      services: ["สีเจล", "เพ้นท์ลาย"],
      bookingDate: today,
      timeWindow: "10:00-12:00",
      note: "อยากได้สีฟ้าใส",
      status: "pending_request",
      source: "customer_request"
    }
  ],
  appointments: [
    {
      id: "APT-2001",
      customerName: "คุณแพรว",
      contact: "โทร 08x-xxx-1234",
      services: ["ต่อเล็บ"],
      bookingDate: today,
      timeWindow: "14:00-16:00",
      status: "confirmed",
      source: "phone"
    }
  ],
  customers: [
    {
      id: "CUS-3001",
      name: "คุณแพรว",
      contact: "โทร 08x-xxx-1234",
      note: "ลูกค้าจองทางโทรศัพท์",
      createdAt: today
    },
    {
      id: "CUS-3002",
      name: "คุณมายด์",
      contact: "LINE mind.nail",
      note: "ชอบโทนสีฟ้าใส",
      createdAt: today
    }
  ]
};

let state = loadState();
let remoteMode = false;
let currentShopSlug = window.FahNailSupabase?.routeShopSlug?.() || "fah-nail";

const ownerAuthPanel = document.getElementById("owner-auth-panel");
const ownerApp = document.getElementById("owner-app");
const googleLoginButton = document.getElementById("google-login-button");
const demoLoginButton = document.getElementById("demo-login-button");
const logoutButton = document.getElementById("logout-button");
const authCopy = document.getElementById("auth-copy");
const authStatus = document.getElementById("auth-status");
const requestList = document.getElementById("request-list");
const ownerStats = document.getElementById("owner-stats");
const customerList = document.getElementById("customer-list");
const ownerServiceList = document.getElementById("owner-service-list");
const manualTime = document.getElementById("manual-time");
const manualService = document.getElementById("manual-service");
const manualDate = document.getElementById("manual-date");
const scheduleDate = document.getElementById("schedule-date");
const closedDayToggle = document.getElementById("closed-day-toggle");
const calendarStatus = document.getElementById("calendar-status");
const calendarSelect = document.getElementById("calendar-select");
const connectCalendarButton = document.getElementById("connect-calendar-button");
const syncCalendarButton = document.getElementById("sync-calendar-button");
const disconnectCalendarButton = document.getElementById("disconnect-calendar-button");
const manualForm = document.getElementById("manual-form");
const serviceForm = document.getElementById("service-form");
const slotForm = document.getElementById("slot-form");
const shopForm = document.getElementById("shop-form");
const shopNameInput = document.getElementById("shop-name");
const shopPhoneInput = document.getElementById("shop-phone");
const shopLineInput = document.getElementById("shop-line");
const shopFacebookInput = document.getElementById("shop-facebook");
const ownerTimeSlotList = document.getElementById("owner-time-slot-list");
const toast = document.getElementById("toast");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      requests: (parsed.requests || []).map((item) => ({ ...item, bookingDate: item.bookingDate || today })),
      appointments: (parsed.appointments || []).map((item) => ({ ...item, bookingDate: item.bookingDate || today })),
      customers: parsed.customers || structuredClone(defaultState.customers),
      timeSlots: normalizeTimeSlots(parsed.timeSlots || defaultTimeSlots),
      closedDates: parsed.closedDates || [],
      calendarIntegration: parsed.calendarIntegration || structuredClone(defaultState.calendarIntegration)
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  if (remoteMode) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeTimeSlots(slots) {
  return slots
    .map((slot) => {
      if (typeof slot === "string") {
        const [startTime, endTime] = slot.split("-");
        return { id: `slot-${startTime.replace(":", "")}`, startTime, endTime, active: true };
      }

      return {
        id: slot.id || `slot-${slot.startTime.replace(":", "")}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        active: slot.active !== false
      };
    })
    .filter((slot) => slot.startTime && slot.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function activeServices() {
  return state.services.filter((service) => service.active);
}

function timeSlots() {
  state.timeSlots = normalizeTimeSlots(state.timeSlots || defaultTimeSlots);
  return state.timeSlots;
}

function timeSlotLabel(slot) {
  return `${slot.startTime}-${slot.endTime}`;
}

function selectedManualDate() {
  return manualDate.value || today;
}

function selectedScheduleDate() {
  return scheduleDate.value || selectedManualDate();
}

function isDayClosed(date) {
  return state.closedDates.includes(date);
}

function isSlotOpen(date, slot) {
  return slot.active && !isDayClosed(date);
}

function busyWindows(date = selectedManualDate()) {
  return new Set(state.appointments
    .filter((appointment) => appointment.status === "confirmed" && appointment.bookingDate === date)
    .map((appointment) => appointment.timeWindow));
}

function render() {
  renderOwnerStats();
  renderOwnerLists();
  renderCustomers();
  renderOwnerServices();
  renderManualOptions();
  renderTimeManager();
  renderCalendarIntegration();
  renderShopSettings();
}

async function initOwnerAccess() {
  manualDate.value = today;
  scheduleDate.value = today;
  manualDate.min = today;
  scheduleDate.min = today;

  try {
    const authState = await window.FahNailSupabase?.ownerSession(currentShopSlug);
    if (authState?.configured && authState.session && authState.member) {
      remoteMode = true;
      await loadRemoteOwnerState();
      showOwnerApp("เข้าสู่ระบบแล้ว");
      return;
    }

    if (authState?.configured && authState.session && !authState.member) {
      showAuthPanel(false);
      const urls = window.FahNailSupabase?.shopUrls?.(currentShopSlug) || { register: "/register" };
      authStatus.innerHTML = `บัญชีนี้ยังไม่มีสิทธิ์หลังบ้านสำหรับร้านนี้ <a href="${urls.register}">ลงทะเบียนร้านใหม่</a>`;
      return;
    }

    if (authState?.configured) {
      showAuthPanel(false);
      return;
    }
  } catch (error) {
    console.warn("Owner auth check failed", error);
    authStatus.textContent = "ยังเชื่อมต่อ Supabase ไม่สำเร็จ ใช้โหมดตัวอย่างได้ชั่วคราว";
  }

  showAuthPanel(true);
}

async function loadRemoteOwnerState() {
  const remoteState = await window.FahNailSupabase?.loadOwnerState(defaultState, currentShopSlug);
  if (!remoteState) return;
  state = remoteState;
  currentShopSlug = remoteState.shop?.slug || currentShopSlug;
}

function showAuthPanel(allowDemo) {
  ownerAuthPanel.hidden = false;
  ownerApp.hidden = true;
  demoLoginButton.hidden = !allowDemo;
  googleLoginButton.hidden = allowDemo;

  authCopy.textContent = allowDemo
    ? "ตอนนี้ยังไม่ได้ใส่ค่า Supabase จึงเปิดดูหลังบ้านในโหมดตัวอย่างได้"
    : "กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของร้าน";
  authStatus.textContent = allowDemo
    ? "โหมดตัวอย่างใช้ข้อมูลในเครื่อง ยังไม่ใช่ระบบรักษาความปลอดภัยจริง"
    : "ข้อมูลหลังบ้านจริงจะแสดงเฉพาะบัญชีเจ้าของร้านที่กำหนดใน Supabase";
}

function showOwnerApp(message) {
  ownerAuthPanel.hidden = true;
  ownerApp.hidden = false;
  logoutButton.hidden = !window.FahNailSupabase?.isConfigured();
  updateRouteLinks();
  render();
  if (message) showToast(message);
}

function updateRouteLinks() {
  const shop = state.shop || { name: "Fah Nail", slug: currentShopSlug };
  const urls = window.FahNailSupabase?.shopUrls?.(currentShopSlug) || {
    booking: "index.html",
    dashboard: "owner.html",
    register: "register.html"
  };
  const customerLink = document.querySelector(".owner-link");
  const brand = document.querySelector(".brand");
  const brandName = document.querySelector(".brand strong");
  const ownerEyebrow = document.querySelector(".section-head .eyebrow");
  if (customerLink) customerLink.href = urls.booking;
  if (brand) brand.href = urls.dashboard;
  if (brandName) brandName.textContent = shop.name || "Fah Nail";
  if (ownerEyebrow) ownerEyebrow.textContent = shop.name || "หลังบ้าน";
  document.title = `หลังบ้าน ${shop.name || "Fah Nail"}`;
}

async function reloadAfterRemote(message) {
  await loadRemoteOwnerState();
  render();
  if (message) showToast(message);
}

function renderOwnerStats() {
  if (!ownerStats) return;
  const todayRequests = state.requests.filter((item) => item.bookingDate === today).length;
  const todayAppointments = state.appointments.filter((item) => item.bookingDate === today && item.status === "confirmed").length;
  const waiting = state.requests.filter((item) => item.status === "pending_request").length;
  const totalCustomers = state.customers?.length || 0;

  const stats = [
    { label: "คำขอวันนี้", value: todayRequests },
    { label: "คิวยืนยันวันนี้", value: todayAppointments },
    { label: "รอติดต่อ", value: waiting },
    { label: "ลูกค้าที่บันทึก", value: totalCustomers }
  ];

  ownerStats.innerHTML = "";
  stats.forEach((stat) => {
    const item = document.createElement("div");
    item.className = "stat-chip";
    item.innerHTML = `
      <strong>${stat.value}</strong>
      <span>${stat.label}</span>
    `;
    ownerStats.append(item);
  });
}

function renderOwnerLists() {
  const items = [
    ...state.requests.map((item) => ({ ...item, kind: "request" })),
    ...state.appointments.map((item) => ({ ...item, kind: "appointment" }))
  ];

  requestList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "ยังไม่มีคำขอจองหรือคิววันนี้";
    requestList.append(empty);
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = item.status === "confirmed" ? "queue-card confirmed" : "queue-card";
    const statusText = statusLabel(item.status);
    const sourceText = sourceLabel(item.source);
    card.innerHTML = `
      <div class="queue-top">
        <div>
          <strong>${escapeHtml(item.customerName)}</strong>
          <p class="hint">${escapeHtml(item.contact)}</p>
        </div>
        <span class="status-pill">${statusText}</span>
      </div>
      <div class="queue-meta">
        <span>${thaiDate(item.bookingDate || today)}</span>
        <span>${escapeHtml(item.timeWindow)}</span>
        <span>${escapeHtml(item.services.join(", "))}</span>
        <span>${sourceText}</span>
        ${item.googleCalendarEventId ? "<span>เข้าปฏิทินแล้ว</span>" : ""}
      </div>
      ${item.note ? `<p class="hint">${escapeHtml(item.note)}</p>` : ""}
    `;

    if (item.kind === "request") {
      const actions = document.createElement("div");
      actions.className = "queue-actions";
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "primary-button";
      confirm.textContent = "ยืนยันคิว";
      confirm.disabled = busyWindows(item.bookingDate || today).has(item.timeWindow);
      confirm.addEventListener("click", () => confirmRequest(item.id));

      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "secondary-button";
      reject.textContent = "ปฏิเสธ";
      reject.addEventListener("click", () => rejectRequest(item.id));

      const contacted = document.createElement("button");
      contacted.type = "button";
      contacted.className = "secondary-button";
      contacted.textContent = "โทรกลับแล้ว";
      contacted.disabled = item.status === "contacted";
      contacted.addEventListener("click", () => updateRequestStatus(item.id, "contacted"));

      const noAnswer = document.createElement("button");
      noAnswer.type = "button";
      noAnswer.className = "secondary-button";
      noAnswer.textContent = "ลูกค้าไม่ตอบ";
      noAnswer.disabled = item.status === "no_answer";
      noAnswer.addEventListener("click", () => updateRequestStatus(item.id, "no_answer"));

      actions.append(confirm, reject, contacted, noAnswer);
      card.append(actions);
    }

    if (item.kind === "appointment") {
      const actions = document.createElement("div");
      actions.className = "queue-actions";

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "secondary-button";
      cancel.textContent = "ยกเลิกคิว";
      cancel.addEventListener("click", () => cancelAppointment(item.id));

      actions.append(cancel);
      card.append(actions);
    }

    requestList.append(card);
  });
}

function renderCustomers() {
  if (!customerList) return;
  customerList.innerHTML = "";

  const customers = state.customers || [];
  if (!customers.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "ยังไม่มีข้อมูลลูกค้า";
    customerList.append(empty);
    return;
  }

  customers.slice(0, 8).forEach((customer) => {
    const item = document.createElement("div");
    item.className = "customer-item";
    item.innerHTML = `
      <span>
        <strong>${escapeHtml(customer.name || "ลูกค้า")}</strong>
        <small>${escapeHtml(customer.contact || customer.note || "ไม่มีช่องทางติดต่อ")}</small>
      </span>
    `;
    customerList.append(item);
  });
}

function renderShopSettings() {
  const shop = state.shop || {};
  if (!shopForm) return;
  shopNameInput.value = shop.name || "Fah Nail";
  shopPhoneInput.value = shop.phone || "";
  shopLineInput.value = shop.lineId || "";
  shopFacebookInput.value = shop.facebookPage || "";
}

function rememberCustomerFromBooking(booking, note = "") {
  const customer = {
    id: `CUS-${Date.now()}`,
    name: booking.customerName,
    contact: booking.contact,
    note,
    createdAt: booking.bookingDate || today
  };
  state.customers = [customer, ...(state.customers || [])].slice(0, 30);
}

function renderOwnerServices() {
  ownerServiceList.innerHTML = "";
  state.services.forEach((service) => {
    const row = document.createElement("div");
    row.className = "service-item";
    row.innerHTML = `<span>${escapeHtml(service.name)}</span>`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "icon-button";
    toggle.textContent = service.active ? "เปิด" : "ปิด";
    toggle.title = "เปิดหรือปิดบริการ";
    toggle.addEventListener("click", () => {
      toggleService(service);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.textContent = "-";
    remove.title = "ลบบริการ";
    remove.addEventListener("click", () => removeService(service.id));

    row.append(toggle, remove);
    ownerServiceList.append(row);
  });
}

async function toggleService(service) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.updateService(service.id, { active: !service.active });
      await reloadAfterRemote(service.active ? "ปิดบริการแล้ว" : "เปิดบริการแล้ว");
      return;
    }

    service.active = !service.active;
    saveState();
    render();
  } catch (error) {
    console.warn("Toggle service failed", error);
    showToast("ยังอัปเดตบริการไม่สำเร็จ");
  }
}

async function removeService(serviceId) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.deleteService(serviceId);
      await reloadAfterRemote("ลบบริการแล้ว");
      return;
    }

    state.services = state.services.filter((item) => item.id !== serviceId);
    saveState();
    render();
  } catch (error) {
    console.warn("Remove service failed", error);
    showToast("ยังลบบริการไม่สำเร็จ");
  }
}

function renderManualOptions() {
  const busy = busyWindows(selectedManualDate());
  const date = selectedManualDate();
  manualTime.innerHTML = "";
  manualService.innerHTML = "";

  activeServices().forEach((service) => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = service.name;
    manualService.append(option);
  });

  if (isDayClosed(date)) {
    const option = document.createElement("option");
    option.value = "";
    option.disabled = true;
    option.selected = true;
    option.textContent = "วันนี้ปิดรับจอง";
    manualTime.append(option);
    return;
  }

  timeSlots().forEach((slot) => {
    const timeWindow = timeSlotLabel(slot);
    const option = document.createElement("option");
    option.value = timeWindow;
    option.disabled = busy.has(timeWindow) || !slot.active;
    option.textContent = busy.has(timeWindow) ? `${timeWindow} ไม่ว่าง` : `${timeWindow}${slot.active ? "" : " ปิดรับจอง"}`;
    manualTime.append(option);
  });
}

function renderTimeManager() {
  const date = selectedScheduleDate();
  closedDayToggle.checked = isDayClosed(date);
  ownerTimeSlotList.innerHTML = "";

  timeSlots().forEach((slot) => {
    const row = document.createElement("div");
    row.className = slot.active ? "time-slot-item" : "time-slot-item off";
    row.innerHTML = `
      <span>
        <strong>${timeSlotLabel(slot)}</strong>
        <small>${slot.active ? "เปิดรับจอง" : "ปิดรับจอง"}</small>
      </span>
    `;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "icon-button";
    toggle.textContent = slot.active ? "เปิด" : "ปิด";
    toggle.title = "เปิดหรือปิดช่วงเวลา";
    toggle.addEventListener("click", () => toggleTimeSlot(slot));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.textContent = "-";
    remove.title = "ลบช่วงเวลา";
    remove.addEventListener("click", () => removeTimeSlot(slot.id));

    row.append(toggle, remove);
    ownerTimeSlotList.append(row);
  });
}

async function toggleTimeSlot(slot) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.updateTimeSlot(slot.id, { active: !slot.active });
      await reloadAfterRemote(slot.active ? "ปิดช่วงเวลานี้แล้ว" : "เปิดช่วงเวลานี้แล้ว");
      return;
    }

    slot.active = !slot.active;
    saveState();
    render();
    showToast(slot.active ? "เปิดช่วงเวลานี้แล้ว" : "ปิดช่วงเวลานี้แล้ว");
  } catch (error) {
    console.warn("Toggle time slot failed", error);
    showToast("ยังอัปเดตช่วงเวลาไม่สำเร็จ");
  }
}

async function removeTimeSlot(slotId) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.deleteTimeSlot(slotId);
      await reloadAfterRemote("ลบช่วงเวลาแล้ว");
      return;
    }

    state.timeSlots = state.timeSlots.filter((item) => item.id !== slotId);
    saveState();
    render();
    showToast("ลบช่วงเวลาแล้ว");
  } catch (error) {
    console.warn("Remove time slot failed", error);
    showToast("ยังลบช่วงเวลาไม่สำเร็จ");
  }
}

function renderCalendarIntegration() {
  const integration = state.calendarIntegration || defaultState.calendarIntegration;
  calendarSelect.value = integration.calendarId || "fah-nail-main";
  syncCalendarButton.disabled = !integration.connected;
  disconnectCalendarButton.disabled = !integration.connected;

  if (integration.connected) {
    calendarStatus.className = "calendar-status connected";
    calendarStatus.innerHTML = `
      <strong>เชื่อมต่อแล้ว</strong>
      <span>${escapeHtml(integration.calendarName)} · ${escapeHtml(integration.accountEmail)}</span>
    `;
    connectCalendarButton.textContent = "เปลี่ยนปฏิทิน";
    return;
  }

  calendarStatus.className = "calendar-status";
  calendarStatus.innerHTML = `
    <strong>ยังไม่ได้เชื่อมต่อ</strong>
    <span>เมื่อยืนยันคิวแล้ว ระบบจะส่งเข้าปฏิทินของร้าน</span>
  `;
  connectCalendarButton.textContent = "เชื่อมต่อปฏิทิน";
}

async function confirmRequest(id) {
  const request = state.requests.find((item) => item.id === id);
  if (!request) return;
  const requestSlot = timeSlots().find((slot) => timeSlotLabel(slot) === request.timeWindow);

  if (!requestSlot || !isSlotOpen(request.bookingDate || today, requestSlot)) {
    showToast("ช่วงเวลานี้ปิดรับจองแล้ว");
    return;
  }

  if (busyWindows(request.bookingDate || today).has(request.timeWindow)) {
    showToast("ช่วงเวลานี้ไม่ว่างแล้ว");
    return;
  }

  try {
    if (remoteMode) {
      await window.FahNailSupabase.confirmBookingRequest(request, currentShopSlug);
      await reloadAfterRemote("ยืนยันคิวแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Confirm request failed", error);
    showToast("ยังยืนยันคิวไม่สำเร็จ");
    return;
  }

  state.appointments.push(syncCalendarEvent({
    id: `APT-${Date.now()}`,
    customerName: request.customerName,
    contact: request.contact,
    services: request.services,
    bookingDate: request.bookingDate || today,
    timeWindow: request.timeWindow,
    status: "confirmed",
    source: "customer_request"
  }));
  rememberCustomerFromBooking(request, request.note || "คำขอจองจากลูกค้า");
  state.requests = state.requests.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("ยืนยันคิวแล้ว");
}

async function rejectRequest(id) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.rejectBookingRequest(id, currentShopSlug);
      await reloadAfterRemote("ปฏิเสธคำขอจองแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Reject request failed", error);
    showToast("ยังปฏิเสธคำขอจองไม่สำเร็จ");
    return;
  }

  state.requests = state.requests.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("ปฏิเสธคำขอจองแล้ว");
}

async function updateRequestStatus(id, status) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.updateBookingRequestStatus(id, status, currentShopSlug);
      await reloadAfterRemote(status === "contacted" ? "บันทึกว่าโทรกลับแล้ว" : "บันทึกว่าลูกค้าไม่ตอบ");
      return;
    }

    const request = state.requests.find((item) => item.id === id);
    if (request) request.status = status;
    saveState();
    render();
    showToast(status === "contacted" ? "บันทึกว่าโทรกลับแล้ว" : "บันทึกว่าลูกค้าไม่ตอบ");
  } catch (error) {
    console.warn("Update request status failed", error);
    showToast("ยังอัปเดตสถานะไม่สำเร็จ");
  }
}

manualForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(manualForm);
  const bookingDateValue = formData.get("bookingDate");
  const timeWindow = formData.get("timeWindow");
  const slot = timeSlots().find((item) => timeSlotLabel(item) === timeWindow);

  if (!slot || !isSlotOpen(bookingDateValue, slot)) {
    showToast("ช่วงเวลานี้ปิดรับจองแล้ว");
    return;
  }

  if (busyWindows(bookingDateValue).has(timeWindow)) {
    showToast("ช่วงเวลานี้ไม่ว่างแล้ว");
    return;
  }

  const selectedService = state.services.find((service) => service.id === formData.get("serviceId"));
  const appointment = {
    id: `APT-${Date.now()}`,
    customerName: formData.get("customerName").trim(),
    contact: formData.get("contact").trim(),
    services: [selectedService?.name || formData.get("serviceId")],
    serviceId: formData.get("serviceId"),
    bookingDate: bookingDateValue,
    timeWindow,
    status: "confirmed",
    source: formData.get("source") || "admin"
  };

  try {
    if (remoteMode) {
      await window.FahNailSupabase.createOwnerAppointment(appointment, currentShopSlug);
      manualForm.reset();
      manualDate.value = today;
      await reloadAfterRemote("บันทึกคิวโดยเจ้าของร้านแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Create owner appointment failed", error);
    showToast("ยังบันทึกคิวไม่สำเร็จ");
    return;
  }

  state.appointments.unshift(syncCalendarEvent(appointment));
  rememberCustomerFromBooking(appointment, "เจ้าของร้านลงคิวเอง");

  manualForm.reset();
  manualDate.value = today;
  saveState();
  render();
  showToast("บันทึกคิวโดยเจ้าของร้านแล้ว");
});

serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(serviceForm);
  const serviceName = formData.get("serviceName").trim();

  if (!serviceName) return;

  try {
    if (remoteMode) {
      await window.FahNailSupabase.createService(serviceName, currentShopSlug);
      serviceForm.reset();
      await reloadAfterRemote("เพิ่มบริการแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Create service failed", error);
    showToast("ยังเพิ่มบริการไม่สำเร็จ");
    return;
  }

  state.services.push({ id: `service-${Date.now()}`, name: serviceName, active: true });
  serviceForm.reset();
  saveState();
  render();
  showToast("เพิ่มบริการแล้ว");
});

shopForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(shopForm);
  const changes = {
    name: formData.get("shopName").trim(),
    phone: formData.get("shopPhone").trim(),
    lineId: formData.get("shopLine").trim(),
    facebookPage: formData.get("shopFacebook").trim()
  };

  if (!changes.name) {
    showToast("กรุณากรอกชื่อร้าน");
    return;
  }

  try {
    if (remoteMode) {
      await window.FahNailSupabase.updateShopSettings(changes, currentShopSlug);
      await reloadAfterRemote("บันทึกข้อมูลร้านแล้ว");
      return;
    }

    state.shop = { ...(state.shop || { slug: currentShopSlug }), ...changes };
    saveState();
    updateRouteLinks();
    render();
    showToast("บันทึกข้อมูลร้านแล้ว");
  } catch (error) {
    console.warn("Update shop settings failed", error);
    showToast("ยังบันทึกข้อมูลร้านไม่สำเร็จ");
  }
});

slotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(slotForm);
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  if (startTime >= endTime) {
    showToast("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
    return;
  }

  const exists = timeSlots().some((slot) => slot.startTime === startTime && slot.endTime === endTime);
  if (exists) {
    showToast("มีช่วงเวลานี้อยู่แล้ว");
    return;
  }

  try {
    if (remoteMode) {
      await window.FahNailSupabase.createTimeSlot(startTime, endTime, currentShopSlug);
      slotForm.reset();
      await reloadAfterRemote("เพิ่มช่วงเวลารับจองแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Create time slot failed", error);
    showToast("ยังเพิ่มช่วงเวลาไม่สำเร็จ");
    return;
  }

  state.timeSlots.push({ id: `slot-${Date.now()}`, startTime, endTime, active: true });
  state.timeSlots = normalizeTimeSlots(state.timeSlots);
  slotForm.reset();
  saveState();
  render();
  showToast("เพิ่มช่วงเวลารับจองแล้ว");
});

document.getElementById("seed-button").addEventListener("click", () => {
  if (remoteMode) {
    showToast("โหมดข้อมูลจริงไม่เติมข้อมูลตัวอย่าง");
    return;
  }

  state = structuredClone(defaultState);
  saveState();
  render();
  showToast("เติมข้อมูลตัวอย่างแล้ว");
});

googleLoginButton.addEventListener("click", async () => {
  try {
    await window.FahNailSupabase?.signInWithGoogle();
  } catch (error) {
    console.warn("Google login failed", error);
    showToast("ยังเข้าสู่ระบบ Google ไม่สำเร็จ");
  }
});

demoLoginButton.addEventListener("click", () => {
  showOwnerApp("เปิดหลังบ้านโหมดตัวอย่าง");
});

logoutButton.addEventListener("click", async () => {
  try {
    await window.FahNailSupabase?.signOut();
  } catch (error) {
    console.warn("Sign out failed", error);
  }
  showAuthPanel(!window.FahNailSupabase?.isConfigured());
});

manualDate.addEventListener("change", renderManualOptions);
scheduleDate.addEventListener("change", renderTimeManager);

closedDayToggle.addEventListener("change", async () => {
  const date = selectedScheduleDate();

  try {
    if (remoteMode) {
      await window.FahNailSupabase.setDayClosed(date, closedDayToggle.checked, currentShopSlug);
      await reloadAfterRemote(closedDayToggle.checked ? "ปิดรับจองทั้งวันแล้ว" : "เปิดรับจองวันนี้แล้ว");
      return;
    }
  } catch (error) {
    console.warn("Set closed day failed", error);
    showToast("ยังอัปเดตวันหยุดไม่สำเร็จ");
    await loadRemoteOwnerState();
    render();
    return;
  }

  if (closedDayToggle.checked) {
    if (!state.closedDates.includes(date)) state.closedDates.push(date);
  } else {
    state.closedDates = state.closedDates.filter((item) => item !== date);
  }
  saveState();
  render();
  showToast(closedDayToggle.checked ? "ปิดรับจองทั้งวันแล้ว" : "เปิดรับจองวันนี้แล้ว");
});

async function cancelAppointment(id) {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.cancelAppointment(id, currentShopSlug);
      await reloadAfterRemote("ยกเลิกคิวแล้ว");
      return;
    }

    const appointment = state.appointments.find((item) => item.id === id);
    if (appointment) appointment.status = "cancelled";
    saveState();
    render();
    showToast("ยกเลิกคิวแล้ว");
  } catch (error) {
    console.warn("Cancel appointment failed", error);
    showToast("ยังยกเลิกคิวไม่สำเร็จ");
  }
}

connectCalendarButton.addEventListener("click", async () => {
  const selectedOption = calendarSelect.selectedOptions[0];

  try {
    if (remoteMode) {
      await window.FahNailSupabase.setCalendarIntegration(calendarSelect.value, currentShopSlug);
      await reloadAfterRemote("บันทึกค่าปฏิทินแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Set calendar integration failed", error);
    showToast("ยังบันทึกค่าปฏิทินไม่สำเร็จ");
    return;
  }

  state.calendarIntegration = {
    connected: true,
    provider: "google",
    accountEmail: "fahnail.shop@gmail.com",
    calendarId: calendarSelect.value,
    calendarName: selectedOption.textContent
  };
  saveState();
  render();
  showToast("เชื่อมต่อ Google Calendar แล้ว");
});

disconnectCalendarButton.addEventListener("click", async () => {
  try {
    if (remoteMode) {
      await window.FahNailSupabase.removeCalendarIntegration(currentShopSlug);
      await reloadAfterRemote("ยกเลิกค่าปฏิทินแล้ว");
      return;
    }
  } catch (error) {
    console.warn("Remove calendar integration failed", error);
    showToast("ยังยกเลิกค่าปฏิทินไม่สำเร็จ");
    return;
  }

  state.calendarIntegration = structuredClone(defaultState.calendarIntegration);
  saveState();
  render();
  showToast("ยกเลิกการเชื่อมต่อปฏิทินแล้ว");
});

syncCalendarButton.addEventListener("click", () => {
  if (remoteMode) {
    showToast("ขั้นต่อไปต้องต่อ Google OAuth/Edge Function ก่อนส่งเข้าปฏิทินจริง");
    return;
  }

  if (!state.calendarIntegration.connected) {
    showToast("กรุณาเชื่อมต่อ Google Calendar ก่อน");
    return;
  }

  state.appointments = state.appointments.map((appointment) => {
    if (appointment.status !== "confirmed" || appointment.googleCalendarEventId) return appointment;
    return syncCalendarEvent(appointment);
  });
  saveState();
  render();
  showToast("ส่งคิวที่ยืนยันแล้วเข้าปฏิทินแล้ว");
});

function syncCalendarEvent(appointment) {
  const integration = state.calendarIntegration || defaultState.calendarIntegration;
  if (!integration.connected) return appointment;

  return {
    ...appointment,
    googleCalendarEventId: `gcal-${appointment.id}`,
    googleCalendarName: integration.calendarName
  };
}

function sourceLabel(source) {
  return {
    customer_request: "ลูกค้าจองเอง",
    walk_in: "หน้าร้าน",
    phone: "โทรจอง",
    line: "LINE",
    facebook: "Facebook",
    admin: "เจ้าของร้านลงเอง"
  }[source] || "หลังบ้าน";
}

function statusLabel(status) {
  return {
    pending_request: "รอยืนยัน",
    contacted: "โทรกลับแล้ว",
    no_answer: "ลูกค้าไม่ตอบ",
    confirmed: "ยืนยันแล้ว",
    rejected: "ปฏิเสธแล้ว",
    cancelled: "ยกเลิกแล้ว"
  }[status] || "รอยืนยัน";
}

function thaiDate(value) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

initOwnerAccess();
