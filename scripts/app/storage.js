const KEY_PROFILES = "yta_profiles_v1";
const KEY_ACTIVE = "yta_active_profile_v1";
const KEY_SETTINGS = "yta_settings_v1";

const DEFAULT_SETTINGS = {
  mode: "kid",                 // "kid" | "parent"
  parentPinHash: null,         // optional (future); keep null for now
};

function safeParse(json, fallback){
  try { return JSON.parse(json); } catch { return fallback; }
}

export const storage = {
  keys: { KEY_PROFILES, KEY_ACTIVE, KEY_SETTINGS },
  getProfiles(){
    return safeParse(localStorage.getItem(KEY_PROFILES), []);
  },
  setProfiles(list){
    localStorage.setItem(KEY_PROFILES, JSON.stringify(list));
  },
  getActiveProfileId(){
    return localStorage.getItem(KEY_ACTIVE);
  },
  setActiveProfileId(id){
    if(id) localStorage.setItem(KEY_ACTIVE, id);
    else localStorage.removeItem(KEY_ACTIVE);
  },
  getSettings(){
    const s = safeParse(localStorage.getItem(KEY_SETTINGS), null);
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
  },
  setSettings(next){
    const merged = { ...storage.getSettings(), ...(next || {}) };
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(merged));
    return merged;
  },
  stateKey(profileId){
    return `yta_state_${profileId}_v1`;
  },
  getState(profileId){
    if(!profileId) return null;
    return safeParse(localStorage.getItem(storage.stateKey(profileId)), {
      version: 1,
      profileId,
      progress: {},
      typingRecords: [],
      mathsScores: {},
      codeProjects: {},
      updatedAt: null
    });
  },
  setState(profileId, state){
    const next = { ...(state||{}), updatedAt: new Date().toISOString() };
    localStorage.setItem(storage.stateKey(profileId), JSON.stringify(next));
    return next;
  }
};
