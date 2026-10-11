import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  audioDir,
  beatIdSet,
  clipLevels,
  clipMs,
  exists,
  fail,
  levelsFit,
  levelsFor,
  makePlaceholder,
  readManifest,
  requireTools,
  writeManifest,
} from './tour-tools.mjs'
import { loadTour } from './tour-load.mjs'

// Makes a placeholder clip (macOS `say` + `ffmpeg`) for every beat without a recording (or whose
// placeholder is missing or was made from different text), measures every clip with `ffprobe` and
// rewrites the manifest. Each entry also holds its clip's levels, for the bar's voice meter: kept
// while they fit the clip's length, otherwise measured with `ffmpeg` (no clip is re-encoded for
// them). `--levels` measures every clip's levels again, even ones that fit: `--check` can't tell a
// clip swapped by hand for one of the same length. `--check` writes nothing and exits 1 unless every
// beat has a current recorded clip whose levels fit it; it needs only `ffprobe`.

const check = process.argv.includes('--check')
const remeasure = process.argv.includes('--levels')

/** Milliseconds as m:ss. */
function clock(ms) {
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

async function main() {
  requireTools('tour:audio', check ? ['ffprobe'] : ['say', 'ffmpeg', 'ffprobe'])

  const { CHAPTERS, textHash } = await loadTour()
  const beats = CHAPTERS.flatMap((chapter) => chapter.steps.flatMap((step) => step.beats))
  const ids = beatIdSet(beats)

  const previous = await readManifest()
  const next = {}
  const counts = { recorded: 0, placeholder: 0, outOfDate: 0, missing: 0, levels: 0 }
  let totalMs = 0
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tour-audio-'))

  try {
    for (const beat of beats) {
      const entry = previous[beat.id]
      const file = path.join(audioDir, `${beat.id}.m4a`)
      const present = await exists(file)
      const hash = textHash(beat.text)

      /** `--check`: an entry's levels are missing, or don't fit its clip's length. */
      const checkLevels = (ms) => {
        if (levelsFit(entry.levels, ms)) return
        counts.levels++
        console.log(`${entry.levels === undefined ? 'no levels    ' : 'stale levels '}${beat.id}`)
      }
      /**
       * The entry's levels if they fit the clip (unless `--levels`), otherwise the clip's, measured
       * (and said so, if they changed).
       */
      const levels = async (ms) => {
        const measured = remeasure ? await clipLevels(file) : await levelsFor(entry, file, ms)
        if (measured !== entry?.levels) console.log(`levels       ${beat.id}`)
        return measured
      }

      if (entry?.source === 'recorded' && present) {
        // Keep the recording, and the hash of the line it was made from, so a later edit still shows.
        const ms = await clipMs(file)
        if (check) checkLevels(ms)
        else {
          next[beat.id] = {
            ms,
            source: 'recorded',
            textHash: entry.textHash,
            levels: await levels(ms),
          }
        }
        totalMs += ms
        if (entry.textHash === hash) counts.recorded++
        else {
          counts.outOfDate++
          console.log(`out of date  ${beat.id}`)
        }
      } else if (check) {
        if (entry?.source === 'placeholder' && present) {
          counts.placeholder++
          console.log(`placeholder  ${beat.id}`)
          const ms = await clipMs(file)
          checkLevels(ms)
          totalMs += ms
        } else {
          counts.missing++
          console.log(`missing      ${beat.id}`)
        }
      } else if (entry?.source === 'placeholder' && present && entry.textHash === hash) {
        // An up-to-date placeholder stays as it is; only its length is measured again.
        const ms = await clipMs(file)
        next[beat.id] = { ms, source: 'placeholder', textHash: hash, levels: await levels(ms) }
        totalMs += ms
        counts.placeholder++
      } else {
        await makePlaceholder(beat.text, file, tmpDir)
        const ms = await clipMs(file)
        next[beat.id] = {
          ms,
          source: 'placeholder',
          textHash: hash,
          levels: await clipLevels(file),
        }
        totalMs += ms
        counts.placeholder++
        console.log(`placeholder  ${beat.id} (${(ms / 1000).toFixed(1)} s)`)
      }
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }

  if (!check) {
    for (const name of await readdir(audioDir)) {
      if (name.endsWith('.m4a') && !ids.has(name.slice(0, -'.m4a'.length))) {
        await rm(path.join(audioDir, name))
        console.log(`removed      ${name}`)
      }
    }
    await writeManifest(next)
  }

  const parts = [
    `${beats.length} beats`,
    `${counts.recorded} recorded`,
    `${counts.placeholder} placeholder`,
    `${counts.outOfDate} out of date`,
  ]
  if (counts.missing) parts.push(`${counts.missing} missing`)
  if (counts.levels) parts.push(`${counts.levels} without levels that fit`)
  parts.push(`total ${clock(totalMs)}`)
  console.log(parts.join(' · '))

  if (check && (counts.recorded !== beats.length || counts.levels > 0)) process.exitCode = 1
}

main().catch((error) => fail(error.message))
