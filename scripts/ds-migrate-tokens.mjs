/**
 * One-off migration (Phase 13): hand-typed values in product CSS → Countersign tokens.
 *
 * Only exact matches move: a value on the handoff's scale becomes its token, so the rendered page
 * can't change (`pnpm visual` proves it). Anything off the scale stays as typed, where
 * `pnpm ds:audit --list` shows it as a decision to make, not a value to guess.
 *
 *   node scripts/ds-migrate-tokens.mjs           rewrite the files and print what moved
 *   node scripts/ds-migrate-tokens.mjs --dry     print only
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSources } from './ds-audit.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PRODUCT = ['src/design-system/', 'src/components/', 'src/layout/', 'src/features/', 'src/app/']

const SPACE = new Set([2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56])
const RADIUS = new Set([1, 2, 3, 4, 6, 8])
const TYPE = { 24: ['title', 32], 20: ['stat', 28], 18: ['section', 24], 16: ['body', 24], 14: ['ui', 20], 13: ['dense', 18], 12: ['meta', 16] }
const LAYER = { 20: 'menu', 50: 'modal', 70: 'skip-link' }

const SPACING_PROPS = /^(padding|margin)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(gap|row-gap|column-gap)$/
const PX = /(?<![\w.#-])(\d+)px\b/g
const DECL = /^(\s*)([a-z-]+)(\s*:\s*)([^;{}\n]+)(;?)$/gm

/** Rewrites one stylesheet. Returns the new text and a count per kind. */
export function migrate(css) {
  const counts = { space: 0, radius: 0, type: 0, line: 0, motion: 0, layer: 0 }
  const out = css.replace(/\{([^{}]*)\}/g, (whole, body) => {
    const size = body.match(/^\s*font-size\s*:\s*(\d+)px/m)?.[1]
    const role = size ? TYPE[size] : undefined
    const next = body.replace(DECL, (decl, indent, prop, colon, value, semi) => {
      let v = value
      if (SPACING_PROPS.test(prop)) {
        v = v.replace(PX, (m, n) => (SPACE.has(Number(n)) ? (counts.space++, `var(--cs-space-${n})`) : m))
      } else if (/^border(-[a-z]+)*-radius$/.test(prop)) {
        v = v.replace(PX, (m, n) => (RADIUS.has(Number(n)) ? (counts.radius++, `var(--cs-radius-${n})`) : m))
        v = v.replace(/^50%$/, () => (counts.radius++, 'var(--cs-radius-round)'))
      } else if (prop === 'font-size') {
        v = v.replace(/^(\d+)px\b/, (m, n) => (TYPE[n] ? (counts.type++, `var(--cs-type-${TYPE[n][0]}-size)`) : m))
      } else if (prop === 'line-height' && role) {
        v = v.replace(/^(\d+)px\b/, (m, n) => (Number(n) === role[1] ? (counts.line++, `var(--cs-type-${role[0]}-line)`) : m))
      } else if (prop === 'transition') {
        v = v.replace(/\b150ms ease-out\b/, () => (counts.motion++, 'var(--cs-motion-row)'))
      } else if (prop === 'z-index') {
        v = v.replace(/^(\d+)$/, (m, n) => (LAYER[n] ? (counts.layer++, `var(--cs-layer-${LAYER[n]})`) : m))
      }
      return `${indent}${prop}${colon}${v}${semi}`
    })
    return `{${next}}`
  })
  return { css: out, counts }
}

function main(argv) {
  const dry = argv.includes('--dry')
  const total = { space: 0, radius: 0, type: 0, line: 0, motion: 0, layer: 0 }
  let files = 0
  for (const { path, text } of readSources()) {
    if (!path.endsWith('.css') || !PRODUCT.some((d) => path.startsWith(d))) continue
    if (/^src\/design-system\/tokens[^/]*\.css$/.test(path)) continue
    const { css, counts } = migrate(text)
    if (css === text) continue
    files++
    for (const k of Object.keys(total)) total[k] += counts[k]
    if (!dry) writeFileSync(join(ROOT, path), css)
  }
  console.log(`${dry ? 'Would move' : 'Moved'} in ${files} stylesheets:`, total)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2))
