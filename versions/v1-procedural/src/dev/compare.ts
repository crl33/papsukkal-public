/**
 * DEV-ONLY reference comparison overlay. Never ships: main.ts imports this
 * behind `import.meta.env.DEV`, which is compile-time false in production.
 *
 * The reference photograph is not committed (unknown license) — drag & drop
 * it onto the page once; it persists in localStorage.
 *
 * Keys:
 *   1 reference only   2 render only   3 50/50 overlay
 *   4 vertical split   5 difference    0 off
 */
import type { App } from "../app/App";

const STORAGE_KEY = "papsukkal-ref-image";

type Mode = "off" | "ref" | "render" | "overlay" | "split" | "diff";

export function installCompareOverlay(_app: App): void {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:50;display:none;overflow:hidden;";
  const img = document.createElement("img");
  img.style.cssText = "position:absolute;object-fit:cover;";
  wrap.appendChild(img);
  document.body.appendChild(wrap);

  const hud = document.createElement("div");
  hud.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:60;color:#9fd;font:11px monospace;background:#0009;padding:4px 8px;border-radius:4px;pointer-events:none;";
  hud.textContent = "compare: [1]ref [2]render [3]overlay [4]split [5]diff [0]off — drop reference image anywhere";
  document.body.appendChild(hud);

  let mode: Mode = "off";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) img.src = stored;

  // The reference must occupy the exact same viewport as the render:
  // cover-fit, centered, matching the canvas.
  function layout(): void {
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
  }
  layout();
  window.addEventListener("resize", layout);

  function apply(): void {
    wrap.style.display = mode === "off" || mode === "render" ? "none" : "block";
    img.style.opacity = "1";
    img.style.mixBlendMode = "normal";
    wrap.style.clipPath = "none";
    if (mode === "overlay") img.style.opacity = "0.5";
    if (mode === "split") wrap.style.clipPath = "inset(0 50% 0 0)";
    if (mode === "diff") img.style.mixBlendMode = "difference";
    hud.textContent = `compare mode: ${mode} ${img.src ? "" : "(no reference loaded — drop an image)"}`;
  }

  window.addEventListener("keydown", (e) => {
    const map: Record<string, Mode> = {
      "1": "ref",
      "2": "render",
      "3": "overlay",
      "4": "split",
      "5": "diff",
      "0": "off",
    };
    if (e.key in map) {
      mode = map[e.key];
      apply();
    }
  });

  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      img.src = url;
      try {
        localStorage.setItem(STORAGE_KEY, url);
      } catch {
        /* image too large for localStorage — session-only */
      }
      mode = "overlay";
      apply();
    };
    reader.readAsDataURL(file);
  });
}
