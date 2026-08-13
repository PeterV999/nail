const STORAGE_KEY = "fah-nail-booking-demo";
const OWNER_TAB_KEY = "fah-nail-owner-tab-v2";
const OWNER_UI_VERSION_KEY = "fah-nail-owner-ui-version";
const OWNER_UI_VERSION = "2026-08-10-release-guardrails";
const NOTIFICATION_SOUND_ENABLED_KEY = "fah-nail-notification-sound-enabled";
const SOUNDED_NOTIFICATION_KEY = "fah-nail-notification-sounded";
const SYSTEM_NOTIFIED_KEY = "fah-nail-system-notified";
const REMINDER_WINDOW_MINUTES = 30;
const REMINDER_REFRESH_MS = 60 * 1000;
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
    facebookPage: "",
    tagline: "",
    logoPath: "",
    logoUrl: ""
  },
  timeSlots: defaultTimeSlots,
  closedDates: [],
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
      contact: "0891234567",
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
      contact: "0891234567",
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
let currentOwnerEmail = "";
let currentOwnerRole = "";
let currentMemberShops = [];
let calendarMonthStart = new Date(`${today}T00:00:00`);
calendarMonthStart.setDate(1);
let notificationSoundEnabled = localStorage.getItem(NOTIFICATION_SOUND_ENABLED_KEY) === "1";
let notificationAudioContext = null;
let notificationReminderTimer = null;
const soundedNotificationKeys = new Set(loadSoundedNotificationKeys());
const systemNotifiedKeys = new Set(loadStoredKeyList(SYSTEM_NOTIFIED_KEY));

const ownerAuthPanel = document.getElementById("owner-auth-panel");
const ownerApp = document.getElementById("owner-app");
const googleLoginButton = document.getElementById("google-login-button");
const demoLoginButton = document.getElementById("demo-login-button");
const logoutButton = document.getElementById("logout-button");
const ownerAccount = document.getElementById("owner-account");
const authCopy = document.getElementById("auth-copy");
const authStatus = document.getElementById("auth-status");
const requestList = document.getElementById("request-list");
const ownerConnectionGrid = document.getElementById("owner-connection-grid");
const ownerStats = document.getElementById("owner-stats");
const ownerTabsMenu = document.querySelector(".owner-tabs");
const ownerTabs = Array.from(document.querySelectorAll("[data-owner-tab]"));
const ownerTabPanels = Array.from(document.querySelectorAll("[data-owner-panel]"));
const ownerAddToggle = document.getElementById("owner-add-toggle");
const ownerAddMenu = document.getElementById("owner-add-menu");
const notificationToggle = document.getElementById("notification-toggle");
const notificationBadge = document.getElementById("notification-badge");
const notificationMenu = document.getElementById("notification-menu");
const notificationCountText = document.getElementById("notification-count-text");
const notificationList = document.getElementById("notification-list");
const notificationSoundToggle = document.getElementById("notification-sound-toggle");
const ownerServiceList = document.getElementById("owner-service-list");
const manualTime = document.getElementById("manual-time");
const manualService = document.getElementById("manual-service");
const manualDate = document.getElementById("manual-date");
const scheduleDate = document.getElementById("schedule-date");
const closedDayToggle = document.getElementById("closed-day-toggle");
const shopScheduleList = document.getElementById("shop-schedule-list");
const bookingCalendar = document.getElementById("booking-calendar");
const manualForm = document.getElementById("manual-form");
const serviceForm = document.getElementById("service-form");
const slotForm = document.getElementById("slot-form");
const shopForm = document.getElementById("shop-form");
const shopNameInput = document.getElementById("shop-name");
const shopTaglineInput = document.getElementById("shop-tagline");
const shopPhoneInput = document.getElementById("shop-phone");
const shopLineInput = document.getElementById("shop-line");
const shopFacebookInput = document.getElementById("shop-facebook");
const shopLogoPreview = document.getElementById("shop-logo-preview");
const shopLogoInput = document.getElementById("shop-logo-input");
const shopLogoUploadButton = document.getElementById("shop-logo-upload-button");
const shopLogoRemoveButton = document.getElementById("shop-logo-remove-button");
const shopLogoStatus = document.getElementById("shop-logo-status");
const ownerTimeSlotList = document.getElementById("owner-time-slot-list");
const pageLoader = document.getElementById("page-loader");
const pageLoaderTitle = document.getElementById("page-loader-title");
const pageLoaderCopy = document.getElementById("page-loader-copy");
const toast = document.getElementById("toast");
const ownerDialog = document.getElementById("owner-dialog");
const ownerDialogBadge = document.getElementById("owner-dialog-badge");
const ownerDialogTitle = document.getElementById("owner-dialog-title");
const ownerDialogMessage = document.getElementById("owner-dialog-message");
const ownerDialogSummary = document.getElementById("owner-dialog-summary");
const ownerDialogCancel = document.getElementById("owner-dialog-cancel");
const ownerDialogConfirm = document.getElementById("owner-dialog-confirm");
let ownerDialogResolve = null;
let ownerDialogResult = false;
const ownerTabsMobileQuery = window.matchMedia?.("(max-width: 620px)");

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
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  if (remoteMode) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setPageLoading(active, title = "", copy = "") {
  if (!pageLoader) return;
  if (title && pageLoaderTitle) pageLoaderTitle.textContent = title;
  if (copy && pageLoaderCopy) pageLoaderCopy.textContent = copy;
  pageLoader.hidden = !active;
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
  renderOwnerConnection();
  renderOwnerStats();
  renderNotifications();
  renderOwnerLists();
  renderOwnerServices();
  renderManualOptions();
  renderTimeManager();
  renderShopSchedule();
  renderBookingCalendar();
  renderShopSettings();
}

function renderOwnerConnection() {
  if (!ownerConnectionGrid) return;

  const memberShopText = currentMemberShops.length
    ? currentMemberShops.map((shop) => shop.name || shop.slug).join(", ")
    : remoteMode ? "เฉพาะร้านนี้" : "โหมดตัวอย่าง";

  ownerConnectionGrid.innerHTML = `
    <div class="connection-card">
      <span>ร้านของบัญชีนี้</span>
      <strong>${escapeHtml(memberShopText)}</strong>
    </div>
    <div class="connection-card connected">
      <span>ตารางคิว</span>
      <strong>พร้อมใช้งาน</strong>
      <small>คิวที่ยืนยันแล้วจะแสดงทันที</small>
    </div>
  `;
}

