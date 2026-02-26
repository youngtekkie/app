import { getActiveProfile } from "../features/profiles.js";
import { getDaysForPhase, phaseTitle } from "../features/curriculum.js";
import { storage } from "../app/storage.js";

function esc(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function pill(text){ return `<span class="yt-pill">${esc(text)}</span>`; }

function renderDayCard(d, state){
  const key = String(d.num);
  const done = !!state?.progress?.[key]?.done;
  const typingPassed = !!state?.progress?.[key]?.typingPassed;
  const mathsPassed = !!state?.progress?.[key]?.mathsPassed;
  return `
    <details class="yt-lesson" ${done ? 'data-done="true"' : ""}>
      <summary class="yt-lesson__summary">
        <div class="yt-lesson__left">
          <div class="yt-lesson__day">Day ${d.num}</div>
          <div class="yt-lesson__title">${esc(d.mainTopic || "")}</div>
          <div class="yt-lesson__meta">
            ${pill(`${esc(d.dow || "")}`)}
            ${pill(`Week ${esc(d.week)}`)}
            ${done ? '<span class="yt-pill yt-pill--success">Completed</span>' : '<span class="yt-pill yt-pill--muted">Not done</span>'}
            ${typingPassed ? '<span class="yt-pill yt-pill--success">Typing passed</span>' : ''}
            ${mathsPassed ? '<span class="yt-pill yt-pill--success">Maths passed</span>' : ''}
          </div>
        </div>
        <div class="yt-lesson__right">
          <span class="yt-lesson__chev" aria-hidden="true">⌄</span>
        </div>
      </summary>
      <div class="yt-lesson__body">
        <div class="yt-grid">
          <section class="yt-card yt-col-12 yt-col-md-6">
            <h3 class="yt-h3">Build</h3>
            <p class="yt-muted">${esc(d.buildTask || "")}</p>
            ${Array.isArray(d.buildSteps) ? `<ol class="yt-steps">${d.buildSteps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>` : ""}
          </section>
          <section class="yt-card yt-col-12 yt-col-md-6">
            <h3 class="yt-h3">Logic & Maths</h3>
            <p class="yt-muted">${esc(d.logicTask || "")}</p>
            ${Array.isArray(d.logicSteps) ? `<ol class="yt-steps">${d.logicSteps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>` : ""}
          
            <div class="yt-card yt-card--soft" style="margin-top:12px">
              <div id="yt-maths-${esc(d.num)}" data-maths-ref="${esc(d.mathsRef || "w01-motion-patterns")}" data-track="" data-profile="${esc(state?.profileId || "")}">
                <p class="yt-muted" style="margin:0">Loading maths…</p>
              </div>
            </div>
          </section>
          <section class="yt-card yt-col-12">
            <h3 class="yt-h3">Typing</h3>
            <p class="yt-muted">${esc(d.typingTask || "")}</p>
            ${Array.isArray(d.typingSteps) ? `<ol class="yt-steps">${d.typingSteps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>` : ""}
            <div class="yt-card yt-card--soft" style="margin-top:12px">
              <div id="yt-typing-${esc(d.num)}" data-typing-ref="${esc(d.typingRef || "01-home-row")}" data-profile="${esc(state?.profileId || "")}">
                <p class="yt-muted" style="margin:0">Loading typing…</p>
              </div>
            </div>
            <div class="yt-lesson__actions">
              <button class="yt-btn yt-btn--primary" data-action="mark-done" data-day="${esc(d.num)}">Mark as done</button>
              <button class="yt-btn" data-action="unmark-done" data-day="${esc(d.num)}">Undo</button>
            </div>
          </section>
        </div>
      </div>
    </details>
  `;
}

export default async function phasePage(){
  const mount = document.getElementById("phase-mount");
  if(!mount) return;

  const page = document.body?.dataset?.page || "phase1";
  const phaseNum = Number(String(page).replace("phase","")) || 1;

  const active = getActiveProfile();
  if(!active){
    mount.innerHTML = `
      <div class="yt-card">
        <h2 class="yt-h2">${phaseTitle(phaseNum)}</h2>
        <p class="yt-muted">You need to create and select a learner profile before starting.</p>
        <a class="yt-btn yt-btn--primary" href="profiles.html">Create a profile</a>
      </div>
    `;
    return;
  }

  const days = await getDaysForPhase(phaseNum);
  const state = storage.getState(active.id);

  mount.innerHTML = `
    <div class="yt-hero yt-hero--compact">
      <div>
        <h1 class="yt-h1">${phaseTitle(phaseNum)}</h1>
        <p class="yt-muted">Active learner: <strong>${esc(active.name)}</strong></p>
      </div>
      <div class="yt-hero__chips">
        <span class="yt-pill">72-day journey</span>
        <span class="yt-pill">Works offline after M6</span>
      </div>
    </div>
    <div class="yt-stack-lg">
      ${days.map(d => renderDayCard(d, state)).join("")}
    </div>
  `;

  // Lazy-init learning modules when a lesson is opened
  mount.addEventListener("toggle", async (e) => {
    const details = e.target;
    if(!(details instanceof HTMLDetailsElement)) return;
    if(!details.open) return;

    const activeNow = getActiveProfile();
    const profileId = activeNow?.id || null;
    const year = String(activeNow?.yearGroup || "");
    const track = /Year\s*[56]/i.test(year) ? "builder" : "foundation";

    // Typing
    const typingHost = details.querySelector("[id^='yt-typing-'][data-typing-ref]");
    if(typingHost && typingHost.dataset.inited !== "1"){
      typingHost.dataset.inited = "1";
      const lessonRef = typingHost.getAttribute("data-typing-ref") || "01-home-row";
      const containerId = typingHost.id;

      try{
        const mod = await import("../modules/typing/typing-trainer.js");
        await mod.initTypingSession(lessonRef, containerId, profileId, {
          onComplete: ({ passed }) => {
            if(!profileId) return;
            const day = containerId.replace("yt-typing-", "");
            const key = String(day);
            const current = storage.getState(profileId) || {};
            current.progress = current.progress || {};
            current.progress[key] = { ...(current.progress[key]||{}), typingPassed: !!passed, typingPassedAt: new Date().toISOString() };
            storage.setState(profileId, current);
            if(passed){
              const meta = details.querySelector('.yt-lesson__meta');
              if(meta && !meta.querySelector('[data-yt-typing-pill]')){
                meta.appendChild(document.createRange().createContextualFragment('<span class="yt-pill yt-pill--success" data-yt-typing-pill>Typing passed</span>'));
              }
            }
          }
        });
      }catch(err){
        typingHost.innerHTML = `<p class="yt-error">Typing failed to load: ${esc(err?.message || err)}</p>`;
      }
    }

    // Maths
    const mathsHost = details.querySelector("[id^='yt-maths-'][data-maths-ref]");
    if(mathsHost && mathsHost.dataset.inited !== "1"){
      mathsHost.dataset.inited = "1";
      const weekRef = mathsHost.getAttribute("data-maths-ref") || "w01-motion-patterns";
      const containerId = mathsHost.id;

      try{
        const mod = await import("../modules/maths/maths-engine.js");
        await mod.initMathsSession(weekRef, track, containerId.replace("yt-maths-",""), containerId, profileId, {
          onComplete: ({ passed, score }) => {
            if(!profileId) return;
            const day = containerId.replace("yt-maths-", "");
            const key = String(day);
            const current = storage.getState(profileId) || {};
            current.progress = current.progress || {};
            current.progress[key] = { ...(current.progress[key]||{}), mathsPassed: !!passed, mathsScore: score, mathsPassedAt: passed ? new Date().toISOString() : null };
            storage.setState(profileId, current);
            if(passed){
              const meta = details.querySelector('.yt-lesson__meta');
              if(meta && !meta.querySelector('[data-yt-maths-pill]')){
                meta.appendChild(document.createRange().createContextualFragment('<span class="yt-pill yt-pill--success" data-yt-maths-pill>Maths passed</span>'));
              }
            }
          }
        });
      }catch(err){
        mathsHost.innerHTML = `<p class="yt-error">Maths failed to load: ${esc(err?.message || err)}</p>`;
      }
    }
  }, true);\n
  mount.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if(!btn) return;
    const action = btn.getAttribute("data-action");
    const day = btn.getAttribute("data-day");
    const key = String(day);
    const current = storage.getState(active.id) || {};
    current.progress = current.progress || {};
    if(action === "mark-done"){
      current.progress[key] = { ...(current.progress[key]||{}), done: true, doneAt: new Date().toISOString() };
      storage.setState(active.id, current);
      btn.closest("details")?.setAttribute("data-done","true");
      // update meta pill
      btn.closest("details")?.querySelector(".yt-pill--muted")?.replaceWith(document.createRange().createContextualFragment('<span class="yt-pill yt-pill--success">Completed</span>'));
    }
    if(action === "unmark-done"){
      current.progress[key] = { ...(current.progress[key]||{}), done: false, doneAt: null };
      storage.setState(active.id, current);
      btn.closest("details")?.removeAttribute("data-done");
    }
  });
}
