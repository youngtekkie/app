import { loadJSON } from "../app/config.js";

let _cache = null;

export async function loadCurriculum(){
  if(_cache) return _cache;
  _cache = await loadJSON("./data/curriculum.json");
  if(!_cache || !Array.isArray(_cache.days)) throw new Error("Curriculum missing days array");
  return _cache;
}

export async function getDays(){
  const c = await loadCurriculum();
  return c.days;
}

export async function getDaysForPhase(phaseNumber){
  const days = await getDays();
  // In legacy content, "month" maps to phase.
  return days.filter(d => Number(d.month) === Number(phaseNumber));
}

export function phaseTitle(phaseNumber){
  const n = Number(phaseNumber);
  if(n===1) return "Phase 1";
  if(n===2) return "Phase 2";
  if(n===3) return "Phase 3";
  return `Phase ${n}`;
}
