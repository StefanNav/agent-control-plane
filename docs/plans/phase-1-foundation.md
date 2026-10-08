# Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed app shell where every designed route exists as a placeholder naming its frames, built on the full Countersign token, icon, primitive and layout layer.

**Architecture:** Vite + React 19 + TS strict SPA. `src/design-system` holds tokens (CSS custom properties) and domain-free primitives, each a folder with `Name.tsx` + `Name.module.css` + `Name.test.tsx`, exported from `src/design-system/index.ts`. `src/app/routes.ts` is a data table of every route; the router, placeholder pages and Playwright smoke test all read from it.

**Tech stack:** pnpm, Vite, React 19, TypeScript, React Router v8 (`react-router` package), Vitest + jsdom + Testing Library, Playwright, ESLint + Prettier, GitHub Actions, Vercel.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.1, §5, §5.5 routes). **Design source:** `docs/design-handoff.md` (Design tokens, Typography, Spacing, Shared primitives, Icons) and `reference/cs-build.js` (exact primitive specs). Read both before Task 1.2.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints. Most relevant here: no UI/icon libraries or Tailwind; colours only via `--cs-*` tokens; Plex 400/600 only; tabular numbers; keyboard-only focus rings; CSS Modules.

## Conventions for this phase

- One folder per primitive: `src/design-system/primitives/<Name>/{<Name>.tsx,<Name>.module.css,<Name>.test.tsx}`. Export every primitive and its props type from `src/design-system/index.ts`.
- Pixel values come from the handoff's "Shared primitives" list and `reference/cs-build.js`. When the two disagree, `cs-build.js` wins for E2–E15 screens; note it in the BUILD_PLAN decision log.
- Tests check behaviour and structure (roles, ARIA, callbacks, emitted values). Visual exactness is checked by screenshots at the checkpoint, not in unit tests.

---

