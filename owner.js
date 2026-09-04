const STORAGE_KEY = "bookingnail-local-state";
const LEGACY_STORAGE_KEY = "fah-nail-booking-demo";
const OWNER_TAB_KEY = "fah-nail-owner-tab-v2";
const OWNER_UI_VERSION_KEY = "fah-nail-owner-ui-version";
const OWNER_UI_VERSION = "2026-08-29-role-aware-owner-nav";
const NOTIFICATION_SOUND_ENABLED_KEY = "fah-nail-notification-sound-enabled";
const SOUNDED_NOTIFICATION_KEY = "fah-nail-notification-sounded";
const SYSTEM_NOTIFIED_KEY = "fah-nail-system-notified";
const POPUP_NOTIFIED_KEY = "fah-nail-popup-notified";
const POPUP_AUTO_DISMISS_MS = 7000;
const MAX_VISIBLE_POPUPS = 3;
const REMINDER_WINDOW_MINUTES = 30;
const REMINDER_REFRESH_MS = 60 * 1000;
const today = new Date().toISOString().slice(0, 10);
const ownerUtils = window.BookingNailOwnerUtils || {};
const {
  contactActionsMarkup,
  escapeHtml,
  phoneHref,
  serviceText,
  sourceLabel,
  statusLabel,
  thaiDate
} = ownerUtils;

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
let ownerTeamMembers = [];
let calendarMonthStart = new Date(`${today}T00:00:00`);
calendarMonthStart.setDate(1);
let selectedCalendarDate = today;
let notificationSoundEnabled = localStorage.getItem(NOTIFICATION_SOUND_ENABLED_KEY) === "1";
let notificationAudioContext = null;
let notificationReminderTimer = null;
const soundedNotificationKeys = new Set(loadSoundedNotificationKeys());
const systemNotifiedKeys = new Set(loadStoredKeyList(SYSTEM_NOTIFIED_KEY));
const popupNotifiedKeys = new Set(loadStoredKeyList(POPUP_NOTIFIED_KEY));
const activePopupTimers = new Map();

