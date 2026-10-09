import { defineConfig, devices } from '@playwright/test'

/**
 * Captures, not tests: frame/app pairs for visual QA (`QA=1`), README screenshots and the social image.
 * Run with `pnpm capture`; it is not part of `pnpm e2e`.
 */
export default defineConfig({
  testDir: 'tests/capture',
  fullyParallel: true,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'pnpm build && pnpm preview --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    { command: 'pnpm designs', port: 4599, reuseExistingServer: true, timeout: 60_000 },
  ],
})
