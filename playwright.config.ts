import { defineConfig, devices } from '@playwright/test'

/** `BASE_URL=https://… pnpm e2e` runs the suite against a deployment instead of a local build. */
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview --port 4173 --strictPort',
        port: 4173,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
