import { App } from "./app/App";

const container = document.getElementById("scene");
if (!container) throw new Error("missing #scene container");

const app = new App({ container });

// Dev-only visual comparison overlay. The import is guarded by the DEV
// constant, so the module is dead-code-eliminated from production builds.
if (import.meta.env.DEV) {
  import("./dev/compare").then((m) => m.installCompareOverlay(app));
}