async function initOwnerAccess() {
  setPageLoading(true, "กำลังโหลดหลังบ้านร้าน", "กำลังตรวจสิทธิ์และดึงคิวล่าสุด");
  manualDate.value = today;
  scheduleDate.value = today;
  manualDate.min = today;
  scheduleDate.min = today;

  if (shouldAutoOpenDemo()) {
    openDemoOwnerApp("");
    return;
  }

  try {
    const authState = await window.FahNailSupabase?.ownerSession(currentShopSlug);
    if (authState?.configured && authState.session && authState.member) {
      remoteMode = true;
      currentOwnerEmail = cleanOwnerEmail(authState.user?.email || authState.session.user?.email || "");
      currentOwnerRole = authState.member.role || "owner";
      currentMemberShops = await safeListMemberShops();
      await loadRemoteOwnerState();
      showOwnerApp("");
      return;
    }

    if (authState?.configured && authState.session && !authState.member) {
      showAuthPanel(false);
      const urls = window.FahNailSupabase?.shopUrls?.(currentShopSlug) || { register: "/register/" };
      authStatus.innerHTML = `บัญชีนี้ยังไม่มีสิทธิ์หลังบ้านสำหรับร้านนี้ <a href="${urls.register}">ลงทะเบียนร้านใหม่</a>`;
      return;
    }

    if (authState?.configured) {
      showAuthPanel(isLocalPreview());
      return;
    }
  } catch (error) {
    console.warn("Owner auth check failed", error);
    authStatus.textContent = isLocalPreview()
      ? "ยังเชื่อมข้อมูลจริงไม่สำเร็จ ใช้โหมดตัวอย่างได้เฉพาะในเครื่อง"
      : "ยังตรวจสอบสิทธิ์เจ้าของร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }

  showAuthPanel(isLocalPreview());
}

async function loadRemoteOwnerState() {
  const remoteState = await window.FahNailSupabase?.loadOwnerState(defaultState, currentShopSlug);
  if (!remoteState) return;
  state = remoteState;
  currentShopSlug = remoteState.shop?.slug || currentShopSlug;
}

function showAuthPanel(allowDemo) {
  stopReminderWatcher();
  setPageLoading(false);
  const configured = Boolean(window.FahNailSupabase?.isConfigured?.());
  ownerAuthPanel.hidden = false;
  ownerApp.hidden = true;
  if (ownerAddToggle) ownerAddToggle.hidden = true;
  if (ownerAddMenu) ownerAddMenu.hidden = true;
  if (notificationToggle) notificationToggle.hidden = true;
  if (notificationSoundToggle) notificationSoundToggle.hidden = true;
  if (notificationMenu) notificationMenu.hidden = true;
  demoLoginButton.hidden = !allowDemo;
  googleLoginButton.hidden = !configured;

  authCopy.textContent = allowDemo
    ? "เปิดดูต้นแบบในเครื่องได้ทันที หรือเข้าสู่ระบบ Google เพื่อดูข้อมูลจริง"
    : "กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของร้าน";
  authStatus.textContent = allowDemo
    ? "โหมดตัวอย่างใช้ข้อมูลในเครื่องสำหรับดู layout เท่านั้น"
    : "ข้อมูลหลังบ้านจะแสดงเฉพาะบัญชีที่มีสิทธิ์ดูแลร้าน";
}

function showOwnerApp(message) {
  setPageLoading(false);
  ownerAuthPanel.hidden = true;
  ownerApp.hidden = false;
  if (ownerAddToggle) ownerAddToggle.hidden = false;
  if (notificationToggle) notificationToggle.hidden = false;
  if (notificationSoundToggle) notificationSoundToggle.hidden = false;
  logoutButton.hidden = !window.FahNailSupabase?.isConfigured();
  demoLoginButton.hidden = true;
  if (ownerAccount) {
    const ownerEmail = cleanOwnerEmail(currentOwnerEmail);
    currentOwnerEmail = ownerEmail;
    ownerAccount.textContent = ownerEmail
      ? `เข้าสู่ระบบ: ${ownerEmail}`
      : remoteMode
        ? "เข้าสู่ระบบเจ้าของร้านแล้ว"
        : "โหมดตัวอย่างในเครื่อง";
  }
  updateRouteLinks();
  render();
  startReminderWatcher();
  if (message) showToast(message);
}

function cleanOwnerEmail(value) {
  return String(value || "").replace(/[\s\u200B-\u200D\uFEFF]+/g, "");
}

function isLocalPreview() {
  return ["file:", "http:"].includes(window.location.protocol)
    && ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
}

function shouldAutoOpenDemo() {
  const params = new URLSearchParams(window.location.search);
  return isLocalPreview() && params.get("real-login") !== "1";
}

function openDemoOwnerApp(message = "เปิดหลังบ้านโหมดตัวอย่าง") {
  remoteMode = false;
  state = withDemoPreviewData(state);
  saveState();
  currentOwnerEmail = "";
  currentOwnerRole = "demo";
  currentMemberShops = [];
  showOwnerApp(message);
}

function withDemoPreviewData(currentState) {
  const nextState = {
    ...structuredClone(defaultState),
    ...currentState,
    services: currentState.services?.length ? currentState.services : structuredClone(defaultState.services),
    timeSlots: currentState.timeSlots?.length ? normalizeTimeSlots(currentState.timeSlots) : structuredClone(defaultTimeSlots),
    closedDates: currentState.closedDates || []
  };

  if (!nextState.requests?.length) {
    nextState.requests = structuredClone(defaultState.requests);
  }

  const hasCallableAppointment = nextState.appointments?.some((appointment) => (
    appointment.status === "confirmed" && appointment.customerName && phoneHref(appointment.contact)
  ));
  if (!hasCallableAppointment) {
    nextState.appointments = structuredClone(defaultState.appointments);
  }

  if (!nextState.customers?.length) {
    nextState.customers = structuredClone(defaultState.customers);
  }

  return nextState;
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
  const brandMark = document.querySelector(".brand-mark");
  const brandName = document.querySelector(".brand strong");
  const ownerEyebrow = document.querySelector(".section-head .eyebrow");
  if (customerLink) customerLink.href = urls.booking;
  if (brand) brand.href = urls.dashboard;
  renderLogoMark(brandMark, shop);
  if (brandName) brandName.textContent = shop.name || "Fah Nail";
  if (ownerEyebrow) ownerEyebrow.textContent = shop.name || "หลังบ้าน";
  document.title = `หลังบ้าน ${shop.name || "Fah Nail"}`;
}

document.querySelector(".brand")?.addEventListener("click", (event) => {
  if (!ownerApp || ownerApp.hidden) return;
  event.preventDefault();
  activateOwnerTab("queue");
  setOwnerAddMenuOpen(false);
  setNotificationMenuOpen(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function shopInitials(name = "Fah Nail") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (initials || "FN").toUpperCase();
}

function renderLogoMark(element, shop) {
  if (!element) return;
  element.classList.remove("has-logo", "app-logo-mark");
  delete element.dataset.appLogo;
  element.textContent = shopInitials(shop?.name);

  if (!shop?.logoUrl) return;
  element.classList.add("has-logo");
  element.innerHTML = `<img src="${escapeHtml(shop.logoUrl)}" alt="">`;
  element.querySelector("img")?.addEventListener("error", () => {
    element.classList.remove("has-logo");
    element.textContent = shopInitials(shop?.name);
  });
}

function renderShopLogoControls() {
  const shop = state.shop || {};
  renderLogoMark(shopLogoPreview, shop);
  if (shopLogoStatus) {
    shopLogoStatus.textContent = shop.logoUrl
      ? "โลโก้นี้จะแสดงในหน้าจองและหลังบ้าน"
      : "PNG, JPG หรือ WebP ไม่เกิน 2MB";
  }
  if (shopLogoRemoveButton) shopLogoRemoveButton.disabled = !remoteMode || !shop.logoPath;
}

async function reloadAfterRemote(message) {
  setPageLoading(true, "กำลังโหลดข้อมูลล่าสุด", "กำลังดึงคิวและสถานะร้านจากฐานข้อมูล");
  try {
    await loadRemoteOwnerState();
    render();
    if (message) showToast(message);
  } finally {
    setPageLoading(false);
  }
}

async function safeListMemberShops() {
  try {
    return await window.FahNailSupabase?.listMemberShops?.() || [];
  } catch (error) {
    console.warn("List member shops failed", error);
    return [];
  }
}

function renderOwnerStats() {
  if (!ownerStats) return;
  const todayRequests = state.requests.filter((item) => item.bookingDate === today).length;
  const todayAppointments = state.appointments.filter((item) => item.bookingDate === today && item.status === "confirmed").length;
  const totalCustomers = state.customers?.length || 0;

  const stats = [
    { label: "คำขอวันนี้", value: todayRequests },
    { label: "คิวยืนยันวันนี้", value: todayAppointments },
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

function buildNotifications() {
  const pendingRequests = state.requests
    .filter((item) => item.status === "pending_request")
    .map((item) => ({
      tone: "warn",
      title: "คำขอใหม่",
      detail: `${item.customerName} · ${thaiDate(item.bookingDate || today)} · ${item.timeWindow}`,
      tab: "queue"
    }));

  const dueSoonAppointments = state.appointments
    .filter((item) => item.status === "confirmed")
    .map((item) => ({ item, minutes: minutesUntilAppointment(item) }))
    .filter(({ minutes }) => minutes >= 0 && minutes <= REMINDER_WINDOW_MINUTES)
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 3)
    .map(({ item, minutes }) => ({
      key: `due-${item.id}-${item.bookingDate}-${item.timeWindow}`,
      sound: true,
      tone: "warn",
      title: "ใกล้ถึงคิว",
      detail: `${item.timeWindow} · ${item.customerName} · อีก ${Math.max(1, Math.round(minutes))} นาที`,
      tab: "calendar"
    }));

  const todayAppointments = state.appointments
    .filter((item) => item.status === "confirmed" && item.bookingDate === today)
    .sort((a, b) => (a.timeWindow || "").localeCompare(b.timeWindow || ""))
    .slice(0, 4)
    .map((item) => ({
      tone: "good",
      title: "คิววันนี้",
      detail: `${item.timeWindow} · ${item.customerName}`,
      tab: "calendar"
    }));

  const upcomingAppointments = state.appointments
    .filter((item) => item.status === "confirmed" && item.bookingDate > today)
    .sort((a, b) => `${a.bookingDate || ""} ${a.timeWindow || ""}`.localeCompare(`${b.bookingDate || ""} ${b.timeWindow || ""}`))
    .slice(0, 2)
    .map((item) => ({
      tone: "",
      title: "คิวถัดไป",
      detail: `${thaiDate(item.bookingDate)} · ${item.timeWindow}`,
      tab: "calendar"
    }));

  return [...pendingRequests, ...dueSoonAppointments, ...todayAppointments, ...upcomingAppointments];
}

function renderNotifications() {
  if (!notificationBadge || !notificationList || !notificationCountText) return;

  const notifications = buildNotifications();
  renderNotificationSoundToggle();
  notificationBadge.textContent = String(notifications.length);
  notificationBadge.hidden = notifications.length === 0;
  notificationCountText.textContent = notifications.length ? `${notifications.length} รายการ` : "ไม่มีรายการใหม่";

  notificationList.innerHTML = "";
  if (!notifications.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state compact";
    empty.textContent = "ยังไม่มีแจ้งเตือนตอนนี้";
    notificationList.append(empty);
    return;
  }

  notifications.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `notification-item ${item.tone}`;
    button.dataset.notificationTab = item.tab;
    button.innerHTML = `
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    `;
    notificationList.append(button);
  });
  playNotificationSoundFor(notifications);
  showSystemNotificationFor(notifications);
}

function renderNotificationSoundToggle() {
  if (!notificationSoundToggle) return;
  notificationSoundToggle.innerHTML = `
    <span aria-hidden="true">${notificationSoundEnabled ? "♪" : "×"}</span>
    <strong>${notificationSoundEnabled ? "เสียงเปิด" : "เสียงปิด"}</strong>
  `;
  notificationSoundToggle.classList.toggle("is-on", notificationSoundEnabled);
  notificationSoundToggle.setAttribute("aria-pressed", String(notificationSoundEnabled));
  notificationSoundToggle.setAttribute("aria-label", notificationSoundEnabled ? "ปิดเสียงแจ้งเตือน" : "เปิดเสียงแจ้งเตือน");
  notificationSoundToggle.title = notificationSoundEnabled
    ? "ปิดเสียงแจ้งเตือน"
    : "เปิดเสียงแจ้งเตือนคิวใกล้ถึง";
}

function parseAppointmentStart(appointment) {
  const startTime = String(appointment?.timeWindow || "").split("-")[0];
  if (!appointment?.bookingDate || !/^\d{2}:\d{2}$/.test(startTime)) return null;
  const date = new Date(`${appointment.bookingDate}T${startTime}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesUntilAppointment(appointment) {
  const start = parseAppointmentStart(appointment);
  if (!start) return Number.POSITIVE_INFINITY;
  return (start.getTime() - Date.now()) / 60000;
}

function loadSoundedNotificationKeys() {
  return loadStoredKeyList(SOUNDED_NOTIFICATION_KEY);
}

function loadStoredKeyList(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rememberSoundedNotifications() {
  localStorage.setItem(SOUNDED_NOTIFICATION_KEY, JSON.stringify([...soundedNotificationKeys].slice(-80)));
}

function rememberSystemNotifications() {
  localStorage.setItem(SYSTEM_NOTIFIED_KEY, JSON.stringify([...systemNotifiedKeys].slice(-80)));
}

function playNotificationSoundFor(notifications) {
  if (!notificationSoundEnabled) return;
  const item = notifications.find((notification) => notification.sound && !soundedNotificationKeys.has(notification.key));
  if (!item) return;

  soundedNotificationKeys.add(item.key);
  rememberSoundedNotifications();

  try {
    playNotificationChime();
  } catch (error) {
    console.warn("Notification sound skipped", error);
  }
}

function showSystemNotificationFor(notifications) {
  if (!notificationSoundEnabled || !("Notification" in window) || Notification.permission !== "granted") return;

  const item = notifications.find((notification) => notification.sound && !systemNotifiedKeys.has(notification.key));
  if (!item) return;

  systemNotifiedKeys.add(item.key);
  rememberSystemNotifications();

  try {
    new Notification(item.title, {
      body: item.detail,
      icon: "/assets/app-icon-192.png",
      tag: item.key,
      silent: true
    });
  } catch (error) {
    console.warn("System notification skipped", error);
  }
}

function getNotificationAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!notificationAudioContext) notificationAudioContext = new AudioContextClass();
  return notificationAudioContext;
}

async function unlockNotificationSound() {
  const audio = getNotificationAudioContext();
  if (!audio) {
    showToast("เครื่องนี้ยังไม่รองรับเสียงแจ้งเตือน");
    return false;
  }

  if (audio.state === "suspended") await audio.resume();
  playNotificationChime();
  await requestSystemNotificationPermission();
  return true;
}

async function requestSystemNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") return;

  try {
    await Notification.requestPermission();
  } catch (error) {
    console.warn("Notification permission skipped", error);
  }
}

function playNotificationChime() {
  const audio = getNotificationAudioContext();
  if (!audio || audio.state === "suspended") return;

  const notes = [
    { frequency: 740, start: 0, duration: 0.14 },
    { frequency: 988, start: 0.15, duration: 0.22 }
  ];

  notes.forEach((note) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const startAt = audio.currentTime + note.start;
    const stopAt = startAt + note.duration;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.14, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  });
}

function startReminderWatcher() {
  if (notificationReminderTimer) return;
  notificationReminderTimer = window.setInterval(() => {
    if (!ownerApp.hidden) renderNotifications();
  }, REMINDER_REFRESH_MS);
}

function stopReminderWatcher() {
  if (!notificationReminderTimer) return;
  window.clearInterval(notificationReminderTimer);
  notificationReminderTimer = null;
}

async function toggleNotificationSound() {
  const nextEnabled = !notificationSoundEnabled;
  if (nextEnabled) {
    const unlocked = await unlockNotificationSound();
    if (!unlocked) return;
  }

  notificationSoundEnabled = nextEnabled;
  localStorage.setItem(NOTIFICATION_SOUND_ENABLED_KEY, notificationSoundEnabled ? "1" : "0");
  renderNotificationSoundToggle();
  showToast(notificationSoundEnabled ? "เปิดเสียงแล้ว" : "ปิดเสียงแล้ว");
}

function phoneHref(contact = "") {
  const normalized = String(contact).replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 ? `tel:${normalized.startsWith("+") ? normalized : digits}` : "";
}

function contactActionsMarkup(contact = "", options = {}) {
  const value = String(contact || "").trim();
  if (!value) return "";

  const { showCopy = true, showPhone = true } = options;
  const callHref = phoneHref(value);
  if (!showCopy && (!showPhone || !callHref)) return "";

  return `
    <div class="contact-actions">
      ${showPhone && callHref ? `<a class="contact-button call" href="${escapeHtml(callHref)}">โทร</a>` : ""}
      ${showCopy ? `<button class="contact-button" type="button" data-copy-contact="${escapeHtml(value)}">คัดลอก</button>` : ""}
    </div>
  `;
}

function serviceText(item) {
  const services = Array.isArray(item?.services) ? item.services.filter(Boolean) : [];
  return services.length ? services.join(", ") : "บริการ";
}

function isPastDate(date = today) {
  return String(date || today) < today;
}

async function copyContact(value) {
  const text = String(value || "").trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast("คัดลอกช่องทางติดต่อแล้ว");
  } catch (error) {
    console.warn("Copy contact failed", error);
    showToast(text);
  }
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
    const pastItem = isPastDate(item.bookingDate || today);
    const card = document.createElement("article");
    card.className = `${item.status === "confirmed" ? "queue-card confirmed" : "queue-card"}${pastItem ? " is-past" : ""}`;
    const statusMarkup = item.kind === "appointment"
      ? `<span class="status-pill">${statusLabel(item.status)}</span>`
      : "";
    const sourceText = sourceLabel(item.source);
    card.innerHTML = `
      <div class="queue-top">
        <div>
          <strong>${escapeHtml(item.customerName || "ลูกค้า")}</strong>
          <p class="hint">${escapeHtml(item.contact || "ไม่มีช่องทางติดต่อ")}</p>
        </div>
        ${statusMarkup}
      </div>
      <div class="queue-meta">
        <span>${thaiDate(item.bookingDate || today)}</span>
        <span>${escapeHtml(item.timeWindow)}</span>
        <span>${escapeHtml(serviceText(item))}</span>
        <span>${sourceText}</span>
      </div>
      ${item.note ? `<p class="hint">${escapeHtml(item.note)}</p>` : ""}
    `;

    if (pastItem) {
      const pastNote = document.createElement("p");
      pastNote.className = "empty-state compact";
      pastNote.textContent = "คิวนี้เลยวันแล้ว";
      card.append(pastNote);
      requestList.append(card);
      return;
    }

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

      actions.append(confirm, reject);
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

function renderShopSettings() {
  const shop = state.shop || {};
  if (!shopForm) return;
  shopNameInput.value = shop.name || "Fah Nail";
  shopTaglineInput.value = shop.tagline || "";
  shopPhoneInput.value = shop.phone || "";
  shopLineInput.value = shop.lineId || "";
  shopFacebookInput.value = shop.facebookPage || "";
  renderShopLogoControls();
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
    row.className = service.active ? "service-item" : "service-item off";
    row.innerHTML = `<span>${escapeHtml(service.name)}</span>`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `icon-button ${service.active ? "toggle-on" : "toggle-off"}`;
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
  const nextActive = !service.active;
  const confirmed = await confirmOwnerAction({
    title: nextActive ? "เปิดบริการนี้หรือไม่" : "ปิดบริการนี้หรือไม่",
    message: nextActive
      ? "ลูกค้าจะเลือกบริการนี้ได้ในหน้าจองคิว"
      : "ลูกค้าจะไม่เห็นบริการนี้ในหน้าจองคิว",
    actionText: nextActive ? "เปิดบริการ" : "ปิดบริการ"
  });
  if (!confirmed) return;

  try {
    if (remoteMode) {
      await window.FahNailSupabase.updateService(service.id, { active: nextActive });
      await reloadAfterRemote(nextActive ? "เปิดบริการแล้ว" : "ปิดบริการแล้ว");
      return;
    }

    service.active = nextActive;
    saveState();
    render();
    showToast(nextActive ? "เปิดบริการแล้ว" : "ปิดบริการแล้ว");
  } catch (error) {
    console.warn("Toggle service failed", error);
    showToast("ยังอัปเดตบริการไม่สำเร็จ");
  }
}

async function removeService(serviceId) {
  const confirmed = await confirmOwnerAction({
    title: "ลบบริการนี้หรือไม่",
    message: "บริการนี้จะหายจากตัวเลือกหน้าจองของลูกค้า",
    actionText: "ลบบริการ"
  });
  if (!confirmed) return;

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
    toggle.className = `icon-button ${slot.active ? "toggle-on" : "toggle-off"}`;
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
  const nextActive = !slot.active;
  const confirmed = await confirmOwnerAction({
    title: nextActive ? "เปิดช่วงเวลานี้หรือไม่" : "ปิดช่วงเวลานี้หรือไม่",
    message: nextActive
      ? "ลูกค้าจะเลือกช่วงเวลานี้ได้ในหน้าจองคิว"
      : "ลูกค้าจะไม่เห็นช่วงเวลานี้ในหน้าจองคิว",
    actionText: nextActive ? "เปิดช่วงเวลา" : "ปิดช่วงเวลา"
  });
  if (!confirmed) return;

  try {
    if (remoteMode) {
      await window.FahNailSupabase.updateTimeSlot(slot.id, { active: nextActive });
      await reloadAfterRemote(nextActive ? "เปิดช่วงเวลานี้แล้ว" : "ปิดช่วงเวลานี้แล้ว");
      return;
    }

    slot.active = nextActive;
    saveState();
    render();
    showToast(nextActive ? "เปิดช่วงเวลานี้แล้ว" : "ปิดช่วงเวลานี้แล้ว");
  } catch (error) {
    console.warn("Toggle time slot failed", error);
    showToast("ยังอัปเดตช่วงเวลาไม่สำเร็จ");
  }
}

async function removeTimeSlot(slotId) {
  const confirmed = await confirmOwnerAction({
    title: "ลบช่วงเวลานี้หรือไม่",
    message: "ช่วงเวลานี้จะหายจากตัวเลือกที่ร้านใช้จัดคิว",
    actionText: "ลบช่วงเวลา"
  });
  if (!confirmed) return;

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

function renderShopSchedule() {
  if (!shopScheduleList) return;
  const upcoming = [...state.appointments]
    .filter((appointment) => appointment.status === "confirmed")
    .sort((a, b) => `${a.bookingDate || ""} ${a.timeWindow || ""}`.localeCompare(`${b.bookingDate || ""} ${b.timeWindow || ""}`))
    .slice(0, 12);

  shopScheduleList.innerHTML = "";

  if (!upcoming.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "ยังไม่มีคิวในตาราง";
    shopScheduleList.append(empty);
    return;
  }

  upcoming.forEach((appointment) => {
    const item = document.createElement("article");
    item.className = "schedule-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(appointment.customerName || "ลูกค้า")}</strong>
        <span>${escapeHtml(serviceText(appointment))}</span>
      </div>
      <div>
        <span>${thaiDate(appointment.bookingDate || today)}</span>
        <strong>${escapeHtml(appointment.timeWindow || "")}</strong>
      </div>
      ${contactActionsMarkup(appointment.contact, { showCopy: !phoneHref(appointment.contact) })}
    `;
    shopScheduleList.append(item);
  });
}

function dayText(value) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function appointmentsByDate() {
  return state.appointments
    .filter((appointment) => appointment.status === "confirmed")
    .reduce((groups, appointment) => {
      const date = appointment.bookingDate || today;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(appointment);
      return groups;
    }, new Map());
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date, offset) {
  const nextDate = new Date(date);
  nextDate.setDate(1);
  nextDate.setMonth(nextDate.getMonth() + offset);
  return nextDate;
}

function monthTitle(date) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function monthDates(monthStart) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => isoDate(new Date(year, month, index + 1)));
}

