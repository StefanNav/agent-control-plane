import { expect, test, type Page } from '@playwright/test'
import { CHAPTERS } from '../../src/prototype/tour/script'
import { collectErrors } from './console'

// The silent voice makes each beat a tenth of its clip; reduced motion makes the cursor jump.
const AT_MED_REC = /\/operations\/agents\/med-rec\?tour=open$/
const CHAPTER_MS = 10_000

const INTAKE = '/inventory/agents/med-rec/onboarding/intake'
const TOOLS = '/inventory/agents/med-rec/onboarding/tools'
const PACKET = '/portfolio/reviews/med-rec'
const RECORD = '/inventory/agents/med-rec'
const SCORECARD = '/operations/agents/med-rec?tab=scorecard'
const SIGN = '/inventory/privileges/prv-0142/sign'

const bar = (page: Page) => page.getByRole('complementary', { name: 'Tour' })
const summary = (page: Page) => page.locator('[data-story-target="agent-summary"]')

/** What the tour types into a field, from the script. */
function typedInto(target: string): string {
  for (const chapter of CHAPTERS)
    for (const step of chapter.steps)
      for (const beat of step.beats)
        for (const action of [...(beat.actions ?? []), ...(beat.after ?? [])])
          if (action.kind === 'type' && action.target === target) return action.text
  throw new Error(`The tour types nothing into ${target}`)
}

/** Open a chapter from a link and wait for its first screen, paused. */
async function openChapter(page: Page, chapter: string, first: RegExp) {
  await page.goto(`/?tour=${chapter}&tourVoice=silent`)
  await expect(page).toHaveURL(first)
}

async function play(page: Page) {
  await bar(page).getByRole('button', { name: 'Play tour' }).click()
}

/** Open the chapter from a link and press Play. */
async function playOpening(page: Page) {
  await openChapter(page, 'open', /\/operations\?tour=open$/)
  await play(page)
}

/**
 * Which screen a line plays over (Ruling 17): the pathname, and any query the route sets, sampled
 * while the bar's caption is that line. Its clicks come at the end of the line, so the screen holds
 * while the line is spoken.
 */
async function expectLineOver(page: Page, line: string, route: string) {
  await expect
    .poll(
      () =>
        page.evaluate(
          ([start, want]) => {
            const caption = document.querySelector('[data-tour="bar"] p')?.textContent ?? ''
            if (!caption.startsWith(start)) return `caption: ${caption}`
            const wanted = new URL(want, location.origin)
            const params = new URLSearchParams(location.search)
            const there =
              location.pathname === wanted.pathname &&
              [...wanted.searchParams].every(([name, value]) => params.get(name) === value)
            return there ? want : location.pathname + location.search
          },
          [line, route] as const,
        ),
      { message: line, timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe(route)
}

/**
 * A moment on screen: an element by its target, on a pathname, with a value or some text, while the
 * bar shows this many skipped actions.
 */
interface Moment {
  target: string
  pathname?: string
  value?: string
  text?: string[]
  skipped?: number
}

/**
 * Watch for a moment that may last only until the next step loads: from now on, every change to the
 * page is checked (a MutationObserver sees each render, however brief). `seen()` checks that it
 * happened; `heldMs()` waits for it to end and says how long it lasted.
 */
async function watchFor(page: Page, moment: Moment) {
  const seenMark = `data-tour-seen-${moment.target}`
  const heldMark = `data-tour-held-${moment.target}`
  await page.evaluate(
    ([seenAttribute, heldAttribute, m]) => {
      const root = document.documentElement
      const look = () => {
        if (m.pathname !== undefined && location.pathname !== m.pathname) return false
        const skipped = document.querySelector('[data-tour="bar"]')?.getAttribute('data-skipped')
        if (m.skipped !== undefined && skipped !== String(m.skipped)) return false
        const el = document.querySelector<HTMLElement>(`[data-story-target="${m.target}"]`)
        if (!el) return false
        if (m.value !== undefined && (el as HTMLSelectElement).value !== m.value) return false
        return (m.text ?? []).every((t) => (el.textContent ?? '').includes(t))
      }
      let since: number | null = null
      const observer = new MutationObserver(() => check())
      const check = () => {
        const now = look()
        if (now && since === null) {
          since = performance.now()
          root.setAttribute(seenAttribute, '')
        } else if (!now && since !== null) {
          observer.disconnect()
          root.setAttribute(heldAttribute, String(Math.round(performance.now() - since)))
        }
      }
      observer.observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      })
      check()
    },
    [seenMark, heldMark, moment] as const,
  )
  const html = page.locator('html')
  return {
    seen: () =>
      expect(html, `${moment.target} was never seen`).toHaveAttribute(seenMark, '', {
        timeout: 2 * CHAPTER_MS,
      }),
    heldMs: async () => {
      await expect(html, `${moment.target} never ended`).toHaveAttribute(heldMark, /^\d+$/, {
        timeout: 2 * CHAPTER_MS,
      })
      return Number(await html.getAttribute(heldMark))
    },
  }
}

