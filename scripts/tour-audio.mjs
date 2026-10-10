import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  ENCODE_ARGS,
  LOUDNORM,
  audioDir,
  beatIdSet,
  clipMs,
  exists,
  fail,
  readManifest,
  requireTools,
  run,
  writeManifest,
} from './tour-tools.mjs'
import { loadTour } from './tour-load.mjs'

// Makes a placeholder clip (macOS `say` + `ffmpeg`) for every beat without a recording (or whose
// placeholder is missing or was made from different text), measures every clip with `ffprobe` and
// rewrites the manifest. `--check` writes nothing and exits 1 unless every beat has a current
// recorded clip.

const check = process.argv.includes('--check')

/** Speaks `text` into `file` as a normalised mono AAC clip. */
async function makePlaceholder(text, file, tmpDir) {
  const aiff = path.join(tmpDir, 'line.aiff')
  // `--` so a line starting with a hyphen is read as text, not an option.
  await run('say', ['-o', aiff, '--', text])
  await run('ffmpeg', ['-y', '-i', aiff, '-af', LOUDNORM, ...ENCODE_ARGS, file])
}

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
  const counts = { recorded: 0, placeholder: 0, outOfDate: 0, missing: 0 }
  let totalMs = 0
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tour-audio-'))

  try {
    for (const beat of beats) {
      const entry = previous[beat.id]
      const file = path.join(audioDir, `${beat.id}.m4a`)
      const present = await exists(file)
      const hash = textHash(beat.text)

      if (entry?.source === 'recorded' && present) {
        // Keep the recording, and the hash of the line it was made from, so a later edit still shows.
        const ms = await clipMs(file)
        next[beat.id] = { ms, source: 'recorded', textHash: entry.textHash }
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
          totalMs += await clipMs(file)
        } else {
          counts.missing++
          console.log(`missing      ${beat.id}`)
        }
      } else if (entry?.source === 'placeholder' && present && entry.textHash === hash) {
        // An up-to-date placeholder stays as it is; only its length is measured again.
        const ms = await clipMs(file)
        next[beat.id] = { ms, source: 'placeholder', textHash: hash }
        totalMs += ms
        counts.placeholder++
      } else {
        await makePlaceholder(beat.text, file, tmpDir)
        const ms = await clipMs(file)
        next[beat.id] = { ms, source: 'placeholder', textHash: hash }
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
  parts.push(`total ${clock(totalMs)}`)
  console.log(parts.join(' · '))

  if (check && counts.recorded !== beats.length) process.exitCode = 1
}

main().catch((error) => fail(error.message))