function bookingCalendarStatus(date, groupedAppointments, activeSlotCount) {
  if (isDayClosed(date)) return "closed";
  const count = groupedAppointments.get(date)?.length || 0;
  if (activeSlotCount > 0 && count >= activeSlotCount) return "full";
  if (count > 0) return "has-booking";
  return "available";
}

function bookingCalendarStatusText(status, count) {
  if (status === "closed") return "ปิด";
  if (status === "full") return "เต็ม";
  if (count > 0) return `${count} คิว`;
  return "ว่าง";
}

function renderBookingCalendar() {
  if (!bookingCalendar) return;
  const groupedAppointments = appointmentsByDate();
  const dates = monthDates(calendarMonthStart);
  const activeSlotCount = timeSlots().filter((slot) => slot.active).length;
  const leadingDays = (new Date(calendarMonthStart).getDay() + 6) % 7;
  const selectedDate = dates.includes(today)
    ? today
    : dates.find((date) => groupedAppointments.get(date)?.length || isDayClosed(date)) || dates[0];
  const weekdays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  bookingCalendar.innerHTML = `
    <div class="booking-calendar-head">
      <button class="calendar-month-button" type="button" data-calendar-month="-1" aria-label="เดือนก่อนหน้า">‹</button>
      <strong>${monthTitle(calendarMonthStart)}</strong>
      <button class="calendar-month-button" type="button" data-calendar-month="1" aria-label="เดือนถัดไป">›</button>
    </div>
    <div class="booking-calendar-weekdays">
      ${weekdays.map((weekday) => `<span>${weekday}</span>`).join("")}
    </div>
    <div class="booking-calendar-grid month-grid">
      ${Array.from({ length: leadingDays }, () => `<span class="calendar-day placeholder" aria-hidden="true"></span>`).join("")}
      ${dates.map((date) => {
        const appointments = groupedAppointments.get(date) || [];
        const count = appointments.length;
        const isToday = date === today;
        const status = bookingCalendarStatus(date, groupedAppointments, activeSlotCount);
        return `
          <button class="calendar-day ${status} ${isToday ? "today" : ""}" type="button" data-calendar-date="${date}" aria-expanded="${date === selectedDate}">
            <span>${dayText(date)}</span>
            <strong>${new Date(`${date}T00:00:00`).getDate()}</strong>
            <em>${bookingCalendarStatusText(status, count)}</em>
          </button>
        `;
      }).join("")}
    </div>
    <div class="calendar-day-detail" id="calendar-day-detail"></div>
  `;

  const detail = bookingCalendar.querySelector("#calendar-day-detail");
  const showDateDetail = (date) => {
    const appointments = (groupedAppointments.get(date) || [])
      .sort((a, b) => (a.timeWindow || "").localeCompare(b.timeWindow || ""));
    const isClosed = isDayClosed(date);
    bookingCalendar.querySelectorAll("[data-calendar-date]").forEach((button) => {
      const isActive = button.dataset.calendarDate === date;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-expanded", String(isActive));
    });

    detail.innerHTML = `
      <div class="calendar-detail-head">
        <strong>${thaiDate(date)}</strong>
        <span>${isClosed ? "ปิดร้าน" : appointments.length ? `${appointments.length} คิว` : "ยังไม่มีคิว"}</span>
      </div>
      ${isClosed ? `<p class="empty-state compact">ร้านปิดวันนี้</p>` : appointments.length ? appointments.map((appointment) => `
        <article class="calendar-detail-item">
          <strong>${escapeHtml(appointment.timeWindow || "")}</strong>
          <span>${escapeHtml(appointment.customerName || "ลูกค้า")}</span>
          <small>${escapeHtml(serviceText(appointment))}</small>
        </article>
      `).join("") : `<p class="empty-state compact">ยังไม่มีคิวในวันนี้</p>`}
    `;
  };

  bookingCalendar.querySelectorAll("[data-calendar-month]").forEach((button) => {
    button.addEventListener("click", () => {
      calendarMonthStart = addMonths(calendarMonthStart, Number(button.dataset.calendarMonth || 0));
      renderBookingCalendar();
    });
  });

  bookingCalendar.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => showDateDetail(button.dataset.calendarDate));
  });
  showDateDetail(selectedDate);
}

