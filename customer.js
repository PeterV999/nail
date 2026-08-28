const STORAGE_KEY = "bookingnail-local-state";
const LEGACY_STORAGE_KEY = "fah-nail-booking-demo";
const SERVICE_LIMIT = 4;
const today = localDateString();

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
  timeSlots: defaultTimeSlots,
  closedDates: [],
  services: [
    { id: "gel", name: "สีเจล", active: true },
    { id: "art", name: "เพ้นท์ลาย", active: true },
    { id: "extension", name: "ต่อเล็บ", active: true },
    { id: "hand-spa", name: "สปามือ", active: true },
    { id: "foot-spa", name: "สปาเท้า", active: true }
  ],
  requests: [],
  appointments: []
};

let state = loadState();
let selectedServices = new Set();
let selectedTime = "";
let currentShopSlug = window.FahNailSupabase?.routeShopSlug?.() || "fah-nail";

const serviceOptions = document.getElementById("service-options");
const timeOptions = document.getElementById("time-options");
const miniCalendar = document.getElementById("mini-calendar");
const bookingDate = document.getElementById("booking-date");
const bookingDateDisplay = document.getElementById("booking-date-display");
const dateQuickOptions = document.getElementById("date-quick-options");
const calendarOpenButton = document.getElementById("calendar-open-button");
const calendarSheet = document.getElementById("calendar-sheet");
const calendarSheetTitle = document.getElementById("calendar-sheet-title");
const calendarSheetGrid = document.getElementById("calendar-sheet-grid");
const calendarPrevMonth = document.getElementById("calendar-prev-month");
const calendarNextMonth = document.getElementById("calendar-next-month");
const calendarConfirmButton = document.getElementById("calendar-confirm-button");
const bookingForm = document.getElementById("booking-form");
const customerSection = document.getElementById("customer");
const homePreview = document.getElementById("home-preview");
const serviceError = document.getElementById("service-error");
const privacyConsent = document.getElementById("privacy-consent");
const privacyError = document.getElementById("privacy-error");
const turnstileField = document.getElementById("turnstile-field");
const turnstileWidget = document.getElementById("turnstile-widget");
const turnstileError = document.getElementById("turnstile-error");
const statusDateTitle = document.getElementById("status-date-title");
const pageLoader = document.getElementById("page-loader");
const pageLoaderTitle = document.getElementById("page-loader-title");
const pageLoaderCopy = document.getElementById("page-loader-copy");
const customerHeroLead = document.querySelector(".hero-copy .lead");
const defaultCustomerHeroLead = customerHeroLead?.textContent || "";
const toast = document.getElementById("toast");
const bookingSuccessDialog = document.getElementById("booking-success-dialog");
const bookingSuccessSummary = document.getElementById("booking-success-summary");
const bookingDialogClose = document.getElementById("booking-dialog-close");
const ownerReturnLink = document.getElementById("owner-return-link");
const bookingNextButton = document.getElementById("booking-next-button");
const bookingBackButton = document.getElementById("booking-back-button");
const bookingStepPanels = document.querySelectorAll("[data-booking-step]");
const bookingStepIndicators = document.querySelectorAll("[data-step-indicator]");
let turnstileWidgetId = "";
let turnstileToken = "";
let bookingStep = "details";
let calendarViewDate = parseLocalDate(today);

function isHomePreviewRoute() {
  const path = window.location.pathname.replace(/\/+$/g, "") || "/";
  return path === "/" || path === "/index.html";
}

