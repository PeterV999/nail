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

const serviceOptions = document.getElementById("service-options");
const timeOptions = document.getElementById("time-options");
const miniCalendar = document.getElementById("mini-calendar");
const bookingDate = document.getElementById("booking-date");
const bookingForm = document.getElementById("booking-form");
const serviceError = document.getElementById("service-error");
const statusDateTitle = document.getElementById("status-date-title");
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
  renderServices();
  renderTimeWindows();
  renderMiniCalendar();
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

bookingForm.addEventListener("submit", (event) => {
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

  state.requests.unshift({
    id: `REQ-${Date.now()}`,
    customerName: formData.get("customerName").trim(),
    contact: formData.get("contact").trim(),
    services: Array.from(selectedServices),
    bookingDate: formData.get("bookingDate"),
    timeWindow: selectedTime,
    note: formData.get("note").trim(),
    status: "pending_request",
    source: "customer_request"
  });

  bookingForm.reset();
  bookingDate.value = today;
  selectedServices.clear();
  selectedTime = "";
  saveState();
  render();
  showToast("ส่งคำขอจองแล้ว ร้านจะติดต่อกลับ");
});

bookingDate.addEventListener("change", render);

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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

bookingDate.value = today;
bookingDate.min = today;
render();
