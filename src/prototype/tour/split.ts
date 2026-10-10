/** A stretch of quiet in a recording, in seconds. */
export interface Silence {
  start: number
  end: number
}

/** Where one line is spoken, in seconds from the start of the recording. */
export interface Segment {
  start: number
  end: number
}

export interface Split {
  segments: Segment[]
  /** Each segment against its expected length, divided by their geometric mean (1 is an even pace). */
  ratios: number[]
  /** False when the cut looks wrong: a ratio outside the bounds, or too few pauses to cut at. */
  confident: boolean
  /** What the chosen cut costs (lower fits better); Infinity when there was nothing to cut. */
  cost: number
}

/**
 * A silence starting this close to the start of the recording, or ending this close to its end, is the
 * room tone around the speech, not a break. Wide because the last silence is reported as ending at
 * the last frame, which can be 0.1 s short of the file's end.
 */
const EDGE = 0.25
/** The pace of a line against the others can drift this far before the split is flagged. */
export const RATIO_MIN = 0.6
export const RATIO_MAX = 1.6
/** How much a longer break counts in its favour, against how far a line is from its expected length. */
const BREAK_WEIGHT = 0.8

/** The air kept before and after a line when it is cut out (seconds). */
const LEAD = 0.15
const TAIL = 0.25

/**
 * The vowel groups in each word (y counts), at least one per word: a rough count, good enough to
 * guess how long a spoken line should take against its neighbours. Bare punctuation isn't a word.
 */
export function syllables(text: string): number {
  let count = 0
  for (const word of text.split(/\s+/)) {
    if (!/[\p{L}\p{N}]/u.test(word)) continue
    count += Math.max(1, word.match(/[aeiouy]+/gi)?.length ?? 0)
  }
  return count
}

/** A split that found nothing to cut. */
const none = (): Split => ({ segments: [], ratios: [], confident: false, cost: Infinity })

/**
 * Finds where each of `lines` is spoken in a recording of them one after another, given the
 * recording's silences. A silence starting at 0 or ending at `total` is trimmed; the rest are the
 * candidate breaks. It picks `lines.length − 1` of them, in order, to minimise how far each segment
 * is (on a log scale) from its expected length, the speech span shared out by syllables, less a
 * reward for longer breaks: a long pause inside a line loses to a shorter one at the right place.
 */
export function splitLines(silences: Silence[], total: number, lines: string[]): Split {
  if (lines.length === 0) return none()

  const sorted = silences.filter((s) => s.end > s.start).sort((a, b) => a.start - b.start)
  let first = 0
  let last = sorted.length
  let begin = 0
  let finish = total
  const head = sorted[0]
  if (head && head.start <= EDGE) {
    begin = head.end
    first = 1
  }
  const tail = sorted[sorted.length - 1]
  if (tail && last > first && tail.end >= total - EDGE) {
    finish = tail.start
    last -= 1
  }
  const span = finish - begin
  if (span <= 0) return none()
  const breaks = sorted.slice(first, last)
  if (breaks.length < lines.length - 1) return none()

  const weights = lines.map((line) => Math.max(1, syllables(line)))
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  const expected = weights.map((w) => (span * w) / weightSum)

  /** How far line `i`, spoken from `from` to `to`, is from its expected length. */
  const fit = (i: number, from: number, to: number) =>
    to > from ? Math.log((to - from) / (expected[i] ?? 1)) ** 2 : Infinity
  /** What choosing break `j` costs, less the more room it gives. */
  const room = (j: number) =>
    -BREAK_WEIGHT * Math.log((breaks[j]?.end ?? 0) - (breaks[j]?.start ?? 0))

  // best[i][j]: the cheapest way to speak lines 0..i with line i ending at break j; back[i][j] is
  // the break that line i − 1 ended at to get there.
  const best: number[][] = []
  const back: number[][] = []
  for (let i = 0; i < lines.length - 1; i++) {
    best.push([])
    back.push([])
    for (let j = 0; j < breaks.length; j++) {
      const stop = breaks[j]?.start ?? 0
      let cost = Infinity
      let via = -1
      if (i === 0) {
        cost = fit(0, begin, stop)
      } else {
        for (let k = 0; k < j; k++) {
          const earlier = best[i - 1]?.[k] ?? Infinity
          const next = earlier + fit(i, breaks[k]?.end ?? 0, stop)
          if (next < cost) {
            cost = next
            via = k
          }
        }
      }
      best[i]?.push(cost + room(j))
      back[i]?.push(via)
    }
  }

  // The last line runs from its break to the end of the speech; pick the cheapest way in.
  const lastIndex = lines.length - 1
  let cheapest = Infinity
  let at = -1
  if (lastIndex === 0) {
    cheapest = fit(0, begin, finish)
  } else {
    for (let j = 0; j < breaks.length; j++) {
      const cost =
        (best[lastIndex - 1]?.[j] ?? Infinity) + fit(lastIndex, breaks[j]?.end ?? 0, finish)
      if (cost < cheapest) {
        cheapest = cost
        at = j
      }
    }
  }
  if (!Number.isFinite(cheapest)) return none()

  // Walk the choices back from the last break to the first.
  const chosen: number[] = []
  for (let i = lastIndex - 1, j = at; i >= 0; i--) {
    chosen.unshift(j)
    j = back[i]?.[j] ?? -1
  }

  const segments: Segment[] = []
  let start = begin
  for (const j of chosen) {
    segments.push({ start, end: breaks[j]?.start ?? start })
    start = breaks[j]?.end ?? start
  }
  segments.push({ start, end: finish })

  const raw = segments.map((s, i) => (s.end - s.start) / (expected[i] ?? 1))
  const mean = Math.exp(raw.reduce((sum, r) => sum + Math.log(r), 0) / raw.length)
  const ratios = raw.map((r) => r / mean)
  const confident = ratios.every((r) => r >= RATIO_MIN && r <= RATIO_MAX)
  return { segments, ratios, confident, cost: cheapest }
}

