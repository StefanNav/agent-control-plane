import type { Page } from '@playwright/test'

/**
 * Tests about the tour itself: a tour link opens straight on the tour's welcome card, without
 * Attune's full-page welcome first (which `welcome.spec.ts` tests on its own), and the landing
 * page's mark is still (a session already welcomed).
 */
export async function skipWelcomeScreen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.setItem('attune-splash', 'off')
    sessionStorage.setItem('attune-welcomed', '1')
  })
}
