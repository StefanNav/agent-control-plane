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
const EPIC = '/epic'
const MED_REC = '/operations/agents/med-rec'
const REVIEWERS = '/operations/reviewers'

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

/** One read of the page and the saved demo, taken at a single moment. */
interface Sample {
  /** The chapter the URL names while the bar is open; null once the tour has closed. */
  chapter: string | null
  caption: string
  pathname: string
  skipped: string | null
  /** The targets the tour has outlined. */
  outlined: string[]
  /** Each asked-for target's text, or null when it isn't on the page. */
  text: Record<string, string | null>
  /** Each asked-for target's top and bottom on screen, or null when it isn't on the page. */
  box: Record<string, { top: number; bottom: number } | null>
  /** The band a target shows in: from under the app's top bar (or the window's top) to the tour bar. */
  band: { top: number; bottom: number }
  /** Med Rec Agent in the saved demo, and its history as `action · who · reason`. */
  medRec: { lifecycle: string; pausedBy: string | null; pausedAt: string | null; history: string[] }
}

async function sample(page: Page, targets: string[] = []): Promise<Sample> {
  return page.evaluate((names) => {
    interface Saved {
      state: {
        agents: {
          id: string
          code: string
          lifecycle: string
          pausedBy?: string
          pausedAt?: string
        }[]
        audit: { action: string; who: string; target: string; reason?: string }[]
      }
    }
    const bar = document.querySelector('[data-tour="bar"]')
    const { state } = JSON.parse(localStorage.getItem('acp-demo') ?? 'null') as Saved
    const agent = state.agents.find((a) => a.id === 'med-rec')!
    const targets = [...document.querySelectorAll<HTMLElement>('[data-story-target]')]
    return {
      chapter: bar ? new URLSearchParams(location.search).get('tour') : null,
      caption: bar?.querySelector('p')?.textContent ?? '',
      pathname: location.pathname,
      skipped: bar?.getAttribute('data-skipped') ?? null,
      outlined: targets
        .filter((el) => getComputedStyle(el).outlineStyle === 'solid')
        .map((el) => el.dataset.storyTarget!),
      text: Object.fromEntries(
        names.map((name) => [
          name,
          document.querySelector(`[data-story-target="${name}"]`)?.textContent ?? null,
        ]),
      ),
      box: Object.fromEntries(
        names.map((name) => {
          const rect = document
            .querySelector(`[data-story-target="${name}"]`)
            ?.getBoundingClientRect()
          return [name, rect ? { top: rect.top, bottom: rect.bottom } : null]
        }),
      ),
      band: {
        top: Math.max(0, document.querySelector('header')?.getBoundingClientRect().bottom ?? 0),
        bottom: bar?.getBoundingClientRect().top ?? innerHeight,
      },
      medRec: {
        lifecycle: agent.lifecycle,
        pausedBy: agent.pausedBy ?? null,
        pausedAt: agent.pausedAt ?? null,
        history: state.audit
          .filter((a) => a.target === agent.code)
          .map((a) => `${a.action} · ${a.who} · ${a.reason ?? ''}`),
      },
    }
  }, targets)
}

/**
 * Check a moment while a line plays: `read` turns each sample taken under that line's caption (the
 * bar open, the URL naming the chapter) into words, until they are `want`. Samples taken anywhere
 * else read as where the tour was, so a later step, or the seed the tour resets to, can't pass it.
 */
