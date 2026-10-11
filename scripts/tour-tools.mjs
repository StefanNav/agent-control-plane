import { spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// What `tour:audio` and `tour:import` share: running ffmpeg and ffprobe, measuring a clip, the
// encoding every clip is made with, making a placeholder and reading and writing the manifest.

export const root = fileURLToPath(new URL('..', import.meta.url))
export const audioDir = path.join(root, 'public/tour/audio')
export const manifestPath = path.join(root, 'src/prototype/tour/manifest.json')

/** The loudness every clip is brought to. */
export const LOUDNORM = 'loudnorm=I=-16:TP=-1.5:LRA=11'

/**
 * How every clip is encoded: mono AAC with no metadata. The sample rate is set because loudnorm
 * resamples to 192 kHz, which would leave 96 kHz AAC; clips should play anywhere.
 */
export const ENCODE_ARGS = [
  '-ac',
  '1',
  '-ar',
  '44100',
  '-c:a',
  'aac',
  '-b:a',
  '64k',
  '-map_metadata',
  '-1',
]

/** Speaks `text` into `file` (macOS `say`) as a normalised mono AAC clip, using `tmpDir` on the way. */
export async function makePlaceholder(text, file, tmpDir) {
  const aiff = path.join(tmpDir, 'line.aiff')
  // `--` so a line starting with a hyphen is read as text, not an option.
  await run('say', ['-o', aiff, '--', text])
  await run('ffmpeg', ['-y', '-i', aiff, '-af', LOUDNORM, ...ENCODE_ARGS, file])
}

/** Exits with a one-line message. */
export function fail(message) {
  console.error(message)
  process.exit(1)
}

/** True when `name` is an executable on the PATH. */
export function onPath(name) {
  return (process.env.PATH ?? '').split(path.delimiter).some((dir) => {
    try {
      accessSync(path.join(dir, name), constants.X_OK)
      return true
    } catch {
      return false
    }
  })
}

/** Exits with a one-line message unless every tool is on the PATH. */
export function requireTools(script, tools) {
  for (const tool of tools) {
    if (!onPath(tool)) fail(`${script} needs \`${tool}\` and it isn't on the PATH`)
  }
}

/** Runs a command with its arguments as an array (no shell) and resolves with its stdout and stderr. */
export function runCapture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${command} exited with ${code}: ${stderr.trim().split('\n').pop()}`))
    })
  })
}

/** Runs a command with its arguments as an array (no shell) and resolves with its stdout. */
export async function run(command, args) {
  return (await runCapture(command, args)).stdout
}

export async function exists(file) {
  return stat(file).then(
    () => true,
    () => false,
  )
}

/** A clip's length in seconds. */
export async function clipSeconds(file) {
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
  return seconds
}

/** A clip's length in whole milliseconds. */
export async function clipMs(file) {
  return Math.round((await clipSeconds(file)) * 1000)
}

/** Exits unless every beat id can name a file and none is used twice; otherwise the set of ids. */
export function beatIdSet(beats) {
  const ids = new Set()
  for (const beat of beats) {
    if (!/^[\w-]+$/.test(beat.id)) {
      fail(`Beat id "${beat.id}" can't name a file (use letters, digits, - and _)`)
    }
    if (ids.has(beat.id)) fail(`Beat id "${beat.id}" is used twice`)
    ids.add(beat.id)
  }
  return ids
}

/** A clip's levels are one digit per window this long (the app reads them so, `levels.ts`). */
export const LEVEL_WINDOW_MS = 50

/**
 * The RMS level of every 50 ms window of a clip (2205 samples at 44.1 kHz), printed one per window.
 * Clips are 44.1 kHz already; the resample only makes sure of it.
 */
const LEVELS_FILTER = [
  'aresample=44100',
  'asetnsamples=n=2205:p=0',
  'astats=metadata=1:reset=1',
  'ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-',
].join(',')

/**
 * Quieter than this is 0, and this loud or louder is 9, on the voice meter (dB RMS). Chosen from the
 * 65 recorded clips' 8,499 windows: their room tone sits at −50 to −44 dB, so it reads 0 (a window
 * reads 0 below about −41.8 dB); their speech, brought to −16 LUFS, sits mostly at −24 to −12 dB, so
 * 7–9 (−15.1 dB and up) are about a quarter of the windows with speech in them (27%) and the bars
 * move through their range. The loudest windows reach about −8 dB (an 8); 9 is headroom.
 */
const LEVEL_FLOOR_DB = -44
const LEVEL_CEILING_DB = -4

/** A window's RMS level in dB as a digit, 0–9: linear from −44 dB (or silence) to −4 dB, rounded. */
export function levelDigit(db) {
  if (!(db > LEVEL_FLOOR_DB)) return 0
  if (db >= LEVEL_CEILING_DB) return 9
  return Math.round(((db - LEVEL_FLOOR_DB) / (LEVEL_CEILING_DB - LEVEL_FLOOR_DB)) * 9)
}

/** ffmpeg's printed RMS levels (see `LEVELS_FILTER`) as a string of digits, one per window. */
export function levelsFromAstats(text) {
  let digits = ''
  for (const line of text.split('\n')) {
    const value = /^lavfi\.astats\.Overall\.RMS_level=(\S+)/.exec(line.trim())?.[1]
    if (value === undefined) continue
    digits += String(levelDigit(value === '-inf' ? -Infinity : Number.parseFloat(value)))
  }
  return digits
}

/** Do these levels belong to a clip this long: digits, within 2 windows of its length? */
export function levelsFit(levels, ms) {
  return (
    typeof levels === 'string' &&
    /^[0-9]+$/.test(levels) &&
    Math.abs(levels.length - Math.ceil(ms / LEVEL_WINDOW_MS)) <= 2
  )
}

/** A clip's loudness, one digit (0–9) per 50 ms, for the tour bar's voice meter. */
export async function clipLevels(file) {
  const { stdout } = await runCapture('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-loglevel',
    'error',
    '-i',
    file,
    '-af',
    LEVELS_FILTER,
    '-f',
    'null',
    '-',
  ])
  const levels = levelsFromAstats(stdout)
  if (levels === '') throw new Error(`ffmpeg gave no levels for ${file}`)
  return levels
}

/** The levels an entry already has, if they fit the clip's length; otherwise the clip's, measured. */
export async function levelsFor(entry, file, ms) {
  return levelsFit(entry?.levels, ms) ? entry.levels : clipLevels(file)
}

/** The manifest as it is on disk (empty if there isn't one yet). */
export async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'))
}

/** Writes the manifest, but only if it changed. */
export async function writeManifest(manifest) {
  const json = `${JSON.stringify(manifest, null, 2)}\n`
  if (json !== (await readFile(manifestPath, 'utf8').catch(() => ''))) {
    await writeFile(manifestPath, json)
  }
}
