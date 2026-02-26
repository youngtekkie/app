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
  const typingRecords = Array.isArray(state.typingRecords) ? state.typingRecords : [];
  const latestTyping = typingRecords.length ? typingRecords[typingRecords.length - 1] : null;
  const bestTyping = typingRecords.length ? typingRecords.reduce((a,b)=> (Number(b.wpm||0) > Number(a.wpm||0) ? b : a), typingRecords[0]) : null;
  const last5Typing = typingRecords.slice(-5).reverse();
  const mathsScores = (state.mathsScores && typeof state.mathsScores === 'object') ? state.mathsScores : {};
  const weeks = Array.from({length:12}, (_,i)=>i+1).map(w => {
    const key = String(w).padStart(2,'0');
    const ref = `w${key}-`;
    // find a score entry whose weekRef starts with wXX-
    const entryKey = Object.keys(mathsScores).find(k => k.startsWith(`w${key}-`));
    const entry = entryKey ? mathsScores[entryKey] : null;
    return { w, entry, entryKey };
  });

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

      <section class="yt-card yt-col-12 yt-col-md-6">
        <h2 class="yt-h2">Typing summary</h2>
        <p class="yt-muted">Latest and best results for the active learner.</p>
        <div class="yt-grid" style="margin-top:10px">
          <div class="yt-col-12 yt-col-md-6">
            <div class="yt-card yt-card--soft" style="padding:14px">
              <div class="yt-muted" style="font-weight:700">Best WPM</div>
              <div style="font-size:34px;font-weight:900;line-height:1">${bestTyping ? esc(bestTyping.wpm) : "—"}</div>
              <div class="yt-muted" style="margin-top:6px">Accuracy: <strong>${bestTyping ? esc(bestTyping.accuracy) + "%" : "—"}</strong></div>
            </div>
          </div>
          <div class="yt-col-12 yt-col-md-6">
            <div class="yt-card yt-card--soft" style="padding:14px">
              <div class="yt-muted" style="font-weight:700">Latest WPM</div>
              <div style="font-size:34px;font-weight:900;line-height:1">${latestTyping ? esc(latestTyping.wpm) : "—"}</div>
              <div class="yt-muted" style="margin-top:6px">Accuracy: <strong>${latestTyping ? esc(latestTyping.accuracy) + "%" : "—"}</strong></div>
            </div>
          </div>
        </div>

        ${last5Typing.length ? `
          <div class="yt-table-wrap" style="margin-top:12px">
            <table class="yt-table">
              <thead>
                <tr><th>Date</th><th>Lesson</th><th>WPM</th><th>Accuracy</th></tr>
              </thead>
              <tbody>
                ${last5Typing.map(r => `
                  <tr>
                    <td>${esc(new Date(r.date).toLocaleDateString())}</td>
                    <td>${esc(r.lessonId || "")}</td>
                    <td><strong>${esc(r.wpm)}</strong></td>
                    <td>${esc(r.accuracy)}%</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : `<p class="yt-muted" style="margin:10px 0 0 0">No typing sessions recorded yet. Open a day in a phase page and run the typing session.</p>`}
      </section>
      <section class="yt-card yt-col-12 yt-col-md-6">
        <h2 class="yt-h2">Maths summary</h2>
        <p class="yt-muted">Weekly maths sessions. Target: 70%+ to pass.</p>
        <div class="yt-week-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px">
          ${weeks.map(x => {
            const score = x.entry ? Number(x.entry.score) : null;
            const passed = x.entry ? !!x.entry.passed : false;
            const label = score === null ? "—" : `${score}%`;
            const cls = passed ? "yt-pill yt-pill--success" : (score === null ? "yt-pill yt-pill--muted" : "yt-pill");
            return `<div class="yt-card yt-card--soft" style="padding:12px">
              <div class="yt-muted" style="font-weight:800">Week ${x.w}</div>
              <div style="margin-top:8px"><span class="${cls}">${label}</span></div>
            </div>`;
          }).join("")}
        </div>
        <p class="yt-muted" style="margin:10px 0 0 0">Tip: open any day in a phase and complete the maths card.</p>
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