async function expectUnder(
  page: Page,
  at: { chapter: string; line: string; targets?: string[] },
  read: (s: Sample) => string,
  want: string,
) {
  await expect
    .poll(
      async () => {
        const s = await sample(page, at.targets)
        if (s.chapter !== at.chapter || !s.caption.startsWith(at.line))
          return `not under "${at.line}": ${s.chapter} · ${s.caption}`
        return read(s)
      },
      { message: at.line, timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe(want)
}

/**
 * Note where a target is at the moment the tour clicks it: `clear` when all of it shows above the bar,
 * otherwise how far under the bar it reaches. The returned check waits for that click.
 */
async function watchClickOn(page: Page, target: string) {
  const mark = `data-tour-click-${target}`
  await page.evaluate(
    ([name, attribute]) => {
      document.addEventListener(
        'click',
        (event) => {
          const el = (event.target as Element | null)?.closest(`[data-story-target="${name}"]`)
          const bar = document.querySelector('[data-tour="bar"]')
          if (!el || !bar) return
          const under = el.getBoundingClientRect().bottom - bar.getBoundingClientRect().top
          const where = under <= 0 ? 'clear' : `${Math.ceil(under)} px under the bar`
          document.documentElement.setAttribute(attribute, where)
        },
        true,
      )
    },
    [target, mark] as const,
  )
  return () =>
    expect(page.locator('html'), `${target} when clicked`).toHaveAttribute(mark, 'clear', {
      timeout: 2 * CHAPTER_MS,
    })
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

test('the opening clicks from the board to the Med Rec Agent, then runs on into the problem', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await playOpening(page)
  await expectLineOver(page, "You can't watch them all", '/operations')
  await expectLineOver(page, 'In Medications', '/operations/divisions/medications')
  await expectLineOver(page, 'This one drafts', '/operations/agents/med-rec')
  await expectAtMedRec(page)
  await expect(page).toHaveURL(/\/tour\/problem\?tour=problem$/, { timeout: CHAPTER_MS })
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
  // Then on into supervising, in the medical record.
  await expect(page).toHaveURL(/\/epic\?tour=supervising$/, { timeout: CHAPTER_MS })
  await expect(bar(page)).toBeVisible()
  expect(errors).toEqual([])
})

test('supervising: Ana flags a draft, Marcus pauses Med Rec, Priya co-signs its resume, then reviewer behaviour', async ({
  page,
}) => {
  const errors = collectErrors(page)
  const reason = typedInto('resume-reason')
  await openChapter(page, 'supervising', /\/epic\?tour=supervising$/)
  // Deferred from 10.6: a tall dialog, or a panel low on the page, must not put its button under the bar.
  const confirmClear = await watchClickOn(page, 'pause-confirm')
  const approveClear = await watchClickOn(page, 'resume-approve')
  await play(page)
  await expectLineOver(page, 'Which brings us back', EPIC)
  // Line 2 ends on Send flag, and holds there before Marcus's step loads its own hospital.
  await expectUnder(
    page,
    { chapter: 'supervising', line: 'Ana reviews', targets: ['epic-flag', 'epic-agent-panel'] },
    (s) =>
      [
        s.pathname,
        s.text['epic-flag']?.startsWith('Flagged · ') ? 'flagged' : 'not flagged',
        s.text['epic-agent-panel']?.includes('sent to Marcus') ? 'sent to Marcus' : 'not sent',
      ].join(' · '),
    `${EPIC} · flagged · sent to Marcus`,
  )
  await expectLineOver(page, 'Marcus pauses it', MED_REC)
  // Paused by the tour's click at 09:52 (the resume step's own hospital was paused at 09:47).
  await expectUnder(
    page,
    { chapter: 'supervising', line: 'Before confirming' },
    (s) =>
      [s.pathname, s.medRec.lifecycle, s.medRec.pausedBy, s.medRec.pausedAt?.slice(11, 16)].join(
        ' · ',
      ),
    `${MED_REC} · paused · marcus · 09:52`,
  )
  await confirmClear()
  // Line 5 ends on Approve: live again, with Priya's approval and reason in its history. The hold
  // outlines the header's status and brings it into view, between the top bar and the tour bar
  // (Ruling 25).
  await expectUnder(
    page,
    { chapter: 'supervising', line: 'By noon', targets: ['agent-status'] },
    (s) => {
      const status = s.box['agent-status']
      const inView = status && status.top >= s.band.top && status.bottom <= s.band.bottom
      return [
        s.pathname,
        s.medRec.lifecycle,
        s.medRec.history.includes(`Resumed · priya · ${reason}`)
          ? 'resumed by Priya with the reason'
          : 'not resumed by Priya',
        `status ${s.text['agent-status']}`,
        `outlined ${s.outlined.join(', ')}`,
        inView ? 'in view' : `out of view ${JSON.stringify(status)} ${JSON.stringify(s.band)}`,
      ].join(' · ')
    },
    `${MED_REC} · live · resumed by Priya with the reason · status Draft · since 06 Nov · outlined agent-status · in view`,
  )
  await approveClear()
  await expectLineOver(page, "There's also a quieter risk", REVIEWERS)
  await expectUnder(
    page,
    { chapter: 'supervising', line: 'On this unit' },
    (s) => `${s.pathname} · outlined ${s.outlined.join(', ')}`,
    `${REVIEWERS} · outlined reviewers-check`,
  )
  await expectUnder(
    page,
    { chapter: 'supervising', line: "It's shown by unit" },
    (s) => `${s.pathname} · outlined ${s.outlined.join(', ')} · skipped ${s.skipped}`,
    `${REVIEWERS} · outlined reviewers-by-unit · skipped 0`,
  )
  // Then on into the step-down.
  await expect(page).toHaveURL(/\/operations\/agents\/med-rec\?tour=step-down$/, {
    timeout: CHAPTER_MS,
  })
  expect(errors).toEqual([])
})

test('trust drops: Med Rec shows its step-down notice, then the tour runs on into how I got here', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await openChapter(page, 'step-down', /\/operations\/agents\/med-rec\?tour=step-down$/)
  await play(page)
  // The outline brings the notice into view, between the top bar and the tour bar.
  await expectUnder(
    page,
    { chapter: 'step-down', line: 'And trust can go down', targets: ['stepdown-notice'] },
    (s) => {
      const notice = s.box['stepdown-notice']
      const inView = notice && notice.top >= s.band.top && notice.bottom <= s.band.bottom
      return [
        s.pathname,
        s.text['stepdown-notice']?.includes('stepped down from Draft to Shadow')
          ? 'stepped down'
          : 'no notice',
        `outlined ${s.outlined.join(', ')}`,
        inView ? 'in view' : `out of view ${JSON.stringify(notice)} ${JSON.stringify(s.band)}`,
      ].join(' · ')
    },
    `${MED_REC} · stepped down · outlined stepdown-notice · in view`,
  )
  await expectUnder(
    page,
    { chapter: 'step-down', line: 'Nothing climbs back up' },
    (s) => `${s.pathname} · skipped ${s.skipped}`,
    `${MED_REC} · skipped 0`,
  )
  await expect(page).toHaveURL(/\/tour\/process\?tour=process$/, { timeout: CHAPTER_MS })
  await expect(bar(page)).toBeVisible()
  expect(errors).toEqual([])
})

/**
 * One read of the tour on a prototype page (an interlude or the landing page), taken at a single
 * moment. Unlike `sample`, it reads nothing from the saved demo: an interlude loads no scenario, so
 * a fresh browser may have none saved.
 */
interface Glance {
  /** The chapter the URL names while the bar is open; null once the tour has closed. */
  chapter: string | null
  caption: string
  pathname: string
  skipped: string | null
  /** The interlude's items on show, in page order, and the ones outlined as current. */
  shown: string[]
  current: string[]
  /** The targets the tour has outlined. */
  outlined: string[]
  /** The tour card's text, or null when none is up. */
  card: string | null
}

async function glance(page: Page): Promise<Glance> {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-tour="bar"]')
    const items = [...document.querySelectorAll<HTMLElement>('main [data-item]')]
    const solid = (el: Element) => getComputedStyle(el).outlineStyle === 'solid'
    return {
      chapter: bar ? new URLSearchParams(location.search).get('tour') : null,
      caption: bar?.querySelector('p')?.textContent ?? '',
      pathname: location.pathname,
      skipped: bar?.getAttribute('data-skipped') ?? null,
      shown: items
        .filter((el) => getComputedStyle(el).visibility === 'visible')
        .map((el) => el.dataset.item!),
      current: items.filter(solid).map((el) => el.dataset.item!),
      outlined: [...document.querySelectorAll<HTMLElement>('[data-story-target]')]
        .filter(solid)
        .map((el) => el.dataset.storyTarget!),
      card: document.querySelector('[data-tour="card"]')?.textContent ?? null,
    }
  })
}

