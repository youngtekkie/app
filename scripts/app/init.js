import { storage } from "./storage.js";
import { mode } from "./mode.js";
import { route } from "./router.js";
import { mountChrome } from "../features/nav.js";
import { applyHeaderOffset } from "./headerOffset.js";

export async function initApp(){
  // Contract: single namespace for debug + shared features
  window.YTA = window.YTA || {};
  window.YTA.storage = storage;
  window.YTA.mode = mode;

  await mountChrome();
  mode.applyToDom();
  applyHeaderOffset();
  window.addEventListener("resize", applyHeaderOffset);

  const pageId = document.body?.dataset?.page || "home";
  window.YTA.page = pageId;

  await route(pageId);
}
