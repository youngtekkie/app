import { storage } from "../app/storage.js";
import { loadCurriculum } from "../features/curriculum.js";

function row(label, ok, detail=""){
  const status = ok ? "PASS" : "FAIL";
  const cls = ok ? "yt-pill yt-pill--success" : "yt-pill yt-pill--danger";
  return `
    <tr>
      <td>${label}</td>
      <td><span class="${cls}">${status}</span></td>
      <td class="yt-muted">${detail}</td>
    </tr>
  `;
}

function safe(fn){
  try{ return { ok: true, value: fn() }; }catch(e){ return { ok:false, error:e }; }
}

export default async function debugPage(){
  const out = document.getElementById("debug-table-body");
  if(!out) return;

  const checks = [];

  // Contract checks
  checks.push(["window.YTA exists", !!window.YTA, "Single global namespace"]);
  checks.push(["YTA.storage exists", !!window.YTA?.storage, "storage.js attached"]);
  checks.push(["YTA.mode exists", !!window.YTA?.mode, "mode.js attached"]);
  checks.push(["body data-page present", !!document.body?.dataset?.page, document.body?.dataset?.page || "missing"]);
  checks.push(["Topbar mounted", !!document.querySelector(".yt-topbar"), "Header injected"]);
  checks.push(["Footer mounted", !!document.querySelector(".yt-footer"), "Footer injected"]);
  checks.push(["Mode toggle button present", !!document.getElementById("yta-mode-toggle"), "Header action"]);

  // Storage checks
  let lsOK = true;
  try{
    localStorage.setItem("__yta_test", "1");
    localStorage.removeItem("__yta_test");
  }catch{ lsOK = false; }
  checks.push(["localStorage available", lsOK, ""]);

  const profiles = safe(() => storage.getProfiles());
  checks.push(["Profiles readable", profiles.ok && Array.isArray(profiles.value), `count=${profiles.ok ? profiles.value.length : "?"}`]);

  const activeId = safe(() => storage.getActiveProfileId());
  checks.push(["Active profile id readable", activeId.ok, activeId.ok ? (activeId.value || "(none)") : "error"]);

  // Curriculum
  let curOK = true, curDetail = "";
  try{
    const c = await loadCurriculum();
    curOK = Array.isArray(c?.days) && c.days.length >= 72;
    curDetail = curOK ? `days=${c.days.length}` : "Missing or too small";
  }catch(e){
    curOK = false;
    curDetail = String(e?.message || e);
  }
  checks.push(["Curriculum loaded", curOK, curDetail]);

  // Page mounts
  const mounts = [
    ["Home mount exists (index)", "home", "#home-mount"],
    ["Profiles mount exists", "profiles", "#profiles-list"],
    ["Phase mount exists", "phase1/phase2/phase3", "#phase-mount"],
  ];
  mounts.forEach(([label, pages, sel]) => {
    checks.push([label, !!document.querySelector(sel), `${sel} (${pages})`]);
  });

  out.innerHTML = checks.map(([l, ok, d]) => row(l, ok, d)).join("");
}
