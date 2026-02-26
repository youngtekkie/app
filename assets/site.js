/* FILE: assets/site.js — inject shared nav + mobile drawer + footer (auto-year) */
(function () {
  const KIDMODE_KEY = "yta_kidmode_v2";
  // Responsive label for Kid/Parent toggle (keep header tidy on small screens)
  function labelForParentOff(){
    return (window.matchMedia && window.matchMedia("(max-width: 420px)").matches) ? "Parent" : "Parent mode";
  }


  function currentFile() {
    const p = (location.pathname || "").split("/").pop();
    return (p && p.length) ? p : "index.html";
  }

  const routes = {
    home: "./index.html",
    tracks: "./tracks.html",
    profiles: "./profiles.html",
    phase1: "./phase1.html",
    phase2: "./phase2.html",
    phase3: "./phase3.html",
    certificates: "./certificates.html",
    print: "./print.html",
    dashboard: "./dashboard.html",
  };

  function isActive(file) {
    return currentFile().toLowerCase() === file.replace("./","").toLowerCase();
  }

  function injectChrome() {
    const mount = document.getElementById("site-chrome");
    if (!mount) return;

    let subtitle = (document.body.getAttribute("data-subtitle") || "").trim();
    if (!subtitle) subtitle = "Foundations for tomorrow’s tech leaders.";
    const kidMode = (localStorage.getItem(KIDMODE_KEY) === "1");
    const inJourney = ["phase1.html","phase2.html","phase3.html","month1.html","month2.html","month3.html"].includes(currentFile().toLowerCase());
mount.innerHTML = `
      <header class="topbar">
        <div class="wrap topbar__inner">
          <a class="brand" href="${routes.home}" aria-label="Young Tech Architect Home">
            <span class="brand__mark" aria-hidden="true"><img src="./assets/logo-mascot.png" alt=""></span>
            <span class="brand__text">
              <span class="brand__title">Youngtekkie</span>
              <span class="brand__subtitle">${escapeHtml(subtitle)}</span>
            </span>
          </a>

          <nav class="navRow" aria-label="Primary">
            <a class="nav__link ${isActive(routes.home) ? "is-active" : ""}" href="${routes.home}">Home</a>
            ${kidMode ? "" : `<a class="nav__link ${isActive(routes.tracks) ? "is-active" : ""}" href="${routes.tracks}" data-parent-only="1">Tracks</a>`}
            ${kidMode ? "" : `<a class="nav__link ${isActive(routes.profiles) ? "is-active" : ""}" href="${routes.profiles}" data-parent-only="1">Profiles</a>`}

            <!-- Keep Journey dropdown closed on page-load (prevents it feeling "stuck" open after navigation) -->
            <details class="navDrop">
              <summary class="nav__link nav__link--btn ${inJourney ? "is-active" : ""}">
                Journey <span class="navDrop__chev" aria-hidden="true">▾</span>
              </summary>
              <div class="navDrop__menu" role="menu" aria-label="Journey phases">
                <a class="navDrop__item ${isActive(routes.phase1) ? "is-active" : ""}" role="menuitem" href="${routes.phase1}">Phase 1 <span class="navDrop__hint">Scratch</span></a>
                <a class="navDrop__item ${isActive(routes.phase2) ? "is-active" : ""}" role="menuitem" href="${routes.phase2}">Phase 2 <span class="navDrop__hint">Roblox</span></a>
                <a class="navDrop__item ${isActive(routes.phase3) ? "is-active" : ""}" role="menuitem" href="${routes.phase3}">Phase 3 <span class="navDrop__hint">Python</span></a>
              </div>
            </details>
          </nav>
          <div class="topbar__actions">
            <a class="tipJarLink" href="./support.html"><span class="tipJarText tipJarText--long">Our tip jar</span><span class="tipJarText tipJarText--short">Tip jar</span></a>
${kidMode ? "" : `<a class="iconLink" href="${routes.certificates}" title="Certificates" aria-label="Certificates" data-parent-only="1">🎓</a>`}
            ${kidMode ? "" : `<a class="iconLink" href="${routes.print}" title="Print plan" aria-label="Print" data-parent-only="1">🖨️</a>`}
            ${kidMode ? "" : `<a class="iconLink" href="${routes.dashboard}" title="Parent dashboard" aria-label="Parent Dashboard" data-parent-only="1">👨‍👩‍👧</a>`}

            <button class="menuBtn" type="button" data-yt="navbtn" aria-expanded="false" aria-label="Open menu">☰</button>
            <button class="mode-toggle mode-toggle--sm" id="kidModeToggle" type="button" aria-pressed="false">${kidMode ? "Kid mode on" : labelForParentOff()}</button>
          </div>
        </div>
      </header>

      <div class="backdrop" data-yt="backdrop"></div>
      <aside class="drawer" data-yt="drawer" aria-label="Mobile menu">
        <div class="drawerHeader">
          <div class="drawerTitle">Menu</div>
          <button class="menuBtn" type="button" data-yt="navbtn" aria-expanded="true" aria-label="Close menu">✕</button>
        </div>
        <div class="drawerLinks">
          <a href="${routes.home}">Home</a>
          ${kidMode ? "" : `<a href="${routes.tracks}" data-parent-only="1">Tracks</a>`}
          ${kidMode ? "" : `<a href="${routes.profiles}" data-parent-only="1">Profiles</a>`}
          <a href="${routes.phase1}">Phase 1 (Scratch)</a>
          <a href="${routes.phase2}">Phase 2 (Roblox)</a>
          <a href="${routes.phase3}">Phase 3 (Python)</a>
          ${kidMode ? "" : `<a href="${routes.certificates}" data-parent-only="1">Certificates</a>`}
          ${kidMode ? "" : `<a href="${routes.print}" data-parent-only="1">Print</a>`}
          ${kidMode ? "" : `<a href="${routes.dashboard}" data-parent-only="1">Parent Dashboard</a>`}
          <a href="./support.html">Tip jar</a>
        </div>
      </aside>
    `;

    bindChromeNav();
    syncHeaderOffset();
    // Re-check after layout/fonts settle
    setTimeout(syncHeaderOffset, 120);
    requestAnimationFrame(syncHeaderOffset);
  }

  function injectFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;

    mount.innerHTML = `
      <footer class="siteFooter">
        <div class="wrap siteFooter__inner">
          <div class="siteFooter__left">© <span data-yt="year"></span> Youngtekkie</div>
          <div class="siteFooter__right">
            <a class="siteFooter__link" href="./data-policy.html">Data policy</a>
            <a class="siteFooter__coffee" href="./support.html" aria-label="Support Youngtekkie">☕ Buy me a coffee</a>
          </div>
        </div>
      </footer>
    `;

    bindChromeNav();
  }

  function syncHeaderOffset() {
    const header = document.querySelector(".topbar");
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height || 0);
    if (h > 0) document.documentElement.style.setProperty("--topbar-h", `${h}px`);
  }

  function bindChromeNav() {
    // Set footer year
    const y = document.querySelector('[data-yt="year"]');
    if (y) y.textContent = String(new Date().getFullYear());

    // Drawer open/close
    const drawer = document.querySelector('[data-yt="drawer"]');
    const backdrop = document.querySelector('[data-yt="backdrop"]');
    const btns = Array.from(document.querySelectorAll('[data-yt="navbtn"]'));

    function setOpen(open) {
      if (!drawer) return;
      drawer.classList.toggle("is-open", !!open);
      if (backdrop) backdrop.classList.toggle("is-open", !!open);
      btns.forEach(b => b.setAttribute("aria-expanded", String(!!open)));
      document.body.classList.toggle("noScroll", !!open);
    }

    btns.forEach(btn => {
      if (btn.__ytBound) return;
      btn.__ytBound = true;
      btn.addEventListener("click", () => {
        const isOpen = drawer ? drawer.classList.contains("is-open") : false;
        setOpen(!isOpen);
      });
    });

    if (backdrop && !backdrop.__ytBound) {
      backdrop.__ytBound = true;
      backdrop.addEventListener("click", () => setOpen(false));
    }

    if (drawer && !drawer.__ytBoundLinks) {
      drawer.__ytBoundLinks = true;
      drawer.addEventListener("click", (e) => {
        const a = e.target && e.target.closest ? e.target.closest("a") : null;
        if (a) setOpen(false);
      });
    }

    // Kid / Parent mode toggle
    // NOTE: app.js owns the click behaviour (password prompt). site.js only keeps label in sync.
    function syncKidBtnLabel() {
      const btn = document.getElementById("kidModeToggle");
      if (!btn) return;
      const on = (localStorage.getItem(KIDMODE_KEY) === "1");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "Kid mode on" : labelForParentOff();
    }
    // Initial label sync (in case app.js hasn't run yet)
    syncKidBtnLabel();
    // Keep in sync when app.js broadcasts mode changes
    if (!window.__ytKidModeSyncBound) {
      window.__ytKidModeSyncBound = true;
      document.addEventListener("yta:kidmode:change", () => syncKidBtnLabel());
      window.addEventListener("resize", () => syncKidBtnLabel());
    }

    // Recompute header height on resize

    if (!window.__ytHeaderResizeBound) {
      window.__ytHeaderResizeBound = true;
      window.addEventListener("resize", () => {
        clearTimeout(window.__ytHeaderResizeT);
        window.__ytHeaderResizeT = setTimeout(syncHeaderOffset, 50);
      });
    }
  }

    // Observe header size changes (e.g., subtitle wraps, font loads)
    if (!window.__ytHeaderRO) {
      const header = document.querySelector(".topbar");
      if (header && "ResizeObserver" in window) {
        window.__ytHeaderRO = new ResizeObserver(() => syncHeaderOffset());
        window.__ytHeaderRO.observe(header);
      }
      window.addEventListener("load", () => syncHeaderOffset(), { once: true });
    }

  function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\'", "&#39;");
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { 
  // Re-inject header when Kid Mode changes (so nav simplifies/returns immediately)
  document.addEventListener("yta:kidmode:change", () => {
    try { injectChrome(); } catch (e) { /* no-op */ }
  });

injectChrome(); injectFooter();
    try { window.dispatchEvent(new Event('yta:chrome:ready')); } catch(e) {} }, { once: true });
  } else {
    
  // Re-inject header when Kid Mode changes (so nav simplifies/returns immediately)
  document.addEventListener("yta:kidmode:change", () => {
    try { injectChrome(); } catch (e) { /* no-op */ }
  });

injectChrome(); injectFooter();
    try { window.dispatchEvent(new Event('yta:chrome:ready')); } catch(e) {}
  }
})();
