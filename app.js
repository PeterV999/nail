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
  requests: [
    {
      id: "REQ-1001",
      customerName: "คุณมายด์",
      contact: "LINE mind.nail",
      services: ["สีเจล", "เพ้นท์ลาย"],
      bookingDate: today,
      timeWindow: "10:00-12:00",
      note: "อยากได้สีชมพูใส",
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
  ]
};

let state = loadState();
let selectedServices = new Set();
let selectedTime = "";

const serviceOptions = document.getElementById("service-options");
const timeOptions = document.getElementById("time-options");
const miniCalendar = document.getElementById("mini-calendar");
const requestList = document.getElementById("request-list");
const ownerServiceList = document.getElementById("owner-service-list");
const manualTime = document.getElementById("manual-time");
const manualService = document.getElementById("manual-service");
const bookingDate = document.getElementById("booking-date");
const manualDate = document.getElementById("manual-date");
const scheduleDate = document.getElementById("schedule-date");
const closedDayToggle = document.getElementById("closed-day-toggle");
const calendarStatus = document.getElementById("calendar-status");
const calendarSelect = document.getElementById("calendar-select");
const connectCalendarButton = document.getElementById("connect-calendar-button");
const syncCalendarButton = document.getElementById("sync-calendar-button");
const disconnectCalendarButton = document.getElementById("disconnect-calendar-button");
const bookingForm = document.getElementById("booking-form");
const manualForm = document.getElementById("manual-form");
const serviceForm = document.getElementById("service-form");
const slotForm = document.getElementById("slot-form");
const serviceError = document.getElementById("service-error");
const statusDateTitle = document.getElementById("status-date-title");
const ownerTimeSlotList = document.getElementById("owner-time-slot-list");
const toast = document.getElementById("toast");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    parsed.requests = (parsed.requests || []).map((item) => ({ ...item, bookingDate: item.bookingDate || today }));
    parsed.appointments = (parsed.appointments || []).map((item) => ({ ...item, bookingDate: item.bookingDate || today }));
    parsed.timeSlots = normalizeTimeSlots(parsed.timeSlots || defaultTimeSlots);
    parsed.closedDates = parsed.closedDates || [];
    parsed.calendarIntegration = parsed.calendarIntegration || structuredClone(defaultState.calendarIntegration);
    return parsed;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeServices() {
  return state.services.filter((service) => service.active);
}

