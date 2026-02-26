import { $, on, escapeHtml } from "../app/dom.js";
import { createProfile, deleteProfile, listProfiles, setActiveProfile, getActiveProfile } from "../features/profiles.js";

function render(){
  const listEl = $("#profiles-list");
  const active = getActiveProfile();
  const profiles = listProfiles();

  if(!listEl) return;

  listEl.innerHTML = profiles.map(p => {
    const isActive = active?.id === p.id;
    return `
      <div class="yt-card yt-profile">
        <div class="yt-profile__info">
          <div class="yt-profile__name">${escapeHtml(p.name)}</div>
          <div class="yt-muted">${escapeHtml(p.yearGroup || "")}</div>
          ${isActive ? `<span class="yt-pill yt-pill--success">Active</span>` : ""}
        </div>
        <div class="yt-profile__actions">
          <button class="yt-btn ${isActive ? "" : "yt-btn--primary"}" data-action="select" data-id="${p.id}">
            ${isActive ? "Selected" : "Select"}
          </button>
          <button class="yt-btn yt-btn--danger" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("") || `<div class="yt-card">No profiles yet. Create one above.</div>`;
}

export default async function profilesPage(){
  const form = $("#profile-form");
  const nameEl = $("#child-name");
  const yearEl = $("#year-group");
  const msg = $("#profile-message");

  on(form, "submit", (e) => {
    e.preventDefault();
    try{
      const p = createProfile({ name: nameEl?.value, yearGroup: yearEl?.value });
      if(msg){ msg.textContent = `Profile created: ${p.name}`; msg.classList.remove("is-error"); msg.classList.add("is-ok"); }
      if(nameEl) nameEl.value = "";
      render();
    }catch(err){
      if(msg){ msg.textContent = String(err?.message || err); msg.classList.remove("is-ok"); msg.classList.add("is-error"); }
    }
  });

  on(document, "click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if(!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if(action === "delete" && id){
      if(confirm("Delete this profile?")){
        deleteProfile(id);
        render();
      }
    }
    if(action === "select" && id){
      setActiveProfile(id);
      render();
    }
  });

  render();
}
