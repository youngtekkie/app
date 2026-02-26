import { storage } from "../../app/storage.js";

/**
 * Maths Engine (M3)
 * - Loads a question bank JSON from ./questions/{ref}.json
 * - Renders questions one at a time
 * - Supports: multiple-choice, fill-in, word-problem
 * - Wrong once: show hint + allow retry
 * - Wrong twice: show explanation + mark incorrect + move on
 * - Pass rule: score >= 70%
 *
 * API:
 *   initMathsSession(weekRef, track, lessonId, containerId, profileId, opts?)
 */
function esc(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadBank(weekRef){
  const url = new URL(`./questions/${weekRef}.json`, import.meta.url);
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Question bank not found: ${weekRef}`);
  return await res.json();
}

function pct(n){ return Math.round(n); }

export async function initMathsSession(weekRef, track, lessonId, containerId, profileId, opts = {}){
  const host = document.getElementById(containerId);
  if(!host) return;
  host.innerHTML = `<p class="yt-muted" style="margin:0">Loading maths…</p>`;

  const bank = await loadBank(weekRef);
  const diff = bank?.difficulty?.[track] || bank?.difficulty?.foundation || { timeLimit: 90, questions: 8 };
  const limitSeconds = Number(diff.timeLimit || 90);
  const questionCount = Number(diff.questions || 8);

  const allQ = Array.isArray(bank.questions) ? bank.questions.slice() : [];
  // shuffle (Fisher-Yates)
  for(let i=allQ.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
  }
  const questions = allQ.slice(0, Math.min(questionCount, allQ.length));

  let idx = 0;
  let correct = 0;
  let startedAt = null;
  let remaining = limitSeconds;
  let timer = null;

  const state = {
    attempts: 0, // attempts for current question
    lastFeedback: null
  };

  function stopTimer(){
    if(timer){ clearInterval(timer); timer = null; }
  }

  function startTimer(){
    stopTimer();
    timer = setInterval(() => {
      remaining -= 1;
      if(remaining <= 0){
        remaining = 0;
        stopTimer();
        renderEnd(true);
      }else{
        const t = host.querySelector("[data-yt-timer]");
        if(t) t.textContent = formatTime(remaining);
      }
    }, 1000);
  }

  function formatTime(s){
    const m = Math.floor(s/60);
    const ss = String(s%60).padStart(2,"0");
    return `${m}:${ss}`;
  }

  function renderShell(inner){
    host.innerHTML = `
      <div class="yt-maths">
        <div class="yt-maths__top">
          <div class="yt-maths__meta">
            <span class="yt-pill">Maths</span>
            <span class="yt-pill yt-pill--muted">${esc(bank.topic || "Session")}</span>
            <span class="yt-pill yt-pill--muted">Q <span data-yt-qno>${idx+1}</span>/${questions.length}</span>
          </div>
          <div class="yt-maths__timer">
            <span class="yt-pill yt-pill--muted">⏱ <span data-yt-timer>${formatTime(remaining)}</span></span>
          </div>
        </div>
        <div class="yt-card yt-card--soft yt-maths__body">
          ${inner}
        </div>
      </div>
    `;
  }

  function renderStart(){
    renderShell(`
      <h4 class="yt-h3" style="margin-top:0">Ready for maths?</h4>
      <p class="yt-muted">Answer the questions. If you miss one, you'll get a hint, then one more try.</p>
      <div class="yt-stack-md">
        <button class="yt-btn yt-btn--primary" data-yt-start>Start</button>
      </div>
    `);
    host.querySelector("[data-yt-start]")?.addEventListener("click", () => {
      startedAt = new Date().toISOString();
      startTimer();
      idx = 0;
      correct = 0;
      state.attempts = 0;
      renderQuestion();
    });
  }

  function renderFeedback(kind, text){
    if(!text) return "";
    const cls = kind === "good" ? "yt-note yt-note--success" : kind === "warn" ? "yt-note yt-note--warn" : "yt-note yt-note--danger";
    return `<div class="${cls}" style="margin-top:10px">${esc(text)}</div>`;
  }

  function normaliseAnswer(a){
    return String(a ?? "").trim().toLowerCase();
  }

  function renderQuestion(){
    const q = questions[idx];
    if(!q){ return renderEnd(false); }
    state.attempts = 0;
    state.lastFeedback = null;

    const prompt = `
      <h4 class="yt-h3" style="margin-top:0">${esc(q.question || "")}</h4>
      ${q.type === "fill-in" ? `
        <div class="yt-stack-md">
          <input class="yt-input" data-yt-input placeholder="Type your answer" inputmode="text" />
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="yt-btn yt-btn--primary" data-yt-submit>Submit</button>
            <button class="yt-btn" data-yt-skip>Skip</button>
          </div>
          <div data-yt-feedback></div>
        </div>
      ` : `
        <div class="yt-stack-md">
          <div class="yt-maths__options">
            ${(q.options || []).map((opt, i) => `
              <button class="yt-btn yt-btn--option" data-yt-opt="${i}">${esc(opt)}</button>
            `).join("")}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="yt-btn" data-yt-skip>Skip</button>
          </div>
          <div data-yt-feedback></div>
        </div>
      `}
    `;

    renderShell(prompt);

    const qno = host.querySelector("[data-yt-qno]");
    if(qno) qno.textContent = String(idx+1);

    const feedbackEl = host.querySelector("[data-yt-feedback]");

    function setFeedback(kind, text){
      if(feedbackEl) feedbackEl.innerHTML = renderFeedback(kind, text);
    }

    function markAndNext(isCorrect){
      if(isCorrect) correct += 1;
      idx += 1;
      setTimeout(() => renderQuestion(), 350);
    }

    function handleWrong(){
      state.attempts += 1;
      if(state.attempts === 1){
        setFeedback("warn", q.hint || "Not quite. Try again.");
      }else{
        setFeedback("bad", q.explanation || "Good try. Let's move on.");
        setTimeout(() => markAndNext(false), 700);
      }
    }

    function handleCorrect(){
      setFeedback("good", "Correct ✅");
      setTimeout(() => markAndNext(true), 450);
    }

    host.querySelector("[data-yt-skip]")?.addEventListener("click", () => {
      setFeedback("warn", "Skipped. Let's move on.");
      setTimeout(() => markAndNext(false), 450);
    });

    if(q.type === "fill-in"){
      const input = host.querySelector("[data-yt-input]");
      const submit = host.querySelector("[data-yt-submit]");
      const check = () => {
        const ans = normaliseAnswer(input?.value || "");
        const expected = normaliseAnswer(q.answer);
        if(ans && expected && ans === expected) handleCorrect();
        else handleWrong();
      };
      submit?.addEventListener("click", check);
      input?.addEventListener("keydown", (ev) => {
        if(ev.key === "Enter"){ ev.preventDefault(); check(); }
      });
    }else{
      host.querySelectorAll("[data-yt-opt]").forEach(btn => {
        btn.addEventListener("click", () => {
          const chosen = Number(btn.getAttribute("data-yt-opt"));
          const expected = Number(q.answerIndex);
          if(Number.isFinite(chosen) && chosen === expected) handleCorrect();
          else handleWrong();
        });
      });
    }
  }

  function renderEnd(timedOut){
    stopTimer();
    const total = questions.length || 0;
    const scorePct = total ? (correct/total)*100 : 0;
    const passed = scorePct >= 70;

    // Persist
    if(profileId){
      const current = storage.getState(profileId) || {};
      current.mathsScores = current.mathsScores || {};
      current.mathsScores[weekRef] = {
        weekRef,
        lessonId: String(lessonId || ""),
        track,
        topic: bank.topic || "",
        correct,
        total,
        score: pct(scorePct),
        passed,
        date: new Date().toISOString(),
        timedOut: !!timedOut,
        durationSeconds: limitSeconds - remaining
      };
      storage.setState(profileId, current);
    }

    renderShell(`
      <h4 class="yt-h3" style="margin-top:0">${timedOut ? "Time's up" : "Session complete"}</h4>
      <p class="yt-muted">Score: <strong>${correct}</strong> out of <strong>${total}</strong> (${pct(scorePct)}%)</p>
      <div class="yt-stack-md">
        <div class="${passed ? "yt-note yt-note--success" : "yt-note yt-note--warn"}">
          ${passed ? "Passed ✅ Great job!" : "Not quite yet. Try again and aim for 70%+"}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="yt-btn yt-btn--primary" data-yt-retry>Try again</button>
        </div>
      </div>
    `);

    host.querySelector("[data-yt-retry]")?.addEventListener("click", () => {
      remaining = limitSeconds;
      idx = 0;
      correct = 0;
      startedAt = new Date().toISOString();
      startTimer();
      renderQuestion();
    });

    if(typeof opts.onComplete === "function"){
      opts.onComplete({ passed, score: pct(scorePct), correct, total, weekRef });
    }
  }

  renderStart();
}
