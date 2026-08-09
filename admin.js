const adminAuthPanel = document.getElementById("admin-auth-panel");
const adminApp = document.getElementById("admin-app");
const adminGoogleLoginButton = document.getElementById("admin-google-login-button");
const adminAuthLogoutButton = document.getElementById("admin-auth-logout-button");
const adminAuthStatus = document.getElementById("admin-auth-status");
const adminAuthCopy = document.getElementById("admin-auth-copy");
const adminAccount = document.getElementById("admin-account");
const adminLogoutButton = document.getElementById("admin-logout-button");
const refreshAdminButton = document.getElementById("refresh-admin-button");
const adminStats = document.getElementById("admin-stats");
const adminAttentionList = document.getElementById("admin-attention-list");
const adminShopList = document.getElementById("admin-shop-list");
const adminShopSearch = document.getElementById("admin-shop-search");
const adminResultCount = document.getElementById("admin-result-count");
const adminFilterButtons = Array.from(document.querySelectorAll("[data-filter-group]"));
const adminShopDialog = document.getElementById("admin-shop-dialog");
const adminShopForm = document.getElementById("admin-shop-form");
const adminShopName = document.getElementById("admin-shop-name");
const adminShopTagline = document.getElementById("admin-shop-tagline");
const adminShopPhone = document.getElementById("admin-shop-phone");
const adminShopLine = document.getElementById("admin-shop-line");
const adminShopFacebook = document.getElementById("admin-shop-facebook");
const adminShopStatus = document.getElementById("admin-shop-status");
const adminDialogCancel = document.getElementById("admin-dialog-cancel");
const adminDialogSave = document.getElementById("admin-dialog-save");
const pageLoader = document.getElementById("page-loader");
const pageLoaderTitle = document.getElementById("page-loader-title");
const pageLoaderCopy = document.getElementById("page-loader-copy");
const toast = document.getElementById("toast");

const adminState = {
  shops: [],
  stats: {},
  editingShopId: "",
  filters: {
    query: "",
    status: "all"
  }
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setPageLoading(active, title = "", copy = "") {
  if (!pageLoader) return;
  if (title && pageLoaderTitle) pageLoaderTitle.textContent = title;
  if (copy && pageLoaderCopy) pageLoaderCopy.textContent = copy;
  pageLoader.hidden = !active;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function shopLogoMarkup(shop) {
  const fallback = escapeHtml(shopInitials(shop.name));
  if (!shop.logoUrl) return `<span class="admin-shop-logo">${fallback}</span>`;
  return `
    <span class="admin-shop-logo has-logo">
      <img src="${escapeHtml(shop.logoUrl)}" alt="" data-logo-fallback="${fallback}">
    </span>
  `;
}

function bindShopLogoFallbacks(scope = document) {
  scope.querySelectorAll("[data-logo-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      const parent = image.parentElement;
      if (!parent) return;
      parent.classList.remove("has-logo");
      parent.textContent = image.dataset.logoFallback || "FN";
    }, { once: true });
  });
}

function showAuth(message = "") {
  setPageLoading(false);
  adminAuthPanel.hidden = false;
  adminApp.hidden = true;
  if (message) adminAuthStatus.textContent = message;
}

function showApp() {
  setPageLoading(false);
  adminAuthPanel.hidden = true;
  adminApp.hidden = false;
}

async function initAdmin() {
  setPageLoading(true, "กำลังโหลดหลังบ้านกลาง", "กำลังตรวจสิทธิ์และดึงภาพรวมร้านค้า");
  if (!window.FahNailSupabase?.isConfigured()) {
    adminGoogleLoginButton.disabled = true;
    showAuth("ยังเปิดข้อมูลจริงไม่ได้ กรุณาตรวจการตั้งค่าระบบ");
    return;
  }

  try {
    const { data, error } = await window.FahNailSupabase.client().auth.getSession();
    if (error) throw error;

    if (!data.session) {
      showAuth();
      return;
    }

    showApp();
    renderLoadingState();
    await loadAdminState();
  } catch (error) {
    console.warn("Admin init failed", error);
    showAuth("ยังตรวจสอบสิทธิ์ ??????????????? ไม่สำเร็จ");
  }
}

