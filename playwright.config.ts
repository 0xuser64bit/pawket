import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm ${process.env.CI ? "start" : "dev"} --port ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      // A fake audio sink: the music box still plays its graph, but the host's own headphones can no
      // longer hold a page up (a context opened as the last one closes waits seconds on some Macs).
      use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--disable-audio-output"] } },
    },
  ],
});
