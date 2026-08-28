const registerForm = document.getElementById("register-form");
const registerLoginButton = document.getElementById("register-login-button");
const registerAuthActions = document.getElementById("register-auth-actions");
const registerStatus = document.getElementById("register-status");
const shopName = document.getElementById("shop-name");
const shopSlug = document.getElementById("shop-slug");
const slugPreview = document.getElementById("slug-preview");
const dashboardPreview = document.getElementById("dashboard-preview");
const registerSuccess = document.getElementById("register-success");
const registerBookingLink = document.getElementById("register-booking-link");
const registerDashboardLink = document.getElementById("register-dashboard-link");
const pageLoader = document.getElementById("page-loader");
const pageLoaderTitle = document.getElementById("page-loader-title");
const pageLoaderCopy = document.getElementById("page-loader-copy");
const toast = document.getElementById("toast");

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

function updatePreview() {
  const slug = normalizeSlug(shopSlug.value || shopName.value) || "your-shop";
  slugPreview.textContent = slug === "fah-nail" ? "/fah" : `/${slug}`;
  dashboardPreview.textContent = slug === "fah-nail" ? "/fah-owner" : `/${slug}-owner`;
  if (shopSlug.value !== slug && document.activeElement !== shopSlug) {
    shopSlug.value = slug === "your-shop" ? "" : slug;
  }
}

function showRegisterSuccess(shop) {
  const urls = window.FahNailSupabase.shopUrls(shop.slug);
  registerForm.hidden = true;
  registerAuthActions.hidden = true;
  registerStatus.textContent = `สร้าง ${shop.name} สำเร็จ`;
  if (registerBookingLink) registerBookingLink.href = urls.booking;
  if (registerDashboardLink) registerDashboardLink.href = urls.dashboard;
  if (registerSuccess) registerSuccess.hidden = false;
}

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

async function initRegister() {
  setPageLoading(true, "กำลังตรวจสอบบัญชี", "กำลังดูสถานะเข้าสู่ระบบก่อนสร้างร้าน");
  if (!window.FahNailSupabase?.isConfigured()) {
    registerStatus.textContent = "ระบบยังไม่พร้อมให้ลงทะเบียนร้านจริง";
    registerLoginButton.disabled = true;
    setPageLoading(false);
    return;
  }

  try {
    const { data, error } = await window.FahNailSupabase.client().auth.getSession();
    if (error) {
      registerStatus.textContent = "ยังตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ";
      return;
    }

    if (data.session) {
      registerAuthActions.hidden = true;
      registerForm.hidden = false;
      registerStatus.textContent = "กรอกชื่อร้านและ URL ที่ต้องการได้เลย";
    }
  } finally {
    setPageLoading(false);
  }
}

registerLoginButton.addEventListener("click", async () => {
  try {
    setPageLoading(true, "กำลังเปิด Google Login", "กำลังส่งคุณไปยืนยันบัญชี Google");
    const isLocalPreview = ["file:", "http:"].includes(window.location.protocol)
      && ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
    await window.FahNailSupabase.client().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/register`
      }
    });
  } catch (error) {
    setPageLoading(false);
    console.warn("Register login failed", error);
    showToast("ยังเข้าสู่ระบบไม่สำเร็จ");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const name = formData.get("shopName").trim();
  const slug = normalizeSlug(formData.get("shopSlug"));

  if (!name || slug.length < 3) {
    showToast("กรุณากรอกชื่อร้านและ URL อย่างน้อย 3 ตัวอักษร");
    return;
  }

  try {
    setPageLoading(true, "กำลังสร้างร้าน", "กำลังบันทึกข้อมูลและเตรียมหลังบ้านร้านใหม่");
    registerStatus.textContent = "กำลังสร้างร้าน...";
    const shop = await window.FahNailSupabase.registerShop(name, slug);
    showToast("สร้างร้านสำเร็จ");
    showRegisterSuccess(shop);
  } catch (error) {
    setPageLoading(false);
    console.warn("Register shop failed", error);
    registerStatus.textContent = "ยังสร้างร้านไม่สำเร็จ กรุณาลอง URL อื่นหรือตรวจสิทธิ์บัญชี";
  }
});

shopName.addEventListener("input", updatePreview);
shopSlug.addEventListener("input", () => {
  shopSlug.value = normalizeSlug(shopSlug.value);
  updatePreview();
});

updatePreview();
initRegister();