async function loadAdminState() {
  setPageLoading(true, "กำลังโหลดข้อมูลร้านค้า", "กำลังดึงตัวเลขรวมและรายการร้าน");
  refreshAdminButton.disabled = true;
  try {
    const overview = await window.FahNailSupabase.loadPlatformAdminOverview();
    if (!overview?.isPlatformAdmin) {
      adminAuthCopy.textContent = "บัญชีนี้ยังไม่มีสิทธิ์ ???????????????";
      adminAuthLogoutButton.hidden = false;
      showAuth("ให้เพิ่มบัญชีนี้ใน ?????????????????????? ก่อนใช้งานหลังบ้านกลาง");
      return;
    }

    adminState.shops = overview.shops || [];
    adminState.stats = overview.stats || calculateStats(adminState.shops);
    adminAccount.textContent = overview.user?.email || "???????????????";
    renderAdmin();
    showApp();
  } catch (error) {
    console.warn("Load platform admin failed", error);
    adminShopList.innerHTML = `<p class="empty-state">ยังโหลดข้อมูลร้านค้าไม่สำเร็จ ตรวจสิทธิ์บัญชีแล้วรีเฟรชอีกครั้ง</p>`;
    showToast("ยังโหลดข้อมูลร้านค้าไม่สำเร็จ");
  } finally {
    setPageLoading(false);
    refreshAdminButton.disabled = false;
  }
}

function renderLoadingState() {
  adminStats.innerHTML = skeletonStats(6);
  adminAttentionList.innerHTML = `<p class="empty-state">กำลังตรวจสอบร้านที่ควรดูต่อ...</p>`;
  adminShopList.innerHTML = `<p class="empty-state">กำลังโหลดรายการร้านค้า...</p>`;
}

function skeletonStats(count) {
  return Array.from({ length: count }, () => `
    <div class="stat-chip admin-stat-chip is-loading">
      <strong>...</strong>
      <span>กำลังโหลด</span>
    </div>
  `).join("");
}

function renderAdmin() {
  adminState.stats = calculateStats(adminState.shops, adminState.stats);
  renderStats();
  renderAttention();
  renderFilterControls();
  renderShopList();
}

function calculateStats(shops, remoteStats = {}) {
  const computedStats = {
    totalShops: shops.length,
    activeShops: shops.filter((shop) => shop.status === "active").length,
    inactiveShops: shops.filter((shop) => shop.status !== "active").length,
    pendingRequests: shops.reduce((sum, shop) => sum + Number(shop.pendingRequests || 0), 0),
    todayAppointments: shops.reduce((sum, shop) => sum + Number(shop.todayAppointments || 0), 0),
    tomorrowAppointments: shops.reduce((sum, shop) => sum + Number(shop.tomorrowAppointments || 0), 0),
    upcomingAppointments: shops.reduce((sum, shop) => sum + Number(shop.upcomingAppointments || 0), 0),
    needsAttention: shops.filter(shopNeedsAttention).length
  };
  return { ...remoteStats, ...computedStats };
}

function renderStats() {
  const stats = adminState.stats || {};
  const items = [
    { label: "ร้านทั้งหมด", value: stats.totalShops || 0, tone: "" },
    { label: "เปิดใช้งาน", value: stats.activeShops || 0, tone: "good" },
    { label: "ปิดใช้งาน", value: stats.inactiveShops || 0, tone: "muted" },
    { label: "คิววันนี้", value: stats.todayAppointments || 0, tone: "" },
    { label: "รอยืนยัน", value: stats.pendingRequests || 0, tone: stats.pendingRequests ? "warn" : "" },
    { label: "ต้องตรวจสอบ", value: stats.needsAttention || 0, tone: stats.needsAttention ? "warn" : "" }
  ];

  adminStats.innerHTML = items.map((item) => `
    <div class="stat-chip admin-stat-chip ${escapeHtml(item.tone)}">
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
    </div>
  `).join("");
}

function renderAttention() {
  const attentionShops = [...adminState.shops]
    .filter(shopNeedsAttention)
    .sort((a, b) => attentionScore(b) - attentionScore(a))
    .slice(0, 4);

  if (!attentionShops.length) {
    adminAttentionList.innerHTML = `<p class="empty-state">ยังไม่มีร้านที่ต้องตรวจสอบเป็นพิเศษตอนนี้</p>`;
    return;
  }

  adminAttentionList.innerHTML = attentionShops.map((shop) => `
    <article class="admin-attention-item">
      <div>
        <strong>${escapeHtml(shop.name)}</strong>
        <span>${escapeHtml(attentionReasons(shop).join(" · "))}</span>
      </div>
      <a class="secondary-button" href="${escapeHtml(shopUrl(shop.slug, "dashboard"))}">เปิดหลังบ้าน</a>
    </article>
  `).join("");
}

