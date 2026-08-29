import { App } from "./app/App";

const container = document.getElementById("scene");
if (!container) throw new Error("missing #scene container");

const params = new URLSearchParams(location.search);
if (params.get("bare") === "1") {
  document.querySelector<HTMLElement>(".overlay")?.style.setProperty("display", "none");
}

const app = new App(container, () => {
  (window as unknown as Record<string, unknown>).__papsukkalReady = true;
});

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__app = app;
  import("./dev/debug").then((m) => m.installDebug(app));
}
