/**
 * DEV-ONLY debug modes (never ships — DEV-guarded dynamic import).
 *
 * Keys:
 *   1 reference image        2 static (wind → 0)     3 animated (wind → 1)
 *   4 plate only             5 rigged layers only    6 difference vs reference
 *   0 off
 *
 * The reference overlay uses object-fit: cover — App's ortho cover-fit uses
 * identical math, so overlay and render align pixel-for-pixel.
 */
import type { App } from "../app/App";

export function installDebug(app: App): void {
  const img = document.createElement("img");
  img.src = `${import.meta.env.BASE_URL}reference/reference.jpg`;
  img.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:40;display:none;";
  document.body.appendChild(img);

  const hud = document.createElement("div");
  hud.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:60;color:#9fd;font:11px monospace;background:#0009;padding:4px 8px;border-radius:4px;pointer-events:none;";
  hud.textContent = "debug: [1]ref [2]static [3]animated [4]plate [5]layers [6]diff [0]off";
  document.body.appendChild(hud);

  const setLayerVisibility = (plate: boolean, rigged: boolean) => {
    for (const lm of app.layerMeshes) {
      lm.mesh.visible = lm.def.rig ? rigged : plate;
    }
  };

  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "1":
        img.style.display = "block";
        img.style.mixBlendMode = "normal";
        img.style.opacity = "1";
        hud.textContent = "debug: REFERENCE";
        break;
      case "2":
        app.wind.intensity = 0;
        img.style.display = "none";
        setLayerVisibility(true, true);
        hud.textContent = "debug: STATIC (wind=0)";
        break;
      case "3":
        app.wind.intensity = 1;
        img.style.display = "none";
        setLayerVisibility(true, true);
        hud.textContent = "debug: ANIMATED (wind=1)";
        break;
      case "4":
        img.style.display = "none";
        setLayerVisibility(true, false);
        hud.textContent = "debug: PLATE ONLY";
        break;
      case "5":
        img.style.display = "none";
        setLayerVisibility(false, true);
        hud.textContent = "debug: RIGGED LAYERS ONLY";
        break;
      case "6":
        img.style.display = "block";
        img.style.mixBlendMode = "difference";
        img.style.opacity = "1";
        hud.textContent = "debug: DIFFERENCE vs reference (black = identical)";
        break;
      case "0":
        img.style.display = "none";
        setLayerVisibility(true, true);
        hud.textContent = "debug: off";
        break;
    }
  });
}
