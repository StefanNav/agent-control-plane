import { copyFile, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { loadTour } from './tour-load.mjs'
import {
  ENCODE_ARGS,
  LOUDNORM,
  audioDir,
  beatIdSet,
  clipMs,
  clipSeconds,
  fail,
  readManifest,
  requireTools,
  root,
  run,
  runCapture,
  writeManifest,
} from './tour-tools.mjs'

// Cuts the narrator's recordings in `reference/tour-inbox/recordings/` into one clip per beat and
// marks those beats recorded in the manifest. A file named `NN-<chapter-id>.m4a` is a whole chapter,
// one line after another with a pause between (it is split where the pauses best fit each line's
// length); a file named `<beat-id>.m4a` is one line recorded again, and replaces that line's clip.
// Chapters not in the tour script yet are listed and skipped. Writes `import-report.md` beside the
// recordings. `--dry-run` cuts into a temp folder only and writes nothing.

const dryRun = process.argv.includes('--dry-run')

/** Quieter than this for at least `d` seconds is a pause. */
const SILENCE = 'silencedetect=noise=-35dB:d=0.2'

/** The recordings folder, whichever way its case is spelled on disk. */
async function recordingsDir() {
  const inbox = path.join(root, 'reference/tour-inbox')
  const entries = await readdir(inbox, { withFileTypes: true }).catch(() => [])
  const folder = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === 'recordings')
  if (!folder) fail('tour:import found no folder at reference/tour-inbox/recordings')
  return path.join(inbox, folder.name)
}

/** The pauses in a recording, in seconds. */
async function detectSilences(file, total) {
  const { stderr } = await runCapture('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    file,
    '-af',
    SILENCE,
    '-f',
    'null',
    '-',
  ])
  const silences = []
  let open = null
  for (const line of stderr.split('\n')) {
    const start = /silence_start: (-?[\d.]+)/.exec(line)
    if (start) open = Math.max(0, Number.parseFloat(start[1]))
    const end = /silence_end: (-?[\d.]+)/.exec(line)
    if (end && open !== null) {
      silences.push({ start: open, end: Number.parseFloat(end[1]) })
      open = null
    }
  }
  // A recording that ends in a pause may not report where it ends.
  if (open !== null) silences.push({ start: open, end: total })
  return silences
}

/** Seconds as a plain ffmpeg time. */
const time = (seconds) => seconds.toFixed(3)

/** Brings a whole recording to the tour's loudness as a lossless temp file, so a cut is encoded once. */
async function normalise(file, wav) {
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    file,
    '-af',
    LOUDNORM,
    '-ac',
    '1',
    '-ar',
    '44100',
    '-c:a',
    'pcm_s16le',
    wav,
  ])
}

/** Cuts `from`–`to` seconds of the normalised recording into an AAC clip. */
async function cut(wav, from, to, clip) {
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    time(from),
    '-to',
    time(to),
    '-i',
    wav,
    ...ENCODE_ARGS,
    clip,
  ])
}

/** Normalises and encodes a line recorded on its own. */
async function encodeWhole(file, clip) {
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    file,
    '-af',
    LOUDNORM,
    ...ENCODE_ARGS,
    clip,
  ])
}

/**
 * Makes a clip in `tmpDir` for each beat of the chapter: from the chapter recording where there is
 * one (`chapterFile`), and from a line's own recording (`overrides`, by beat id) where there is one.
 *
 * @returns {Promise<{ lines: { beat: object, clip: string, ms: number, ratio: number | null, from: 'split' | 'override' }[], verdict: string, note: string }>}
 */
async function importChapter(tour, chapter, chapterFile, overrides, tmpDir) {
  const beats = chapter.steps.flatMap((step) => step.beats)
  const lines = []
  let verdict = 'override only'
  let note = ''
  let windows = []
  let ratios = []
  let wav = null

  if (chapterFile) {
    let total
    try {
      total = await clipSeconds(chapterFile)
    } catch (error) {
      throw new Error(`tour:import can't read ${path.basename(chapterFile)}: ${error.message}`, {
        cause: error,
      })
    }
    const silences = await detectSilences(chapterFile, total)
    const split = tour.splitLines(
      silences,
      total,
      beats.map((beat) => beat.text),
    )
    ratios = split.ratios
    if (split.segments.length === 0) {
      verdict = 'CHECK'
      note = `Couldn't find ${beats.length - 1} breaks between the lines, so the chapter wasn't split.`
    } else {
      verdict = split.confident ? 'OK' : 'CHECK'
      windows = tour.cutWindows(split.segments, total)
      wav = path.join(tmpDir, `${chapter.id}.wav`)
      await normalise(chapterFile, wav)
    }
  }

  for (const [i, beat] of beats.entries()) {
    const clip = path.join(tmpDir, `${beat.id}.m4a`)
    const override = overrides.get(beat.id)
    const window = windows[i]
    if (override) {
      try {
        await encodeWhole(override, clip)
      } catch (error) {
        throw new Error(`tour:import can't read ${path.basename(override)}: ${error.message}`, {
          cause: error,
        })
      }
    } else if (wav && window) {
      await cut(wav, window.start, window.end, clip)
    } else {
      continue
    }
    lines.push({
      beat,
      clip,
      ms: await clipMs(clip),
      // An own recording isn't the split's segment, so the split's ratio says nothing about it.
      ratio: override ? null : (ratios[i] ?? null),
      from: override ? 'override' : 'split',
    })
  }
  if (wav) await rm(wav, { force: true })
  return { lines, verdict, note }
}

