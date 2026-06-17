(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var business = script.getAttribute("data-business");
  var label = script.getAttribute("data-label") || "Reservar turno";
  var color = script.getAttribute("data-color") || "#6366f1";
  var baseUrl = script.src.replace("/widget.js", "");

  if (!business) return;

  // Estilos
  var style = document.createElement("style");
  style.textContent = [
    "#agendapro-btn{position:fixed;bottom:24px;right:24px;z-index:99998;background:" + color + ";color:#fff;border:none;border-radius:999px;padding:14px 22px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.18);font-family:system-ui,sans-serif;display:flex;align-items:center;gap:8px;transition:transform .15s,box-shadow .15s}",
    "#agendapro-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.22)}",
    "#agendapro-overlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);align-items:center;justify-content:center;padding:16px}",
    "#agendapro-overlay.open{display:flex}",
    "#agendapro-modal{background:#fff;border-radius:16px;width:100%;max-width:520px;height:80vh;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.3)}",
    "#agendapro-close{position:absolute;top:12px;right:14px;z-index:1;background:rgba(0,0,0,.12);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:16px;color:#333;display:flex;align-items:center;justify-content:center;line-height:1}",
    "#agendapro-frame{width:100%;height:100%;border:none;border-radius:16px}",
  ].join("");
  document.head.appendChild(style);

  // Botón
  var btn = document.createElement("button");
  btn.id = "agendapro-btn";
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + label;
  document.body.appendChild(btn);

  // Overlay + modal
  var overlay = document.createElement("div");
  overlay.id = "agendapro-overlay";

  var modal = document.createElement("div");
  modal.id = "agendapro-modal";

  var closeBtn = document.createElement("button");
  closeBtn.id = "agendapro-close";
  closeBtn.innerHTML = "&#x2715;";

  var iframe = document.createElement("iframe");
  iframe.id = "agendapro-frame";
  iframe.src = baseUrl + "/book/" + business + "?embed=1";
  iframe.allow = "payment";

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function open() { overlay.classList.add("open"); document.body.style.overflow = "hidden"; }
  function close() { overlay.classList.remove("open"); document.body.style.overflow = ""; }

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