/** The opening has clicked its way to the Med Rec Agent and outlined its summary, skipping nothing. */
async function expectAtMedRec(page: Page) {
  await expect(page).toHaveURL(AT_MED_REC, { timeout: CHAPTER_MS })
  await expect(summary(page)).toBeVisible()
  // The outline is the chapter's last action, so by now every action has run or been skipped.
  await expect(summary(page)).toHaveCSS('outline-style', 'solid')
  await expect(bar(page)).toHaveAttribute('data-skipped', '0')
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('the opening clicks from the board to the Med Rec Agent, then runs on into onboarding', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await playOpening(page)
  await expectLineOver(page, "You can't watch them all", '/operations')
  await expectLineOver(page, 'In Medications', '/operations/divisions/medications')
  await expectLineOver(page, 'This one drafts', '/operations/agents/med-rec')
  await expectAtMedRec(page)
  await expect(page).toHaveURL(
    /\/inventory\/agents\/med-rec\/onboarding\/intake\?tour=onboarding$/,
    {
      timeout: CHAPTER_MS,
    },
  )
  await expect(bar(page)).toBeVisible()
  expect(errors).toEqual([])
})

test('Resume tour after a take-over closes what the visitor opened (Review focus 3)', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await playOpening(page)
  await expect(page).toHaveURL(AT_MED_REC, { timeout: CHAPTER_MS })
  await page.getByRole('button', { name: 'Controls' }).click()
  await expect(bar(page)).toContainText('Paused. You’re driving.')
  await page.getByRole('menuitem', { name: /Pause this agent…/ }).click()
  await expect(page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })).toBeVisible()
  await bar(page).getByRole('button', { name: 'Resume tour' }).click()
  // Hold the restarted step on its first screen.
  await bar(page).getByRole('button', { name: 'Pause tour' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  expect(errors).toEqual([])
})

test('a saved state with Med Rec retired still tours Med Rec live (Review focus 5)', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: /Dana/ }).click()
  await page.goto('/inventory')
  await page.getByRole('table', { name: 'Agents' }).getByText('Med Rec Agent').click()
  await page
    .getByRole('complementary', { name: 'Selected record' })
    .getByRole('button', { name: 'Disable or retire…' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Disable or retire Med Rec Agent' })
  await dialog.getByRole('radio', { name: /Retire for good/ }).check()
  await dialog.getByRole('textbox', { name: /Type the agent’s name/ }).fill('Med Rec Agent')
  await dialog.getByRole('textbox', { name: /Reason/ }).fill('Replaced by a new build.')
  await dialog.getByRole('button', { name: 'Retire agent' }).click()
  await expect(dialog).toBeHidden()
  await page.goto('/operations/agents/med-rec')
  await expect(page.getByRole('button', { name: 'Controls' })).toHaveCount(0)

  await playOpening(page)
  // Checked in one sample while the opening is still on: once the tour closes it resets the demo,
  // which would bring Controls back for the wrong reason.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const touring =
            document.querySelector('[data-tour="bar"]') !== null &&
            new URLSearchParams(location.search).get('tour') === 'open'
          if (!touring) return 'not in the opening'
          if (location.pathname !== '/operations/agents/med-rec') return location.pathname
          const controls = [...document.querySelectorAll('button')].some(
            (b) => b.textContent?.trim() === 'Controls',
          )
          return controls ? 'Controls' : 'no Controls'
        }),
      { timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe('Controls')
  await expectAtMedRec(page)
  expect(errors).toEqual([])
})

