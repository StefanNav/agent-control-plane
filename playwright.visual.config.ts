import { defineConfig, devices } from '@playwright/test'

/**
 * The screenshot gate (tests/visual): `pnpm visual:baseline` writes the baseline, `pnpm visual` compares.
 * The baseline stays local (.visual/, ignored): it's taken on this machine, before the change.
 */
export default defineConfig({
  testDir: 'tests/visual',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '.visual/report' }]],
  outputDir: '.visual/results',
  snapshotPathTemplate: '.visual/baseline/{arg}{ext}',
  timeout: 60_000,
  expect: { toHaveScreenshot: { maxDiffPixels: 0 } },
  use: {
    baseURL: 'http://localhost:4174',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
    },
  ],
  webServer: {
    command: 'vite build --outDir .visual/dist && vite preview --outDir .visual/dist --port 4174 --strictPort',
    port: 4174,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
