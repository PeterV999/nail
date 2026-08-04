const registerForm = document.getElementById("register-form");
const registerLoginButton = document.getElementById("register-login-button");
const registerAuthActions = document.getElementById("register-auth-actions");
const registerStatus = document.getElementById("register-status");
const shopName = document.getElementById("shop-name");
const shopSlug = document.getElementById("shop-slug");
const slugPreview = document.getElementById("slug-preview");
const dashboardPreview = document.getElementById("dashboard-preview");
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
  slugPreview.textContent = slug;
  dashboardPreview.textContent = slug;
  if (shopSlug.value !== slug && document.activeElement !== shopSlug) {
    shopSlug.value = slug === "your-shop" ? "" : slug;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function initRegister() {
  if (!window.FahNailSupabase?.isConfigured()) {
    registerStatus.textContent = "ยังไม่ได้ตั้งค่า Supabase จึงยังลงทะเบียนร้านจริงไม่ได้";
    registerLoginButton.disabled = true;
    return;
  }

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
}

registerLoginButton.addEventListener("click", async () => {
  try {
    await window.FahNailSupabase.client().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/register`
      }
    });
  } catch (error) {
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
    registerStatus.textContent = "กำลังสร้างร้าน...";
    const shop = await window.FahNailSupabase.registerShop(name, slug);
    showToast("สร้างร้านสำเร็จ");
    window.location.href = window.FahNailSupabase.shopUrls(shop.slug).dashboard;
  } catch (error) {
    console.warn("Register shop failed", error);
    registerStatus.textContent = "ยังสร้างร้านไม่สำเร็จ กรุณาลอง URL อื่นหรือตรวจสิทธิ์ Supabase";
  }
});

shopName.addEventListener("input", updatePreview);
shopSlug.addEventListener("input", () => {
  shopSlug.value = normalizeSlug(shopSlug.value);
  updatePreview();
});

updatePreview();
initRegister();
