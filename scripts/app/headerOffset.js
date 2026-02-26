export function applyHeaderOffset(){
  const header = document.querySelector(".yt-topbar");
  if(!header) return;
  const h = Math.round(header.getBoundingClientRect().height || 72);
  document.documentElement.style.setProperty("--headerH", `${h}px`);
}
