import { getActiveProfile } from "../features/profiles.js";
import { storage } from "../app/storage.js";
import { loadCurriculum } from "../features/curriculum.js";

function esc(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export default async function dashboardPage(){
  const mount = document.getElementById("dashboard-mount");
  if(!mount) return;

  const mode = document.documentElement.dataset.mode || "kid";
  if(mode !== "parent"){
    mount.innerHTML = `
      <div class="yt-card">
        <h2 class="yt-h2">Parent dashboard</h2>
        <p class="yt-muted">Switch to Parent mode to view progress and manage settings.</p>
        <p class="yt-muted" style="margin-bottom:0">Tip: use the Mode button in the top-right.</p>
      </div>
    `;
    return;
  }

  const active = getActiveProfile();
  if(!active){
    mount.innerHTML = `
      <div class="yt-card">
        <h2 class="yt-h2">Parent dashboard</h2>
        <p class="yt-muted">No learner profile selected yet.</p>
        <a class="yt-btn yt-btn--primary" href="profiles.html">Create a profile</a>
      </div>
    `;
    return;
  }

  const state = storage.getState(active.id) || {};
  const progress = state.progress || {};
  const completed = Object.values(progress).filter(v => v && v.done).length;

  const c = await loadCurriculum();
  const total = Array.isArray(c.days) ? c.days.length : 0;

  // simple per-phase counts
  const byPhase = [1,2,3].map(p => {
    const phaseDays = c.days.filter(d => Number(d.month) === p);
    const done = phaseDays.filter(d => progress[String(d.num)]?.done).length;
    return { p, done, total: phaseDays.length };
  });

  mount.innerHTML = `
    <section class="yt-hero yt-hero--compact">
      <div>
        <h1 class="yt-h1">Parent dashboard</h1>
        <p class="yt-muted">Active learner: <strong>${esc(active.name)}</strong></p>
      </div>
      <div class="yt-hero__chips">
        <span class="yt-pill">Completed ${completed}/${total}</span>
        <span class="yt-pill">Mode: parent</span>
      </div>
    </section>

    <div class="yt-grid">
      <section class="yt-card yt-col-12 yt-col-md-6">
        <h2 class="yt-h2">Overall progress</h2>
        <p class="yt-muted">Days marked as completed across the full journey.</p>
        <div class="yt-progress">
          <div class="yt-progress__bar" style="width:${total ? Math.round((completed/total)*100) : 0}%"></div>
        </div>
        <p style="margin:10px 0 0 0"><strong>${completed}</strong> completed out of <strong>${total}</strong></p>
      </section>

      <section class="yt-card yt-col-12 yt-col-md-6">
        <h2 class="yt-h2">By phase</h2>
        <div class="yt-stack-md">
          ${byPhase.map(x => `
            <div class="yt-phase-row">
              <div><strong>Phase ${x.p}</strong> <span class="yt-muted">(${x.done}/${x.total})</span></div>
              <div class="yt-progress yt-progress--sm">
                <div class="yt-progress__bar" style="width:${x.total ? Math.round((x.done/x.total)*100) : 0}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="yt-card yt-col-12">
        <h2 class="yt-h2">Quick links</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a class="yt-btn yt-btn--primary" href="phase1.html">Go to Phase 1</a>
          <a class="yt-btn" href="print.html">Printable plan</a>
          <a class="yt-btn" href="support.html">Support / Tip jar</a>
        </div>
      </section>
    </div>
  `;
}
