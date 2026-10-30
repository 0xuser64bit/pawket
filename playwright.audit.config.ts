import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  testMatch: ["accessibility.spec.ts", "resilience.spec.ts", "responsive-audit.spec.ts"],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
