// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { METRICS, audit, compare, coverage, readBaseline, readSources } from './ds-audit.mjs'

const css = (path, text) => ({ path, text })

describe('audit', () => {
  test('counts typed values in product CSS, and leaves tokens alone', () => {
    const { counts } = audit([
      css(
        'src/features/x/x.module.css',
        `.a {
  padding: 0 14px;
  gap: var(--cs-space-8);
  margin-top: -6px;
  font-size: 15px;
  line-height: 22px;
  border-radius: 3px;
  color: oklch(0.5 0 0);
}
.a:hover { background: var(--cs-hover); }`,
      ),
    ])
    expect(counts.rawSpacing).toBe(2) // 14px and -6px; 0 is not a value
    expect(counts.rawFontSizes).toBe(1)
    expect(counts.rawRadii).toBe(1)
    expect(counts.rawColours).toBe(1)
  })

  test('ignores the token files, tests and the prototype layer', () => {
    const { counts } = audit([
      css('src/design-system/tokens.css', ':root { --cs-x: oklch(1 0 0); --cs-space-4: 4px; }'),
      css('src/prototype/Landing/Landing.module.css', '.a { padding: 13px; color: #fff; }'),
      css('src/features/x/x.test.tsx', 'const c = "#ffffff"'),
    ])
    expect(Object.values(counts).every((n) => n === 0)).toBe(true)
  })

  test('the label role copied outside the design system counts; inside it, it is the role', () => {
    const label = '.l { text-transform: uppercase; }'
    const { counts } = audit([css('src/design-system/type.module.css', label), css('src/features/x/x.module.css', label)])
    expect(counts.labelRoleCopies).toBe(1)
  })

  test('a styled block copied into a second stylesheet counts once; a repeated layout stack does not', () => {
    const card = '{ background: var(--cs-raised); border: 1px solid var(--cs-line); border-radius: var(--cs-radius-6); }'
    const stack = '{ display: flex; flex-direction: column; gap: var(--cs-space-4); }'
    const { counts } = audit([
      css('src/features/a/a.module.css', `.side ${card}\n.head ${stack}`),
      css('src/features/b/b.module.css', `.panel ${card}\n.intro ${stack}`),
      css('src/features/b/c.module.css', `.box ${card}`),
    ])
    expect(counts.copiedBlocks).toBe(2)
  })

  test('raw form and table elements count in screens, not in the primitives that wrap them', () => {
    const { counts } = audit([
      css('src/features/x/X.tsx', 'return <button onClick={go}>Go</button>'),
      css('src/design-system/primitives/Button/Button.tsx', 'return <button className={c} />'),
    ])
    expect(counts.rawElements).toBe(1)
  })

  test('scoped tokens leak outside their scope', () => {
    const { counts } = audit([
      css('src/features/epic/epic.module.css', '.a { color: var(--cs-ehr-ink); }'),
      css('src/features/board/board.module.css', '.a { color: var(--cs-ehr-ink); fill: var(--cs-mark-deep); }'),
    ])
    expect(counts.scopedTokenLeaks).toBe(2)
  })

  test('coverage is the share of declarations that use a token', () => {
    const cov = coverage([css('src/features/x/x.module.css', '.a { padding: var(--cs-space-4); margin: 3px; font-size: var(--cs-type-ui-size); }')])
    expect(cov).toEqual({ spacing: 50, fontSize: 100, radius: 100 })
  })
})

describe('compare', () => {
  test('a count that rose fails; one that fell is to be locked in', () => {
    const { rose, fell } = compare({ rawSpacing: 5, rawRadii: 1 }, { rawSpacing: 4, rawRadii: 2 })
    expect(rose).toEqual([{ key: 'rawSpacing', was: 4, now: 5 }])
    expect(fell).toEqual([{ key: 'rawRadii', was: 2, now: 1 }])
  })
})

/**
 * The ratchet. Debt may only go down: a count above the baseline fails the build (fix it, or use what
 * the system has); a count below it fails too, until `pnpm ds:audit --write` locks the gain in.
 */
describe('the ratchet', () => {
  const { counts, places } = audit(readSources())
  const baseline = readBaseline()

  test.each(Object.keys(METRICS))('%s has not risen', (key) => {
    const was = baseline[key] ?? 0
    if (counts[key] > was) {
      const newest = places[key].slice(-5).join('\n  ')
      expect.fail(
        `${METRICS[key]}: ${counts[key]}, baseline ${was}. Use the token or component instead ` +
          `(docs/design-system/contributing.md). Every place: pnpm ds:audit --list ${key}\n  ${newest}`,
      )
    }
  })

  test('every gain is locked in', () => {
    const { fell } = compare(counts, baseline)
    expect(fell, 'Debt fell: run `pnpm ds:audit --write` and commit the baseline').toEqual([])
  })
})