function renderHomePreview() {
  document.body.removeAttribute("data-shop-theme");
  if (homePreview) homePreview.hidden = false;
  if (customerSection) customerSection.hidden = true;
  if (ownerReturnLink) ownerReturnLink.hidden = true;

  const brand = document.querySelector(".brand");
  const brandMark = document.querySelector(".brand-mark");
  const brandName = document.querySelector(".brand strong");
  const brandSmall = document.querySelector(".brand small");
  if (brand) brand.href = "/";
  if (brandMark) {
    brandMark.classList.add("has-logo", "app-logo-mark");
    brandMark.dataset.appLogo = "true";
    brandMark.innerHTML = `<img src="assets/bookingnail-icononly-pastel.png" alt="">`;
  }
  if (brandName) brandName.textContent = "BookingNail";
  if (brandSmall) brandSmall.textContent = "ตัวอย่างแพลตฟอร์ม";
  document.title = "BookingNail | ตัวอย่างระบบจองคิว";
  renderHomeShopList();
}

async function renderHomeShopList() {
  const homeShopList = document.getElementById("home-shop-list");
  if (!homeShopList) return;

  const fallbackShops = [{ name: "Fah Nail", slug: "fah-nail", tagline: "ร้านตัวอย่างที่เชื่อมข้อมูลจริง" }];
  let shops = fallbackShops;

  try {
    const remoteShops = await window.FahNailSupabase?.listPublicShops?.();
    if (remoteShops?.length) shops = remoteShops;
  } catch (error) {
    console.warn("Load home shops failed", error);
  }

  homeShopList.innerHTML = shops.map((shop) => homeShopCard(shop)).join("");
  homeShopList.querySelectorAll("[data-logo-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      const mark = image.closest(".brand-mark");
      if (!mark) return;
      mark.classList.remove("has-logo");
      mark.textContent = image.dataset.logoFallback || "BN";
    }, { once: true });
  });
}

function homeShopCard(shop) {
  const urls = window.FahNailSupabase?.shopUrls?.(shop.slug) || { booking: "/fah", dashboard: "/fah-owner" };
  const initials = escapeHtml(shopInitials(shop.name));
  const displayPath = urls.booking || "/fah";
  const shopDescription = shop.tagline || displayPath;
  const logo = shop.logoUrl
    ? `<div class="brand-mark has-logo"><img src="${escapeHtml(shop.logoUrl)}" alt="" data-logo-fallback="${initials}"></div>`
    : `<div class="brand-mark">${initials}</div>`;

  return `
    <article class="home-shop-card">
      ${logo}
      <div>
        <h3>${escapeHtml(shop.name || shop.slug)}</h3>
        <p>${escapeHtml(shopDescription)}</p>
      </div>
      <div class="home-shop-actions">
        <a class="owner-link" href="${escapeHtml(urls.booking)}">จองคิว</a>
        <a class="owner-link muted" href="${escapeHtml(urls.dashboard)}">หลังบ้าน</a>
      </div>
    </article>
  `;
}

function turnstileSiteKey() {
  return window.FAH_NAIL_CONFIG?.turnstileSiteKey || "";
}

function isLocalTurnstileBypass() {
  return window.location.protocol === "file:"
    || window.location.hostname === "localhost"
    || window.location.hostname === "127.0.0.1";
}

function isTurnstileRequired() {
  return Boolean(turnstileSiteKey()) && !isLocalTurnstileBypass() && !isHomePreviewRoute();
}

function initTurnstile() {
  if (!turnstileField || !turnstileWidget) return;

  if (!isTurnstileRequired()) {
    turnstileField.hidden = true;
    return;
  }

  turnstileField.hidden = false;
  if (bookingStep !== "contact") return;

  if (turnstileWidgetId) return;

  if (!window.turnstile?.render) {
    window.setTimeout(initTurnstile, 300);
    return;
  }

  try {
    turnstileWidgetId = window.turnstile.render("#turnstile-widget", {
      sitekey: turnstileSiteKey(),
      action: "booking_request",
      theme: "light",
      size: "flexible",
      callback(token) {
        turnstileToken = token;
        if (turnstileError) turnstileError.hidden = true;
      },
      "expired-callback"() {
        turnstileToken = "";
        if (turnstileError) turnstileError.hidden = false;
      },
      "error-callback"() {
        turnstileToken = "";
        if (turnstileError) turnstileError.hidden = false;
      }
    });
  } catch (error) {
    turnstileWidgetId = "";
    turnstileToken = "";
    console.warn("Turnstile render failed", error);
    if (turnstileError) {
      turnstileError.textContent = "ระบบยืนยันความปลอดภัยยังไม่พร้อม กรุณารอสักครู่แล้วลองอีกครั้ง";
      turnstileError.hidden = false;
    }
  }
}

