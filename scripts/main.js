import { initApp } from "./app/init.js";

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await initApp();
  } catch (err) {
    console.error("[YTA] Fatal init error:", err);
    const el = document.getElementById("app-error");
    if (el) el.textContent = String(err?.message || err);
  }
});
