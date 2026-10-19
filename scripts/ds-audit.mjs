/**
 * Design-system debt audit (docs/design-system/contributing.md → "The ratchet").
 *
 * Counts the places where product code works around Countersign instead of through it, and
 * compares each count with scripts/ds-audit.baseline.json. A count may only go down: the unit
 * test fails if one rises, and asks for the baseline to be locked in when one falls.
 *
 *   pnpm ds:audit           print the report and compare with the baseline (exit 1 if a count rose)
 *   pnpm ds:audit --write   lock the current counts in as the new baseline
 *   pnpm ds:audit --list <metric>   every place that counts towards one metric
 *
 * Product code is src/design-system, src/components, src/layout, src/features and src/app.
 * The prototype layer (landing, tour, About) is the portfolio wrapper around the product and isn't counted.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASELINE = join(ROOT, 'scripts/ds-audit.baseline.json')

const PRODUCT = ['src/design-system/', 'src/components/', 'src/layout/', 'src/features/', 'src/app/']
const isProduct = (path) => PRODUCT.some((dir) => path.startsWith(dir))
const isTokenFile = (path) => /^src\/design-system\/tokens[^/]*\.css$/.test(path)
const isTest = (path) => /\.test\.[jt]sx?$/.test(path)

/** What each count means, in the order the report prints them. */
export const METRICS = {
  rawColours: 'Colour values typed outside the token files',
  rawSpacing: 'Spacing (padding, margin, gap) typed in px instead of a --cs-space token',
  rawFontSizes: 'Font sizes typed in px instead of a --cs-type token',
  rawLineHeights: 'Line heights typed in px instead of a --cs-type token',
  rawRadii: 'Corner radii typed in px instead of a --cs-radius token',
  labelRoleCopies: 'Copies of the label type role (mono, uppercase) outside the design system',
  copiedBlocks: 'Styled rule blocks (3+ declarations, one of them visual) repeated across stylesheets outside the design system',
  rawElements: 'Raw <button>, <table>, <input>, <select>, <textarea> in screens where a primitive exists',
  crossFeatureImports: "Imports from one feature's folder into another's (shared UI belongs in the system, shared logic in src/store or src/lib)",
  scopedTokenLeaks: 'Scoped tokens used outside their scope (--cs-ehr-* outside the Epic stand-in, --cs-mark-* outside the prototype)',
}