test('onboarding names Sam, then records the board’s decision on Med Rec’s record', async ({
  page,
}) => {
  const errors = collectErrors(page)
  const reason = typedInto('packet-reason')
  await openChapter(
    page,
    'onboarding',
    /\/inventory\/agents\/med-rec\/onboarding\/intake\?tour=onboarding$/,
  )
  // Sam is chosen in place, and the step moves on soon after.
  const samChosen = await watchFor(page, { target: 'intake-tech-owner', value: 'sam' })
  // The record shows the decision only until the next chapter loads its own hospital. It is the
  // chapter's last screen, so by then every action has run or been skipped.
  const decided = await watchFor(page, {
    target: 'record-decision',
    pathname: RECORD,
    text: ['Approved with conditions', reason],
    skipped: 0,
  })
  await play(page)
  await expectLineOver(page, 'It starts on October first', INTAKE)
  await expectLineOver(page, 'No agent goes live', INTAKE)
  await samChosen.seen()
  await expectLineOver(page, 'Marcus writes down', TOOLS)
  await expectLineOver(page, 'And each one is tested', TOOLS)
  await expectLineOver(page, "Dr. Lee's board", PACKET)
  // The record holds before the next chapter loads (Ruling 22): still under the line's caption,
  // for the 1500 ms wait.
  await expectLineOver(page, "Dr. Lee's board", RECORD)
  await decided.seen()
  expect(await decided.heldMs()).toBeGreaterThanOrEqual(1000)
  expect(errors).toEqual([])
})

test('earning trust reads the scorecard, then Priya signs admission med rec to Draft with a reason', async ({
  page,
}) => {
  const errors = collectErrors(page)
  const reason = typedInto('sign-reason')
  await openChapter(
    page,
    'earning-trust',
    /\/operations\/agents\/med-rec\?tab=scorecard&tour=earning-trust$/,
  )
  await play(page)
  await expectLineOver(page, 'For three weeks', SCORECARD)
  await expectLineOver(page, 'It meets two targets', SIGN)
  await expectLineOver(page, 'Now the agent drafts', SIGN)
  // Sampled while the last line plays: once the tour ends it resets the demo, whose seed has this
  // privilege signed too.
  await expect
    .poll(
      () =>
        page.evaluate(
          ([start, typed]) => {
            const caption = document.querySelector('[data-tour="bar"] p')?.textContent ?? ''
            if (!caption.startsWith(start)) return `caption: ${caption}`
            const signature =
              document.querySelector('[data-story-target="sign-signature"]')?.textContent ?? ''
            const level = document.querySelector('main [data-state="current"]')?.textContent ?? ''
            const skipped = document
              .querySelector('[data-tour="bar"]')
              ?.getAttribute('data-skipped')
            return [
              signature.includes('Signed by Priya') ? 'signed by Priya' : 'not signed',
              signature.includes(typed) ? 'with the reason' : 'without the reason',
              `current level ${level}`,
              `skipped ${skipped}`,
            ].join(' · ')
          },
          ['Now the agent drafts', reason] as const,
        ),
      { timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe('signed by Priya · with the reason · current level CurrentDraft · skipped 0')
  // The last chapter so far: the tour ends there and resets the demo.
  await expect(bar(page)).toHaveCount(0, { timeout: CHAPTER_MS })
  await expect(page).toHaveURL(/\/inventory\/privileges\/prv-0142\/sign$/)
  expect(errors).toEqual([])
})

test('an unknown chapter is stripped from the URL', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations?tour=nope')
  await expect(page).toHaveURL(/\/operations$/)
  await expect(bar(page)).toHaveCount(0)
  expect(errors).toEqual([])
})
