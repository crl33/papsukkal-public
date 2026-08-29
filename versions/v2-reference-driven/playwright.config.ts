import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45000,
  use: {
    baseURL: "http://localhost:5193",
    viewport: { width: 1242, height: 822 },
    deviceScaleFactor: 1,
    launchOptions: { args: ["--force-color-profile=srgb"] },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5193",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
