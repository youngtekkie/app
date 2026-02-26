import { storage } from "../app/storage.js";

function uid(){
  return "p_" + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}

export function listProfiles(){
  return storage.getProfiles();
}

export function createProfile({ name, yearGroup }){
  const profiles = storage.getProfiles();
  const trimmed = (name || "").trim();
  if(!trimmed) throw new Error("Enter a child name.");
  const p = {
    id: uid(),
    name: trimmed,
    yearGroup: yearGroup || "Year 4",
    createdAt: new Date().toISOString()
  };
  profiles.push(p);
  storage.setProfiles(profiles);
  storage.setActiveProfileId(p.id);
  return p;
}

export function deleteProfile(id){
  const profiles = storage.getProfiles().filter(p => p.id !== id);
  storage.setProfiles(profiles);
  if(storage.getActiveProfileId() === id){
    storage.setActiveProfileId(profiles[0]?.id || null);
  }
}

export function setActiveProfile(id){
  storage.setActiveProfileId(id);
}

export function getActiveProfile(){
  const id = storage.getActiveProfileId();
  return storage.getProfiles().find(p => p.id === id) || null;
}
