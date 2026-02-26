/* FILE: assets/regression.js — in-browser regression checks for static site
   Runs fast, no server required. Focuses on: page load, key DOM, internal links, assets, header/footer injection.
*/
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function now(){ return (performance && performance.now) ? performance.now() : Date.now(); }

  async function fetchText(url){
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    return { ok: res.ok, status: res.status, url, text };
  }

  function parseHTML(html){
    return new DOMParser().parseFromString(html, "text/html");
  }

  function isExternal(href){
    try{
      const u = new URL(href, location.href);
      return u.origin !== location.origin;
    }catch(e){ return false; }
  }

  function normaliseHref(href){
    if (!href) return null;
    const h = href.trim();
    if (!h || h === "#" || h.startsWith("#")) return null;
    if (h.startsWith("mailto:") || h.startsWith("tel:") || h.startsWith("javascript:")) return null;
    return h;
  }

  function unique(arr){
    return Array.from(new Set(arr));
  }

  function summarise(results){
    const counts = { pass: 0, warn: 0, fail: 0 };
    results.forEach(r => counts[r.status]++);
    return counts;
  }

  function statusFrom(counts){
    if (counts.fail > 0) return "fail";
    if (counts.warn > 0) return "warn";
    return "pass";
  }

  function fmtMs(ms){ return `${Math.round(ms)}ms`; }

  async function runRegression(opts={}){
    const pages = opts.pages || [
      "index.html",
      "profiles.html",
      "phase1.html",
      "phase2.html",
      "phase3.html",
      "printable-plan.html",
      "certificates.html",
      "support.html",
      "data-policy.html",
      "debug.html"
    ];

    const results = [];
    const t0 = now();

    // 1) Basic: regression runner environment
    results.push({
      id: 1,
      title: "Regression runner loaded",
      status: "pass",
      details: `Runner OK. Base URL: <code>${location.href}</code>`
    });

    // 2) Header + footer present on current page (injected)
    const hasHeader = !!$(".topbar");
    const hasFooter = !!$(".siteFooter, .site-footer, footer.siteFooter, footer.site-footer");
    results.push({
      id: 2,
      title: "Header injection on current page",
      status: hasHeader ? "pass" : "fail",
      details: hasHeader ? "Found <code>.topbar</code>." : "Header not found. Ensure <code>assets/site.js</code> is loading and <code>#site-chrome</code> exists."
    });
    results.push({
      id: 3,
      title: "Footer injection on current page",
      status: hasFooter ? "pass" : "fail",
      details: hasFooter ? "Footer found." : "Footer not found. Ensure <code>#site-footer</code> exists and <code>assets/site.js</code> runs without errors."
    });

    // 3) Fetch each page and validate: loads, has title, has main content, has injection mounts
    const pageDocs = {};
    const failedPages = [];
    for (const p of pages){
      const st = now();
      let res;
      try{
        res = await fetchText(p);
      }catch(e){
        failedPages.push({ p, err: String(e) });
        results.push({
          id: results.length + 1,
          title: `Page loads: ${p}`,
          status: "fail",
          details: `Fetch error: <code>${String(e)}</code>`
        });
        continue;
      }
      const dur = now() - st;
      if (!res.ok){
        failedPages.push({ p, status: res.status });
        results.push({
          id: results.length + 1,
          title: `Page loads: ${p}`,
          status: "fail",
          details: `HTTP ${res.status}. Time: ${fmtMs(dur)}.`
        });
        continue;
      }
      const doc = parseHTML(res.text);
      pageDocs[p] = doc;
      const title = doc.title || "(no title)";
      const hasMount = !!$("#site-chrome", doc) && !!$("#site-footer", doc);
      results.push({
        id: results.length + 1,
        title: `Page loads: ${p}`,
        status: "pass",
        details: `OK (${fmtMs(dur)}). Title: <code>${title}</code>.<br>${hasMount ? "Has" : "<strong>Missing</strong>"} injection mounts (<code>#site-chrome</code>, <code>#site-footer</code>).`
      });

      // Simple DOM expectations per page
      if (p === "index.html"){
        const hero = $(".hero", doc) || $(".heroWrap", doc) || $("section.hero", doc);
        results.push({
          id: results.length + 1,
          title: "Homepage: hero section present",
          status: hero ? "pass" : "warn",
          details: hero ? "Hero section detected." : "Couldn't confidently find hero section. If intentional, ignore; otherwise check homepage layout."
        });
      }
      if (p === "support.html"){
        const h1 = $("h1", doc);
        results.push({
          id: results.length + 1,
          title: "Support page: heading present",
          status: (h1 && /support/i.test(h1.textContent || "")) ? "pass" : "warn",
          details: h1 ? `Found H1: <code>${(h1.textContent||"").trim()}</code>` : "No H1 found."
        });
      }
    }

    // 4) Internal link audit: crawl anchors from parsed pages and check targets exist (same-origin only)
    const allLinks = [];
    Object.entries(pageDocs).forEach(([p, doc]) => {
      $$("a[href]", doc).forEach(a => {
        const href0 = normaliseHref(a.getAttribute("href"));
        if (!href0) return;
        allLinks.push({ from: p, href: href0 });
      });
    });
    const uniqLinks = unique(allLinks.map(x => x.href));
    const internal = [];
    const external = [];
    uniqLinks.forEach(h => (isExternal(h) ? external : internal).push(h));

    const internalToCheck = internal
      .filter(h => !h.startsWith("http"))
      .map(h => h.split("#")[0])
      .filter(Boolean);

    const broken = [];
    for (const href of unique(internalToCheck)){
      try{
        const r = await fetch(href, { cache: "no-store" });
        if (!r.ok) broken.push({ href, status: r.status });
      }catch(e){
        broken.push({ href, err: String(e) });
      }
    }

    results.push({
      id: results.length + 1,
      title: "Internal links: targets reachable",
      status: broken.length ? "fail" : "pass",
      details: broken.length
        ? `Broken internal targets (${broken.length}):<br><ul>${broken.slice(0,12).map(b => `<li><code>${b.href}</code> (${b.status || b.err})</li>`).join("")}</ul>${broken.length>12 ? "…(truncated)" : ""}`
        : `Checked ${unique(internalToCheck).length} internal link targets.`
    });

    results.push({
      id: results.length + 1,
      title: "External links: listed (not validated)",
      status: external.length ? "warn" : "pass",
      details: external.length
        ? `External links found (${external.length}). Not validated in-browser to avoid CORS/timeouts.<br><ul>${external.slice(0,8).map(u=>`<li><code>${u}</code></li>`).join("")}</ul>${external.length>8 ? "…(truncated)" : ""}`
        : "No external links found."
    });

    // 5) Core assets referenced by pages
    const assetWarn = [];
    Object.entries(pageDocs).forEach(([p, doc]) => {
      const cssLinks = $$('link[rel="stylesheet"]', doc).map(n=>n.getAttribute("href")).filter(Boolean);
      const js = $$('script[src]', doc).map(n=>n.getAttribute("src")).filter(Boolean);
      const hasStyles = cssLinks.some(h => /styles\.css/.test(h));
      const hasSite = js.some(h => /assets\/site\.js/.test(h));
      const hasApp = js.some(h => /app\.js/.test(h));
      if (!hasStyles) assetWarn.push(`${p}: missing styles.css`);
      if (!hasSite) assetWarn.push(`${p}: missing assets/site.js`);
      if (!hasApp && p !== "debug.html") assetWarn.push(`${p}: missing app.js`);
    });
    results.push({
      id: results.length + 1,
      title: "Page includes: styles + scripts",
      status: assetWarn.length ? "warn" : "pass",
      details: assetWarn.length ? `<ul>${assetWarn.slice(0,14).map(x=>`<li>${x}</li>`).join("")}</ul>${assetWarn.length>14?"…(truncated)":""}` : "All pages include expected core assets."
    });

    const t1 = now();
    const counts = summarise(results);
    return {
      results,
      summary: {
        ...counts,
        status: statusFrom(counts),
        durationMs: Math.round(t1 - t0)
      }
    };
  }

  window.YTRegression = { run: runRegression };
})();