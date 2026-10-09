import { spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTour } from './tour-load.mjs'

// Makes a placeholder clip (macOS `say` + `ffmpeg`) for every beat without a recording (or whose
// placeholder is missing or was made from different text), measures every clip with `ffprobe` and
// rewrites the manifest. `--check` writes nothing and exits 1 unless every beat has a current
// recorded clip.

const root = fileURLToPath(new URL('..', import.meta.url))
const audioDir = path.join(root, 'public/tour/audio')
const manifestPath = path.join(root, 'src/prototype/tour/manifest.json')
const check = process.argv.includes('--check')

/** Exits with a one-line message. */
function fail(message) {
  console.error(message)
  process.exit(1)
}

/** True when `name` is an executable on the PATH. */
function onPath(name) {
  return (process.env.PATH ?? '').split(path.delimiter).some((dir) => {
    try {
      accessSync(path.join(dir, name), constants.X_OK)
      return true
    } catch {
      return false
    }
  })
}

/** Runs a command with its arguments as an array (no shell) and resolves with its stdout. */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`${command} exited with ${code}: ${stderr.trim().split('\n').pop()}`))
    })
  })
}

async function exists(file) {
  return stat(file).then(
    () => true,
    () => false,
  )
}

/** A clip's length in whole milliseconds. */
async function clipMs(file) {
  const out = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ])
  const seconds = Number.parseFloat(out)
  if (Number.isNaN(seconds)) throw new Error(`ffprobe gave no duration for ${file}`)
  return Math.round(seconds * 1000)
}

/** Speaks `text` into `file` as a normalised mono AAC clip. */
async function makePlaceholder(text, file, tmpDir) {
  const aiff = path.join(tmpDir, 'line.aiff')
  // `--` so a line starting with a hyphen is read as text, not an option.
  await run('say', ['-o', aiff, '--', text])
  await run('ffmpeg', [
    '-y',
    '-i',
    aiff,
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ac',
    '1',
    // loudnorm resamples to 192 kHz, which would leave 96 kHz AAC; clips should play anywhere.
    '-ar',
    '44100',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-map_metadata',
    '-1',
    file,
  ])
}

/** Milliseconds as m:ss. */
function clock(ms) {
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

async function main() {
  const tools = check ? ['ffprobe'] : ['say', 'ffmpeg', 'ffprobe']
  for (const tool of tools) {
    if (!onPath(tool)) fail(`tour:audio needs \`${tool}\` and it isn't on the PATH`)
  }

  const { CHAPTERS, textHash } = await loadTour()
  const beats = CHAPTERS.flatMap((chapter) => chapter.steps.flatMap((step) => step.beats))
  const ids = new Set()
  for (const beat of beats) {
    if (!/^[\w-]+$/.test(beat.id)) {
      fail(`Beat id "${beat.id}" can't name a file (use letters, digits, - and _)`)
    }
    if (ids.has(beat.id)) fail(`Beat id "${beat.id}" is used twice`)
    ids.add(beat.id)
  }

  const previous = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'))
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
    const json = `${JSON.stringify(next, null, 2)}\n`
    if (json !== (await readFile(manifestPath, 'utf8').catch(() => ''))) {
      await writeFile(manifestPath, json)
    }
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
