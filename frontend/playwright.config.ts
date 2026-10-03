import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", outputDir: "./test-results/browser", workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3000", channel: "chrome", launchOptions: { args: ["--use-angle=swiftshader", "--enable-webgl"] } },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000", reuseExistingServer: true, timeout: 120000 },
});
