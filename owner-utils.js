(() => {
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
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

  function statusLabel(status) {
    return {
      pending_request: "รอยืนยัน",
      confirmed: "ยืนยันแล้ว",
      rejected: "ปฏิเสธแล้ว",
      cancelled: "ยกเลิกแล้ว",
      completed: "เสร็จแล้ว"
    }[status] || "รอยืนยัน";
  }

  function thaiDate(value) {
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(`${value}T00:00:00`));
  }

  function phoneHref(contact = "") {
    const normalized = String(contact).replace(/[^\d+]/g, "");
    const digits = normalized.replace(/\D/g, "");
    return digits.length >= 8 ? `tel:${normalized.startsWith("+") ? normalized : digits}` : "";
  }

  function serviceText(item) {
    const services = Array.isArray(item?.services) ? item.services.filter(Boolean) : [];
    return services.length ? services.join(", ") : "บริการ";
  }

  function contactActionsMarkup(contact = "", options = {}) {
    const value = String(contact || "").trim();
    if (!value) return "";

    const { showCopy = true, showPhone = true } = options;
    const callHref = phoneHref(value);
    if (!showCopy && (!showPhone || !callHref)) return "";

    return `
      <div class="contact-actions">
        ${showPhone && callHref ? `<a class="contact-button call" href="${escapeHtml(callHref)}">โทร</a>` : ""}
        ${showCopy ? `<button class="contact-button" type="button" data-copy-contact="${escapeHtml(value)}">คัดลอก</button>` : ""}
      </div>
    `;
  }

  window.BookingNailOwnerUtils = {
    contactActionsMarkup,
    escapeHtml,
    phoneHref,
    serviceText,
    sourceLabel,
    statusLabel,
    thaiDate
  };
})();
