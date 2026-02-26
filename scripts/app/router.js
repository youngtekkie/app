export async function route(pageId){
  const routes = {
    "home": () => import("../pages/home.page.js"),
    "profiles": () => import("../pages/profiles.page.js"),
    "dashboard": () => import("../pages/dashboard.page.js"),
    "phase1": () => import("../pages/phase.page.js"),
    "phase2": () => import("../pages/phase.page.js"),
    "phase3": () => import("../pages/phase.page.js"),
    "support": () => import("../pages/support.page.js"),
    "debug": () => import("../pages/debug.page.js"),
  };

  const loader = routes[pageId] || routes["home"];
  const mod = await loader();
  if (typeof mod.default === "function") await mod.default();
}
