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
const adminShopList = document.getElementById("admin-shop-list");
const adminShopDialog = document.getElementById("admin-shop-dialog");
const adminShopForm = document.getElementById("admin-shop-form");
const adminShopName = document.getElementById("admin-shop-name");
const adminShopPhone = document.getElementById("admin-shop-phone");
const adminShopLine = document.getElementById("admin-shop-line");
const adminShopFacebook = document.getElementById("admin-shop-facebook");
const adminShopStatus = document.getElementById("admin-shop-status");
const adminDialogCancel = document.getElementById("admin-dialog-cancel");
const adminDialogSave = document.getElementById("admin-dialog-save");
const toast = document.getElementById("toast");

const adminState = {
  shops: [],
  stats: {},
  editingShopId: ""
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showAuth(message = "") {
  adminAuthPanel.hidden = false;
  adminApp.hidden = true;
  if (message) adminAuthStatus.textContent = message;
}

function showApp() {
  adminAuthPanel.hidden = true;
  adminApp.hidden = false;
}

async function initAdmin() {
  if (!window.FahNailSupabase?.isConfigured()) {
    adminGoogleLoginButton.disabled = true;
    showAuth("ยังไม่ได้ตั้งค่า Supabase จึงเปิดหลังบ้านกลางไม่ได้");
    return;
  }

  try {
    const { data, error } = await window.FahNailSupabase.client().auth.getSession();
    if (error) throw error;

    if (!data.session) {
      showAuth();
      return;
    }

    await loadAdminState();
  } catch (error) {
    console.warn("Admin init failed", error);
    showAuth("ยังตรวจสอบสิทธิ์ global admin ไม่สำเร็จ");
  }
}

async function loadAdminState() {
  refreshAdminButton.disabled = true;
  try {
    const overview = await window.FahNailSupabase.loadPlatformAdminOverview();
    if (!overview?.isPlatformAdmin) {
      adminAuthCopy.textContent = "บัญชีนี้ยังไม่มีสิทธิ์ global admin";
      adminAuthLogoutButton.hidden = false;
      showAuth("ให้เพิ่มบัญชีนี้ใน platform_admins ก่อนใช้งานหลังบ้านกลาง");
      return;
    }

    adminState.shops = overview.shops || [];
    adminState.stats = overview.stats || {};
    adminAccount.textContent = overview.user?.email || "global admin";
    renderAdmin();
    showApp();
  } finally {
    refreshAdminButton.disabled = false;
  }
}

function renderAdmin() {
  renderStats();
  renderShopList();
}

function renderStats() {
  const stats = adminState.stats || {};
  const items = [
    { label: "ร้านทั้งหมด", value: stats.totalShops || 0 },
    { label: "ร้านเปิดใช้งาน", value: stats.activeShops || 0 },
    { label: "คิววันนี้", value: stats.todayAppointments || 0 },
    { label: "คำขอรอยืนยัน", value: stats.pendingRequests || 0 },
    { label: "เชื่อม Calendar", value: stats.calendarConnected || 0 }
  ];

  adminStats.innerHTML = items.map((item) => `
    <div class="stat-chip admin-stat-chip">
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
    </div>
  `).join("");
}

function renderShopList() {
  if (!adminState.shops.length) {
    adminShopList.innerHTML = `<p class="empty-state">ยังไม่มีร้านค้าในระบบ</p>`;
    return;
  }

  adminShopList.innerHTML = adminState.shops.map((shop) => {
    const statusText = shop.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน";
    const calendarText = shop.calendarConnected ? "เชื่อมแล้ว" : "ยังไม่เชื่อม";
    return `
      <article class="admin-shop-card" data-shop-id="${escapeHtml(shop.id)}">
        <div class="admin-shop-top">
          <div>
            <span class="status-pill ${shop.status === "active" ? "" : "muted"}">${escapeHtml(statusText)}</span>
            <h3>${escapeHtml(shop.name)}</h3>
            <p>${escapeHtml(`/book/${shop.slug}`)}</p>
          </div>
          <button class="secondary-button" type="button" data-action="edit">แก้ข้อมูลร้าน</button>
        </div>

        <div class="admin-shop-metrics">
          <span><strong>${escapeHtml(shop.todayAppointments)}</strong> คิววันนี้</span>
          <span><strong>${escapeHtml(shop.pendingRequests)}</strong> รอยืนยัน</span>
          <span><strong>${escapeHtml(calendarText)}</strong> Calendar</span>
        </div>

        <div class="admin-shop-contact">
          <span>${escapeHtml(shop.phone || "ยังไม่มีเบอร์")}</span>
          <span>${escapeHtml(shop.lineId || "ยังไม่มี LINE")}</span>
          <span>${escapeHtml(shop.facebookPage || "ยังไม่มี Facebook")}</span>
        </div>

        <div class="admin-shop-actions">
          <a class="primary-button" href="/dashboard/${encodeURIComponent(shop.slug)}">เปิดหลังบ้านร้าน</a>
          <a class="secondary-button" href="/book/${encodeURIComponent(shop.slug)}">ดูหน้าลูกค้า</a>
        </div>
      </article>
    `;
  }).join("");
}

function openEditor(shopId) {
  const shop = adminState.shops.find((item) => item.id === shopId);
  if (!shop) return;

  adminState.editingShopId = shop.id;
  adminShopName.value = shop.name || "";
  adminShopPhone.value = shop.phone || "";
  adminShopLine.value = shop.lineId || "";
  adminShopFacebook.value = shop.facebookPage || "";
  adminShopStatus.value = shop.status || "active";
  adminShopDialog.showModal();
}

adminGoogleLoginButton.addEventListener("click", async () => {
  try {
    await window.FahNailSupabase.client().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin`
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
    await loadAdminState();
    showToast("รีเฟรชข้อมูลแล้ว");
  } catch (error) {
    console.warn("Admin refresh failed", error);
    showToast("ยังรีเฟรชข้อมูลไม่สำเร็จ");
  }
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
    adminState.stats = {
      ...adminState.stats,
      activeShops: adminState.shops.filter((shop) => shop.status === "active").length
    };
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