/** As `expectUnder`, for a glance: only glances taken under that line's caption count. */
async function expectGlance(
  page: Page,
  at: { chapter: string; line: string },
  read: (g: Glance) => string,
  want: string,
) {
  await expect
    .poll(
      async () => {
        const g = await glance(page)
        if (g.chapter !== at.chapter || !g.caption.startsWith(at.line))
          return `not under "${at.line}": ${g.chapter} · ${g.caption}`
        return read(g)
      },
      { message: at.line, timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe(want)
}

/**
 * From now on, note each target the tour outlines, in order (a MutationObserver sees every render,
 * however brief); the returned read gives the list so far.
 */
async function watchOutlines(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const seen: string[] = []
    Reflect.set(window, 'tourOutlines', seen)
    const look = () => {
      for (const el of document.querySelectorAll<HTMLElement>('[data-story-target]')) {
        const target = el.dataset.storyTarget!
        if (getComputedStyle(el).outlineStyle === 'solid' && seen.at(-1) !== target)
          seen.push(target)
      }
    }
    new MutationObserver(look).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    })
    look()
  })
  return () => page.evaluate(() => Reflect.get(window, 'tourOutlines') as string[])
}

/** An interlude's items: which show and which are current. */
const items = (g: Glance) => `shown ${g.shown.join(', ')} · current ${g.current.join(', ')}`