function currentTurnstileToken() {
  if (!isTurnstileRequired()) return "";
  if (turnstileWidgetId && window.turnstile?.getResponse) {
    return window.turnstile.getResponse(turnstileWidgetId) || turnstileToken;
  }
  return turnstileToken;
}

function resetTurnstile() {
  turnstileToken = "";
  if (turnstileWidgetId && window.turnstile?.reset) {
    window.turnstile.reset(turnstileWidgetId);
  }
}

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
      timeSlots: normalizeTimeSlots(parsed.timeSlots || defaultTimeSlots),
      closedDates: parsed.closedDates || []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
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

function selectedBookingDate() {
  return bookingDate.value || today;
}

function isDayClosed(date) {
  return state.closedDates.includes(date);
}

function isSlotOpen(date, slot) {
  return slot.active && !isDayClosed(date);
}

function busyWindows(date = selectedBookingDate()) {
  return new Set(state.appointments
    .filter((appointment) => appointment.status === "confirmed" && appointment.bookingDate === date)
    .map((appointment) => appointment.timeWindow));
}

function render() {
  renderShopChrome();
  renderServices();
  renderDateQuickOptions();
  renderTimeWindows();
  renderMiniCalendar();
  renderCalendarSheet();
}

function renderShopChrome() {
  const shop = state.shop || { name: "Fah Nail", slug: currentShopSlug };
  window.BookingNailTheme?.applyShopTheme?.(shop.themeKey);
  const urls = window.FahNailSupabase?.shopUrls?.(shop.slug || currentShopSlug) || {
    booking: "index.html",
    dashboard: "/fah-owner",
    register: "/register"
  };
  const brand = document.querySelector(".brand");
  const brandMark = document.querySelector(".brand-mark");
  const brandName = document.querySelector(".brand strong");
  const heroEyebrow = document.querySelector(".hero-copy .eyebrow");
  if (brand) brand.href = urls.booking;
  if (ownerReturnLink) ownerReturnLink.href = urls.dashboard;
  renderBrandMark(brandMark, shop);
  if (brandName) brandName.textContent = shop.name || "Fah Nail";
  if (heroEyebrow) heroEyebrow.textContent = shop.name || "Fah Nail";
  if (customerHeroLead) customerHeroLead.textContent = shop.tagline || defaultCustomerHeroLead;
  document.title = `จองคิว ${shop.name || "Fah Nail"}`;
}

async function updateOwnerReturnLink() {
  if (!ownerReturnLink) return;
  ownerReturnLink.hidden = true;

  try {
    const authState = await window.FahNailSupabase?.ownerSession?.(currentShopSlug);
    ownerReturnLink.hidden = !(authState?.configured && authState?.session && authState?.member);
  } catch (error) {
    const isMissingSession = error?.name === "AuthSessionMissingError" || String(error?.message || "").includes("Auth session missing");
    if (!isMissingSession) console.warn("Owner shortcut check failed", error);
    ownerReturnLink.hidden = true;
  }
}

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

