import { storage } from "../../app/storage.js";

function esc(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function getProject(state, lessonId){
  state.codeProjects = state.codeProjects || {};
  state.codeProjects[lessonId] = state.codeProjects[lessonId] || {};
  return state.codeProjects[lessonId];
}

function saveXml(profileId, lessonId, xml){
  if(!profileId) return;
  const st = storage.getState(profileId) || {};
  const proj = getProject(st, lessonId);
  proj.blocklyXml = xml;
  proj.blocklySavedAt = new Date().toISOString();
  storage.setState(profileId, st);
}

function loadXml(profileId, lessonId){
  if(!profileId) return null;
  const st = storage.getState(profileId) || {};
  return st.codeProjects?.[lessonId]?.blocklyXml || null;
}

async function loadVendorScript(relPath){
  const url = new URL(relPath, import.meta.url).toString();
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Missing vendor file: ${relPath}`));
    document.head.appendChild(s);
  });
}

async function ensureVendors(){
  if(window.Blockly && window.Phaser) return true;

  // Expect self-hosted vendor files in ./vendor/
  await loadVendorScript("./vendor/blockly.min.js");
  await loadVendorScript("./vendor/phaser.min.js");

  if(!window.Blockly) throw new Error("Blockly did not load (check vendor/blockly.min.js)");
  if(!window.Phaser) throw new Error("Phaser did not load (check vendor/phaser.min.js)");
  return true;
}

function toolboxFor(unlockedBlocks){
  // Placeholder toolbox mapping. When real Blockly is present, you can replace this
  // with a proper category/toolbox based on unlockedBlocks.
  // For now we give a minimal set if Blockly exists.
  return `
    <xml id="toolbox" style="display:none">
      <category name="Events" colour="#7c3aed">
        <block type="event_whenflagclicked"></block>
      </category>
      <category name="Motion" colour="#2563eb">
        <block type="motion_movesteps"></block>
        <block type="motion_turnright"></block>
        <block type="motion_turnleft"></block>
      </category>
      <category name="Control" colour="#16a34a">
        <block type="control_repeat"></block>
        <block type="control_forever"></block>
        <block type="control_if"></block>
      </category>
      <category name="Variables" custom="VARIABLE" colour="#f59e0b"></category>
    </xml>
  `;
}

export async function initBlockStudio(hostId, profileId, lessonId, opts={}){
  const host = document.getElementById(hostId);
  if(!host) throw new Error("Blocks host not found");

  const unlockedBlocks = opts.unlockedBlocks || [];
  const saved = loadXml(profileId, lessonId) || "";

  host.innerHTML = `
    <div class="yt-studio">
      <div class="yt-studio__panel">
        <h4>Blocks</h4>
        <div class="yt-muted" style="margin-bottom:10px">
          If the block editor isn’t showing yet, add the self-hosted Blockly + Phaser vendor files.
        </div>
        <div id="${hostId}-workspace" style="height: 360px"></div>
      </div>
      <div class="yt-studio__panel">
        <h4>Saved Project</h4>
        <div class="yt-muted" style="margin-bottom:10px">We store the workspace as XML per lesson.</div>
        <textarea class="yt-input yt-studio__xml" spellcheck="false"></textarea>
        <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap">
          <button class="yt-btn yt-btn--primary" data-act="save">Save</button>
          <button class="yt-btn yt-btn--ghost" data-act="load">Load</button>
        </div>
        <div class="yt-muted" style="margin-top:10px" data-status=""></div>
      </div>
    </div>
  `;

  const xmlTa = host.querySelector("textarea");
  const status = host.querySelector("[data-status]");
  xmlTa.value = saved;

  const setStatus = (msg) => { status.textContent = msg; };

  host.querySelector("[data-act='save']").addEventListener("click", () => {
    saveXml(profileId, lessonId, xmlTa.value);
    setStatus("Saved.");
  });
  host.querySelector("[data-act='load']").addEventListener("click", () => {
    xmlTa.value = loadXml(profileId, lessonId) || "";
    setStatus("Loaded.");
  });

  // If vendors exist, try to mount Blockly workspace and sync XML textarea.
  try{
    await ensureVendors();

    const workspaceHost = host.querySelector(`#${CSS.escape(hostId)}-workspace`);
    workspaceHost.innerHTML = toolboxFor(unlockedBlocks);

    const toolbox = workspaceHost.querySelector("#toolbox");
    const workspace = window.Blockly.inject(workspaceHost, {
      toolbox,
      trashcan: true,
      grid: { spacing: 20, length: 3, colour: "#e5e7eb", snap: true }
    });

    // Load saved xml if present
    if(xmlTa.value.trim()){
      try{
        const dom = window.Blockly.Xml.textToDom(xmlTa.value);
        window.Blockly.Xml.domToWorkspace(dom, workspace);
      }catch(_e){ /* ignore bad XML */ }
    }

    // Keep textarea updated
    const updateXml = () => {
      try{
        const dom = window.Blockly.Xml.workspaceToDom(workspace);
        xmlTa.value = window.Blockly.Xml.domToText(dom);
      }catch(_e){ /* ignore */ }
    };
    workspace.addChangeListener(() => updateXml());
    setStatus("Block editor ready.");
  }catch(err){
    setStatus(`Game Studio not fully enabled: ${err?.message||err}`);
  }
}
