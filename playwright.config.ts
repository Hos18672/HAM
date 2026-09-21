import { defineConfig, devices } from '@playwright/test';

/**
 * The e2e suite runs against a production build, not the dev server: the
 * things it checks — static rendering, the real middleware, the CSP headers —
 * only behave correctly there.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  // A shared database means tests that write content must not race each other.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'de-AT',
    timezoneId: 'Europe/Vienna',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // CI images often ship a Chromium build that does not match the
          // revision this Playwright would download. When one is present,
          // point at it rather than fetching a second copy.
          ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
        },
      },
    },
  ],

  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    // Auth.js resolves post-sign-out redirects against AUTH_URL, so it has to
    // name the server the tests are actually talking to.
    env: { AUTH_URL: baseURL, NEXT_PUBLIC_SITE_URL: baseURL },
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