/** A chapter recording fitted to some of its lines. */
export interface ChapterFit extends Split {
  /** Every line, or only the lines without a recording of their own. */
  over: 'all' | 'unrecorded'
  /** The lines it was fitted to, as indexes into the chapter's lines; the nth segment is the nth. */
  lineIndexes: number[]
}

/**
 * Fits a chapter recording to its lines (Ruling 21). A line with a recording of its own may or may
 * not be in the chapter recording too, so when there is one the recording is fitted both ways, over
 * every line and over only the others, and the better fit is kept: a confident one first, then the
 * lower cost (ties go to every line).
 */
export function fitChapter(
  silences: Silence[],
  total: number,
  lines: string[],
  ownRecording: boolean[],
): ChapterFit {
  const every = lines.map((_, i) => i)
  const all: ChapterFit = { ...splitLines(silences, total, lines), over: 'all', lineIndexes: every }
  const kept = every.filter((i) => !ownRecording[i])
  if (kept.length === lines.length) return all
  const unrecorded: ChapterFit = {
    ...splitLines(
      silences,
      total,
      kept.map((i) => lines[i] ?? ''),
    ),
    over: 'unrecorded',
    lineIndexes: kept,
  }
  if (unrecorded.confident !== all.confident) return unrecorded.confident ? unrecorded : all
  return unrecorded.cost < all.cost ? unrecorded : all
}

/** Whether a chapter's cut lines are imported, and what the import report says about it. */
export interface ChapterVerdict {
  imported: boolean
  verdict: 'OK' | 'CHECK'
  /** Shown in brackets after the verdict; empty for OK. */
  note: string
}

/**
 * Ruling 20: a confident fit is imported; a doubtful one only when forced, so a wrong cut never
 * replaces a clip by itself; a recording with too few pauses to cut never. `lineCount` is how many
 * lines it was fitted to.
 */
export function chapterVerdict(fit: Split, lineCount: number, force: boolean): ChapterVerdict {
  if (fit.segments.length === 0)
    return {
      imported: false,
      verdict: 'CHECK',
      note: `not imported; couldn't find ${lineCount - 1} breaks between the lines`,
    }
  if (fit.confident) return { imported: true, verdict: 'OK', note: '' }
  if (force) return { imported: true, verdict: 'CHECK', note: 'imported with --force' }
  return {
    imported: false,
    verdict: 'CHECK',
    note: 'not imported; listen and use --force, or fix the recording',
  }
}

/**
 * Where to cut each line's clip: its segment with a little air either side, never running into the
 * neighbouring line's speech or past the ends of the recording.
 */
export function cutWindows(segments: Segment[], total: number): Segment[] {
  return segments.map((segment, i) => ({
    start: Math.max(segment.start - LEAD, segments[i - 1]?.end ?? 0),
    end: Math.min(segment.end + TAIL, segments[i + 1]?.start ?? total),
  }))
}