const ownerAuthPanel = document.getElementById("owner-auth-panel");
const ownerApp = document.getElementById("owner-app");
const googleLoginButton = document.getElementById("google-login-button");
const demoLoginButton = document.getElementById("demo-login-button");
const logoutButton = document.getElementById("logout-button");
const ownerAccount = document.getElementById("owner-account");
const authCopy = document.getElementById("auth-copy");
const authStatus = document.getElementById("auth-status");
const requestList = document.getElementById("request-list");
const todayQueueList = document.getElementById("today-queue-list");
const ownerConnectionGrid = document.getElementById("owner-connection-grid");
const ownerStats = document.getElementById("owner-stats");
const ownerFastLaneList = document.getElementById("owner-fast-lane-list");
const ownerHeroStatus = document.getElementById("owner-hero-status");
const ownerTabsMenu = document.querySelector(".owner-tabs");
const ownerTabs = Array.from(document.querySelectorAll("[data-owner-tab]"));
const ownerTabPanels = Array.from(document.querySelectorAll("[data-owner-panel]"));
const ownerAddToggle = document.getElementById("owner-add-toggle");
const ownerAddMenu = document.getElementById("owner-add-menu");
const ownerAddMenuItems = Array.from(document.querySelectorAll("#owner-add-menu [data-owner-action-tab]"));
const notificationToggle = document.getElementById("notification-toggle");
const notificationBadge = document.getElementById("notification-badge");
const notificationMenu = document.getElementById("notification-menu");
const notificationCountText = document.getElementById("notification-count-text");
const notificationList = document.getElementById("notification-list");
const notificationSoundToggle = document.getElementById("notification-sound-toggle");
const ownerNotificationPopups = document.getElementById("owner-notification-popups");
const ownerServiceList = document.getElementById("owner-service-list");
const manualTime = document.getElementById("manual-time");
const manualService = document.getElementById("manual-service");
const manualDate = document.getElementById("manual-date");
const scheduleDate = document.getElementById("schedule-date");
const closedDayToggle = document.getElementById("closed-day-toggle");
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
const teamForm = document.getElementById("team-form");
const teamEmailInput = document.getElementById("team-email");
const teamRoleInput = document.getElementById("team-role");
const teamSaveButton = document.getElementById("team-save");
const ownerTeamList = document.getElementById("owner-team-list");
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
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
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
  localStorage.removeItem(LEGACY_STORAGE_KEY);
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
  renderOwnerFastLane();
  renderNotifications();
  renderOwnerLists();
  renderOwnerServices();
  renderManualOptions();
  renderTimeManager();
  renderBookingCalendar();
  renderShopSettings();
  renderOwnerTeam();
  syncOwnerAccessUi();
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
      await loadOwnerTeamMembers();
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
  ownerTeamMembers = [
    { userId: "demo-owner", email: "owner@example.com", role: "owner" },
    { userId: "demo-staff", email: "staff@example.com", role: "staff" }
  ];
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
  window.BookingNailTheme?.applyShopTheme?.(shop.themeKey);
  const urls = window.FahNailSupabase?.shopUrls?.(currentShopSlug) || {
    booking: "index.html",
    dashboard: "/fah-owner",
    register: "/register"
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
  const shopSlug = shop?.slug || currentShopSlug || "";
  const fallbackShop = element.dataset.fallbackShop || "";
  const fallbackLogo = (!fallbackShop || fallbackShop === shopSlug) ? element.dataset.fallbackLogo || "" : "";
  const fallbackText = shopInitials(shop?.name);
  const logoUrl = shop?.logoUrl || fallbackLogo;
  element.classList.remove("has-logo", "app-logo-mark");
  delete element.dataset.appLogo;

  if (!logoUrl) {
    element.textContent = fallbackText;
    return;
  }

  element.classList.add("has-logo");
  element.innerHTML = `<img src="${escapeHtml(logoUrl)}" alt="">`;
  element.querySelector("img")?.addEventListener("error", (event) => {
    if (fallbackLogo && logoUrl !== fallbackLogo) {
      event.currentTarget.src = fallbackLogo;
      return;
    }
    element.classList.remove("has-logo");
    element.textContent = fallbackText;
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
    await loadOwnerTeamMembers();
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

async function loadOwnerTeamMembers() {
  if (!remoteMode || !state.shop?.id) return;

  try {
    ownerTeamMembers = await window.FahNailSupabase.listShopMembers(state.shop.id);
  } catch (error) {
    console.warn("Load owner team failed", error);
    ownerTeamMembers = [];
    showToast("ยังโหลดทีมงานไม่สำเร็จ");
  }
}

function isPrivilegedOwnerRole() {
  return ["owner", "platform_admin", "admin"].includes(currentOwnerRole);
}

function canManageOwnerTeam() {
  return !remoteMode || isPrivilegedOwnerRole();
}

function canManageShopSettings() {
  return !remoteMode || isPrivilegedOwnerRole();
}

function canManageServiceSettings() {
  return !remoteMode || isPrivilegedOwnerRole();
}

function canAccessOwnerTab(tabName) {
  if (["queue", "calendar", "manual"].includes(tabName)) return true;
  if (tabName === "team") return canManageOwnerTeam();
  if (tabName === "shop") return canManageShopSettings();
  if (tabName === "settings") return canManageServiceSettings();
  return false;
}

function ownerRestrictedMessage(tabName = "") {
  if (tabName === "team") return "บัญชีทีมงานจัดการทีมไม่ได้";
  if (tabName === "shop") return "บัญชีทีมงานแก้ข้อมูลร้านไม่ได้";
  if (tabName === "settings") return "บัญชีทีมงานแก้เวลาและบริการไม่ได้";
  return "บัญชีทีมงานจัดการเมนูนี้ไม่ได้";
}

function ownerUiMode() {
  return isMobileOwnerTabs() ? "mobile" : "window";
}

function logOwnerActivity(eventName, metadata = {}) {
  window.FahNailSupabase?.logActivity?.({
    eventName,
    surface: "owner_dashboard",
    slug: currentShopSlug,
    metadata: {
      role: currentOwnerRole || "unknown",
      mode: ownerUiMode(),
      ...metadata
    }
  });
}

function setControlsDisabled(root, disabled) {
  root?.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = Boolean(disabled);
  });
}

function markOwnerAccessControl(element, canAccess) {
  if (!element) return;
  element.hidden = false;
  element.disabled = false;
  element.classList.toggle("is-locked", !canAccess);
  element.setAttribute("aria-disabled", String(!canAccess));
  element.setAttribute("aria-hidden", "false");
}

function ownerAddMenuMode() {
  return isMobileOwnerTabs() ? "mobile" : "desktop";
}

function syncOwnerAddMenuItems(mode = ownerAddMenuMode()) {
  ownerAddMenuItems.forEach((item) => {
    const tabName = item.dataset.ownerActionTab || "";
    const visibleForMode = mode === "mobile" || tabName === "manual";
    item.classList.toggle("is-screen-hidden", !visibleForMode);
    item.setAttribute("aria-hidden", String(!visibleForMode));
  });

  const hasVisibleAction = ownerAddMenuItems.some((item) => !item.classList.contains("is-screen-hidden"));
  if (ownerAddToggle) ownerAddToggle.hidden = ownerApp.hidden || !hasVisibleAction;
}

function syncOwnerAccessUi() {
  const limitedRole = remoteMode && !isPrivilegedOwnerRole();
  document.body.classList.toggle("owner-role-limited", limitedRole);
  document.body.classList.toggle("owner-role-admin", !limitedRole);

  ownerTabs.forEach((tab) => {
    const tabName = tab.dataset.ownerTab || "";
    const canAccess = canAccessOwnerTab(tabName);
    markOwnerAccessControl(tab, canAccess);
    if (tabName === "settings") {
      tab.classList.remove("owner-more-tab");
      tab.removeAttribute("aria-haspopup");
      tab.removeAttribute("aria-expanded");
    }
  });

  document.querySelectorAll("[data-owner-action-tab]").forEach((item) => {
    const tabName = item.dataset.ownerActionTab || "";
    const canAccess = canAccessOwnerTab(tabName);
    markOwnerAccessControl(item, canAccess);
  });

  syncOwnerAddMenuItems();

  setControlsDisabled(teamForm, !canManageOwnerTeam());
  setControlsDisabled(shopForm, !canManageShopSettings());
  setControlsDisabled(serviceForm, !canManageServiceSettings());
  setControlsDisabled(slotForm, !canManageServiceSettings());
  if (closedDayToggle) closedDayToggle.disabled = !canManageServiceSettings();
  if (shopLogoUploadButton) shopLogoUploadButton.disabled = !canManageShopSettings();
  if (shopLogoRemoveButton) shopLogoRemoveButton.disabled = !canManageShopSettings() || !remoteMode || !state.shop?.logoPath;

  const activeTab = ownerTabs.find((tab) => tab.classList.contains("is-active"))?.dataset.ownerTab || "queue";
  if (!canAccessOwnerTab(activeTab)) {
    localStorage.removeItem(OWNER_TAB_KEY);
    activateOwnerTab("queue", { persist: false, silent: true });
  }
}

function ownerRoleText(role) {
  return role === "owner" ? "เจ้าของร้าน" : "ทีมงาน";
}

function renderOwnerTeam() {
  if (!ownerTeamList) return;
  const canManage = canManageOwnerTeam();
  const formCard = teamForm?.closest(".side-card");
  if (formCard) formCard.hidden = remoteMode && !canManage;

  if (!remoteMode) {
    ownerTeamList.innerHTML = `
      <p class="empty-state compact">โหมดตัวอย่าง ทีมงานจริงจะแสดงหลังเข้าสู่ระบบร้าน</p>
      ${ownerTeamMembers.map(ownerTeamMemberMarkup).join("")}
    `;
    return;
  }

  if (!canManage) {
    ownerTeamList.innerHTML = `<p class="empty-state">บัญชีนี้ดูคิวได้ แต่จัดการทีมงานไม่ได้</p>`;
    return;
  }

  if (!ownerTeamMembers.length) {
    ownerTeamList.innerHTML = `<p class="empty-state">ยังไม่มีทีมงานในร้านนี้</p>`;
    return;
  }

  ownerTeamList.innerHTML = ownerTeamMembers.map(ownerTeamMemberMarkup).join("");
}

function ownerTeamMemberMarkup(member) {
  const userId = escapeHtml(member.userId || "");
  const email = escapeHtml(member.email || "ไม่พบอีเมล");
  const role = escapeHtml(ownerRoleText(member.role));
  const canRemove = remoteMode && canManageOwnerTeam();
  return `
    <article class="admin-member-item owner-team-item" data-team-user-id="${userId}">
      <div>
        <strong>${email}</strong>
        <span>${role}</span>
      </div>
      ${canRemove ? `<button class="secondary-button" type="button" data-team-action="remove">ลบ</button>` : ""}
    </article>
  `;
}

function renderOwnerStats() {
  if (!ownerStats) return;
  const pendingRequests = activeBookingRequests().length;
  const todayAppointments = todayQueueItems().filter((item) => item.status === "confirmed").length;
  const dueSoon = dueSoonAppointmentCount();
  const completedToday = state.appointments.filter((item) => item.bookingDate === today && item.status === "completed").length;

  if (ownerHeroStatus) {
    ownerHeroStatus.textContent = `${ownerTodayLabel()} · ${todayAppointments} คิววันนี้ · ${pendingRequests} รอยืนยัน`;
  }

  const stats = [
    { label: "รอยืนยัน", value: pendingRequests, hint: pendingRequests ? "รอตอบ" : "ว่าง", tone: "warn" },
    { label: "คิววันนี้", value: todayAppointments, hint: todayAppointments ? "วันนี้" : "ไม่มีคิว", tone: "info" },
    { label: "ใกล้ถึง", value: dueSoon, hint: dueSoon ? "เตรียมรับ" : "ปกติ", tone: "aqua" },
    { label: "เสร็จแล้ว", value: completedToday, hint: completedToday ? "บันทึกแล้ว" : "ยังไม่มี", tone: "good" }
  ];

  ownerStats.innerHTML = "";
  stats.forEach((stat) => {
    const item = document.createElement("div");
    item.className = `stat-chip owner-stat-card ${stat.tone}${stat.value ? " has-value" : " is-empty"}`;
    item.innerHTML = `
      <span class="stat-label">${escapeHtml(stat.label)}</span>
      <strong>${stat.value}</strong>
      <small>${escapeHtml(stat.hint)}</small>
    `;
    ownerStats.append(item);
  });
}

function ownerTodayLabel() {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${today}T00:00:00`));
}

function renderOwnerFastLane() {
  if (!ownerFastLaneList) return;
  const pending = activeBookingRequests().slice(0, 2).map((item) => ({ ...item, kind: "request" }));
  const nextQueue = todayQueueItems()
    .filter((item) => item.status === "confirmed")
    .filter((item) => minutesUntilAppointment(item) > -15)
    .slice(0, 3)
    .map((item) => ({ ...item, kind: "appointment" }));
  const items = [...pending, ...nextQueue].slice(0, 4);

  if (!items.length) {
    ownerFastLaneList.innerHTML = `
      <div class="owner-fast-lane-empty">
        <strong>วันนี้ยังโล่ง</strong>
        <span>ถ้ามีลูกค้าจองหรือใกล้ถึงคิว ระบบจะแสดงตรงนี้</span>
      </div>
    `;
    return;
  }

  ownerFastLaneList.innerHTML = items.map((item) => {
    const isRequest = item.kind === "request";
    const href = phoneHref(item.contact || "");
    const action = isRequest
      ? `<button type="button" data-fast-action="request" data-fast-id="${escapeHtml(item.id)}">ตอบ</button>`
      : href
        ? `<a href="${escapeHtml(href)}">โทร</a>`
        : `<button type="button" data-fast-action="copy" data-fast-id="${escapeHtml(item.id)}">คัดลอก</button>`;
    return `
      <article class="owner-fast-lane-item ${isRequest ? "warn" : ""}">
        <div>
          <strong>${escapeHtml(item.customerName || "ลูกค้า")}</strong>
          <span>${escapeHtml(item.timeWindow || "")} · ${escapeHtml(serviceText(item))}</span>
        </div>
        ${action}
      </article>
    `;
  }).join("");
}

function activeBookingRequests() {
  return state.requests
    .filter((item) => item.status === "pending_request" && !isPastDate(item.bookingDate || today))
    .sort((a, b) => `${a.bookingDate || ""} ${a.timeWindow || ""}`.localeCompare(`${b.bookingDate || ""} ${b.timeWindow || ""}`));
}

function todayQueueItems() {
  return state.appointments
    .filter((item) => item.bookingDate === today && ["confirmed", "completed"].includes(item.status))
    .sort((a, b) => (a.timeWindow || "").localeCompare(b.timeWindow || ""));
}

function dueSoonAppointmentCount() {
  return state.appointments
    .filter((item) => item.status === "confirmed")
    .map((item) => minutesUntilAppointment(item))
    .filter((minutes) => minutes >= 0 && minutes <= REMINDER_WINDOW_MINUTES)
    .length;
}

function buildNotifications() {
  const pendingRequests = state.requests
    .filter((item) => item.status === "pending_request")
    .map((item) => ({
      key: `request-${item.id}-${item.bookingDate || today}-${item.timeWindow}`,
      popup: true,
      popupActionText: "ดูคำขอ",
      tone: "warn",
      title: "คำขอจองใหม่",
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
      popup: true,
      popupActionText: "ดูตาราง",
      tone: "due",
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
  showInAppNotificationPopups(notifications);
}

function showInAppNotificationPopups(notifications) {
  if (!ownerNotificationPopups || ownerApp.hidden) return;

  const popupItems = notifications
    .filter((item) => item.popup && item.key && !popupNotifiedKeys.has(item.key))
    .slice(0, MAX_VISIBLE_POPUPS);

  popupItems.forEach((item) => {
    popupNotifiedKeys.add(item.key);
    rememberPopupNotifications();
    appendOwnerNotificationPopup(item);
  });
}

function appendOwnerNotificationPopup(item) {
  if (!ownerNotificationPopups) return;

  const visiblePopups = Array.from(ownerNotificationPopups.querySelectorAll(".owner-notification-popup"));
  while (visiblePopups.length >= MAX_VISIBLE_POPUPS) {
    const oldPopup = visiblePopups.shift();
    if (oldPopup) dismissOwnerNotificationPopup(oldPopup);
  }

  const popup = document.createElement("article");
  popup.className = `owner-notification-popup ${item.tone || "info"}`;
  popup.dataset.popupKey = item.key;
  popup.dataset.notificationTab = item.tab || "queue";
  popup.tabIndex = -1;
  popup.innerHTML = `
    <div class="owner-notification-popup-mark" aria-hidden="true">${ownerNotificationPopupIcon(item.tone)}</div>
    <div class="owner-notification-popup-copy">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
    <div class="owner-notification-popup-actions">
      <button class="owner-popup-action" type="button" data-popup-action="open">
        <span class="owner-popup-action-full">${escapeHtml(item.popupActionText || "ดู")}</span>
        <span class="owner-popup-action-short">ดู</span>
      </button>
      <button class="owner-popup-dismiss" type="button" data-popup-action="dismiss" aria-label="ปิดแจ้งเตือน">ปิด</button>
    </div>
  `;

  ownerNotificationPopups.append(popup);
  requestAnimationFrame(() => popup.classList.add("show"));
  startOwnerPopupTimer(popup);
}

function ownerNotificationPopupIcon(tone = "") {
  if (tone === "due") {
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"></circle><path d="M12 9v4l3 2"></path><path d="M7 4 4.5 6.5M17 4l2.5 2.5"></path></svg>';
  }

  return '<svg viewBox="0 0 24 24"><path d="M12 3v5M12 16v5M4 12h5M15 12h5"></path><path d="m7 7 2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17"></path></svg>';
}

function startOwnerPopupTimer(popup) {
  const key = popup?.dataset.popupKey;
  if (!key) return;
  window.clearTimeout(activePopupTimers.get(key));
  activePopupTimers.set(key, window.setTimeout(() => dismissOwnerNotificationPopup(popup), POPUP_AUTO_DISMISS_MS));
}

function pauseOwnerPopupTimer(popup) {
  const key = popup?.dataset.popupKey;
  if (!key) return;
  window.clearTimeout(activePopupTimers.get(key));
  activePopupTimers.delete(key);
}

function dismissOwnerNotificationPopup(popup) {
  if (!popup) return;
  const key = popup.dataset.popupKey;
  if (key) {
    window.clearTimeout(activePopupTimers.get(key));
    activePopupTimers.delete(key);
  }
  popup.classList.remove("show");
  window.setTimeout(() => popup.remove(), 180);
}

function rememberPopupNotifications() {
  localStorage.setItem(POPUP_NOTIFIED_KEY, JSON.stringify([...popupNotifiedKeys].slice(-100)));
}

function renderNotificationSoundToggle() {
  if (!notificationSoundToggle) return;
  notificationSoundToggle.innerHTML = `
    <span class="sound-toggle-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 15h4l5 4V5L9 9H5v6Z"></path><path d="M17 9.5c1 .8 1.5 1.6 1.5 2.5S18 13.7 17 14.5"></path>${notificationSoundEnabled ? '<path d="M19.5 7c1.7 1.4 2.5 3 2.5 5s-.8 3.6-2.5 5"></path>' : '<path d="m19 9-4 6M15 9l4 6"></path>'}</svg>
    </span>
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

function isPastDate(date = today) {
  return String(date || today) < today;
}

async function copyContact(value) {
  await copyText(value, "คัดลอกช่องทางติดต่อแล้ว");
}

async function copyText(value, successMessage = "คัดลอกแล้ว") {
  const text = String(value || "").trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    console.warn("Copy text failed", error);
    showToast(text);
  }
}

function bookingMessage(booking, mode = "request") {
  const shopName = state.shop?.name || "Fah Nail";
  const dateText = thaiDate(booking.bookingDate || today);
  const serviceList = serviceText(booking);
  const customerName = booking.customerName || "ลูกค้า";
  if (mode === "confirmed") {
    return `${shopName} ยืนยันคิวแล้วนะคะ\n${customerName}\nบริการ: ${serviceList}\nวันที่: ${dateText}\nเวลา: ${booking.timeWindow}\nหากต้องการเปลี่ยนเวลา แจ้งร้านได้เลยค่ะ`;
  }

  return `${shopName} ได้รับคำขอจองแล้วนะคะ\n${customerName}\nบริการ: ${serviceList}\nวันที่: ${dateText}\nช่วงเวลา: ${booking.timeWindow}\nร้านจะตรวจคิวและยืนยันกลับอีกครั้งค่ะ`;
}

function copyBookingMessage(booking, mode = "request") {
  copyText(bookingMessage(booking, mode), "คัดลอกข้อความตอบลูกค้าแล้ว");
}

function renderOwnerLists() {
  const requests = activeBookingRequests();
  const todayItems = todayQueueItems();

  if (requestList) {
    requestList.innerHTML = "";
    if (!requests.length) {
      appendOwnerEmptyState(requestList, {
        title: "ยังไม่มีคำขอที่ต้องตอบ",
        copy: "ถ้ามีลูกค้าจองเข้ามา รายการจะขึ้นตรงนี้ให้ตอบกลับทันที",
        action: "ดูตาราง",
        tab: "calendar"
      });
    } else {
      requests.forEach((item) => requestList.append(createQueueCard({ ...item, kind: "request" })));
    }
  }

  if (todayQueueList) {
    todayQueueList.innerHTML = "";
    if (!todayItems.length) {
      appendOwnerEmptyState(todayQueueList, {
        title: "วันนี้ยังไม่มีคิว",
        copy: "เพิ่มคิวหน้าร้านหรือรอคำขอจากหน้าจองของลูกค้าได้เลย",
        action: "ลงคิวหน้าร้าน",
        tab: "manual"
      });
    } else {
      todayItems.forEach((item) => todayQueueList.append(createQueueCard({ ...item, kind: "appointment" })));
    }
  }
}

function appendOwnerEmptyState(list, { title, copy, action, tab }) {
  const empty = document.createElement("div");
  empty.className = "owner-empty-state";
  empty.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(copy)}</span>
  `;

  if (action && tab) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "owner-quick-action";
    button.textContent = action;
    button.addEventListener("click", () => activateOwnerTab(tab));
    empty.append(button);
  }

  list.append(empty);
}

function createQueueCard(item) {
  const pastItem = isPastDate(item.bookingDate || today);
  const card = document.createElement("article");
  const confirmed = item.status === "confirmed";
  const completed = item.status === "completed";
  card.className = `queue-card owner-queue-card ${confirmed ? "confirmed" : ""} ${completed ? "completed" : ""}${pastItem ? " is-past" : ""}`.trim();
  const statusMarkup = `<span class="status-pill ${statusToneClass(item)}">${statusLabel(item.status)}</span>`;
  const sourceText = sourceLabel(item.source);
  const noteMarkup = item.note ? `<p class="queue-note">${escapeHtml(item.note)}</p>` : "";

  card.innerHTML = `
    <div class="queue-top">
      <div>
        <span class="queue-kind">${item.kind === "request" ? "คำขอใหม่" : "คิวร้าน"}</span>
        <strong>${escapeHtml(item.customerName || "ลูกค้า")}</strong>
        <p class="hint">${escapeHtml(item.contact || "ไม่มีช่องทางติดต่อ")}</p>
      </div>
      ${statusMarkup}
    </div>
    <div class="queue-meta">
      <span>${thaiDate(item.bookingDate || today)}</span>
      <span>${escapeHtml(item.timeWindow || "")}</span>
      <span>${escapeHtml(serviceText(item))}</span>
      <span>${sourceText}</span>
    </div>
    ${contactActionsMarkup(item.contact)}
    ${noteMarkup}
  `;

  if (pastItem) {
    const pastNote = document.createElement("p");
    pastNote.className = "empty-state compact";
    pastNote.textContent = "รายการนี้เลยวันแล้ว ดูย้อนหลังได้จากตารางคิว";
    card.append(pastNote);
    return card;
  }

  const actions = document.createElement("div");
  actions.className = "queue-actions";

  if (item.kind === "request") {
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "primary-button";
    confirm.textContent = "ยืนยันคิว";
    confirm.disabled = busyWindows(item.bookingDate || today).has(item.timeWindow);
    confirm.title = confirm.disabled ? "ช่วงเวลานี้มีคิวแล้ว" : "ยืนยันคำขอนี้";
    confirm.addEventListener("click", () => confirmRequest(item.id));

    const message = document.createElement("button");
    message.type = "button";
    message.className = "secondary-button";
    message.textContent = "ข้อความ";
    message.addEventListener("click", () => copyBookingMessage(item, "request"));

    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "danger-button";
    reject.textContent = "ปฏิเสธ";
    reject.addEventListener("click", () => rejectRequest(item.id));

    actions.append(confirm, message, reject);
  }

  if (item.kind === "appointment") {
    const message = document.createElement("button");
    message.type = "button";
    message.className = "secondary-button";
    message.textContent = "ข้อความ";
    message.addEventListener("click", () => copyBookingMessage(item, "confirmed"));
    actions.append(message);

    if (!completed) {
      const complete = document.createElement("button");
      complete.type = "button";
      complete.className = "primary-button";
      complete.textContent = "เสร็จแล้ว";
      complete.addEventListener("click", () => completeAppointment(item.id));

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "danger-button";
      cancel.textContent = "ยกเลิกคิว";
      cancel.addEventListener("click", () => cancelAppointment(item.id));

      actions.append(complete, cancel);
    }
  }

  if (actions.children.length) card.append(actions);
  return card;
}

function statusToneClass(item) {
  if (item.kind === "request") return "warn";
  if (item.status === "completed") return "good";
  if (item.status === "confirmed") return "info";
  if (["cancelled", "rejected"].includes(item.status)) return "danger";
  return "muted";
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
  if (!canManageServiceSettings()) {
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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
  if (!canManageServiceSettings()) {
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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
  if (!canManageServiceSettings()) {
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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
  if (!canManageServiceSettings()) {
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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

function dayText(value) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function visibleCalendarAppointments() {
  return state.appointments.filter((appointment) => ["confirmed", "completed"].includes(appointment.status));
}

function appointmentsByDate() {
  return visibleCalendarAppointments()
    .reduce((groups, appointment) => {
      const date = appointment.bookingDate || today;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(appointment);
      return groups;
    }, new Map());
}

function calendarContactMarkup(contact = "") {
  const value = String(contact || "").trim();
  if (!value) return `<span class="calendar-detail-contact">ไม่มีเบอร์</span>`;
  const href = phoneHref(value);
  if (!href) return `<span class="calendar-detail-contact">${escapeHtml(value)}</span>`;
  return `<a class="calendar-detail-contact" href="${escapeHtml(href)}">${escapeHtml(value)}</a>`;
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
  const selectedDate = dates.includes(selectedCalendarDate)
    ? selectedCalendarDate
    : (dates.includes(today)
      ? today
      : dates.find((date) => groupedAppointments.get(date)?.length || isDayClosed(date)) || dates[0]);
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
    selectedCalendarDate = date;
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
        <article class="calendar-detail-item ${appointment.status === "completed" ? "completed" : ""}">
          <div class="calendar-detail-line primary">
            <strong>${escapeHtml(appointment.customerName || "ลูกค้า")}</strong>
            ${calendarContactMarkup(appointment.contact)}
            <em class="status-pill ${statusToneClass({ ...appointment, kind: "appointment" })}">${statusLabel(appointment.status)}</em>
          </div>
          <div class="calendar-detail-line secondary">
            <span>${escapeHtml(serviceText(appointment))}</span>
            <strong>${thaiDate(appointment.bookingDate || date)} · ${escapeHtml(appointment.timeWindow || "")}</strong>
          </div>
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
  if (!canManageServiceSettings()) {
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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
  if (!canManageShopSettings()) {
    showToast(ownerRestrictedMessage("shop"));
    return;
  }
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

teamForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!remoteMode || !state.shop?.id || !canManageOwnerTeam()) {
    showToast("บัญชีนี้ยังจัดการทีมงานไม่ได้");
    return;
  }

  const email = cleanOwnerEmail(teamEmailInput?.value || "").toLowerCase();
  const role = teamRoleInput?.value || "staff";
  if (!email) {
    showToast("กรุณาใส่อีเมล");
    return;
  }

  if (teamSaveButton) teamSaveButton.disabled = true;
  try {
    const member = await window.FahNailSupabase.upsertShopMember(state.shop.id, email, role);
    const memberIndex = ownerTeamMembers.findIndex((item) => item.userId === member.userId);
    if (memberIndex >= 0) {
      ownerTeamMembers[memberIndex] = member;
    } else {
      ownerTeamMembers.push(member);
    }
    teamForm.reset();
    if (teamRoleInput) teamRoleInput.value = "owner";
    renderOwnerTeam();
    showToast("บันทึกสิทธิ์แล้ว");
  } catch (error) {
    console.warn("Upsert owner team member failed", error);
    const message = error?.message || "";
    showToast(message.includes("MEMBER_USER_NOT_FOUND") ? "ไม่พบอีเมลนี้ ให้เขา login ก่อน" : "ยังบันทึกสิทธิ์ไม่สำเร็จ");
  } finally {
    if (teamSaveButton) teamSaveButton.disabled = false;
  }
});

shopLogoUploadButton?.addEventListener("click", () => {
  if (!canManageShopSettings()) {
    showToast(ownerRestrictedMessage("shop"));
    return;
  }
  if (!remoteMode) {
    showToast("อัปโหลดโลโก้ได้หลังจากเข้าสู่ระบบร้าน");
    return;
  }
  shopLogoInput?.click();
});

shopLogoInput?.addEventListener("change", async () => {
  if (!canManageShopSettings()) {
    showToast(ownerRestrictedMessage("shop"));
    if (shopLogoInput) shopLogoInput.value = "";
    return;
  }
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
  if (!canManageShopSettings()) {
    showToast(ownerRestrictedMessage("shop"));
    return;
  }
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
  if (!canManageServiceSettings()) {
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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
  if (!canManageServiceSettings()) {
    closedDayToggle.checked = isDayClosed(selectedScheduleDate());
    showToast(ownerRestrictedMessage("settings"));
    return;
  }
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

async function completeAppointment(id) {
  const appointment = state.appointments.find((item) => item.id === id);
  if (appointment && isPastDate(appointment.bookingDate || today)) {
    showToast("คิวนี้เลยวันแล้ว");
    return;
  }

  try {
    if (remoteMode) {
      await window.FahNailSupabase.completeAppointment(id, currentShopSlug);
      await reloadAfterRemote("บันทึกว่าคิวเสร็จแล้ว");
      return;
    }

    if (appointment) appointment.status = "completed";
    saveState();
    render();
    showToast("บันทึกว่าคิวเสร็จแล้ว");
  } catch (error) {
    console.warn("Complete appointment failed", error);
    showToast("ยังบันทึกคิวเสร็จแล้วไม่สำเร็จ");
  }
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

function activateOwnerTab(tabName, { persist = true, silent = false } = {}) {
  if (!ownerTabs.length || !ownerTabPanels.length) return;

  const requestedTab = ownerTabPanels.some((panel) => panel.dataset.ownerPanel === tabName) ? tabName : "queue";
  const nextTab = canAccessOwnerTab(requestedTab) ? requestedTab : "queue";
  if (requestedTab !== nextTab && !silent) {
    showToast(ownerRestrictedMessage(requestedTab));
    logOwnerActivity("restricted_owner_menu_attempt", { tab: requestedTab });
  } else if (!silent) {
    logOwnerActivity("owner_tab_opened", { tab: nextTab });
  }

  ownerTabs.forEach((tab) => {
    const isActive = tab.dataset.ownerTab === nextTab;
    const canAccess = canAccessOwnerTab(tab.dataset.ownerTab || "");
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive || !ownerTabs.some((item) => item.dataset.ownerTab === nextTab && canAccessOwnerTab(item.dataset.ownerTab || "")) ? 0 : -1;
  });

  ownerTabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.ownerPanel !== nextTab;
  });

  updateOwnerTabOptionPositions();
  if (persist) localStorage.setItem(OWNER_TAB_KEY, nextTab);
  syncOwnerAccessUi();
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
    tab.addEventListener("click", (event) => {
      activateOwnerTab(tab.dataset.ownerTab);
      setOwnerTabsExpanded(false);
    });
    tab.addEventListener("keydown", (event) => {
      const availableTabs = ownerTabs.filter((item) => !item.hidden && canAccessOwnerTab(item.dataset.ownerTab || ""));
      const currentIndex = availableTabs.indexOf(tab);
      const lastIndex = availableTabs.length - 1;
      let nextIndex = currentIndex;

      if (currentIndex < 0) return;
      if (event.key === "ArrowRight") nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      if (event.key === "ArrowLeft") nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = lastIndex;
      if (nextIndex === currentIndex && !["Home", "End"].includes(event.key)) return;

      event.preventDefault();
      const nextTab = availableTabs[nextIndex];
      nextTab.focus();
      activateOwnerTab(nextTab.dataset.ownerTab);
      setOwnerTabsExpanded(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!isMobileOwnerTabs() || !ownerTabsExpanded() || ownerTabsMenu?.contains(event.target)) return;
    setOwnerTabsExpanded(false);
  });

  ownerTabsMobileQuery?.addEventListener?.("change", () => {
    setOwnerTabsExpanded(false);
    setOwnerAddMenuOpen(false);
    syncOwnerAddMenuItems();
  });

  activateOwnerTab(initialOwnerTab(), { persist: false });
}

function initialOwnerTab() {
  if (localStorage.getItem(OWNER_UI_VERSION_KEY) !== OWNER_UI_VERSION) {
    localStorage.setItem(OWNER_UI_VERSION_KEY, OWNER_UI_VERSION);
    localStorage.removeItem(OWNER_TAB_KEY);
    return "queue";
  }

  const savedTab = localStorage.getItem(OWNER_TAB_KEY);
  return ownerTabPanels.some((panel) => panel.dataset.ownerPanel === savedTab) && canAccessOwnerTab(savedTab) ? savedTab : "queue";
}

function setOwnerAddMenuOpen(open, mode = "auto") {
  if (!ownerAddMenu || !ownerAddToggle) return;
  const resolvedMode = mode === "auto" ? ownerAddMenuMode() : mode;
  syncOwnerAddMenuItems(resolvedMode);
  ownerAddMenu.dataset.menuMode = resolvedMode;
  ownerAddMenu.hidden = !open;
  ownerAddMenu.classList.toggle("is-open", Boolean(open));
  ownerAddMenu.style.display = open ? "grid" : "";
  ownerAddToggle.setAttribute("aria-expanded", String(open));
}

ownerAddToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setOwnerAddMenuOpen(ownerAddMenu?.hidden ?? true, "auto");
  setNotificationMenuOpen(false);
});

ownerAddMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
  const item = event.target.closest("[data-owner-action-tab]");
  if (!item) return;
  const targetTab = item.dataset.ownerActionTab || "queue";
  if (item.hidden || item.disabled || item.classList.contains("is-screen-hidden") || item.classList.contains("is-locked") || !canAccessOwnerTab(targetTab)) {
    showToast(ownerRestrictedMessage(targetTab));
    logOwnerActivity("restricted_owner_menu_attempt", { tab: targetTab, source: "plus_menu" });
    setOwnerAddMenuOpen(false);
    return;
  }
  activateOwnerTab(targetTab);
  setOwnerAddMenuOpen(false);
});

function setNotificationMenuOpen(open) {
  if (!notificationMenu || !notificationToggle) return;
  notificationMenu.hidden = !open;
  notificationToggle.setAttribute("aria-expanded", String(open));
}

function eventPathIncludes(event, element) {
  if (!element) return false;
  if (typeof event.composedPath === "function") return event.composedPath().includes(element);
  return element.contains(event.target);
}

ownerNotificationPopups?.addEventListener("click", (event) => {
  const popup = event.target.closest(".owner-notification-popup");
  const action = event.target.closest("[data-popup-action]");
  if (!popup || !action) return;

  if (action.dataset.popupAction === "open") {
    activateOwnerTab(popup.dataset.notificationTab || "queue");
    dismissOwnerNotificationPopup(popup);
    return;
  }

  dismissOwnerNotificationPopup(popup);
});

ownerNotificationPopups?.addEventListener("pointerenter", (event) => {
  const popup = event.target.closest(".owner-notification-popup");
  if (popup) pauseOwnerPopupTimer(popup);
}, true);

ownerNotificationPopups?.addEventListener("pointerleave", (event) => {
  const popup = event.target.closest(".owner-notification-popup");
  if (popup) startOwnerPopupTimer(popup);
}, true);

ownerNotificationPopups?.addEventListener("focusin", (event) => {
  const popup = event.target.closest(".owner-notification-popup");
  if (popup) pauseOwnerPopupTimer(popup);
});

ownerNotificationPopups?.addEventListener("focusout", (event) => {
  const popup = event.target.closest(".owner-notification-popup");
  if (popup && !popup.contains(event.relatedTarget)) startOwnerPopupTimer(popup);
});

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

ownerFastLaneList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-fast-action]");
  if (!item) return;
  const id = item.dataset.fastId || "";
  if (item.dataset.fastAction === "request") {
    activateOwnerTab("queue");
    requestList?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const appointment = state.appointments.find((entry) => entry.id === id);
  if (appointment?.contact) copyText(appointment.contact, "คัดลอกช่องทางติดต่อแล้ว");
});

ownerTeamList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-team-action='remove']");
  if (!button || !remoteMode || !state.shop?.id || !canManageOwnerTeam()) return;
  const item = button.closest("[data-team-user-id]");
  const userId = item?.dataset.teamUserId || "";
  const member = ownerTeamMembers.find((entry) => entry.userId === userId);
  if (!member) return;

  const confirmed = await confirmOwnerAction({
    title: "ลบสิทธิ์นี้หรือไม่",
    message: `${member.email || "บัญชีนี้"} จะไม่เห็นหลังบ้านร้านนี้`,
    actionText: "ลบสิทธิ์"
  });
  if (!confirmed) return;

  button.disabled = true;
  try {
    await window.FahNailSupabase.removeShopMember(state.shop.id, userId);
    ownerTeamMembers = ownerTeamMembers.filter((entry) => entry.userId !== userId);
    renderOwnerTeam();
    showToast("ลบสิทธิ์แล้ว");
  } catch (error) {
    console.warn("Remove owner team member failed", error);
    showToast(error?.message?.includes("SHOP_LAST_OWNER_REQUIRED") ? "ต้องมีเจ้าของร้านอย่างน้อย 1 คน" : "ยังลบสิทธิ์ไม่สำเร็จ");
  } finally {
    button.disabled = false;
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !ownerApp.hidden) renderNotifications();
});

document.addEventListener("click", (event) => {
  const clickedOwnerAdd = eventPathIncludes(event, ownerAddMenu) || eventPathIncludes(event, ownerAddToggle);
  if (!clickedOwnerAdd) setOwnerAddMenuOpen(false);

  const clickedNotification = eventPathIncludes(event, notificationMenu) || eventPathIncludes(event, notificationToggle);
  if (!clickedNotification) setNotificationMenuOpen(false);

  const quickAction = event.target.closest(".owner-quick-action[data-owner-action-tab]");
  if (quickAction) {
    const targetTab = quickAction.dataset.ownerActionTab || "queue";
    if (quickAction.classList.contains("is-locked") || !canAccessOwnerTab(targetTab)) {
      showToast(ownerRestrictedMessage(targetTab));
      logOwnerActivity("restricted_owner_menu_attempt", { tab: targetTab, source: "quick_action" });
    } else {
      activateOwnerTab(targetTab);
    }
  }

  const copyButton = event.target.closest("[data-copy-contact]");
  if (copyButton) copyContact(copyButton.dataset.copyContact);
});

setupOwnerTabs();
initOwnerAccess();