function normalizeTimeSlots(slots) {
  return slots
    .map((slot) => {
      if (typeof slot === "string") {
        const [startTime, endTime] = slot.split("-");
        return {
          id: `slot-${startTime.replace(":", "")}`,
          startTime,
          endTime,
          active: true
        };
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

function timeSlotLabel(slot) {
  return `${slot.startTime}-${slot.endTime}`;
}

function timeSlots() {
  state.timeSlots = normalizeTimeSlots(state.timeSlots || defaultTimeSlots);
  return state.timeSlots;
}

function selectedBookingDate() {
  return bookingDate.value || today;
}

function selectedManualDate() {
  return manualDate.value || selectedBookingDate();
}

function selectedScheduleDate() {
  return scheduleDate.value || selectedBookingDate();
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
  renderOwnerLists();
  renderManualOptions();
  renderTimeManager();
  renderCalendarIntegration();
}

function renderServices() {
  serviceOptions.innerHTML = "";

  activeServices().forEach((service) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedServices.has(service.name) ? "choice active" : "choice";
    button.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${service.name}</span>`;
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
  statusDateTitle.textContent = thaiDate(selectedBookingDate());

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
    const statusText = item.status === "confirmed" ? "ยืนยันแล้ว" : "รอยืนยัน";
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

      actions.append(confirm, reject);
      card.append(actions);
    }

    requestList.append(card);
  });

  renderOwnerServices();
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
      service.active = !service.active;
      saveState();
      render();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.textContent = "-";
    remove.title = "ลบบริการ";
    remove.addEventListener("click", () => {
      state.services = state.services.filter((item) => item.id !== service.id);
      selectedServices.delete(service.name);
      saveState();
      render();
    });

    row.append(toggle, remove);
    ownerServiceList.append(row);
  });
}

function renderManualOptions() {
  const busy = busyWindows(selectedManualDate());
  const date = selectedManualDate();
  manualTime.innerHTML = "";
  manualService.innerHTML = "";

  activeServices().forEach((service) => {
    const option = document.createElement("option");
    option.value = service.name;
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

function confirmRequest(id) {
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
  state.requests = state.requests.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("ยืนยันคิวแล้ว และช่วงเวลานี้จะกดไม่ได้ในหน้าลูกค้า");
}

function rejectRequest(id) {
  state.requests = state.requests.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("ปฏิเสธคำขอจองแล้ว");
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

manualForm.addEventListener("submit", (event) => {
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

  state.appointments.unshift(syncCalendarEvent({
    id: `APT-${Date.now()}`,
    customerName: formData.get("customerName").trim(),
    contact: formData.get("contact").trim(),
    services: [formData.get("serviceId")],
    bookingDate: bookingDateValue,
    timeWindow,
    status: "confirmed",
    source: "admin"
  }));

  manualForm.reset();
  manualDate.value = today;
  saveState();
  render();
  showToast("บันทึกคิวโดยเจ้าของร้านแล้ว");
});

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(serviceForm);
  const serviceName = formData.get("serviceName").trim();

  if (!serviceName) return;

  state.services.push({
    id: `service-${Date.now()}`,
    name: serviceName,
    active: true
  });
  serviceForm.reset();
  saveState();
  render();
  showToast("เพิ่มบริการแล้ว");
});

slotForm.addEventListener("submit", (event) => {
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

  state.timeSlots.push({
    id: `slot-${Date.now()}`,
    startTime,
    endTime,
    active: true
  });
  state.timeSlots = normalizeTimeSlots(state.timeSlots);
  slotForm.reset();
  saveState();
  render();
  showToast("เพิ่มช่วงเวลารับจองแล้ว");
});

document.querySelectorAll("[data-view-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.viewLink);
  });
});

document.getElementById("seed-button").addEventListener("click", () => {
  state = structuredClone(defaultState);
  selectedServices.clear();
  selectedTime = "";
  saveState();
  render();
  showToast("เติมข้อมูลตัวอย่างแล้ว");
});

bookingDate.addEventListener("change", () => {
  renderTimeWindows();
  renderMiniCalendar();
  renderManualOptions();
});

manualDate.addEventListener("change", renderManualOptions);

scheduleDate.addEventListener("change", renderTimeManager);

closedDayToggle.addEventListener("change", () => {
  const date = selectedScheduleDate();
  if (closedDayToggle.checked) {
    if (!state.closedDates.includes(date)) state.closedDates.push(date);
  } else {
    state.closedDates = state.closedDates.filter((item) => item !== date);
  }
  saveState();
  render();
  showToast(closedDayToggle.checked ? "ปิดรับจองทั้งวันแล้ว" : "เปิดรับจองวันนี้แล้ว");
});

connectCalendarButton.addEventListener("click", () => {
  const selectedOption = calendarSelect.selectedOptions[0];
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

disconnectCalendarButton.addEventListener("click", () => {
  state.calendarIntegration = structuredClone(defaultState.calendarIntegration);
  saveState();
  render();
  showToast("ยกเลิกการเชื่อมต่อปฏิทินแล้ว");
});

syncCalendarButton.addEventListener("click", () => {
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

function setView(view) {
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.viewLink === view);
  });
  document.getElementById("customer-view").classList.toggle("active", view === "customer");
  document.getElementById("owner-view").classList.toggle("active", view === "owner");
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
    toggle.addEventListener("click", () => {
      slot.active = !slot.active;
      saveState();
      render();
      showToast(slot.active ? "เปิดช่วงเวลานี้แล้ว" : "ปิดช่วงเวลานี้แล้ว");
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.textContent = "-";
    remove.title = "ลบช่วงเวลา";
    remove.addEventListener("click", () => {
      const label = timeSlotLabel(slot);
      state.timeSlots = state.timeSlots.filter((item) => item.id !== slot.id);
      if (selectedTime === label) selectedTime = "";
      saveState();
      render();
      showToast("ลบช่วงเวลาแล้ว");
    });

    row.append(toggle, remove);
    ownerTimeSlotList.append(row);
  });
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

function syncCalendarEvent(appointment) {
  const integration = state.calendarIntegration || defaultState.calendarIntegration;
  if (!integration.connected) return appointment;

  return {
    ...appointment,
    googleCalendarEventId: `gcal-${appointment.id}`,
    googleCalendarName: integration.calendarName
  };
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
manualDate.value = today;
scheduleDate.value = today;
bookingDate.min = today;
manualDate.min = today;
scheduleDate.min = today;
render();
