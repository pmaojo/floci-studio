import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './.playwright-mcp',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Overridable via BASE_URL env var so the Docker test container can point at the gui service */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Stable 1440x900 canvas so docs screenshots are reproducible. */
        viewport: { width: 1440, height: 900 },
        /*
         * Sandboxes that ship a pre-baked Chromium (different build than the
         * one `@playwright/test` pins) can point at it with
         * PLAYWRIGHT_CHROMIUM_PATH. Unset in CI → Playwright uses its own.
         */
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],

  /* Start the dev server locally; in CI/Docker the server is an external service */
  webServer: process.env.CI ? undefined : {
    command: 'pnpm run sidecar:dev & pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
