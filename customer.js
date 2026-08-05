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
const bookingForm = document.getElementById("booking-form");
const serviceError = document.getElementById("service-error");
const statusDateTitle = document.getElementById("status-date-title");
const pageLoader = document.getElementById("page-loader");
const pageLoaderTitle = document.getElementById("page-loader-title");
const pageLoaderCopy = document.getElementById("page-loader-copy");
const toast = document.getElementById("toast");
const bookingSuccessDialog = document.getElementById("booking-success-dialog");
const bookingSuccessSummary = document.getElementById("booking-success-summary");
const bookingDialogClose = document.getElementById("booking-dialog-close");

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
      timeSlots: normalizeTimeSlots(parsed.timeSlots || defaultTimeSlots),
      closedDates: parsed.closedDates || []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
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
  renderTimeWindows();
  renderMiniCalendar();
}

function renderShopChrome() {
  const shop = state.shop || { name: "Fah Nail", slug: currentShopSlug };
  const urls = window.FahNailSupabase?.shopUrls?.(shop.slug || currentShopSlug) || {
    booking: "index.html",
    dashboard: "owner.html",
    register: "register.html"
  };
  const brand = document.querySelector(".brand");
  const brandName = document.querySelector(".brand strong");
  const heroEyebrow = document.querySelector(".hero-copy .eyebrow");
  if (brand) brand.href = urls.booking;
  if (brandName) brandName.textContent = shop.name || "Fah Nail";
  if (heroEyebrow) heroEyebrow.textContent = shop.name || "Fah Nail";
  document.title = `จองคิว ${shop.name || "Fah Nail"}`;
}

function renderServices() {
  serviceOptions.innerHTML = "";

  activeServices().forEach((service) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedServices.has(service.name) ? "choice active" : "choice";
    button.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${escapeHtml(service.name)}</span>`;
    button.addEventListener("click", () => {
      if (selectedServices.has(service.name)) {
        selectedServices.delete(service.name);
      } else {
        selectedServices.add(service.name);
      }
      serviceError.hidden = true;
      renderServices();
    });
    serviceOptions.append(button);
  });
}

function renderTimeWindows() {
  const busy = busyWindows();
  const date = selectedBookingDate();
  timeOptions.innerHTML = "";

  timeSlots().forEach((slot) => {
    const timeWindow = timeSlotLabel(slot);
    const isBusy = busy.has(timeWindow);
    const isClosed = !isSlotOpen(date, slot);
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedTime === timeWindow ? "choice active" : "choice";
    button.disabled = isBusy || isClosed;
    button.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span>${timeWindow}<small>${slotStatusText(date, slot, isBusy)}</small></span>
    `;
    button.addEventListener("click", () => {
      selectedTime = timeWindow;
      renderTimeWindows();
    });
    timeOptions.append(button);
  });

  const selectedSlot = timeSlots().find((slot) => timeSlotLabel(slot) === selectedTime);
  if (busy.has(selectedTime) || !selectedSlot || !isSlotOpen(date, selectedSlot)) {
    selectedTime = "";
  }
}

function renderMiniCalendar() {
  const busy = busyWindows();
  const date = selectedBookingDate();
  miniCalendar.innerHTML = "";
  statusDateTitle.textContent = thaiDate(date);

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

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);

  if (selectedServices.size === 0) {
    serviceError.hidden = false;
    return;
  }

  if (!selectedTime) {
    showToast("กรุณาเลือกช่วงเวลาที่สะดวก");
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
  selectedServices.clear();
  selectedTime = "";
  saveState();
  render();

  try {
    setPageLoading(true, "กำลังส่งคำขอจอง", "กำลังบันทึกข้อมูลและตรวจสอบช่วงเวลาล่าสุด");
    await window.FahNailSupabase?.createBookingRequest(request, state);
    setPageLoading(false);
    showBookingSuccessDialog(request);
  } catch (error) {
    setPageLoading(false);
    console.warn("Supabase booking request failed", error);
    const errorText = `${error?.message || ""} ${error?.details || ""}`;
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

bookingDate.addEventListener("change", render);
bookingDialogClose?.addEventListener("click", closeBookingSuccessDialog);
bookingSuccessDialog?.addEventListener("click", (event) => {
  if (event.target === bookingSuccessDialog) closeBookingSuccessDialog();
});

function slotStatusText(date, slot, isBusy = false) {
  if (isDayClosed(date)) return "หยุดร้าน";
  if (!slot.active) return "ปิดรับจอง";
  if (isBusy) return "เต็มแล้ว";
  return "เลือกช่วงนี้";
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
  }).format(new Date(`${value}T00:00:00`));
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
}

init();