/** Seconds, one decimal. */
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`

/** A ratio is the line against its expected length; outside the bounds the cut may be wrong. */
function ratioText(line, tour) {
  if (line.ratio === null) return '–'
  const text = line.ratio.toFixed(2)
  return line.ratio < tour.RATIO_MIN || line.ratio > tour.RATIO_MAX
    ? `${text} (out of range)`
    : text
}

async function main() {
  requireTools('tour:import', ['ffmpeg', 'ffprobe'])

  const tour = await loadTour()
  const { CHAPTERS, textHash } = tour
  const beats = CHAPTERS.flatMap((chapter) => chapter.steps.flatMap((step) => step.beats))
  const beatIds = beatIdSet(beats)
  const chapterIds = new Set(CHAPTERS.map((chapter) => chapter.id))

  const dir = await recordingsDir()
  const names = (await readdir(dir)).filter((n) => /\.m4a$/i.test(n) && !n.startsWith('.')).sort()

  /** Chapter id → the file holding the whole chapter. */
  const chapterFiles = new Map()
  /** Beat id → the file holding that line alone. */
  const overrides = new Map()
  const notEncoded = []
  const unrecognised = []
  for (const name of names) {
    const stem = name.replace(/\.m4a$/i, '')
    const chapterId = /^\d+-(.+)$/.exec(stem)?.[1]
    if (beatIds.has(stem)) overrides.set(stem, path.join(dir, name))
    else if (chapterId && chapterIds.has(chapterId)) chapterFiles.set(chapterId, name)
    else if (chapterId) notEncoded.push(name)
    else unrecognised.push(name)
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tour-import-'))
  /** What was made, per chapter, in tour order. */
  const results = []
  try {
    for (const chapter of CHAPTERS) {
      const chapterName = chapterFiles.get(chapter.id)
      const own = new Map(
        chapter.steps
          .flatMap((step) => step.beats)
          .filter((beat) => overrides.has(beat.id))
          .map((beat) => [beat.id, overrides.get(beat.id)]),
      )
      if (!chapterName && own.size === 0) continue
      const file = chapterName ? path.join(dir, chapterName) : null
      const result = await importChapter(tour, chapter, file, own, tmpDir)
      results.push({
        chapter,
        name: chapterName ?? [...own.keys()].map((id) => `${id}.m4a`).join(', '),
        ...result,
      })
    }

    const imported = results.flatMap((result) => result.lines)
    if (!dryRun) {
      const manifest = await readManifest()
      for (const { beat, clip, ms } of imported) {
        await copyFile(clip, path.join(audioDir, `${beat.id}.m4a`))
        manifest[beat.id] = { ms, source: 'recorded', textHash: textHash(beat.text) }
      }
      // Script order, as `tour:audio` writes it.
      const ordered = {}
      for (const beat of beats) if (manifest[beat.id]) ordered[beat.id] = manifest[beat.id]
      await writeManifest(ordered)
    }

    // Report: to the console, and beside the recordings.
    const out = []
    const md = ['# Import report', '']
    for (const { chapter, name, lines, verdict, note } of results) {
      const length = seconds(lines.reduce((sum, line) => sum + line.ms, 0))
      out.push(`${name}  ${chapter.title}  ${lines.length} lines, ${length}`)
      md.push(`## ${name}: ${chapter.title} (${verdict})`, '')
      md.push('| Line | Length | Ratio | From | Text |', '|---|---|---|---|---|')
      for (const line of lines) {
        const ratio = ratioText(line, tour)
        out.push(
          `  ${line.beat.id.padEnd(10)} ${seconds(line.ms).padStart(7)}  ratio ${ratio}${line.from === 'override' ? '  (own recording)' : ''}`,
        )
        const text =
          line.beat.text.length > 60 ? `${line.beat.text.slice(0, 57)}...` : line.beat.text
        md.push(
          `| ${line.beat.id} | ${seconds(line.ms)} | ${ratio} | ${line.from} | ${text.replaceAll('|', '\\|')} |`,
        )
      }
      out.push(`  ${verdict}${note ? `: ${note}` : ''}`)
      md.push('', note ? `${verdict}: ${note}` : verdict, '')
    }
    md.push(
      "Ratio: a line's length against its expected share of the chapter (by syllables), so 1.00 is an even pace. Outside 0.60 to 1.60 the cut may be wrong: listen to it.",
      '',
    )
    for (const name of notEncoded) out.push(`${name}  not encoded yet`)
    for (const name of unrecognised) out.push(`${name}  not a chapter file or a beat id, skipped`)
    if (notEncoded.length > 0) {
      md.push('## Not encoded yet', '', ...notEncoded.map((name) => `- ${name}`), '')
    }

    console.log(out.join('\n'))
    const lineCount = imported.length
    const chapterCount = results.length
    console.log(
      `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'} imported (${lineCount} ${lineCount === 1 ? 'line' : 'lines'}) · ${notEncoded.length} not encoded yet${dryRun ? ' · dry run, nothing written' : ''}`,
    )
    if (!dryRun) await writeFile(path.join(dir, 'import-report.md'), md.join('\n'))
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

main().catch((error) => fail(error.message))