### Task 1.1: Scaffold the app and the `pnpm check` gate

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js` (written by hand; the template ships oxlint instead), `.prettierrc.json`, `.prettierignore`, `src/main.tsx`, `src/test/setup.ts`, `src/lib/cx.ts`
- Test: `src/lib/cx.test.ts`

**Interfaces:**
- Produces: `cx(...parts: Array<string | false | null | undefined>): string` in `src/lib/cx.ts`; scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `check`, `e2e`, `designs`, `format`.

- [ ] **Step 1: Branch**

Run: `git checkout -b phase-1-foundation`

- [ ] **Step 2: Scaffold outside the repo and copy in**

The repo root is not empty, so scaffold in the scratchpad: `pnpm create vite@latest acp-scaffold --template react-ts`. Copy `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src/main.tsx` into the repo root. Do **not** copy its `README.md`, `_gitignore`, `_oxlintrc.json`, `public/`, `src/App.*`, `src/assets/`, `src/index.css`. (create-vite 9.2 ships oxlint, no `eslint.config.js` and no `vite-env.d.ts`; `"types": ["vite/client"]` in `tsconfig.app.json` replaces the latter.) Set `"name": "agent-control-plane"`, `"private": true`, `"packageManager": "pnpm@11.5.1"` (CI's `pnpm/action-setup` reads it).

- [ ] **Step 3: Install dependencies**

```bash
pnpm add react-router zustand @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
pnpm remove oxlint
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test prettier serve \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals eslint-config-prettier
```
Record the installed major versions of react, react-router, vite, vitest in the BUILD_PLAN decision log.

- [ ] **Step 4: Configure**
  - `tsconfig.app.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]` (keep `vite/client`: CSS Module and `?raw` imports need it).
  - `vite.config.ts`: `test: { environment: 'jsdom', globals: true, setupFiles: ['src/test/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] }`.
  - `src/test/setup.ts`: `import '@testing-library/jest-dom/vitest'`.
  - `eslint.config.js` (flat config): `tseslint.config(` ignores `dist`, `designs`, `reference`, `playwright-report`, `test-results`, `.superpowers`; then `js.configs.recommended`, `...tseslint.configs.recommended`; then for `**/*.{ts,tsx}`: `languageOptions.globals = globals.browser`, plugins `react-hooks` and `react-refresh`, rules `...reactHooks.configs.recommended.rules` and `'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]`; last, `eslint-config-prettier` `)`.
  - `.prettierrc.json`: `{ "singleQuote": true, "semi": false, "printWidth": 100 }`; `.prettierignore`: `designs/`, `reference/`, `pnpm-lock.yaml`, `dist/`.
  - `index.html`: `<title>Signal · Agent Control Plane</title>`, `lang="en"`.
  - `package.json` scripts:
    - `"typecheck": "tsc -b"`, `"lint": "eslint ."`, `"test": "vitest run"`, `"build": "tsc -b && vite build"`
    - `"check": "pnpm typecheck && pnpm lint && pnpm test && vite build"`
    - `"e2e": "playwright test"`, `"designs": "serve designs -l 4599"`, `"format": "prettier --write ."`

- [ ] **Step 5: Write the failing test** in `src/lib/cx.test.ts`

```ts
import { cx } from './cx'

test('joins truthy class names with single spaces', () => {
  expect(cx('a', false, undefined, null, 'b')).toBe('a b')
})
test('returns an empty string when nothing is truthy', () => {
  expect(cx(false, undefined)).toBe('')
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm test src/lib/cx.test.ts`
Expected: FAIL, cannot resolve `./cx`

- [ ] **Step 7: Implement `cx` in `src/lib/cx.ts`**; make `src/main.tsx` render a bare `<div>Agent Control Plane</div>` for now

- [ ] **Step 8: Run the full gate**

Run: `pnpm check`
Expected: typecheck, lint, 2 tests and build all pass

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS app with check gate"
```

### Task 1.2: Tokens, type roles, global styles, focus rings

**Files:**
- Create: `src/design-system/tokens.css`, `src/design-system/global.css`, `src/design-system/type.module.css`, `src/design-system/focus.ts`
- Modify: `src/main.tsx` (import fonts, `tokens.css`, `global.css`; call `installKeyboardFocusMode()`)
- Test: `src/design-system/tokens.test.ts`, `src/design-system/focus.test.ts`

**Interfaces:**
- Produces: CSS custom properties below (every later task uses only these for colour, shadow and scrim); type role classes in `type.module.css`: `pageTitle`, `statValue`, `sectionTitle`, `body`, `ui`, `dense`, `meta`, `mono`, `label`, `wordmark`; `installKeyboardFocusMode(doc?: Document): () => void`.

**Token names** (the decision; values are verbatim from the handoff tables):

| CSS variable | Light (handoff row) | Dark (handoff row) |
|---|---|---|
| `--cs-bg` | screen bg `0.985 0.002 90` | page `0.165 0.004 90` |
| `--cs-raised` | raised `1 0 0` | raised `0.2 0.005 90` |
| `--cs-sunk` | screen bg `0.985 0.002 90` | sunk `0.185 0.004 90` |
| `--cs-hover` | hover `0.975 0.003 90` | hover `0.23 0.005 90` |
| `--cs-fill` | neutral fill `0.965 0.003 90` | read from `designs/CountersignCore.dc.html` dark mode; log it |
| `--cs-sel` | sel `0.96 0.02 268` | sel `0.29 0.045 268` |
| `--cs-acc` | selBar/acc `0.43 0.15 268` | selBar/acc `0.74 0.12 268` |
| `--cs-acc-fill` | `0.43 0.15 268` | `0.43 0.15 268` (button fills keep the deep indigo) |
| `--cs-on-acc` | `1 0 0` | `1 0 0` |
| `--cs-focus` | ink `0.21 0.004 90` | focus `0.96 0.002 90` |
| `--cs-line` | line `0.925 0.004 90` | line `0.29 0.005 90` |
| `--cs-line-strong` | lineStrong `0.87 0.005 90` | lineStrong `0.38 0.006 90` |
| `--cs-off` | off `0.72 0.006 90` | off `0.46 0.006 90` |
| `--cs-icon` | icon `0.6 0.006 90` | icon `0.6 0.006 90` |
| `--cs-meta` | meta `0.5 0.006 90` | meta `0.72 0.005 90` |
| `--cs-text2` | text2 `0.41 0.006 90` | text2 `0.8 0.004 90` |
| `--cs-strong` | strong `0.31 0.005 90` | strong `0.88 0.003 90` |
| `--cs-ink` | ink `0.21 0.004 90` | ink `0.96 0.002 90` |
| `--cs-rev` | rev `0.5 0.085 200` | rev `0.78 0.09 200` |
| `--cs-warn` | warn `0.65 0.14 70` | warn `0.8 0.14 78` |
| `--cs-warn-text` | warnT `0.5 0.1 62` | warnT `0.83 0.12 80` |
| `--cs-crit` | crit `0.52 0.19 27` | crit `0.7 0.17 27` |
| `--cs-lad-pass` | ladPass `0.72 0.006 90` | ladPass `0.52 0.006 90` |
| `--cs-lad-lock` | ladLock `0.925 0.004 90` | ladLock `0.3 0.005 90` |
| `--cs-canvas` | canvas `0.93 0.003 90` | (light only) |
| `--cs-scrim` | `oklch(0.21 0.004 90 / 0.32)` | same |
| `--cs-shadow-menu` | `0 8px 24px oklch(0.21 0.004 90 / 0.14)` | same |
| `--cs-shadow-modal` | `0 16px 48px oklch(0.21 0.004 90 / 0.2)` | same |

Light values go on `:root`; dark values on `[data-theme="dark"]`. Every colour is written `oklch(L C H)`.

- [ ] **Step 1: Write the failing token test** in `src/design-system/tokens.test.ts`

Import the file as text (`import css from './tokens.css?raw'`). Split it into the `:root { … }` block and the `[data-theme="dark"] { … }` block. A table in the test lists every light and dark pair above (except the `--cs-fill` dark value, which is asserted only to exist). Assertions:

```ts
test.each(LIGHT)('light %s', (name, value) => {
  expect(rootBlock).toContain(`${name}: ${value};`)
})
test.each(DARK)('dark %s', (name, value) => {
  expect(darkBlock).toContain(`${name}: ${value};`)
})
test('dark --cs-fill is defined', () => {
  expect(darkBlock).toMatch(/--cs-fill: oklch\([^)]+\);/)
})
```
with entries such as `['--cs-ink', 'oklch(0.21 0.004 90)']` and `['--cs-acc-fill', 'oklch(0.43 0.15 268)']` (dark).

- [ ] **Step 2: Write the failing focus test** in `src/design-system/focus.test.ts`

```ts
test('Tab turns keyboard mode on, mousedown turns it off', () => {
  const stop = installKeyboardFocusMode(document)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
  expect(document.documentElement.dataset.keyboard).toBe('true')
  document.dispatchEvent(new MouseEvent('mousedown'))
  expect(document.documentElement.dataset.keyboard).toBeUndefined()
  stop()
})
test('arrow keys also turn keyboard mode on', () => { /* ArrowDown → 'true' */ })
test('cleanup removes listeners', () => { /* after stop(), Tab leaves dataset.keyboard undefined */ })
```

- [ ] **Step 3: Run both; verify they fail**

Run: `pnpm test src/design-system`
Expected: FAIL (missing file / missing export)

- [ ] **Step 4: Implement**
  - `tokens.css` per the table.
  - `type.module.css`: one class per row of the handoff Typography table (`pageTitle` 24/32 600 −0.01em; `statValue` 20/28 600; `sectionTitle` 18/24 600; `body` 16/24; `ui` 14/20; `dense` 13/18; `meta` 12/16 `--cs-meta`; `mono` Plex Mono 12/16; `label` Mono 12/16 600 uppercase +0.05em `--cs-meta`; `wordmark` 14 600 +0.04em).
  - `global.css`: `body { margin:0; background: var(--cs-bg); color: var(--cs-ink); font-family: 'IBM Plex Sans', sans-serif; font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased }`; `button { font: inherit }`; `:root:not([data-keyboard]) *:focus { outline: none }`; `:root[data-keyboard] :focus-visible { outline: 2px solid var(--cs-focus); outline-offset: 1px }`; `@media (prefers-reduced-motion: reduce) { * { transition: none !important } }`.
  - `focus.ts`: `installKeyboardFocusMode(doc = document)` listens for `keydown` (Tab, ArrowUp/Down/Left/Right) → `dataset.keyboard = 'true'`; `mousedown` → delete; returns cleanup.
  - `main.tsx`: import `@fontsource/ibm-plex-sans/400.css`, `/600.css`, same for mono; then `tokens.css`, `global.css`; call `installKeyboardFocusMode()`.

- [ ] **Step 5: Run; verify pass.** Run: `pnpm test src/design-system` → PASS
- [ ] **Step 6: Commit** `git commit -m "feat(ds): Countersign tokens, type roles, global styles, keyboard focus mode"`

### Task 1.3: Icon set

**Files:**
- Create: `src/design-system/icons/paths.ts`, `src/design-system/icons/Icon.tsx`
- Test: `src/design-system/icons/Icon.test.tsx`

**Interfaces:**
- Produces: `type IconName = 'ring' | 'diamond' | 'triangle' | 'stale' | 'shadow' | 'paused' | 'check' | 'lock' | 'chevron'`; `Icon(props: { name: IconName; size?: number /* default 12 */; color?: string /* default 'currentColor' */; title?: string }): JSX.Element`.

Paths (verbatim from the handoff "Icons" list and `cs-build.js`): ring `M6 1.75a4.25 4.25 0 1 1 0 8.5a4.25 4.25 0 1 1 0-8.5Z` stroke 1.5, no fill; diamond `M6 0.9L11.1 6L6 11.1L0.9 6Z` filled; triangle `M6 1.2L11.4 10.6H0.6Z` filled; stale = ring with `stroke-dasharray="2.2 1.75"`; shadow = ring + filled `M6 1.75a4.25 4.25 0 0 0 0 8.5Z`; paused `M2.6 2h2.4v8H2.6ZM7 2h2.4v8H7Z` filled; check `M2.5 6.2l2.3 2.3 4.7-5` stroke 1.8 round caps and joins; lock = shackle `M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5` stroke 1.4 + `rect x=2 y=5.5 width=8 height=5.5 rx=1` filled; chevron viewBox `0 0 10 10`, `M2 3.5l3 3 3-3` stroke 1.5. All others use viewBox `0 0 12 12`.

- [ ] **Step 1: Failing tests**
  - each name renders an `svg` whose first `path` has the `d` above;
  - `stale` path has `stroke-dasharray="2.2 1.75"`;
  - `shadow` renders 2 paths; `lock` renders a path and a rect;
  - without `title` the svg has `aria-hidden="true"`; with `title` it has `role="img"` and a `<title>`.
- [ ] **Step 2: Run; verify fail.** `pnpm test src/design-system/icons` → FAIL
- [ ] **Step 3: Implement** `paths.ts` (data) and `Icon.tsx`.
- [ ] **Step 4: Run; verify pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(ds): inline SVG icon set"`

### Task 1.4: Form primitives

**Files:** `src/design-system/primitives/{Button,Field,Input,Select,Textarea,Checkbox,RadioCardGroup,Segmented,FilterPill}/…`, `src/design-system/index.ts`

**Interfaces (Produces):**
- `Button(props: ButtonProps)`; `ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { variant?: 'primary' | 'secondary' | 'ghost' | 'blocked'; size?: 'md' | 'sm'; icon?: ReactNode; type?: 'button' | 'submit' }`. Default `variant='secondary'`, `size='md'`, `type='button'`. `md` = 36 high (ghost 32), `sm` = 32 high / 13 px (in-card). `blocked` renders `aria-disabled="true"` and swallows clicks.
- `Field(props: { label: ReactNode; htmlFor: string; hint?: ReactNode; help?: ReactNode; children: ReactNode })`
- `Input(props: InputHTMLAttributes<HTMLInputElement> & { locked?: boolean })`: `locked` → `readOnly`, fill `--cs-fill`, border `--cs-line`, lock icon at right.
- `Select<T extends string>(props: { id?: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; locked?: boolean })`: native `<select>` with the chevron icon.
- `Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>)`: min-height 108.
- `Checkbox(props: { checked: boolean; onChange: (checked: boolean) => void; label?: ReactNode; disabled?: boolean; id?: string })`
- `RadioCardGroup<T extends string>(props: { name: string; value: T | null; onChange: (value: T) => void; options: { value: T; title: ReactNode; description?: ReactNode; disabled?: boolean }[] })`
- `Segmented<T extends string>(props: { value: T; onChange: (value: T) => void; options: { value: T; label: ReactNode; sub?: ReactNode }[]; variant?: 'choice' | 'control' })`: `choice` = equal-grid segmented choice (radio-card treatment); `control` = compact inbox control (r3, 32 high).
- `FilterPill(props: { on: boolean; onClick: () => void; children: ReactNode })`

- [ ] **Step 1: Failing tests** (one file per primitive):
  - Button: `blocked` has `aria-disabled="true"` and clicking does not call `onClick`; default `type="button"`; `primary` gets the primary class.
  - Field + Input: `getByLabelText('Purpose')` finds the input (label `htmlFor` wiring); `locked` input is `readOnly` and contains a lock svg.
  - Select: choosing an option calls `onChange` with its value.
  - Checkbox: `role="checkbox"` with `aria-checked`; Space and click call `onChange(!checked)`; `disabled` blocks both.
  - RadioCardGroup: `role="radiogroup"`; clicking an option calls `onChange`; ArrowDown moves to the next enabled option and selects it (skips `disabled`); selected option has `aria-checked="true"`.
  - Segmented: clicking a segment calls `onChange(value)`; selected has `aria-pressed="true"`.
  - FilterPill: `aria-pressed` mirrors `on`.
- [ ] **Step 2: Run; verify fail.** `pnpm test src/design-system/primitives`
- [ ] **Step 3: Implement** each primitive and its CSS Module from the handoff "Shared primitives" (Buttons, Field, Radio card, Checkbox, Segmented choice, Filter pill) and `cs-build.js`. Export all from `src/design-system/index.ts`.
- [ ] **Step 4: Run; verify pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(ds): form primitives"`

### Task 1.5: Display primitives

**Files:** `src/design-system/primitives/{Card,Paper,DefinitionList,Notice,StatStrip,Sparkline,ProgressBar,RuleTag,LogRow,Avatar}/…`

**Interfaces (Produces):**
- `Card(props: { children: ReactNode; className?: string })`; `Paper(props: { children: ReactNode })`
- `DefinitionList(props: { items: { key: ReactNode; value: ReactNode }[] })`: 160 px key column.
- `Notice(props: { mark?: 'warn' | 'crit' | 'review' | 'lock' | 'none'; lead?: ReactNode; children: ReactNode })`
- `StatStrip(props: { stats: { label: ReactNode; value: ReactNode; sub?: ReactNode }[] })`
- `sparklinePath(values: number[], width: number, height: number): string` and `Sparkline(props: { values: number[]; width?: number /* 72 */; height?: number /* 20 */; stale?: boolean; endDot?: boolean /* default true */ })`. Use 56×16 in rows (caller passes size).
- `ProgressBar(props: { value: number /* 0..1 */; label?: string })`
- `RuleTag(props: { children: string })`; `LogRow(props: { time: string; children: ReactNode; sub?: ReactNode })`; `Avatar(props: { initial: string; size?: number /* 28 */ })`

`sparklinePath` algorithm (pinned so tests and component agree): padding 2 px; `x_i = 2 + i * (width - 4) / (n - 1)`; `y_i = 2 + (1 - (v_i - min) / (max - min)) * (height - 4)`; if `max === min`, every `y = height / 2`; numbers rounded to 2 decimals, trailing zeros dropped; format `M{x} {y}L{x} {y}…`; fewer than 2 values → `''`.

- [ ] **Step 1: Failing tests**
  - `sparklinePath([0, 10, 5], 72, 20) === 'M2 18L36 2L70 10'`
  - `sparklinePath([5, 5], 72, 20) === 'M2 10L70 10'`
  - `sparklinePath([3], 72, 20) === ''`
  - `Sparkline stale` renders the path with `stroke-dasharray="2 2"` and no end-dot circle; default renders one circle at the last point.
  - `ProgressBar value={1.4}` → `aria-valuenow="100"`; `value={-1}` → `"0"`; `role="progressbar"`.
  - `DefinitionList` renders a `dl` with `dt`/`dd` pairs in order.
  - `Notice` renders `lead` in a `strong`.
- [ ] **Step 2: Run; verify fail.**
- [ ] **Step 3: Implement** from the handoff (Card, Paper, Definition list, Notice, Stat strip, Sparkline, Progress bar, Rule tag, Log row).
- [ ] **Step 4: Run; verify pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(ds): display primitives"`

### Task 1.6: Interactive structures

**Files:** `src/design-system/primitives/{Table,Tabs,WizardSteps,Menu,Modal}/…`

**Interfaces (Produces):**
- `Column<Row> = { id: string; header: ReactNode; width: string /* CSS grid track, e.g. '304px' | '1fr' */; align?: 'left' | 'right'; render: (row: Row) => ReactNode }`
- `Table<Row>(props: { columns: Column<Row>[]; rows: Row[]; getRowId: (row: Row) => string; selectedId?: string | null; onSelect?: (id: string) => void; onOpen?: (id: string) => void; density?: 'board' | 'default'; groups?: { id: string; label: string; count?: number; rowIds: string[] }[]; ariaLabel: string })`
  - div-based with `role="table" | "row" | "columnheader" | "cell"`; header row 32 high, mono uppercase labels; rows min 44 (`board`: 32); `grid-template-columns` = column widths joined.
  - Rows are `tabIndex=0`. Click → `onSelect`. ArrowDown/ArrowUp moves focus to the next/previous row. Enter or Space → `onOpen`. Selected row: `aria-selected="true"`, `--cs-sel` + `inset 2px 0 0 var(--cs-acc)`.
  - `groups` renders a sunk group header row (label + count) before its rows; rows not in any group render after.
- `Tabs(props: { items: { id: string; label: ReactNode; to?: string }[]; current: string; onSelect?: (id: string) => void; ariaLabel: string })`: renders React Router `Link` when `to` is set; current has `aria-current="page"`.
- `WizardSteps(props: { steps: { id: string; label: ReactNode; sub: ReactNode; mark: 'done' | 'todo' | 'locked' | 'review' }[]; current: string; onSelect?: (id: string) => void })`: current gets `aria-current="step"`, `--cs-sel` tint and 2 px indigo underline.
- `MenuItem = { id: string; label: ReactNode; sub?: ReactNode; onSelect?: () => void; locked?: boolean }`; `Menu(props: { trigger: (p: { open: boolean; toggle: () => void; ref: Ref<HTMLButtonElement> }) => ReactNode; groups: { label?: string; items: MenuItem[] }[]; align?: 'left' | 'right' })`
- `Modal(props: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; audit?: ReactNode; actions: ReactNode; width?: number /* 600 */ })`: portal to `document.body`, scrim, top 96, `--cs-shadow-modal`; footer has `audit` (mono) left and `actions` right.

- [ ] **Step 1: Failing tests**
  - Table: column headers render as `columnheader` in order; clicking row 2 calls `onSelect('r2')`; row with `selectedId` has `aria-selected="true"`; focusing row 1 and pressing ArrowDown focuses row 2; Enter on a focused row calls `onOpen`; a group header with label "Overdue" and count 2 renders before its rows; right-aligned cells carry `data-align="right"`.
  - Tabs: current item has `aria-current="page"`; items with `to` render links (wrap in `MemoryRouter`).
  - WizardSteps: current step `aria-current="step"`; a `done` step contains the check icon, a `locked` step the lock icon.
  - Menu: clicking the trigger shows `role="menu"`; ArrowDown moves focus between `menuitem`s; a `locked` item has `aria-disabled="true"` and selecting it does not call `onSelect`; Escape closes and returns focus to the trigger.
  - Modal: `open` renders `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing at the title; focus moves inside on open; Tab from the last focusable element wraps to the first; Escape calls `onClose`; when `open` flips false, focus returns to the element focused before opening.
- [ ] **Step 2: Run; verify fail.**
- [ ] **Step 3: Implement** from the handoff (Table, Tabs, Wizard steps, Menu, Modal) and `cs-build.js`.
- [ ] **Step 4: Run; verify pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(ds): table, tabs, wizard steps, menu, modal"`

### Task 1.7: Layout and app shell

**Files:**
- Create: `src/app/nav.ts`, `src/layout/TopNav/…`, `src/layout/PageHeader/…`, `src/layout/layouts.tsx` + `layouts.module.css`, `src/layout/NotFound.tsx`, `src/prototype/PrototypeBar/…`, `src/app/AppShell.tsx`
- Test: `src/layout/TopNav/TopNav.test.tsx`, `src/layout/PageHeader/PageHeader.test.tsx`

**Interfaces (Produces):**
- `src/app/nav.ts`: `type NavSection = 'portfolio' | 'inventory' | 'operations' | 'reports' | 'settings'`; `NAV_ITEMS: { id: NavSection; label: string; to: string }[]` = Portfolio `/portfolio`, Inventory `/inventory`, Operations `/operations`, Reports `/reports`, Settings `/settings` (this order).
- `TopNav(props: { current: NavSection | null; avatarInitial: string; hospital?: string /* 'Lakeshore Health' */ })`: 48 high; "AIMS" wordmark; nav gap 24; current item 600 + `inset 0 -2px 0 var(--cs-acc)` + `aria-current="page"`.
- `PageHeader(props: { breadcrumb?: ReactNode; title: ReactNode; status?: ReactNode; idLine?: ReactNode; chips?: ReactNode; people?: { role: string; name: string }[]; actions?: ReactNode; tabs?: ReactNode; steps?: ReactNode })`: title is the page's `h1`; padding 24 40 24 (0 bottom when `tabs` or `steps`).
- `Split(props: { main: ReactNode; side: ReactNode })` (1fr + 340, gap 40, padding 32 40 48); `SplitL(props: { list: ReactNode; detail: ReactNode })` (420 + 1fr, gap 24, padding 24 40 48); `Body(props: { children: ReactNode })` (column, gap 20, padding 28 40 48).
- `PrototypeBar()`: 32 px ink strip; left "Signal · Agent Control Plane · Prototype" (link to `/`); right static "Viewing as Marcus · Agent owner", "Stories", "Reset demo", "About" (wired in Phase 2 and 8).
- `AppShell(props: { shell: 'app' | 'prototype' | 'kiosk' })`: the app container has `min-width: 1280px` (narrower windows scroll horizontally; the <1024 desktop gate comes in Phase 8). `app` = PrototypeBar + TopNav + `<Outlet/>`; `prototype` = PrototypeBar + `<Outlet/>`; `kiosk` = `<Outlet/>` only. TopNav `current` comes from the deepest route `handle.nav` (`useMatches`).
- `NotFound()`: inside the shell; `h1` "Page not found"; one line "This page isn't part of the prototype."; link "Go to the Command Board" → `/operations`.

- [ ] **Step 1: Failing tests**
  - TopNav: five links in `NAV_ITEMS` order with exact labels; `current='operations'` → Operations has `aria-current="page"`, others don't; avatar shows the initial; "Lakeshore Health" visible.
  - PageHeader: `title` renders as the only `h1`; `people` renders "Owner" then "Marcus"; `actions` render.
- [ ] **Step 2: Run; verify fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run; verify pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(layout): top nav, page header, body layouts, app shell, prototype bar"`

### Task 1.8: Route table, router, placeholders, route smoke test

**Files:**
- Create: `src/app/routes.ts`, `src/app/router.tsx`, `src/app/Placeholder.tsx`, `playwright.config.ts`, `tests/e2e/routes.spec.ts`, `vercel.json`
- Modify: `src/main.tsx` (render `<RouterProvider router={router} />`)
- Test: `src/app/routes.test.ts`

**Interfaces:**
- Consumes: `NavSection` (1.7), `AppShell`, `NotFound`, `PageHeader`, `Body`, `Notice`.
- Produces:
  - `type ShellKind = 'app' | 'prototype' | 'kiosk'`
  - `type RouteDef = { path: string; nav: NavSection | null; shell: ShellKind; title: string; frames: string[]; phase: number; samplePath: string }`
  - `routeTable: RouteDef[]` (one entry per row of spec §5.5; frames and phase from spec §8; `samplePath` = a concrete URL, e.g. `/operations/agents/med-rec`)
  - `redirects: Record<string, string>` = `{ '/portfolio': '/portfolio/privileges', '/reports': '/reports/evidence', '/settings': '/settings/divisions/medications' }`
  - `router` (from `createBrowserRouter`). Later phases replace a route's `Placeholder` element with the real page by path; the table stays the single list of routes.

Shell per route: `kiosk` for `/wall`; `prototype` for `/`, `/about`, `/about/components`, `/epic`; `app` for everything else.

- [ ] **Step 1: Failing unit test** `src/app/routes.test.ts`

```ts
const EXPECTED = [
  '/', '/about', '/about/components',
  '/operations', '/operations/divisions/:divisionId', '/operations/agents/:agentId',
  '/operations/agents/:agentId/cases/:caseId', '/operations/inbox', '/operations/inbox/:exceptionId',
  '/operations/actions', '/operations/actions/:actionId', '/operations/incidents',
  '/operations/incidents/:incidentId', '/operations/reviewers', '/operations/reviewers/:unitId',
  '/operations/sampling',
  '/inventory', '/inventory/agents/:agentId', '/inventory/agents/:agentId/onboarding/:step',
  '/inventory/agents/:agentId/risk-tier', '/inventory/privileges/:privilegeId/sign',
  '/inventory/unregistered/:callerId', '/inventory/promotions/:promotionId',
  '/portfolio/privileges', '/portfolio/reviews/:reviewId', '/portfolio/promotions/:promotionId',
  '/portfolio/activities/:activityId', '/portfolio/activities/:activityId/branches/:branchId',
  '/reports/evidence', '/reports/evidence/:agentId', '/reports/export',
  '/settings/divisions/:divisionId', '/settings/people',
  '/wall', '/epic',
]
test('route table has exactly the spec routes', () => {
  expect(routeTable.map((r) => r.path).sort()).toEqual([...EXPECTED].sort())
})
test('every samplePath matches its pattern', () => {
  for (const r of routeTable) expect(matchPath(r.path, r.samplePath)).not.toBeNull()
})
test('redirect targets exist', () => {
  for (const to of Object.values(redirects))
    expect(routeTable.some((r) => matchPath(r.path, to))).toBe(true)
})
test('wall is kiosk; landing, about, epic are prototype; rest are app', () => { /* per spec */ })
```

- [ ] **Step 2: Run; verify fail.**
- [ ] **Step 3: Implement** `routes.ts`, `router.tsx` (group routes under three `AppShell` layout routes by `shell`; add redirect routes; `*` → `NotFound` in the `app` shell) and `Placeholder.tsx` (PageHeader with the route `title`; mono line `Frames 4a · 4d · 4f`; Notice "Built in Phase N. This placeholder lists the frames this route will show."). Wire `main.tsx`.
- [ ] **Step 4: Run; verify pass.** `pnpm test src/app`
- [ ] **Step 5: Playwright config and smoke test**
  - `playwright.config.ts`: chromium only; viewport 1440×900; `webServer: { command: 'pnpm build && pnpm preview --port 4173 --strictPort', port: 4173, reuseExistingServer: !process.env.CI }`; `baseURL: 'http://localhost:4173'`.
  - `tests/e2e/routes.spec.ts`: for each `routeTable` entry, `page.goto(samplePath)` directly (no in-app navigation), collect `pageerror` and `console` errors, expect an `h1` to be visible and zero errors. Plus: `/no-such-page` shows "Page not found"; `/portfolio` ends at `/portfolio/privileges`.
  - `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
- [ ] **Step 6: Run** `pnpm exec playwright install chromium && pnpm e2e` → all pass
- [ ] **Step 7: Commit** `git commit -m "feat(app): route table, router, placeholders, route smoke test"`

### Task 1.9: Primitives gallery (`/about/components`)

**Files:**
- Create: `src/prototype/ComponentGallery/ComponentGallery.tsx` (+ `.module.css`), `tests/e2e/gallery.spec.ts`
- Modify: `src/app/routes.ts` (point `/about/components` at the gallery instead of `Placeholder`)

**Interfaces:**
- Produces: `ComponentGallery()` with sections `Tokens`, `Type`, `Icons`, `Buttons`, `Fields`, `Selection`, `Display`, `Table`, `Navigation`, `Menu and modal`. Phase 2 adds `Product components` (light and dark).

- [ ] **Step 1: Failing e2e** `tests/e2e/gallery.spec.ts`: page has an `h2` per section above; clicking "Open modal" shows `role="dialog"`; Escape closes it; no console errors.
- [ ] **Step 2: Run; verify fail.** `pnpm e2e tests/e2e/gallery.spec.ts`
- [ ] **Step 3: Implement**: token swatches (light and a `data-theme="dark"` panel), the type scale, every icon, every primitive in its states (button variants and sizes; locked input; checked and unchecked checkbox; radio cards with a disabled option; segmented both variants; filter pills on/off; a 3-row table with a selected row and a group header; tabs; wizard steps with all four marks; a menu with a locked item; a modal).
- [ ] **Step 4: Run; verify pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(prototype): primitives gallery"`

### Task 1.10: CI, Vercel, checkpoint

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `docs/BUILD_PLAN.md`, this file (tick steps)

- [ ] **Step 1: CI workflow** on `pull_request` and `push` to `main`: checkout → `pnpm/action-setup` → `actions/setup-node` (Node 24, cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm exec playwright install --with-deps chromium` → `pnpm e2e` → upload `playwright-report/` on failure.
- [ ] **Step 2: Commit and push the branch**

```bash
git add .github
git commit -m "ci: check and e2e on PRs"
git push -u origin phase-1-foundation
```

- [ ] **Step 3: Link Vercel**

```bash
vercel link --yes --project agent-control-plane
vercel git connect https://github.com/StefanNav/agent-control-plane
```
If `git connect` says the Vercel GitHub app lacks access to the repo, ask Stefan to grant it (Vercel dashboard → Add New Project → import `agent-control-plane`). This is the one step that may need him. Framework preset: Vite; install `pnpm install`; build `pnpm build`; output `dist`.

- [ ] **Step 4: Open the PR**

`gh pr create --title "Phase 1: Foundation" --body` with: the Phase 1 checklist, `Closes #2` (issue numbers are phase + 1), and a note that the Vercel preview link appears below. Verify CI is green and the Vercel bot posts a preview URL.

- [ ] **Step 5: Visual check.** On the preview URL at 1440×900, screenshot `/operations` (shell + placeholder) and `/about/components`. Compare buttons, fields, table, tabs, wizard steps and modal against `designs/Countersign Components.dc.html` and the handoff specs (`pnpm designs` → `http://localhost:4599`). Fix differences; commit.
- [ ] **Step 6: Deep-link check on the preview.** Open `<preview>/operations/agents/med-rec` directly and refresh; it must load (no Vercel 404).
- [ ] **Step 7: Update `docs/BUILD_PLAN.md`**: tick 1.1–1.10; Phase 1 → ⏸ At checkpoint; PR link; Latest preview URL; Phase 1 handoff notes (what exists, where, versions, gotchas, what Phase 2 needs); decision log; session log; Start here → "Next task: Phase 2, Task 2.0 (after Stefan approves Phase 1)". Commit and push.
- [ ] **Step 8: STOP. Ask Stefan to review** the preview URL and the PR. After approval: squash-merge (`gh pr merge --squash --delete-branch`), confirm production deploy on the Vercel URL, record the **Live URL** in Start here, set Phase 1 → ☑ Merged, commit to `main`.