const SPACING_PROPS = /^(padding|margin)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(gap|row-gap|column-gap)$/
const PX = /(?<![\w.#-])(-?\d*\.?\d+)px\b/g
const COLOUR_CSS = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|color)\(/g
const COLOUR_TS = /['"`]#[0-9a-fA-F]{3,8}['"`]|\b(rgba?|hsla?|oklch)\(/g
const RAW_ELEMENT = /<(button|table|input|select|textarea)\b/g
/** A copied block counts only if it styles something; repeated layout stacks (flex, gap) are fine. */
const VISUAL = /^(color|background|border|font|box-shadow|text-|letter-spacing|line-height|outline|opacity)/

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
const lineOf = (text, index) => text.slice(0, index).split('\n').length

/** Every `property: value` in a stylesheet, with its line. */
function declarations(css) {
  const out = []
  const clean = stripComments(css)
  const re = /([a-z-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\}))/g
  let m
  while ((m = re.exec(clean))) {
    // Skip selectors like `a:hover {`: a declaration's value never runs into an opening brace.
    const after = clean.slice(re.lastIndex).trimStart()
    if (after.startsWith('{')) continue
    out.push({ prop: m[1], value: m[2], line: lineOf(clean, m.index) })
  }
  return out
}

/** Innermost rule blocks: `selector { body }`, including those inside @media. */
function blocks(css) {
  const out = []
  const clean = stripComments(css)
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(clean))) {
    const body = m[2]
      .split(';')
      .map((d) => d.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .sort()
    const visual = body.some((d) => VISUAL.test(d))
    if (body.length >= 3 && visual) out.push({ selector: m[1].trim(), body: body.join('; '), line: lineOf(clean, m.index) })
  }
  return out
}

/**
 * Audits a set of source files. `files` is a list of `{ path, text }` with repo-relative paths.
 * Returns `{ counts, places }`: a number per metric, and where each one comes from.
 */
export function audit(files) {
  const places = Object.fromEntries(Object.keys(METRICS).map((k) => [k, []]))
  const add = (metric, path, line, note) => places[metric].push(`${path}:${line}  ${note}`)
  const product = files.filter((f) => isProduct(f.path) && !isTest(f.path))

  for (const { path, text } of product) {
    if (path.endsWith('.css')) {
      if (!isTokenFile(path)) {
        for (const { prop, value, line } of declarations(text)) {
          value.match(COLOUR_CSS)?.forEach(() => add('rawColours', path, line, `${prop}: ${value}`))
          const px = [...value.matchAll(PX)].filter((m) => Number(m[1]) !== 0)
          if (SPACING_PROPS.test(prop)) for (const m of px) add('rawSpacing', path, line, `${prop}: ${m[0]}`)
          if (prop === 'font-size') for (const m of px) add('rawFontSizes', path, line, `${prop}: ${m[0]}`)
          if (prop === 'line-height') for (const m of px) add('rawLineHeights', path, line, `${prop}: ${m[0]}`)
          if (/^border(-[a-z]+)*-radius$/.test(prop)) for (const m of px) add('rawRadii', path, line, `${prop}: ${m[0]}`)
          if (prop === 'text-transform' && value === 'uppercase' && !path.startsWith('src/design-system/'))
            add('labelRoleCopies', path, line, 'text-transform: uppercase')
        }
      }
      for (const m of text.matchAll(/var\(--cs-(ehr|mark)-[a-z0-9-]+\)/g)) {
        const inScope = m[1] === 'ehr' ? path.startsWith('src/features/epic/') : false
        if (!inScope) add('scopedTokenLeaks', path, lineOf(text, m.index), m[0])
      }
    } else if (/\.tsx?$/.test(path)) {
      for (const m of text.matchAll(COLOUR_TS)) add('rawColours', path, lineOf(text, m.index), m[0])
      if (path.startsWith('src/features/') || path.startsWith('src/layout/'))
        for (const m of text.matchAll(RAW_ELEMENT)) add('rawElements', path, lineOf(text, m.index), `<${m[1]}>`)
      if (path.startsWith('src/features/')) {
        const own = path.split('/')[2]
        for (const m of text.matchAll(/(?:from |import\(|import )'(\.[^']+)'/g)) {
          const target = normalize(join(dirname(path), m[1])).split(sep).join('/')
          const other = target.startsWith('src/features/') ? target.split('/')[2] : null
          if (other && other !== own) add('crossFeatureImports', path, lineOf(text, m.index), `${own} → ${other}: ${m[1]}`)
        }
      }
    }
  }

  // Copies across stylesheets: the same declarations under any selector, in more than one file.
  // The design system defines a block once; a screen repeating it is the copy.
  const seen = new Map()
  for (const { path, text } of product.filter((f) => f.path.endsWith('.css') && !f.path.startsWith('src/design-system/'))) {
    for (const block of blocks(text)) {
      const where = seen.get(block.body) ?? new Map()
      if (!where.has(path)) where.set(path, `${block.selector} (line ${block.line})`)
      seen.set(block.body, where)
    }
  }
  for (const [body, where] of seen) {
    if (where.size < 2) continue
    const [first, ...copies] = [...where.entries()]
    for (const [path, at] of copies) add('copiedBlocks', path, 0, `${at} copies ${first[0]} ${first[1]}: { ${body} }`)
  }

  const counts = Object.fromEntries(Object.entries(places).map(([k, v]) => [k, v.length]))
  return { counts, places }
}

/** Share of spacing, font-size, line-height and radius declarations in product CSS that use a token. */
export function coverage(files) {
  const totals = { spacing: [0, 0], fontSize: [0, 0], lineHeight: [0, 0], radius: [0, 0] }
  for (const { path, text } of files) {
    if (!isProduct(path) || !path.endsWith('.css') || isTokenFile(path)) continue
    for (const { prop, value } of declarations(text)) {
      const kind = SPACING_PROPS.test(prop)
        ? 'spacing'
        : prop === 'font-size'
          ? 'fontSize'
          : prop === 'line-height'
            ? 'lineHeight'
          : /^border(-[a-z]+)*-radius$/.test(prop)
            ? 'radius'
            : null
      if (!kind) continue
      if (/var\(--cs-/.test(value)) totals[kind][0]++
      else if ([...value.matchAll(PX)].some((m) => Number(m[1]) !== 0)) totals[kind][1]++
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([k, [tokens, raw]]) => [k, tokens + raw ? Math.round((100 * tokens) / (tokens + raw)) : 100]),
  )
}

/** Compares counts with a baseline: which rose (fail) and which fell (lock in). */
export function compare(counts, baseline) {
  const rose = []
  const fell = []
  for (const key of Object.keys(METRICS)) {
    const was = baseline[key] ?? 0
    const now = counts[key] ?? 0
    if (now > was) rose.push({ key, was, now })
    if (now < was) fell.push({ key, was, now })
  }
  return { rose, fell }
}

export function readSources(root = ROOT) {
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(css|tsx?)$/.test(entry.name)) files.push({ path: relative(root, full).split(sep).join('/'), text: readFileSync(full, 'utf8') })
    }
  }
  walk(join(root, 'src'))
  return files
}

export function readBaseline() {
  return JSON.parse(readFileSync(BASELINE, 'utf8'))
}

function main(argv) {
  const files = readSources()
  const { counts, places } = audit(files)

  const listAt = argv.indexOf('--list')
  if (listAt !== -1) {
    const metric = argv[listAt + 1]
    if (!places[metric]) throw new Error(`Unknown metric "${metric}". One of: ${Object.keys(METRICS).join(', ')}`)
    console.log(places[metric].join('\n'))
    return 0
  }

  if (argv.includes('--write')) {
    writeFileSync(BASELINE, `${JSON.stringify(counts, null, 2)}\n`)
    console.log(`Baseline locked in: ${BASELINE}`)
    return 0
  }

  const baseline = readBaseline()
  const cov = coverage(files)
  console.log('Countersign debt audit (product code)\n')
  for (const [key, label] of Object.entries(METRICS)) {
    const was = baseline[key] ?? 0
    const now = counts[key]
    const delta = now === was ? '' : now < was ? `  (down ${was - now})` : `  (UP ${now - was})`
    console.log(`${String(now).padStart(5)}  ${label}${delta}`)
  }
  console.log(`\nToken coverage: spacing ${cov.spacing}% · font sizes ${cov.fontSize}% · line heights ${cov.lineHeight}% · radii ${cov.radius}%`)

  const { rose, fell } = compare(counts, baseline)
  if (rose.length) {
    console.log(`\nDebt rose: ${rose.map((r) => r.key).join(', ')}. See where with: pnpm ds:audit --list <metric>`)
    return 1
  }
  if (fell.length) console.log('\nDebt fell. Lock it in with: pnpm ds:audit --write')
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2))
