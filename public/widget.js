(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var slug = script.getAttribute("data-slug");
  var label = script.getAttribute("data-label") || "Reservar hora";
  var color = script.getAttribute("data-color") || "#0ea5e9";
  var baseUrl = script.src.replace("/widget.js", "");

  if (!slug) return;

  var style = document.createElement("style");
  style.textContent = [
    "#amok-btn{position:fixed;bottom:24px;right:24px;z-index:99998;background:" + color + ";color:#fff;border:none;border-radius:999px;padding:14px 22px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 24px rgba(14,165,233,.4);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;gap:8px;transition:transform .2s,box-shadow .2s}",
    "#amok-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(14,165,233,.5)}",
    "#amok-overlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px}",
    "#amok-overlay.open{display:flex}",
    "#amok-modal{position:relative;width:100%;max-width:480px;height:90vh;max-height:720px;border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}",
    "#amok-close{position:absolute;top:12px;right:12px;z-index:10;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.5);border:none;cursor:pointer;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .2s}",
    "#amok-close:hover{background:rgba(0,0,0,.8)}",
    "#amok-frame{width:100%;height:100%;border:none;display:block}",
  ].join("");
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "amok-btn";
  btn.setAttribute("aria-label", label);
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + label;

  var overlay = document.createElement("div");
  overlay.id = "amok-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  var modal = document.createElement("div");
  modal.id = "amok-modal";

  var closeBtn = document.createElement("button");
  closeBtn.id = "amok-close";
  closeBtn.setAttribute("aria-label", "Cerrar");
  closeBtn.innerHTML = "&#x2715;";

  var iframe = document.createElement("iframe");
  iframe.id = "amok-frame";
  iframe.setAttribute("title", "Reservar hora — AgendaMok");
  iframe.setAttribute("loading", "lazy");
  iframe.allow = "payment";

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(btn);
  document.body.appendChild(overlay);

  function open() {
    if (!iframe.src) iframe.src = baseUrl + "/book/" + slug;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