function renderBrandMark(element, shop) {
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

function renderServices() {
  const services = activeServices();
  serviceOptions.innerHTML = "";

  if (!services.length) {
    serviceOptions.setAttribute("aria-disabled", "true");
    serviceOptions.innerHTML = '<div class="empty-state">ยังไม่มีบริการที่เปิดรับจอง</div>';
    selectedServices.clear();
    updateBookingStepper();
    return;
  }

  serviceOptions.removeAttribute("aria-disabled");
  if (!services.some((service) => selectedServices.has(service.name))) {
    selectedServices.clear();
    selectedServices.add(services[0].name);
  }

  services.forEach((service) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedServices.has(service.name) ? "service-choice active" : "service-choice";
    button.setAttribute("aria-pressed", selectedServices.has(service.name) ? "true" : "false");
    button.dataset.serviceName = service.name;
    button.innerHTML = '<span class="service-check" aria-hidden="true"></span><span>' + escapeHtml(service.name) + '</span>';
    button.addEventListener("click", () => toggleService(service.name));
    serviceOptions.append(button);
  });

  updateBookingStepper();
}

function toggleService(serviceName) {
  if (selectedServices.has(serviceName)) {
    if (selectedServices.size > 1) selectedServices.delete(serviceName);
  } else if (selectedServices.size < SERVICE_LIMIT) {
    selectedServices.add(serviceName);
  } else {
    serviceError.textContent = "เลือกบริการได้สูงสุด " + SERVICE_LIMIT + " รายการ";
    serviceError.hidden = false;
    return;
  }

  serviceError.textContent = "กรุณาเลือกบริการอย่างน้อย 1 รายการ";
  serviceError.hidden = true;
  renderServices();
}

function renderDateQuickOptions() {
  if (!dateQuickOptions) return;
  const selectedDate = selectedBookingDate();
  dateQuickOptions.innerHTML = "";

  for (let offset = 0; offset < 7; offset += 1) {
    const date = parseLocalDate(today);
    date.setDate(date.getDate() + offset);
    const value = localDateString(date);
    const availability = dateAvailability(value);
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["date-quick-chip", availability.status, value === selectedDate ? "active" : ""].filter(Boolean).join(" ");
    button.disabled = availability.disabled && value !== selectedDate;
    button.setAttribute("aria-pressed", value === selectedDate ? "true" : "false");
    button.innerHTML = `
      <span class="quick-day-label">${offset === 0 ? "วันนี้" : weekdayShort(value)}</span>
      <strong>${date.getDate()}</strong>
      <small>${monthShort(value)}</small>
      <em>${availability.label}</em>
    `;
    button.addEventListener("click", () => selectBookingDate(value));
    dateQuickOptions.append(button);
  }
}

function selectBookingDate(value) {
  if (!bookingDate || !value) return;
  bookingDate.value = value;
  calendarViewDate = parseLocalDate(value);
  selectedTime = "";
  render();
}

function openDatePicker() {
  openCalendarSheet();
}

function openCalendarSheet() {
  if (!calendarSheet) return;
  calendarViewDate = parseLocalDate(selectedBookingDate());
  renderCalendarSheet();

  if (typeof calendarSheet.showModal === "function") {
    calendarSheet.showModal();
    return;
  }

  calendarSheet.hidden = false;
  calendarSheet.classList.add("open");
}

function closeCalendarSheet() {
  if (!calendarSheet) return;

  if (calendarSheet.open && typeof calendarSheet.close === "function") {
    calendarSheet.close();
    return;
  }

  calendarSheet.classList.remove("open");
  calendarSheet.hidden = true;
}

function renderCalendarSheet() {
  if (!calendarSheetGrid || !calendarSheetTitle) return;

  const monthStart = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
  const monthEnd = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0);
  const selectedDate = selectedBookingDate();
  calendarSheetTitle.textContent = new Intl.DateTimeFormat("th-TH", { month: "short", year: "numeric" }).format(monthStart);
  calendarSheetGrid.innerHTML = "";

  for (let blank = 0; blank < monthStart.getDay(); blank += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-day-spacer";
    calendarSheetGrid.append(spacer);
  }

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
    const value = localDateString(date);
    const availability = dateAvailability(value);
    const isPast = value < today;
    const isSelected = value === selectedDate;
    const isToday = value === today;
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["calendar-day-cell", availability.status, isSelected ? "active" : "", isToday ? "today" : ""].filter(Boolean).join(" ");
    button.disabled = isPast || (availability.disabled && !isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    button.innerHTML = `
      <strong>${day}</strong>
      <span>${isToday ? "วันนี้" : availability.shortLabel}</span>
    `;
    button.addEventListener("click", () => selectBookingDate(value));
    calendarSheetGrid.append(button);
  }
}