function shopNeedsAttention(shop) {
  return Number(shop.pendingRequests || 0) > 0
    || shop.status !== "active";
}

function attentionScore(shop) {
  return (Number(shop.pendingRequests || 0) * 10)
    + (shop.status !== "active" ? 5 : 0);
}

function attentionReasons(shop) {
  const reasons = [];
  if (Number(shop.pendingRequests || 0) > 0) reasons.push(`${shop.pendingRequests} คำขอรอยืนยัน`);
  if (shop.status !== "active") reasons.push("ร้านปิดใช้งาน");
  return reasons;
}

function renderFilterControls() {
  adminFilterButtons.forEach((button) => {
    const group = button.dataset.filterGroup;
    button.classList.toggle("is-active", adminState.filters[group] === button.dataset.filterValue);
  });
}

function filteredShops() {
  const query = adminState.filters.query.trim().toLowerCase();
  return adminState.shops.filter((shop) => {
    if (adminState.filters.status !== "all" && shop.status !== adminState.filters.status) return false;

    if (!query) return true;
    const haystack = [
      shop.name,
      shop.slug,
      shop.phone,
      shop.lineId,
      shop.facebookPage,
      shop.tagline
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function renderShopList() {
  if (!adminState.shops.length) {
    adminResultCount.textContent = "";
    adminShopList.innerHTML = `<p class="empty-state">ยังไม่มีร้านค้าในระบบ เพิ่มร้านใหม่จากเมนูด้านบนได้เลย</p>`;
    return;
  }

  const shops = filteredShops();
  adminResultCount.textContent = `แสดง ${shops.length} จาก ${adminState.shops.length} ร้าน`;

  if (!shops.length) {
    adminShopList.innerHTML = `<p class="empty-state">ไม่พบร้านที่ตรงกับตัวกรอง ลองล้างคำค้นหาหรือเปลี่ยนสถานะที่เลือก</p>`;
    return;
  }

  adminShopList.innerHTML = shops.map((shop) => shopCard(shop)).join("");
  bindShopLogoFallbacks(adminShopList);
}

function shopCard(shop) {
  const statusText = shop.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน";
  const lastUpdated = formatDateTime(shop.updatedAt);
  const reasons = attentionReasons(shop);

  return `
    <article class="admin-shop-card ${shopNeedsAttention(shop) ? "needs-attention" : ""}" data-shop-id="${escapeHtml(shop.id)}">
      <div class="admin-shop-top">
        <div class="admin-shop-identity">
          ${shopLogoMarkup(shop)}
          <div>
            <div class="admin-shop-badges">
              <span class="status-pill ${shop.status === "active" ? "" : "muted"}">${escapeHtml(statusText)}</span>
            </div>
            <h3>${escapeHtml(shop.name)}</h3>
            ${shop.tagline ? `<p class="admin-shop-tagline">${escapeHtml(shop.tagline)}</p>` : ""}
            <p>${escapeHtml(shopUrl(shop.slug, "booking"))} · อัปเดต ${escapeHtml(lastUpdated)}</p>
          </div>
        </div>
        <button class="secondary-button" type="button" data-action="edit">แก้ข้อมูลร้าน</button>
      </div>

      <div class="admin-shop-metrics">
        <span><strong>${escapeHtml(shop.todayAppointments)}</strong> คิววันนี้</span>
        <span><strong>${escapeHtml(shop.tomorrowAppointments)}</strong> คิวพรุ่งนี้</span>
        <span><strong>${escapeHtml(shop.upcomingAppointments)}</strong> คิว 7 วัน</span>
        <span><strong>${escapeHtml(shop.pendingRequests)}</strong> รอยืนยัน</span>
      </div>

      <div class="admin-shop-contact">
        <span>${escapeHtml(contactValue("โทร", shop.phone))}</span>
        <span>${escapeHtml(contactValue("LINE", shop.lineId))}</span>
        <span>${escapeHtml(contactValue("Facebook", shop.facebookPage))}</span>
      </div>

      ${reasons.length ? `<div class="admin-shop-warning">${escapeHtml(reasons.join(" · "))}</div>` : ""}

      <div class="admin-shop-actions">
        <a class="primary-button" href="${escapeHtml(shopUrl(shop.slug, "dashboard"))}">เปิดหลังบ้านร้าน</a>
        <a class="secondary-button" href="${escapeHtml(shopUrl(shop.slug, "booking"))}">ดูหน้าลูกค้า</a>
      </div>
    </article>
  `;
}

function shopUrl(slug, type) {
  const urls = window.FahNailSupabase?.shopUrls?.(slug);
  if (urls?.[type]) return urls[type];
  const encoded = encodeURIComponent(slug);
  return type === "dashboard" ? `/o/${encoded}` : `/b/${encoded}`;
}

function contactValue(label, value) {
  return value ? `${label}: ${value}` : `${label}: ยังไม่มี`;
}

function formatDateTime(value) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ยังไม่มีข้อมูล";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function openEditor(shopId) {
  const shop = adminState.shops.find((item) => item.id === shopId);
  if (!shop) return;

  adminState.editingShopId = shop.id;
  adminShopName.value = shop.name || "";
  adminShopTagline.value = shop.tagline || "";
  adminShopPhone.value = shop.phone || "";
  adminShopLine.value = shop.lineId || "";
  adminShopFacebook.value = shop.facebookPage || "";
  adminShopStatus.value = shop.status || "active";
  adminShopDialog.showModal();
}

adminGoogleLoginButton.addEventListener("click", async () => {
  try {
    const isLocalPreview = ["file:", "http:"].includes(window.location.protocol)
      && ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
    await window.FahNailSupabase.client().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: isLocalPreview ? `${window.location.origin}/admin/` : `${window.location.origin}/admin`
      }
    });
  } catch (error) {
    console.warn("Admin login failed", error);
    showToast("ยังเข้าสู่ระบบ Google ไม่สำเร็จ");
  }
});