/** Which research excerpt the card shows, by the start of its quote. */
function excerpt(card: string | null): string {
  if (card === null) return 'no card'
  if (card.startsWith('Plan-level oversight')) return 'R1'
  if (card.startsWith('Clinicians show strong automation bias')) return 'R2'
  if (card.startsWith('start in a shadow-like mode')) return 'R3'
  return `another card: ${card}`
}

test('the problem: its three lines come in as they are named, with the research cards', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await openChapter(page, 'problem', /\/tour\/problem\?tour=problem$/)
  // Held on the first line: only its item, current.
  await expect.poll(async () => items(await glance(page))).toBe('shown act · current act')
  await play(page)
  await expectGlance(
    page,
    { chapter: 'problem', line: 'The usual safety net' },
    items,
    'shown act, approve · current approve',
  )
  // The line's two excerpts: the first while it plays, the second once it ends, for the next line.
  await expectGlance(
    page,
    { chapter: 'problem', line: "But that doesn't hold up well" },
    (g) => excerpt(g.card),
    'R1',
  )
  await expectGlance(
    page,
    { chapter: 'problem', line: 'And with dozens of agents' },
    (g) => excerpt(g.card),
    'R2',
  )
  await expectGlance(
    page,
    { chapter: 'problem', line: 'The thing is' },
    (g) => `${items(g)} · ${excerpt(g.card)}`,
    'shown act, approve, trust · current trust · R3',
  )
  await expectGlance(
    page,
    { chapter: 'problem', line: 'So I built the whole product' },
    (g) => `${items(g)} · ${excerpt(g.card)} · skipped ${g.skipped}`,
    'shown act, approve, trust · current trust · no card · skipped 0',
  )
  // Then on into the people, on the landing page.
  await expect(page).toHaveURL(/\/\?tour=people$/, { timeout: CHAPTER_MS })
  expect(errors).toEqual([])
})

