import { loadJSON } from "../app/config.js";
import { mode } from "../app/mode.js";

function currentFile(){
  const p = location.pathname.split("/").pop();
  return p || "index.html";
}

function createModal(){
  const overlay = document.createElement("div");
  overlay.className = "yt-modal-overlay";
  overlay.innerHTML = `
    <div class="yt-modal" role="dialog" aria-modal="true" aria-labelledby="yta-modal-title">
      <div class="yt-modal__head">
        <h2 id="yta-modal-title" class="yt-h2" style="margin:0">Parent access</h2>
        <button class="yt-btn yt-btn--ghost" type="button" data-modal-close aria-label="Close">✕</button>
      </div>
      <div class="yt-modal__body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

async function promptForPin({ kind }){
  // kind: "set" | "enter"
  return new Promise((resolve) => {
    const overlay = createModal();
    const body = overlay.querySelector(".yt-modal__body");

    const title = overlay.querySelector("#yta-modal-title");
    title.textContent = (kind === "set") ? "Set a Parent PIN" : "Enter Parent PIN";

    body.innerHTML = `
      <p class="yt-muted" style="margin-top:0">
        ${kind === "set"
          ? "Choose a 4-digit PIN to protect parent-only pages and controls."
          : "Enter your 4-digit PIN to switch to Parent mode."}
      </p>

      <form class="yt-form" id="yta-pin-form">
        <label class="yt-label" for="yta-pin">PIN</label>
        <input class="yt-input" id="yta-pin" inputmode="numeric" autocomplete="one-time-code"
               pattern="\d{4}" maxlength="4" placeholder="••••" />
        ${kind === "set" ? `
          <label class="yt-label" for="yta-pin2">Confirm PIN</label>
          <input class="yt-input" id="yta-pin2" inputmode="numeric" pattern="\d{4}" maxlength="4" placeholder="••••" />
        ` : ""}
        <div class="yt-modal__actions">
          <button class="yt-btn" type="button" data-modal-cancel>Cancel</button>
          <button class="yt-btn yt-btn--primary" type="submit">${kind === "set" ? "Set PIN" : "Unlock"}</button>
        </div>
        <div class="yt-form__msg" id="yta-pin-msg" aria-live="polite"></div>
      </form>
    `;

    const close = () => { overlay.remove(); resolve(null); };

    overlay.addEventListener("click", (e) => {
      if(e.target === overlay) close();
    });

    overlay.querySelector("[data-modal-close]")?.addEventListener("click", close);
    overlay.querySelector("[data-modal-cancel]")?.addEventListener("click", close);

    const form = overlay.querySelector("#yta-pin-form");
    const pinEl = overlay.querySelector("#yta-pin");
    const pin2El = overlay.querySelector("#yta-pin2");
    const msg = overlay.querySelector("#yta-pin-msg");
    pinEl?.focus();

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = String(pinEl?.value || "").trim();
      if(!/^\d{4}$/.test(pin)){
        msg.textContent = "Please enter a 4-digit PIN.";
        return;
      }
      if(kind === "set"){
        const pin2 = String(pin2El?.value || "").trim();
        if(pin2 !== pin){
          msg.textContent = "PINs do not match.";
          return;
        }
      }
      overlay.remove();
      resolve(pin);
    });
  });
}

export async function mountChrome(){
  const cfg = await loadJSON("./data/site.json");

  const header = document.createElement("header");
  header.className = "yt-topbar";
  const file = currentFile();

  const navLinks = (cfg.nav || []).map(item => {
    const isCurrent = (item.href === file) || (file === "" && item.href === "index.html");
    return `<a href="${item.href}" ${isCurrent ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  const logoPath = cfg.brand?.logo || "assets/images/youngtekkie-logo.png";
  const brandName = cfg.brand?.name || "YoungTekkie";

  header.innerHTML = `
    <div class="container">
      <a class="yt-brand" href="index.html" aria-label="${brandName} home">
        <img src="${logoPath}" alt="${brandName} logo" />
        <span>${brandName}</span>
      </a>
      <nav class="yt-nav" aria-label="Primary">${navLinks}</nav>
      <div class="yt-actions">
        <button class="yt-btn" id="yta-mode-toggle" type="button" title="Toggle Kid/Parent mode">
          <span class="yt-muted" style="font-weight:700">Mode</span>
          <span class="yt-mode-chip" id="yta-mode-label">${mode.get()}</span>
        </button>
      </div>
    </div>
  `;

  document.body.prepend(header);

  const footer = document.createElement("footer");
  footer.className = "yt-footer";
  const year = new Date().getFullYear();
  const footerText = (cfg.footer?.text || "").replace("{year}", String(year));
  footer.innerHTML = `<div class="container"><small>${footerText}</small></div>`;
  document.body.appendChild(footer);

  const btn = document.getElementById("yta-mode-toggle");
  const label = document.getElementById("yta-mode-label");

  function syncLabel(){
    if(label) label.textContent = mode.get();
  }

  btn?.addEventListener("click", async () => {
    const m = await mode.toggleWithGuard(promptForPin);
    if(label) label.textContent = m;
  });

  window.addEventListener("yta:mode", syncLabel);

  // Offline banner (M6 will expand)
  const banner = document.createElement("div");
  banner.id = "yta-offline";
  banner.className = "yt-offline";
  banner.textContent = "📶 Offline — all lessons still available";
  document.body.appendChild(banner);

  function updateOnline(){
    banner.style.display = navigator.onLine ? "none" : "block";
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();
}
