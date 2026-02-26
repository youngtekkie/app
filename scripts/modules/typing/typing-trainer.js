import { storage } from "../../app/storage.js";

function esc(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function pickRandom(arr){
  if(!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random()*arr.length)];
}

function now(){ return performance && performance.now ? performance.now() : Date.now(); }

function calcWpm(charsTyped, elapsedMs){
  const minutes = Math.max(elapsedMs/60000, 1/60000);
  return Math.round(((charsTyped/5)/minutes) * 10) / 10;
}

function calcAccuracy(charsTotal, errors){
  if(charsTotal <= 0) return 0;
  const correct = Math.max(charsTotal - errors, 0);
  return Math.round((correct / charsTotal) * 100);
}

async function loadLesson(ref){
  const url = `./scripts/modules/typing/lessons/${encodeURIComponent(ref)}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`Typing lesson not found: ${ref}`);
  return await res.json();
}

function renderShell(lesson, text){
  return `
    <div class="yt-typing">
      <div class="yt-typing__top">
        <div>
          <div class="yt-typing__title">${esc(lesson.title || "Typing")}</div>
          <div class="yt-typing__meta yt-muted">Target: <strong>${esc(lesson.wpm_target)}</strong> WPM · <strong>${esc(lesson.accuracy_target)}%</strong> accuracy</div>
        </div>
        <div class="yt-typing__stats">
          <div class="yt-typing__stat"><span class="yt-muted">WPM</span><strong data-yt-wpm>0</strong></div>
          <div class="yt-typing__stat"><span class="yt-muted">Accuracy</span><strong data-yt-acc>100%</strong></div>
          <div class="yt-typing__stat"><span class="yt-muted">Errors</span><strong data-yt-err>0</strong></div>
        </div>
      </div>
      <div class="yt-typing__prompt" aria-label="Typing prompt" tabindex="0" data-yt-prompt>
        ${text.split("").map((ch,i)=>`<span class="yt-typing__ch" data-idx="${i}">${esc(ch)}</span>`).join("")}
      </div>
      <div class="yt-typing__actions">
        <button class="yt-btn yt-btn--primary" data-yt-start>Start</button>
        <button class="yt-btn" data-yt-reset disabled>Reset</button>
      </div>
      <div class="yt-typing__result" data-yt-result hidden></div>
    </div>
  `;
}

/**
 * initTypingSession(lessonRef, containerId, profileId)
 */
export async function initTypingSession(lessonRef, containerId, profileId, options={}){
  const container = document.getElementById(containerId);
  if(!container) throw new Error(`Typing container not found: ${containerId}`);

  const lesson = await loadLesson(lessonRef);
  const text = pickRandom(lesson.texts);
  container.innerHTML = renderShell(lesson, text);

  const promptEl = container.querySelector("[data-yt-prompt]");
  const startBtn = container.querySelector("[data-yt-start]");
  const resetBtn = container.querySelector("[data-yt-reset]");
  const resultEl = container.querySelector("[data-yt-result]");
  const wpmEl = container.querySelector("[data-yt-wpm]");
  const accEl = container.querySelector("[data-yt-acc]");
  const errEl = container.querySelector("[data-yt-err]");

  const spans = Array.from(container.querySelectorAll(".yt-typing__ch"));
  let idx = 0;
  let startedAt = null;
  let errors = 0;
  let keystrokes = 0;
  let liveTimer = null;
  let active = false;

  function setCursor(){
    spans.forEach(s => s.classList.remove("is-cursor"));
    const cur = spans[idx];
    if(cur) cur.classList.add("is-cursor");
  }

  function resetUI(){
    idx = 0; errors = 0; keystrokes = 0; startedAt = null; active = false;
    spans.forEach(s => { s.classList.remove("is-correct","is-wrong","is-cursor"); });
    wpmEl.textContent = "0";
    accEl.textContent = "100%";
    errEl.textContent = "0";
    resultEl.hidden = true;
    resultEl.innerHTML = "";
    startBtn.disabled = false;
    resetBtn.disabled = true;
    setCursor();
  }

  function updateStats(){
    if(!startedAt){
      accEl.textContent = `${calcAccuracy(Math.max(idx,1), errors)}%`;
      errEl.textContent = String(errors);
      return;
    }
    const elapsed = now() - startedAt;
    const wpm = calcWpm(idx, elapsed);
    const acc = calcAccuracy(Math.max(idx,1), errors);
    wpmEl.textContent = String(wpm);
    accEl.textContent = `${acc}%`;
    errEl.textContent = String(errors);
  }

  function finish(){
    active = false;
    if(liveTimer) clearInterval(liveTimer);
    const elapsed = Math.max(now() - (startedAt || now()), 1);
    const wpm = calcWpm(idx, elapsed);
    const acc = calcAccuracy(idx, errors);

    // Save
    if(profileId){
      const state = storage.getState(profileId) || {};
      state.typingRecords = Array.isArray(state.typingRecords) ? state.typingRecords : [];
      state.typingRecords.push({
        lessonId: lesson.id || lessonRef,
        date: new Date().toISOString(),
        wpm,
        accuracy: acc,
        duration: Math.round(elapsed/1000)
      });
      storage.setState(profileId, state);
    }

    const hitWpm = wpm >= Number(lesson.wpm_target || 0);
    const hitAcc = acc >= Number(lesson.accuracy_target || 0);
    const passed = hitWpm && hitAcc;

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="yt-card" style="margin-top:12px">
        <h4 class="yt-h3" style="margin-top:0">Result</h4>
        <div class="yt-grid">
          <div class="yt-col-12 yt-col-md-4"><span class="yt-muted">WPM</span><div style="font-size:28px"><strong>${esc(wpm)}</strong></div></div>
          <div class="yt-col-12 yt-col-md-4"><span class="yt-muted">Accuracy</span><div style="font-size:28px"><strong>${esc(acc)}%</strong></div></div>
          <div class="yt-col-12 yt-col-md-4"><span class="yt-muted">Errors</span><div style="font-size:28px"><strong>${esc(errors)}</strong></div></div>
        </div>
        <p class="yt-muted" style="margin:10px 0 0 0">
          ${passed ? "✅ Targets met. Brilliant." : "Keep going. Aim for the targets and try again."}
        </p>
      </div>
    `;

    // notify page (optional)
    if(typeof options.onComplete === "function"){
      options.onComplete({ wpm, accuracy: acc, passed, lessonId: lesson.id || lessonRef });
    }
  }

  function onKeydown(e){
    if(!active) return;
    if(e.key.length !== 1 && e.key !== "Enter" && e.key !== "Backspace" && e.key !== "Tab" && e.key !== " ") return;

    // prevent scrolling on space
    if(e.key === " ") e.preventDefault();

    if(!startedAt){
      startedAt = now();
      liveTimer = setInterval(updateStats, 5000);
    }

    const expected = text[idx];
    const got = (e.key === "Enter") ? "\n" : e.key;
    keystrokes += 1;

    if(got === expected){
      spans[idx]?.classList.add("is-correct");
      spans[idx]?.classList.remove("is-wrong");
      idx += 1;
      if(idx >= text.length){
        updateStats();
        finish();
        return;
      }
      setCursor();
    } else {
      errors += 1;
      const cur = spans[idx];
      if(cur){
        cur.classList.add("is-wrong");
        setTimeout(()=>cur.classList.remove("is-wrong"), 120);
      }
    }
    updateStats();
  }

  startBtn.addEventListener("click", () => {
    active = true;
    startBtn.disabled = true;
    resetBtn.disabled = false;
    promptEl.focus();
    setCursor();
  });

  resetBtn.addEventListener("click", () => {
    if(liveTimer) clearInterval(liveTimer);
    resetUI();
  });

  promptEl.addEventListener("keydown", onKeydown);
  // also capture keys if user clicks elsewhere in the card
  container.addEventListener("keydown", onKeydown);

  resetUI();
}