async function confirmRequest(id) {
  const request = state.requests.find((item) => item.id === id);
  if (!request) return;
  if (isPastDate(request.bookingDate || today)) {
    showToast("คำขอนี้เลยวันแล้ว");
    return;
  }
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

  state.appointments.push({
    id: `APT-${Date.now()}`,
    customerName: request.customerName,
    contact: request.contact,
    services: request.services,
    bookingDate: request.bookingDate || today,
    timeWindow: request.timeWindow,
    status: "confirmed",
    source: "customer_request"
  });
  rememberCustomerFromBooking(request, request.note || "คำขอจองจากลูกค้า");
  state.requests = state.requests.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("ยืนยันคิวแล้ว");
}

async function rejectRequest(id) {
  const request = state.requests.find((item) => item.id === id);
  if (request && isPastDate(request.bookingDate || today)) {
    showToast("คำขอนี้เลยวันแล้ว");
    return;
  }

  const confirmed = await confirmOwnerAction({
    title: "ปฏิเสธคำขอนี้หรือไม่",
    message: "คำขอนี้จะถูกนำออกจากรายการรอยืนยันของร้าน",
    actionText: "ปฏิเสธคำขอ"
  });
  if (!confirmed) return;

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
      activateOwnerTab("queue");
      return;
    }
  } catch (error) {
    console.warn("Create owner appointment failed", error);
    showToast("ยังบันทึกคิวไม่สำเร็จ");
    return;
  }

  state.appointments.unshift(appointment);
  rememberCustomerFromBooking(appointment, "เจ้าของร้านลงคิวเอง");

  manualForm.reset();
  manualDate.value = today;
  saveState();
  render();
  activateOwnerTab("queue");
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
    tagline: formData.get("shopTagline").trim(),
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