async function signOutAdmin() {
  try {
    await window.FahNailSupabase.signOut();
    showAuth("ออกจากระบบแล้ว");
  } catch (error) {
    console.warn("Admin logout failed", error);
    showToast("ยังออกจากระบบไม่สำเร็จ");
  }
}

adminAuthLogoutButton.addEventListener("click", signOutAdmin);
adminLogoutButton.addEventListener("click", signOutAdmin);
refreshAdminButton.addEventListener("click", async () => {
  try {
    renderLoadingState();
    await loadAdminState();
    showToast("รีเฟรชข้อมูลแล้ว");
  } catch (error) {
    console.warn("Admin refresh failed", error);
    showToast("ยังรีเฟรชข้อมูลไม่สำเร็จ");
  }
});

adminShopSearch.addEventListener("input", () => {
  adminState.filters.query = adminShopSearch.value;
  renderShopList();
});

adminFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    adminState.filters[button.dataset.filterGroup] = button.dataset.filterValue;
    renderFilterControls();
    renderShopList();
  });
});

adminShopList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='edit']");
  if (!button) return;
  const card = button.closest("[data-shop-id]");
  openEditor(card?.dataset.shopId || "");
});

adminDialogCancel.addEventListener("click", () => {
  adminShopDialog.close();
});

adminShopForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminState.editingShopId) return;

  const changes = {
    name: adminShopName.value.trim(),
    tagline: adminShopTagline.value.trim(),
    phone: adminShopPhone.value.trim(),
    lineId: adminShopLine.value.trim(),
    facebookPage: adminShopFacebook.value.trim(),
    status: adminShopStatus.value
  };

  if (!changes.name) {
    showToast("กรุณาใส่ชื่อร้าน");
    return;
  }

  adminDialogSave.disabled = true;
  try {
    const updatedShop = await window.FahNailSupabase.updatePlatformShopSettings(adminState.editingShopId, changes);
    adminState.shops = adminState.shops.map((shop) => (
      shop.id === updatedShop.id ? { ...shop, ...updatedShop } : shop
    ));
    renderAdmin();
    adminShopDialog.close();
    showToast("บันทึกข้อมูลร้านแล้ว");
  } catch (error) {
    console.warn("Update platform shop failed", error);
    showToast("ยังบันทึกข้อมูลร้านไม่สำเร็จ");
  } finally {
    adminDialogSave.disabled = false;
  }
});

adminShopDialog.addEventListener("click", (event) => {
  if (event.target === adminShopDialog) adminShopDialog.close();
});

initAdmin();
