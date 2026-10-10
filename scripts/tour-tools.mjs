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