shopLogoUploadButton?.addEventListener("click", () => {
  if (!remoteMode) {
    showToast("อัปโหลดโลโก้ได้หลังจากเข้าสู่ระบบร้าน");
    return;
  }
  shopLogoInput?.click();
});

shopLogoInput?.addEventListener("change", async () => {
  const file = shopLogoInput.files?.[0];
  shopLogoInput.value = "";
  if (!file) return;

  const previousStatus = shopLogoStatus?.textContent || "";
  if (shopLogoUploadButton) shopLogoUploadButton.disabled = true;
  if (shopLogoRemoveButton) shopLogoRemoveButton.disabled = true;
  if (shopLogoStatus) shopLogoStatus.textContent = "กำลังอัปโหลดโลโก้...";

  try {
    const updatedShop = await window.FahNailSupabase.uploadShopLogo(file, currentShopSlug);
    state.shop = { ...(state.shop || { slug: currentShopSlug }), ...updatedShop };
    saveState();
    updateRouteLinks();
    renderShopLogoControls();
    showToast("อัปโหลดโลโก้ร้านแล้ว");
  } catch (error) {
    console.warn("Upload shop logo failed", error);
    const message = error?.message === "SHOP_LOGO_TOO_LARGE"
      ? "ไฟล์โลโก้ต้องไม่เกิน 2MB"
      : error?.message === "SHOP_LOGO_TYPE_INVALID"
        ? "รองรับเฉพาะ PNG, JPG หรือ WebP"
        : "ยังอัปโหลดโลโก้ไม่สำเร็จ";
    if (shopLogoStatus) shopLogoStatus.textContent = previousStatus;
    showToast(message);
  } finally {
    if (shopLogoUploadButton) shopLogoUploadButton.disabled = false;
    renderShopLogoControls();
  }
});

