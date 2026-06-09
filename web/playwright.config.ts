import { defineConfig } from "@playwright/test";

// E2E config for the web file-feature flows (REQ-124). Drives the production
// build at a phone viewport (< 700px → the compact/tabbed iOS layout) so the
// tests exercise the same UX the iOS shell hosts. The bridge is stubbed per
// test (see e2e/bridge-stub.ts); no native shell is required.
const PORT = 4178;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node e2e/static-server.mjs",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