function changeCalendarMonth(offset) {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + offset, 1);
  renderCalendarSheet();
}
function renderTimeWindows() {
  const busy = busyWindows();
  const date = selectedBookingDate();
  timeOptions.innerHTML = "";
  let firstAvailableTime = "";

  timeSlots().forEach((slot) => {
    const timeWindow = timeSlotLabel(slot);
    const isBusy = busy.has(timeWindow);
    const isClosed = !isSlotOpen(date, slot);
    if (!firstAvailableTime && !isBusy && !isClosed) firstAvailableTime = timeWindow;
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["choice", selectedTime === timeWindow ? "active" : "", isBusy ? "full" : "", isClosed ? "closed" : ""].filter(Boolean).join(" ");
    button.disabled = isBusy || isClosed;
    button.innerHTML = `
      <span class="slot-time">${slot.startTime}</span>
      <small class="slot-availability">${slotStatusText(date, slot, isBusy)}</small>
    `;
    button.addEventListener("click", () => {
      selectedTime = timeWindow;
      renderTimeWindows();
    });
    timeOptions.append(button);
  });

  const selectedSlot = timeSlots().find((slot) => timeSlotLabel(slot) === selectedTime);
  if (busy.has(selectedTime) || !selectedSlot || !isSlotOpen(date, selectedSlot)) {
    selectedTime = firstAvailableTime;
    if (selectedTime) renderTimeWindows();
    return;
  }
  updateBookingStepper();
}

function renderMiniCalendar() {
  const busy = busyWindows();
  const date = selectedBookingDate();
  miniCalendar.innerHTML = "";
  statusDateTitle.textContent = thaiDate(date);
  updateBookingDateDisplay();

  timeSlots().forEach((slot) => {
    const timeWindow = timeSlotLabel(slot);
    const isClosed = !isSlotOpen(date, slot);
    const isBusy = busy.has(timeWindow);
    const row = document.createElement("div");
    row.className = isBusy || isClosed ? "mini-slot busy" : "mini-slot";
    row.innerHTML = `<span>${timeWindow}</span><span class="status-pill">${miniSlotStatusText(date, slot, isBusy)}</span>`;
    miniCalendar.append(row);
  });
}

function updateBookingDateDisplay() {
  if (bookingDateDisplay) bookingDateDisplay.textContent = thaiDate(selectedBookingDate());
}

