import brand from '../prototype/brand-tokens.css?raw'
import ehr from './tokens-ehr.css?raw'
import css from './tokens.css?raw'

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  if (start === -1) return ''
  return source.slice(start, source.indexOf('}', start))
}

const rootBlock = block(css, ':root')
const darkBlock = block(css, '[data-theme="dark"]')

const LIGHT: Array<[string, string]> = [
  ['--cs-bg', 'oklch(0.985 0.002 90)'],
  ['--cs-raised', 'oklch(1 0 0)'],
  ['--cs-sunk', 'oklch(0.985 0.002 90)'],
  ['--cs-hover', 'oklch(0.975 0.003 90)'],
  ['--cs-fill', 'oklch(0.965 0.003 90)'],
  ['--cs-sel', 'oklch(0.96 0.02 268)'],
  ['--cs-acc', 'oklch(0.43 0.15 268)'],
  ['--cs-acc-fill', 'oklch(0.43 0.15 268)'],
  ['--cs-on-acc', 'oklch(1 0 0)'],
  ['--cs-focus', 'oklch(0.21 0.004 90)'],
  ['--cs-line', 'oklch(0.925 0.004 90)'],
  ['--cs-line-strong', 'oklch(0.87 0.005 90)'],
  ['--cs-off', 'oklch(0.72 0.006 90)'],
  ['--cs-icon', 'oklch(0.6 0.006 90)'],
  ['--cs-meta', 'oklch(0.5 0.006 90)'],
  ['--cs-text2', 'oklch(0.41 0.006 90)'],
  ['--cs-strong', 'oklch(0.31 0.005 90)'],
  ['--cs-ink', 'oklch(0.21 0.004 90)'],
  ['--cs-rev', 'oklch(0.5 0.085 200)'],
  ['--cs-warn', 'oklch(0.65 0.14 70)'],
  ['--cs-warn-text', 'oklch(0.5 0.1 62)'],
  ['--cs-crit', 'oklch(0.52 0.19 27)'],
  ['--cs-lad-pass', 'oklch(0.72 0.006 90)'],
  ['--cs-lad-lock', 'oklch(0.925 0.004 90)'],
  ['--cs-canvas', 'oklch(0.93 0.003 90)'],
  ['--cs-scrim', 'oklch(0.21 0.004 90 / 0.32)'],
  ['--cs-scrim-strong', 'oklch(0.21 0.004 90 / 0.55)'],
  ['--cs-shadow-menu', '0 8px 24px oklch(0.21 0.004 90 / 0.14)'],
  ['--cs-shadow-modal', '0 16px 48px oklch(0.21 0.004 90 / 0.2)'],
]

const DARK: Array<[string, string]> = [
  ['--cs-bg', 'oklch(0.165 0.004 90)'],
  ['--cs-raised', 'oklch(0.2 0.005 90)'],
  ['--cs-sunk', 'oklch(0.185 0.004 90)'],
  ['--cs-hover', 'oklch(0.23 0.005 90)'],
  ['--cs-sel', 'oklch(0.29 0.045 268)'],
  ['--cs-acc', 'oklch(0.74 0.12 268)'],
  ['--cs-acc-fill', 'oklch(0.43 0.15 268)'],
  ['--cs-on-acc', 'oklch(1 0 0)'],
  ['--cs-focus', 'oklch(0.96 0.002 90)'],
  ['--cs-line', 'oklch(0.29 0.005 90)'],
  ['--cs-line-strong', 'oklch(0.38 0.006 90)'],
  ['--cs-off', 'oklch(0.46 0.006 90)'],
  ['--cs-icon', 'oklch(0.6 0.006 90)'],
  ['--cs-meta', 'oklch(0.72 0.005 90)'],
  ['--cs-text2', 'oklch(0.8 0.004 90)'],
  ['--cs-strong', 'oklch(0.88 0.003 90)'],
  ['--cs-ink', 'oklch(0.96 0.002 90)'],
  ['--cs-rev', 'oklch(0.78 0.09 200)'],
  ['--cs-warn', 'oklch(0.8 0.14 78)'],
  ['--cs-warn-text', 'oklch(0.83 0.12 80)'],
  ['--cs-crit', 'oklch(0.7 0.17 27)'],
  ['--cs-lad-pass', 'oklch(0.52 0.006 90)'],
  ['--cs-lad-lock', 'oklch(0.3 0.005 90)'],
]

test.each(LIGHT)('light %s', (name, value) => {
  expect(rootBlock).toContain(`${name}: ${value};`)
})

test.each(DARK)('dark %s', (name, value) => {
  expect(darkBlock).toContain(`${name}: ${value};`)
})

test('dark --cs-fill is defined', () => {
  expect(darkBlock).toMatch(/--cs-fill: oklch\([^)]+\);/)
})

// The Attune mark (Phase 11), scoped to the prototype layer: product indigo, deep and soft, and a pair for the ink prototype bar.
test.each([
  [':root', '--cs-mark-deep', 'var(--cs-acc)'],
  [':root', '--cs-mark-soft', 'oklch(0.7 0.1 268)'],
  [':root', '--cs-mark-deep-on-ink', 'oklch(0.74 0.12 268)'],
  [':root', '--cs-mark-soft-on-ink', 'oklch(0.86 0.06 268)'],
  ['[data-theme="dark"]', '--cs-mark-deep', 'oklch(0.74 0.12 268)'],
  ['[data-theme="dark"]', '--cs-mark-soft', 'oklch(0.86 0.06 268)'],
])('brand %s %s', (selector, name, value) => {
  expect(block(brand, selector)).toContain(`${name}: ${value};`)
})

test('the Epic stand-in keeps its own tokens, light and dark', () => {
  expect(block(ehr, ':root')).toContain('--cs-ehr-bg: oklch(0.97 0.004 240);')
  expect(block(ehr, '[data-theme="dark"]')).toContain('--cs-ehr-bg: oklch(0.18 0.006 240);')
  expect(css).not.toContain('--cs-ehr-')
  expect(css).not.toContain('--cs-mark-')
})

/** The handoff's scales (docs/design-handoff.md → "Spacing, radius, borders, elevation" and "Typography"). */
test.each([2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56])('space %i', (px) => {
  expect(rootBlock).toContain(`--cs-space-${px}: ${px}px;`)
})

test.each([1, 2, 3, 4, 6, 8])('radius %i', (px) => {
  expect(rootBlock).toContain(`--cs-radius-${px}: ${px}px;`)
})

test.each([
  ['title', 24, 32],
  ['stat', 20, 28],
  ['section', 18, 24],
  ['body', 16, 24],
  ['ui', 14, 20],
  ['dense', 13, 18],
  ['meta', 12, 16],
])('type role %s is %i/%i', (role, size, line) => {
  expect(rootBlock).toContain(`--cs-type-${role}-size: ${size}px;`)
  expect(rootBlock).toContain(`--cs-type-${role}-line: ${line}px;`)
})
