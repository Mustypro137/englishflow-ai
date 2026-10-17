import { defineConfig, devices } from "@playwright/test";
import { FIXTURE_MANIFEST, writeFixtureManifest } from "./e2e/audio-fixture";
import { E2E_SCHEMA } from "./e2e/db";
import { BASE_URL as baseURL, LAB_URL as labURL, PORT } from "./e2e/servers";

const LAB_PORT = PORT + 1;

writeFixtureManifest();
const serverEnv = { AUTH_RATE_LIMIT: "off", DATABASE_SCHEMA: E2E_SCHEMA };

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  // Locally the database is remote, so too many browsers at once just queue on it.
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Database round trips from a development machine to a remote database can be slow,
  // so assertions that wait on a server response get more than the default 5 seconds.
  expect: { timeout: process.env.CI ? 15_000 : 30_000 },
  timeout: process.env.CI ? 60_000 : 120_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Tests run against the production build, which is what learners get.
  // Never reuse a server: one started elsewhere might point at the live schema.
  // Auth rate limits would block the many quick sign-ups these tests make.
  // Both servers use the isolated browser-test schema, never the live one.
  webServer: [
    {
      // Like a real site without an AI key or audio files.
      command: `npm run start -- -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...serverEnv, BETTER_AUTH_URL: baseURL },
    },
    {
      command: `npm run start -- -p ${LAB_PORT}`,
      url: labURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...serverEnv,
        BETTER_AUTH_URL: labURL,
        AI_PROVIDER: "mock",
        ALLOW_MOCK_AI: "1",
        AUDIO_MANIFEST_PATH: FIXTURE_MANIFEST,
      },
    },
  ],
});