function setBookingStep(step) {
  bookingStep = step;
  bookingStepPanels.forEach((panel) => {
    panel.hidden = panel.dataset.bookingStep !== step;
  });
  updateBookingStepper();
  if (step === "contact") initTurnstile();
  bookingForm?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateBookingStepper() {
  const hasService = selectedServices.size > 0;
  const hasDate = Boolean(selectedBookingDate());
  const hasTime = Boolean(selectedTime);
  bookingStepIndicators.forEach((indicator) => {
    const step = indicator.dataset.stepIndicator;
    const isActive = step === "contact" ? bookingStep === "contact" : bookingStep === "details";
    const isComplete = (step === "details" && hasService)
      || (step === "date" && hasDate)
      || (step === "time" && hasTime)
      || (step === "contact" && bookingStep === "contact");
    indicator.classList.toggle("is-active", isActive);
    indicator.classList.toggle("is-complete", isComplete);
  });
}

function validateBookingDetails() {
  if (selectedServices.size === 0) {
    serviceError.hidden = false;
    serviceOptions?.focus();
    return false;
  }

  if (!selectedTime) {
    showToast("กรุณาเลือกช่วงเวลาที่สะดวก");
    timeOptions?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  return true;
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);

  if (!validateBookingDetails()) return;

  if (!privacyConsent?.checked) {
    if (privacyError) privacyError.hidden = false;
    privacyConsent?.focus();
    return;
  }

  const turnstileResponse = currentTurnstileToken();
  if (isTurnstileRequired() && !turnstileResponse) {
    initTurnstile();
    if (turnstileError) {
      turnstileError.textContent = "กรุณายืนยันว่าไม่ใช่บอทก่อนส่งคำขอจอง";
      turnstileError.hidden = false;
    }
    turnstileField.hidden = false;
    turnstileWidget?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const request = {
    id: `REQ-${Date.now()}`,
    customerName: formData.get("customerName").trim(),
    contact: formData.get("contact").trim(),
    services: Array.from(selectedServices),
    bookingDate: formData.get("bookingDate"),
    timeWindow: selectedTime,
    note: formData.get("note").trim(),
    status: "pending_request",
    source: "customer_request"
  };

  state.requests.unshift(request);

  bookingForm.reset();
  bookingDate.value = today;
  if (privacyError) privacyError.hidden = true;
  selectedServices.clear();
  selectedTime = "";
  setBookingStep("details");
  saveState();
  render();

  try {
    setPageLoading(true, "กำลังส่งคำขอจอง", "กำลังบันทึกข้อมูลและตรวจสอบช่วงเวลาล่าสุด");
    await window.FahNailSupabase?.createBookingRequest(request, state, { turnstileToken: turnstileResponse });
    setPageLoading(false);
    resetTurnstile();
    showBookingSuccessDialog(request);
  } catch (error) {
    setPageLoading(false);
    resetTurnstile();
    console.warn("Supabase booking request failed", error);
    const errorText = `${error?.message || ""} ${error?.details || ""}`;
    if (errorText.includes("TURNSTILE_")) {
      state.requests = state.requests.filter((item) => item.id !== request.id);
      saveState();
      render();
      showToast("กรุณายืนยันอีกครั้งก่อนส่งคำขอจอง");
      return;
    }

    if (error?.code === "23505" || errorText.includes("DUPLICATE_BOOKING_REQUEST")) {
      state.requests = state.requests.filter((item) => item.id !== request.id);
      saveState();
      render();
      showToast("คุณส่งคำขอช่วงเวลานี้ไว้แล้ว ร้านจะติดต่อกลับ");
      return;
    }

    if (errorText.includes("BOOKING_REQUEST_RATE_LIMITED")) {
      state.requests = state.requests.filter((item) => item.id !== request.id);
      saveState();
      render();
      showToast("ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่");
      return;
    }

    if (errorText.includes("BOOKING_SLOT_NOT_AVAILABLE")) {
      state.requests = state.requests.filter((item) => item.id !== request.id);
      saveState();
      await init();
      showToast("ช่วงเวลานี้ไม่ว่างแล้ว กรุณาเลือกช่วงใหม่");
      return;
    }

    if (window.FahNailSupabase?.isConfigured?.()) {
      state.requests = state.requests.filter((item) => item.id !== request.id);
      saveState();
      render();
      showToast("ยังส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }

    showBookingSuccessDialog(request);
  }
});

bookingNextButton?.addEventListener("click", () => {
  if (validateBookingDetails()) setBookingStep("contact");
});
bookingBackButton?.addEventListener("click", () => setBookingStep("details"));
bookingDateDisplay?.addEventListener("click", openDatePicker);
bookingDate.addEventListener("click", openDatePicker);
bookingDate.addEventListener("change", () => selectBookingDate(bookingDate.value));
calendarOpenButton?.addEventListener("click", openCalendarSheet);
calendarPrevMonth?.addEventListener("click", () => changeCalendarMonth(-1));
calendarNextMonth?.addEventListener("click", () => changeCalendarMonth(1));
calendarConfirmButton?.addEventListener("click", closeCalendarSheet);
calendarSheet?.addEventListener("click", (event) => {
  if (event.target === calendarSheet) closeCalendarSheet();
});
privacyConsent?.addEventListener("change", () => {
  if (privacyConsent.checked && privacyError) privacyError.hidden = true;
});
bookingDialogClose?.addEventListener("click", closeBookingSuccessDialog);
bookingSuccessDialog?.addEventListener("click", (event) => {
  if (event.target === bookingSuccessDialog) closeBookingSuccessDialog();
});

function slotStatusText(date, slot, isBusy = false) {
  if (isDayClosed(date)) return "ปิด";
  if (!slot.active) return "ปิด";
  if (isBusy) return "เต็ม";
  return "ว่าง";
}

function dateAvailability(date) {
  if (date < today) {
    return { status: "closed", label: "ผ่านแล้ว", shortLabel: "ผ่านแล้ว", disabled: true, availableCount: 0 };
  }

  if (isDayClosed(date)) {
    return { status: "closed", label: "ปิด", shortLabel: "ปิด", disabled: true, availableCount: 0 };
  }

  const busy = busyWindows(date);
  const availableCount = timeSlots().filter((slot) => isSlotOpen(date, slot) && !busy.has(timeSlotLabel(slot))).length;

  if (!availableCount) {
    return { status: "full", label: "เต็ม", shortLabel: "เต็ม", disabled: true, availableCount: 0 };
  }

  return {
    status: "available",
    label: "ว่าง " + availableCount + " คิว",
    shortLabel: "ว่าง " + availableCount,
    disabled: false,
    availableCount
  };
}

function miniSlotStatusText(date, slot, isBusy = false) {
  if (isDayClosed(date)) return "หยุดร้าน";
  if (!slot.active) return "ปิด";
  if (isBusy) return "ไม่ว่าง";
  return "ว่าง";
}

function thaiDate(value) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(parseLocalDate(value));
}

function shortThaiDate(value) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short"
  }).format(parseLocalDate(value));
}

