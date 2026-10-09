import type { Page } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'
import { personaById } from '../../src/prototype/personas'

/** Switches persona with the prototype bar's menu, as a visitor would. */
export async function viewAs(page: Page, id: PersonaId) {
  await page.goto('/operations')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  const name = personaById(id).name.replace('.', '\\.')
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
  await page.waitForURL((url) => url.pathname !== '/operations' || id === 'dana')
}
