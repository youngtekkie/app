import { storage } from "../../app/storage.js";

function esc(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function getProject(state, lessonId){
  state.codeProjects = state.codeProjects || {};
  state.codeProjects[lessonId] = state.codeProjects[lessonId] || {};
  return state.codeProjects[lessonId];
}

function savePython(profileId, lessonId, code){
  if(!profileId) return;
  const st = storage.getState(profileId) || {};
  const proj = getProject(st, lessonId);
  proj.pythonCode = code;
  proj.pythonSavedAt = new Date().toISOString();
  storage.setState(profileId, st);
}

function loadPython(profileId, lessonId){
  if(!profileId) return null;
  const st = storage.getState(profileId) || {};
  const proj = st.codeProjects?.[lessonId];
  return proj?.pythonCode || null;
}

async function ensurePyodide(){
  // If already loaded
  if(window.pyodide) return window.pyodide;

  // Expect self-hosted pyodide loader at ./pyodide/pyodide.js (non-module)
  const url = new URL("./pyodide/pyodide.js", import.meta.url).toString();

  // Load script tag
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Missing pyodide.js bundle (place it in scripts/modules/python-ide/pyodide/)"));
    document.head.appendChild(s);
  });

  if(typeof window.loadPyodide !== "function"){
    throw new Error("Pyodide loader not found (loadPyodide missing). Check your pyodide bundle.");
  }

  const indexURL = new URL("./pyodide/", import.meta.url).toString();
  const pyodide = await window.loadPyodide({ indexURL });
  window.pyodide = pyodide;
  return pyodide;
}

async function runPython(code, io){
  const pyodide = await ensurePyodide();

  // Basic stdout capture. Pyodide versions differ; handle defensively.
  let out = "";
  const write = (s) => { out += String(s); io.onStdout?.(String(s)); };

  try{
    if(pyodide.setStdout){
      pyodide.setStdout({ batched: (s) => write(s) });
    }
    if(pyodide.setStderr){
      pyodide.setStderr({ batched: (s) => io.onStderr?.(String(s)) });
    }
  }catch(_e){ /* ignore */ }

  // input() bridge — limited but works for common cases:
  // We patch builtins.input to call a JS function that returns a Promise.
  // Some pyodide builds support async input; if not, we show a friendly message.
  const wantsInput = /\binput\s*\(/.test(code);

  if(wantsInput){
    window.__yta_input_async = async (promptText) => {
      const value = await io.requestInput?.(String(promptText || ""));
      return String(value ?? "");
    };
    const patch = `
import builtins
try:
  import js
  async def _yta_input(prompt=''):
    return await js.__yta_input_async(prompt)
  builtins.input = _yta_input
except Exception:
  pass
`;
    // If input() is used, we must run through async path.
    try{
      await pyodide.runPythonAsync(patch);
    }catch(_e){ /* ignore */ }
  }

  // Run code
  try{
    const result = await pyodide.runPythonAsync(code);
    return { ok: true, out, result };
  }catch(err){
    return { ok: false, out, error: err };
  }
}

export async function initPythonIDE(hostId, profileId, lessonId, opts={}){
  const host = document.getElementById(hostId);
  if(!host) throw new Error("Python host not found");

  const starterCode = opts.starterCode || "";
  const saved = loadPython(profileId, lessonId);
  const initial = saved ?? starterCode;

  host.innerHTML = `
    <div class="yt-python">
      <div class="yt-python__toolbar">
        <button class="yt-btn yt-btn--primary" data-act="run">Run</button>
        <button class="yt-btn yt-btn--ghost" data-act="clear">Clear output</button>
        <button class="yt-btn yt-btn--ghost" data-act="reset">Reset to starter</button>
        <span class="yt-muted yt-python__hint">Python runs offline once Pyodide bundle is added.</span>
      </div>
      <textarea class="yt-input yt-python__editor" spellcheck="false"></textarea>
      <div class="yt-python__output" aria-live="polite"></div>
    </div>
  `;

  const ta = host.querySelector("textarea");
  const out = host.querySelector(".yt-python__output");
  ta.value = initial;

  const appendOut = (s) => { out.textContent += String(s); };
  const setErr = (s) => { out.textContent += String(s); };

  // autosave (debounced)
  let t = null;
  ta.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => savePython(profileId, lessonId, ta.value), 250);
  });

  async function requestInput(promptText){
    // Simple input UI appended under output.
    return await new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "yt-python__input";
      wrap.innerHTML = `
        <div class="yt-muted">${esc(promptText)}</div>
        <input class="yt-input" type="text" />
        <button class="yt-btn yt-btn--primary">Enter</button>
      `;
      out.appendChild(wrap);
      const inp = wrap.querySelector("input");
      const btn = wrap.querySelector("button");
      const done = () => {
        const v = inp.value;
        wrap.innerHTML = `<div class="yt-muted">${esc(promptText)} ${esc(v)}</div>`;
        resolve(v);
      };
      btn.addEventListener("click", done);
      inp.addEventListener("keydown", (e) => { if(e.key==="Enter") done(); });
      inp.focus();
    });
  }

  host.querySelector("[data-act='clear']").addEventListener("click", () => { out.textContent = ""; });
  host.querySelector("[data-act='reset']").addEventListener("click", () => {
    ta.value = starterCode;
    savePython(profileId, lessonId, ta.value);
  });

  host.querySelector("[data-act='run']").addEventListener("click", async () => {
    out.textContent = "";
    savePython(profileId, lessonId, ta.value);

    // Try to run with Pyodide if available; otherwise show guidance.
    try{
      const res = await runPython(ta.value, { onStdout: appendOut, onStderr: setErr, requestInput });
      if(!res.ok){
        out.textContent += "\n" + (res.error?.message || String(res.error));
      }
    }catch(err){
      out.innerHTML = `
        <div class="yt-muted">
          <strong>Python engine not installed yet.</strong><br/>
          To enable offline Python, place the Pyodide release files in:<br/>
          <code>scripts/modules/python-ide/pyodide/</code><br/>
          Then reload this page.
          <div style="margin-top:8px">Details: ${esc(err?.message||err)}</div>
        </div>
      `;
    }
  });
}
