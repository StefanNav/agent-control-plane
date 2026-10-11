import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { buildTimeline } from '../../src/prototype/tour/engine'
import { beatRunningMs, runningMs } from '../../src/prototype/tour/runningTime'
import { CHAPTERS } from '../../src/prototype/tour/script'
import type { Manifest } from '../../src/prototype/tour/types'
import { collectErrors } from './console'

/**
 * Checkpoint E: the whole tour, played at 1× in its recorded voice. It takes about seven and a half
 * minutes, so it is opt-in: `TOUR_REALTIME=1 pnpm e2e tests/e2e/tour-realtime.spec.ts`.
 */
test.skip(
  process.env.TOUR_REALTIME !== '1',
  'Plays the whole tour in real time (about 7½ minutes); opt in with TOUR_REALTIME=1.',
)
test.setTimeout(12 * 60_000)

/** How far the wall time may stray from the model, either way. */
const TOLERANCE_S = 45

/** A handoff this much slower than the model is worth a look: a settle that waited out its 1.5 s cap, say. */
const SLOW_MS = 1200

const bar = '[data-tour="bar"]'

/** What the page records, from the first moment, for the run to be read afterwards. */
interface TourLog {
  /** Each clip's `play()`, in order. */
  plays: { clip: string; at: number }[]
  /** What the audio element reported: `playing`, `ended`, `error`, `stalled`, `waiting`. */
  events: { type: string; clip: string; at: number; currentTime: number }[]
  /** Each `play()` of a clip that the browser refused. */
  refused: { clip: string; error: string }[]
  /** The bar read every 100 ms while it is up. */
  readings: { seconds: number; fine: number; skipped: string; chapter: string }[]
  pressedPlayAt: number | null
  /** The first reading with no bar, after it had been up. */
  closedAt: number | null
}

