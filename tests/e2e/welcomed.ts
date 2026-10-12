import type { Page } from '@playwright/test'

/**
 * A visitor this session has already welcomed: a tour link then opens straight on the tour's welcome
 * card, without Attune's full-page welcome first (which `welcome.spec.ts` tests on its own).
 */
export async function alreadyWelcomed(page: Page): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem('attune-welcomed', '1'))
}