shopLogoRemoveButton?.addEventListener("click", async () => {
  if (!remoteMode || !state.shop?.logoPath) return;

  if (shopLogoUploadButton) shopLogoUploadButton.disabled = true;
  if (shopLogoRemoveButton) shopLogoRemoveButton.disabled = true;
  if (shopLogoStatus) shopLogoStatus.textContent = "กำลังลบโลโก้...";

  try {
    const updatedShop = await window.FahNailSupabase.removeShopLogo(currentShopSlug);
    state.shop = { ...(state.shop || { slug: currentShopSlug }), ...updatedShop };
    saveState();
    updateRouteLinks();
    renderShopLogoControls();
    showToast("ลบโลโก้ร้านแล้ว");
  } catch (error) {
    console.warn("Remove shop logo failed", error);
    showToast("ยังลบโลโก้ไม่สำเร็จ");
  } finally {
    if (shopLogoUploadButton) shopLogoUploadButton.disabled = false;
    renderShopLogoControls();
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

googleLoginButton.addEventListener("click", async () => {
  try {
    await window.FahNailSupabase?.signInWithGoogle();
  } catch (error) {
    console.warn("Google login failed", error);
    showToast("ยังเข้าสู่ระบบ Google ไม่สำเร็จ");
  }
});

demoLoginButton.addEventListener("click", () => {
  openDemoOwnerApp();
});

logoutButton.addEventListener("click", async () => {
  try {
    await window.FahNailSupabase?.signOut();
  } catch (error) {
    console.warn("Sign out failed", error);
  }
  remoteMode = false;
  currentOwnerEmail = "";
  currentOwnerRole = "";
  currentMemberShops = [];
  showAuthPanel(isLocalPreview());
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
  const appointment = state.appointments.find((item) => item.id === id);
  if (appointment && isPastDate(appointment.bookingDate || today)) {
    showToast("คิวนี้เลยวันแล้ว");
    return;
  }

  const confirmed = await confirmOwnerAction({
    title: "ยกเลิกคิวนี้หรือไม่",
    message: "คิวนี้จะไม่ถูกนับเป็นช่วงเวลาที่จองแล้ว",
    actionText: "ยกเลิกคิว"
  });
  if (!confirmed) return;

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
  if (ownerDialog && ownerDialogTitle && ownerDialogMessage) {
    showOwnerNotice(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function showOwnerNotice(message) {
  configureOwnerDialog({
    title: noticeTitle(message),
    message,
    badge: noticeBadge(message),
    confirmText: "",
    cancelText: "ปิด"
  });
  openOwnerDialog();
}

function confirmOwnerAction({ title, message, actionText }) {
  if (!ownerDialog || typeof ownerDialog.showModal !== "function") {
    return Promise.resolve(window.confirm(message));
  }

  configureOwnerDialog({
    title,
    message,
    badge: "!",
    confirmText: actionText,
    cancelText: "กลับ"
  });

  return new Promise((resolve) => {
    ownerDialogResolve = resolve;
    ownerDialogResult = false;
    openOwnerDialog();
  });
}

function configureOwnerDialog({ title, message, badge, confirmText, cancelText }) {
  if (ownerDialogTitle) ownerDialogTitle.textContent = title;
  if (ownerDialogMessage) ownerDialogMessage.textContent = message;
  if (ownerDialogBadge) ownerDialogBadge.textContent = badge || "FN";
  if (ownerDialogSummary) {
    ownerDialogSummary.hidden = true;
    ownerDialogSummary.textContent = "";
  }
  if (ownerDialogCancel) ownerDialogCancel.textContent = cancelText || "ปิด";
  if (ownerDialogConfirm) {
    ownerDialogConfirm.hidden = !confirmText;
    ownerDialogConfirm.textContent = confirmText || "ยืนยัน";
    ownerDialogConfirm.className = confirmText ? "danger-button" : "primary-button";
  }
  ownerDialogCancel?.parentElement?.classList.toggle("confirming", Boolean(confirmText));
}

function openOwnerDialog() {
  if (!ownerDialog) return;
  if (ownerDialog.open) ownerDialog.close();
  if (typeof ownerDialog.showModal === "function") {
    ownerDialog.showModal();
    return;
  }
  ownerDialog.hidden = false;
  ownerDialog.classList.add("open");
}

function closeOwnerDialog(result = false) {
  ownerDialogResult = result;
  if (ownerDialog?.open) {
    ownerDialog.close();
    return;
  }
  ownerDialog?.classList.remove("open");
  if (ownerDialog) ownerDialog.hidden = true;
  resolveOwnerDialog(result);
}

function resolveOwnerDialog(result = false) {
  if (!ownerDialogResolve) return;
  const resolve = ownerDialogResolve;
  ownerDialogResolve = null;
  resolve(result);
}

function noticeTitle(message) {
  if (message.includes("ไม่สำเร็จ") || message.startsWith("ยัง")) return "ยังทำรายการไม่สำเร็จ";
  if (message.startsWith("กรุณา") || message.includes("ต้อง")) return "ต้องตรวจสอบอีกครั้ง";
  return "ทำรายการสำเร็จ";
}

function noticeBadge(message) {
  if (message.includes("ไม่สำเร็จ") || message.startsWith("ยัง")) return "!";
  if (message.startsWith("กรุณา") || message.includes("ต้อง")) return "!";
  return "FN";
}

ownerDialogCancel?.addEventListener("click", () => closeOwnerDialog(false));
ownerDialogConfirm?.addEventListener("click", () => closeOwnerDialog(true));
ownerDialog?.addEventListener("click", (event) => {
  if (event.target === ownerDialog) closeOwnerDialog(false);
});
ownerDialog?.addEventListener("close", () => {
  resolveOwnerDialog(ownerDialogResult);
  ownerDialogResult = false;
});

function activateOwnerTab(tabName, { persist = true } = {}) {
  if (!ownerTabs.length || !ownerTabPanels.length) return;

  const nextTab = ownerTabPanels.some((panel) => panel.dataset.ownerPanel === tabName) ? tabName : "queue";
  ownerTabs.forEach((tab) => {
    const isActive = tab.dataset.ownerTab === nextTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive || !ownerTabs.some((item) => item.dataset.ownerTab === nextTab) ? 0 : -1;
  });

  ownerTabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.ownerPanel !== nextTab;
  });

  updateOwnerTabOptionPositions();
  if (persist) localStorage.setItem(OWNER_TAB_KEY, nextTab);
}

function isMobileOwnerTabs() {
  return ownerTabsMobileQuery?.matches ?? window.innerWidth <= 620;
}

function setOwnerTabsExpanded(expanded) {
  if (!ownerTabsMenu) return;
  const nextState = Boolean(expanded && isMobileOwnerTabs());
  updateOwnerTabOptionPositions();
  ownerTabsMenu.classList.toggle("is-expanded", nextState);
  ownerTabsMenu.setAttribute("aria-expanded", String(nextState));
}

function ownerTabsExpanded() {
  return ownerTabsMenu?.classList.contains("is-expanded") || false;
}

function updateOwnerTabOptionPositions() {
  let optionIndex = 0;
  ownerTabs.forEach((tab) => {
    if (tab.classList.contains("is-active")) {
      tab.style.removeProperty("--owner-tab-option-index");
      tab.style.removeProperty("--owner-tab-option-offset");
      return;
    }

    tab.style.setProperty("--owner-tab-option-index", optionIndex);
    tab.style.setProperty("--owner-tab-option-offset", `${optionIndex * 54}px`);
    optionIndex += 1;
  });
}

function setupOwnerTabs() {
  if (!ownerTabs.length || !ownerTabPanels.length) return;
  setOwnerTabsExpanded(false);

  ownerTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateOwnerTab(tab.dataset.ownerTab);
      setOwnerTabsExpanded(false);
    });
    tab.addEventListener("keydown", (event) => {
      const lastIndex = ownerTabs.length - 1;
      let nextIndex = index;

      if (event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
      if (event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = lastIndex;
      if (nextIndex === index && !["Home", "End"].includes(event.key)) return;

      event.preventDefault();
      ownerTabs[nextIndex].focus();
      activateOwnerTab(ownerTabs[nextIndex].dataset.ownerTab);
      setOwnerTabsExpanded(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!isMobileOwnerTabs() || !ownerTabsExpanded() || ownerTabsMenu?.contains(event.target)) return;
    setOwnerTabsExpanded(false);
  });

  ownerTabsMobileQuery?.addEventListener?.("change", () => setOwnerTabsExpanded(false));

  activateOwnerTab(initialOwnerTab(), { persist: false });
}

function initialOwnerTab() {
  if (localStorage.getItem(OWNER_UI_VERSION_KEY) !== OWNER_UI_VERSION) {
    localStorage.setItem(OWNER_UI_VERSION_KEY, OWNER_UI_VERSION);
    localStorage.removeItem(OWNER_TAB_KEY);
    return "queue";
  }

  const savedTab = localStorage.getItem(OWNER_TAB_KEY);
  return ownerTabPanels.some((panel) => panel.dataset.ownerPanel === savedTab) ? savedTab : "queue";
}

function setOwnerAddMenuOpen(open) {
  if (!ownerAddMenu || !ownerAddToggle) return;
  ownerAddMenu.hidden = !open;
  ownerAddToggle.setAttribute("aria-expanded", String(open));
}

ownerAddToggle?.addEventListener("click", () => {
  setOwnerAddMenuOpen(ownerAddMenu?.hidden ?? true);
  setNotificationMenuOpen(false);
});

ownerAddMenu?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-owner-action-tab]");
  if (!item) return;
  activateOwnerTab(item.dataset.ownerActionTab || "queue");
  setOwnerAddMenuOpen(false);
});

function setNotificationMenuOpen(open) {
  if (!notificationMenu || !notificationToggle) return;
  notificationMenu.hidden = !open;
  notificationToggle.setAttribute("aria-expanded", String(open));
}

notificationToggle?.addEventListener("click", () => {
  setNotificationMenuOpen(notificationMenu?.hidden ?? true);
  setOwnerAddMenuOpen(false);
});

notificationSoundToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleNotificationSound();
});

notificationList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-notification-tab]");
  if (!item) return;
  activateOwnerTab(item.dataset.notificationTab || "queue");
  setNotificationMenuOpen(false);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !ownerApp.hidden) renderNotifications();
});

document.addEventListener("click", (event) => {
  const clickedOwnerAdd = ownerAddMenu?.contains(event.target) || ownerAddToggle?.contains(event.target);
  if (!clickedOwnerAdd) setOwnerAddMenuOpen(false);

  const clickedNotification = notificationMenu?.contains(event.target) || notificationToggle?.contains(event.target);
  if (!clickedNotification) setNotificationMenuOpen(false);

  const copyButton = event.target.closest("[data-copy-contact]");
  if (copyButton) copyContact(copyButton.dataset.copyContact);
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

setupOwnerTabs();
initOwnerAccess();
