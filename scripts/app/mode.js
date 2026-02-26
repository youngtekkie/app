import { storage } from "./storage.js";

async function sha256(text){
  const enc = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

export const mode = {
  get(){
    return storage.getSettings().mode || "kid";
  },
  async set(nextMode){
    const m = (nextMode === "parent") ? "parent" : "kid";
    storage.setSettings({ mode: m });
    document.documentElement.dataset.mode = m;
    window.dispatchEvent(new CustomEvent("yta:mode", { detail: { mode: m } }));
    return m;
  },
  async toggleWithGuard(promptPin){
    // promptPin: async ({kind}) => pin string or null
    const current = mode.get();
    if(current === "parent"){
      return mode.set("kid");
    }
    // switching to parent
    const settings = storage.getSettings();
    const hasPin = !!settings.parentPinHash;

    if(!crypto?.subtle){
      // If WebCrypto unavailable, fall back to no-pin unlock.
      return mode.set("parent");
    }

    if(!hasPin){
      const pin = await promptPin?.({ kind: "set" });
      if(!pin) return "kid";
      const hash = await sha256(pin);
      storage.setSettings({ parentPinHash: hash });
      return mode.set("parent");
    }

    const pin = await promptPin?.({ kind: "enter" });
    if(!pin) return "kid";
    const hash = await sha256(pin);
    if(hash !== settings.parentPinHash){
      return "kid";
    }
    return mode.set("parent");
  },
  applyToDom(){
    document.documentElement.dataset.mode = mode.get();
  }
};
