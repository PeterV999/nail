const STORAGE_KEY = "fah-nail-booking-demo";

const timeWindows = [
  "08:00-10:00",
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00"
];

const defaultState = {
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
const bookingForm = document.getElementById("booking-form");
const manualForm = document.getElementById("manual-form");
const serviceForm = document.getElementById("service-form");
const serviceError = document.getElementById("service-error");
const toast = document.getElementById("toast");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    return JSON.parse(saved);
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

function busyWindows() {
  return new Set(state.appointments
    .filter((appointment) => appointment.status === "confirmed")
    .map((appointment) => appointment.timeWindow));
}

function render() {
  renderServices();
  renderTimeWindows();
  renderMiniCalendar();
  renderOwnerLists();
  renderManualOptions();
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
  timeOptions.innerHTML = "";

  timeWindows.forEach((timeWindow) => {
    const isBusy = busy.has(timeWindow);
    const button = document.createElement("button");
    button.type = "button";
    button.className = selectedTime === timeWindow ? "choice active" : "choice";
    button.disabled = isBusy;
    button.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span>${timeWindow}<small>${isBusy ? "เต็มแล้ว" : "เลือกช่วงนี้"}</small></span>
    `;
    button.addEventListener("click", () => {
      selectedTime = timeWindow;
      renderTimeWindows();
    });
    timeOptions.append(button);
  });

  if (busy.has(selectedTime)) {
    selectedTime = "";
  }
}

function renderMiniCalendar() {
  const busy = busyWindows();
  miniCalendar.innerHTML = "";

  timeWindows.forEach((timeWindow) => {
    const row = document.createElement("div");
    row.className = busy.has(timeWindow) ? "mini-slot busy" : "mini-slot";
    row.innerHTML = `<span>${timeWindow}</span><span class="status-pill">${busy.has(timeWindow) ? "ไม่ว่าง" : "ว่าง"}</span>`;
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
    return;
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
        <span>${escapeHtml(item.timeWindow)}</span>
        <span>${escapeHtml(item.services.join(", "))}</span>
        <span>${sourceText}</span>
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
      confirm.disabled = busyWindows().has(item.timeWindow);
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
  const busy = busyWindows();
  manualTime.innerHTML = "";
  timeWindows.forEach((timeWindow) => {
    const option = document.createElement("option");
    option.value = timeWindow;
    option.disabled = busy.has(timeWindow);
    option.textContent = busy.has(timeWindow) ? `${timeWindow} ไม่ว่าง` : timeWindow;
    manualTime.append(option);
  });

  manualService.innerHTML = "";
  activeServices().forEach((service) => {
    const option = document.createElement("option");
    option.value = service.name;
    option.textContent = service.name;
    manualService.append(option);
  });
}

function confirmRequest(id) {
  const request = state.requests.find((item) => item.id === id);
  if (!request) return;

  if (busyWindows().has(request.timeWindow)) {
    showToast("ช่วงเวลานี้ไม่ว่างแล้ว");
    return;
  }

  state.appointments.push({
    id: `APT-${Date.now()}`,
    customerName: request.customerName,
    contact: request.contact,
    services: request.services,
    timeWindow: request.timeWindow,
    status: "confirmed",
    source: "customer_request"
  });
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
    timeWindow: selectedTime,
    note: formData.get("note").trim(),
    status: "pending_request",
    source: "customer_request"
  });

  bookingForm.reset();
  selectedServices.clear();
  selectedTime = "";
  saveState();
  render();
  showToast("ส่งคำขอจองแล้ว ร้านจะติดต่อกลับ");
});

manualForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(manualForm);
  const timeWindow = formData.get("timeWindow");

  if (busyWindows().has(timeWindow)) {
    showToast("ช่วงเวลานี้ไม่ว่างแล้ว");
    return;
  }

  state.appointments.unshift({
    id: `APT-${Date.now()}`,
    customerName: formData.get("customerName").trim(),
    contact: formData.get("contact").trim(),
    services: [formData.get("serviceId")],
    timeWindow,
    status: "confirmed",
    source: "admin"
  });

  manualForm.reset();
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
    walk_in: "Walk-in",
    phone: "โทรจอง",
    line: "LINE",
    facebook: "Facebook",
    admin: "เจ้าของร้านลงเอง"
  }[source] || "หลังบ้าน";
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

render();