const clock = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}`

test('the whole tour plays through in its own voice, in the time the model gives', async ({
  page,
}) => {
  const errors = collectErrors(page)
  const warnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().startsWith('Tour:'))
      warnings.push(message.text())
  })

  await page.addInitScript(
    ([barSelector]) => {
      const log: TourLog = {
        plays: [],
        events: [],
        refused: [],
        readings: [],
        pressedPlayAt: null,
        closedAt: null,
      }
      Reflect.set(window, 'tourLog', log)
      const clipOf = (src: string) => /\/tour\/audio\/([^/]+)\.m4a$/.exec(src)?.[1] ?? null

      // Every clip the tour plays, and what the browser said about it.
      const watched = new WeakSet<HTMLMediaElement>()
      const play = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        const clip = clipOf(this.src)
        if (clip === null) return play.call(this)
        if (!watched.has(this)) {
          watched.add(this)
          // Capturing, so these run before the voice's own listener, which moves on to the next
          // clip (and its `src`) the moment the last one ends.
          for (const type of ['playing', 'ended', 'error', 'stalled', 'waiting'])
            this.addEventListener(
              type,
              () =>
                log.events.push({
                  type,
                  clip: clipOf(this.src) ?? this.src,
                  at: performance.now(),
                  currentTime: this.currentTime,
                }),
              { capture: true },
            )
        }
        log.plays.push({ clip, at: performance.now() })
        const result = play.call(this)
        result.catch((error: unknown) =>
          log.refused.push({ clip, error: error instanceof Error ? error.name : String(error) }),
        )
        return result
      }

      // The press of Play, as a visitor does it.
      document.addEventListener(
        'click',
        (event) => {
          const button = event.target instanceof Element ? event.target.closest('button') : null
          if (log.pressedPlayAt === null && button?.textContent === 'Play tour')
            log.pressedPlayAt = performance.now()
        },
        true,
      )

      // The bar: its time (whole seconds, and finer from the progress fills), chapter and skips.
      let opened = false
      setInterval(() => {
        const el = document.querySelector(barSelector)
        if (!el) {
          if (opened && log.closedAt === null) log.closedAt = performance.now()
          return
        }
        opened = true
        const time = [...el.querySelectorAll('span')]
          .map((span) => span.textContent ?? '')
          .find((text) => /^\d+:\d{2} \/ \d+:\d{2}$/.test(text))
        const [minutes = 0, seconds = 0] = (time ?? '0:00').split(' / ')[0]!.split(':').map(Number)
        let fine = 0
        for (const segment of el.querySelectorAll<HTMLElement>('[role="group"] button')) {
          const fill = segment.firstElementChild as HTMLElement | null
          fine +=
            (Number.parseFloat(segment.style.flexGrow) *
              Number.parseFloat(fill?.style.width ?? '0')) /
            100
        }
        log.readings.push({
          seconds: minutes * 60 + seconds,
          fine,
          skipped: el.getAttribute('data-skipped') ?? '',
          chapter: el.querySelector('[role="status"]')?.textContent ?? '',
        })
      }, 100)
    },
    [bar] as const,
  )

  // The model (Ruling 27): the clips laid end to end, and what the actions add to each beat.
  const manifest = JSON.parse(readFileSync('src/prototype/tour/manifest.json', 'utf8')) as Manifest
  const { beatMs } = buildTimeline(CHAPTERS, manifest)
  const beats = CHAPTERS.flatMap((chapter) => chapter.steps.flatMap((step) => step.beats))
  const modelled = beats.map((beat) => beatRunningMs(beat, beatMs[beat.id]!))
  const modelledS = runningMs(CHAPTERS, manifest) / 1000

  /** The wall time, from the press of Play to the bar closing; null if it never closed. */
  const wallOf = (log: TourLog) =>
    log.closedAt !== null && log.pressedPlayAt !== null ? log.closedAt - log.pressedPlayAt : null

  /** What the run measured, in words. It reads a run that stalled too: whatever it got through. */
  const describe = (log: TourLog): string[] => {
    const wall = wallOf(log)
    const last = log.readings.at(-1)
    const lines = [
      wall === null
        ? `did not finish: ${log.plays.length} of ${beats.length} clips played, the last ${log.plays.at(-1)?.clip ?? 'none'}; the bar read ${last ? `${last.chapter} at ${clock(last.seconds * 1000)}` : 'nothing'}`
        : `played in ${clock(wall)} (${(wall / 1000).toFixed(1)} s); the model gives ${clock(modelledS * 1000)} (${modelledS.toFixed(1)} s)`,
    ]

    // Where it ran slower than the model: each beat from its clip starting to the next one's. Only
    // as many as there are beats, should a run have played more clips than the script has.
    const starts = [
      ...log.plays.map((play) => play.at),
      ...(log.closedAt === null ? [] : [log.closedAt]),
    ]
    const slowest = starts
      .slice(1, beats.length + 1)
      .map((next, i) => ({ beat: beats[i]!.id, over: next - starts[i]! - modelled[i]! }))
      .sort((a, b) => b.over - a.over)
    lines.push(
      `slowest handoffs against the model: ${slowest
        .slice(0, 5)
        .map(({ beat, over }) => `${beat} +${Math.round(over)} ms`)
        .join(', ')}`,
      `${slowest.filter(({ over }) => over > SLOW_MS).length} beat(s) over ${SLOW_MS} ms slower than the model`,
    )

    // How the audio behaved: when each clip started playing, how long it ran against its length, and
    // any stall once under way.
    const first = (type: string, clip: string) =>
      log.events.find((event) => event.type === type && event.clip === clip)
    const worst = (values: number[]) => Math.round(Math.max(0, ...values.filter(Number.isFinite)))
    const lateStart = log.plays.map((play) => (first('playing', play.clip)?.at ?? NaN) - play.at)
    const lengthOff = beats.map((beat) =>
      Math.abs(
        (first('ended', beat.id)?.at ?? NaN) -
          (first('playing', beat.id)?.at ?? NaN) -
          beatMs[beat.id]!,
      ),
    )
    const stalls = log.events.filter(
      (event) => event.type === 'stalled' || (event.type === 'waiting' && event.currentTime > 0.25),
    )
    const ended = log.events.filter((event) => event.type === 'ended').length
    lines.push(
      `clips: ${ended} of ${log.plays.length} ended, slowest to start ${worst(lateStart)} ms, longest run against its length ${worst(lengthOff)} ms, ${stalls.length} stall(s)`,
    )
    return lines
  }

  /** `describe`, but a log it can't read still gives what it has, never a TypeError of its own. */
  const describeSafely = (log: TourLog): string => {
    try {
      return describe(log).join('\n')
    } catch (error) {
      return [
        `the run could not be described: ${error instanceof Error ? error.message : String(error)}`,
        `${log.plays.length} clips played (the script has ${beats.length}), ${log.events.length} audio events, ${log.readings.length} bar readings; the bar ${log.closedAt === null ? 'never closed' : 'closed'}`,
      ].join('\n')
    }
  }

  // Opened from the link (the tour waits there, paused, its welcome pointing at Play), then played
  // with a real press of the bar's Play.
  await page.goto('/?tour=open')
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  await page
    .getByRole('complementary', { name: 'Tour' })
    .getByRole('button', { name: 'Play tour' })
    .click()
  let log: TourLog | null
  try {
    await page.waitForFunction(() => Reflect.get(window, 'tourLog').closedAt !== null, undefined, {
      timeout: 11 * 60_000,
      polling: 500,
    })
  } finally {
    // Read and told even when the wait timed out, so a stalled run still gives its numbers, and
    // before anything below can fail.
    log = await page.evaluate(() => Reflect.get(window, 'tourLog') as TourLog).catch(() => null)
    if (log) {
      const measured = describeSafely(log)
      console.log(measured)
      await test.info().attach('realtime', { body: measured, contentType: 'text/plain' })
    }
  }
  if (!log) throw new Error('The recorder’s log could not be read from the page')
  const wallMs = wallOf(log)

  // The end: the landing page, the bar gone, `?tour` with it.
  await expect(page.locator(bar)).toHaveCount(0)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeVisible()

  // Every chapter came up, in order, and every line was spoken, in order. The status region mounts
  // empty and names its chapter a frame later, so a reading in that frame says nothing.
  const chapters = log.readings
    .map((reading) => reading.chapter)
    .filter((chapter) => chapter !== '')
    .filter((chapter, i, all) => chapter !== all[i - 1])
  expect(chapters).toEqual(CHAPTERS.map((chapter, i) => `Chapter ${i + 1}: ${chapter.title}`))
  expect(log.plays.map((play) => play.clip)).toEqual(beats.map((beat) => beat.id))

  // Nothing was skipped, and nothing was said to the console.
  expect(new Set(log.readings.map((reading) => reading.skipped))).toEqual(new Set(['0']))
  expect(errors).toEqual([])
  expect(warnings).toEqual([])

  // The voice was real: each clip ran to its `ended`, so no refused play, no error, no fallback
  // timer and no watchdog stood in for one.
  expect(log.refused).toEqual([])
  expect(log.events.filter((event) => event.type === 'error')).toEqual([])
  const ended = log.events.filter((event) => event.type === 'ended').map((event) => event.clip)
  expect(ended).toEqual(beats.map((beat) => beat.id))

  // The bar's time never goes backwards, in whole seconds or in the finer reading of its fills.
  for (const [i, reading] of log.readings.entries()) {
    const before = log.readings[i - 1]
    if (!before) continue
    expect(reading.seconds, `reading ${i}`).toBeGreaterThanOrEqual(before.seconds)
    expect(reading.fine, `reading ${i}`).toBeGreaterThanOrEqual(before.fine - 1)
  }

  // The wall time stays within the model, as its own check apart from the unit test's ceiling.
  expect(wallMs).not.toBeNull()
  expect(Math.abs(wallMs! / 1000 - modelledS), describe(log)[0]).toBeLessThanOrEqual(TOLERANCE_S)
})