function weekdayShort(value) {
  return new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(parseLocalDate(value));
}

function monthShort(value) {
  return new Intl.DateTimeFormat("th-TH", { month: "short" }).format(parseLocalDate(value));
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function showBookingSuccessDialog(request) {
  if (bookingSuccessSummary) {
    bookingSuccessSummary.textContent = `${thaiDate(request.bookingDate)} | ${request.timeWindow} | ${request.services.join(", ")}`;
  }

  if (!bookingSuccessDialog) {
    showToast("ส่งคำขอจองแล้ว ร้านจะติดต่อกลับ");
    return;
  }

  if (typeof bookingSuccessDialog.showModal === "function") {
    bookingSuccessDialog.showModal();
    return;
  }

  bookingSuccessDialog.hidden = false;
  bookingSuccessDialog.classList.add("open");
}

function closeBookingSuccessDialog() {
  if (!bookingSuccessDialog) return;

  if (bookingSuccessDialog.open && typeof bookingSuccessDialog.close === "function") {
    bookingSuccessDialog.close();
    return;
  }

  bookingSuccessDialog.classList.remove("open");
  bookingSuccessDialog.hidden = true;
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

async function init() {
  if (isHomePreviewRoute()) {
    setPageLoading(false);
    renderHomePreview();
    return;
  }

  setPageLoading(true, "กำลังโหลดข้อมูลร้าน", "กำลังดึงบริการ เวลา และคิวล่าสุด");
  bookingDate.value = today;
  bookingDate.min = today;

  try {
    const remoteState = await window.FahNailSupabase?.loadPublicState(defaultState);
    if (remoteState) {
      state = remoteState;
      currentShopSlug = remoteState.shop?.slug || currentShopSlug;
      saveState();
    }
  } catch (error) {
    console.warn("Supabase public load failed", error);
  } finally {
    setPageLoading(false);
  }

  render();
  await updateOwnerReturnLink();
}

init();