test('who it’s for: the story cards, then each person’s card as they are named', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await openChapter(page, 'people', /\/\?tour=people$/)
  const outlines = await watchOutlines(page)
  await play(page)
  const outlined = (g: Glance) => `${g.pathname} · outlined ${g.outlined.join(', ')}`
  const under = (line: string) => ({ chapter: 'people', line })
  await expectGlance(page, under('Seven people use it'), outlined, '/ · outlined people-cards')
  await expectGlance(page, under('Marcus owns'), outlined, '/ · outlined people-marcus')
  await expectGlance(page, under('Priya is'), outlined, '/ · outlined people-priya')
  await expectGlance(page, under('Pharmacists like Ana'), outlined, '/ · outlined people-ana')
  await expectGlance(
    page,
    under('And Jordan'),
    (g) => `${outlined(g)} · skipped ${g.skipped}`,
    '/ · outlined people-jordan · skipped 0',
  )
  // Then on into onboarding.
  await expect(page).toHaveURL(
    /\/inventory\/agents\/med-rec\/onboarding\/intake\?tour=onboarding$/,
    { timeout: CHAPTER_MS },
  )
  // One line names three people, outlined in turn. The silent voice ends the line as the last
  // outline lands, so that one shows only for a moment: the order is read from the watch.
  expect((await outlines()).filter((target) => target.startsWith('people-'))).toEqual(
    ['cards', 'marcus', 'priya', 'dana', 'sam', 'drlee', 'ana', 'jordan'].map((p) => `people-${p}`),
  )
  expect(errors).toEqual([])
})

test('how I got here: Research, then the documents, then the design and the build', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await openChapter(page, 'process', /\/tour\/process\?tour=process$/)
  await expect.poll(async () => items(await glance(page))).toBe('shown research · current research')
  await play(page)
  const documents = ['vision', 'prd', 'roadmap', 'epics'].join(', ')
  const making = ['brief', 'explorations', 'frames', 'build'].join(', ')
  await expectGlance(
    page,
    { chapter: 'process', line: 'That shaped the vision' },
    items,
    `shown research, ${documents} · current ${documents}`,
  )
  await expectGlance(
    page,
    { chapter: 'process', line: 'AI sped up every step' },
    (g) => `${items(g)} · skipped ${g.skipped}`,
    `shown research, ${documents}, ${making} · current ${making} · skipped 0`,
  )
  await expect(page).toHaveURL(/\/tour\/validate\?tour=validate$/, { timeout: CHAPTER_MS })
  expect(errors).toEqual([])
})

test('how I’d validate it: what I checked, who I’d bring in, what I’d measure', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await openChapter(page, 'validate', /\/tour\/validate\?tour=validate$/)
  await play(page)
  const under = (line: string) => ({ chapter: 'validate', line })
  await expectGlance(page, under("I couldn't test it"), items, 'shown checked · current checked')
  await expectGlance(
    page,
    under("I'd want to learn"),
    items,
    'shown checked, bring-in · current bring-in',
  )
  await expectGlance(
    page,
    under("And I'd measure"),
    (g) => `${items(g)} · skipped ${g.skipped}`,
    'shown checked, bring-in, measure · current measure · skipped 0',
  )
  // Then on into the close, on the landing page.
  await expect(page).toHaveURL(/\/\?tour=close$/, { timeout: CHAPTER_MS })
  expect(errors).toEqual([])
})

test('the close points at the story cards, then the tour ends on the landing page', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await openChapter(page, 'close', /\/\?tour=close$/)
  await play(page)
  await expectGlance(
    page,
    { chapter: 'close', line: 'Each of the seven people' },
    (g) => `${g.pathname} · outlined ${g.outlined.join(', ')}`,
    '/ · outlined people-cards',
  )
  await expectGlance(
    page,
    { chapter: 'close', line: 'Thanks for watching' },
    (g) => `${g.pathname} · skipped ${g.skipped}`,
    '/ · skipped 0',
  )
  // The end (R5): the bar goes, `?tour` with it, and the visitor stays on the landing page.
  await expect(bar(page)).toHaveCount(0, { timeout: CHAPTER_MS })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeVisible()
  expect(errors).toEqual([])
})

test('an unknown chapter is stripped from the URL', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations?tour=nope')
  await expect(page).toHaveURL(/\/operations$/)
  await expect(bar(page)).toHaveCount(0)
  expect(errors).toEqual([])
})
