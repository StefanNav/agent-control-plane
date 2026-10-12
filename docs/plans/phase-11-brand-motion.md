# Phase 11: Brand motion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attune's four-pebble mark appears with the kit's "First hello" on the first landing visit of a session, and appears still in the prototype bar, About, the narrow-screen page and the tab icon.

**Architecture:**
- **Pure geometry** (`geometry.ts`) is ported from `reference/attune-motion-kit/attune-motion.js`. It includes only the pebble path and the rest, quiet and welcome poses, plus a `welcomeFrame(elapsed)` timeline that dances and then settles.
- **A still mark** (`AttuneMark`) renders those paths with token fills.
- **The animated mark** (`AttuneWelcome`) runs a `requestAnimationFrame` loop (`useWelcomeMotion`) that writes the four paths' attributes directly. It decides once, at mount, whether to dance. The deciding inputs are reduced motion, a once-per-session flag (`session.ts`) and a `hold` prop.
- **Location:** everything lives in `src/prototype/AttuneMark/`. The only design-system change is four tokens.

**Tech stack:** as Phase 10. No new dependencies.

**Spec:** [`docs/specs/2026-10-12-attune-brand-motion-design.md`](../specs/2026-10-12-attune-brand-motion-design.md). Read it first.

## Global Constraints

See `CLAUDE.md` and `docs/BUILD_PLAN.md` → Global constraints. Also:

- **Product screens don't change.** No file in `src/components`, `src/features` or `src/design-system/primitives` is touched. `SEED_VERSION` stays as it is, and the "AIMS" wordmark stays.
- **Colour comes only from tokens** (`--cs-mark-*`). The one exception is `public/favicon.svg`, a standalone file that carries sRGB hex, as it does today.
- **The mark is decorative everywhere:** `aria-hidden="true"`, `focusable="false"`, and no new copy. The bar link's accessible name stays "Attune · Agent Control Plane · Prototype".
- **No `Date.now()`.** Time comes from `requestAnimationFrame` timestamps only.
- **Never name the real company.** Run the forbidden-terms check (`CLAUDE.md`) before every push.
- **Every task:** `pnpm check` is green. Tasks 11.4 and 11.5 also need `pnpm e2e` green.

## Rulings

- **R1 Sizes:**
  - `AttuneMark`'s `size` is the mark's **width** in px. Its height is `size × 130 / 140`, and its viewBox is `-70 -65 140 130`.
  - `AttuneWelcome`'s `size` is the whole square footprint (default 140), with viewBox `-100 -100 200 200`.
- **R2 Tokens:**

  | Token | `:root` | `[data-theme="dark"]` |
  |---|---|---|
  | `--cs-mark-deep` | `var(--cs-acc)` | `oklch(0.74 0.12 268)` |
  | `--cs-mark-soft` | `oklch(0.7 0.1 268)` | `oklch(0.86 0.06 268)` |
  | `--cs-mark-deep-on-ink` | `oklch(0.74 0.12 268)` | (inherits) |
  | `--cs-mark-soft-on-ink` | `oklch(0.86 0.06 268)` | (inherits) |

  Pebbles 0 and 3 are deep; pebbles 1 and 2 are soft.
- **R3 Favicon:** the existing ink square (`#1c1b18`, `rx="6"`, 32 × 32) with the still mark centred at about 24 px wide. The deep pebbles are `#8aa8f7` and the soft ones `#c0d0f9`, the sRGB of the on-ink pair.
- **R4 Timing:**
  - `WELCOME_S = 2.25` and `SETTLE_S = 0.52`, so `WELCOME_TOTAL_S = 2.77`.
  - Each frame's step is capped at `0.05` s, and the first frame's step is 0.
- **R5 Session flag:** the key is `attune-welcomed` and the value is `'1'`, in `sessionStorage`, falling back to a module-level boolean when storage throws.
- **R6 Hooks for tests:**
  - `AttuneMark` renders `data-attune="mark"` and `data-tone`.
  - `AttuneWelcome` renders `data-attune="welcome"` and `data-state="dancing" | "still"`.
- **R7 Hold:** `Landing` passes `hold={useTourOpen()}`. `AttuneWelcome` never imports the tour.

## Review Focus

1. **StrictMode and remounts (dev double-mount, back navigation).** The first visit still dances. Leaving and coming back in the same session shows the still mark. *(11.3: render in `<StrictMode>` and expect `dancing`, then `still` after frames; a remount is `still`.)*
2. **Leaving mid-dance** (Play the tour at 1 s navigates away). The pending frame is cancelled, with no stray frames or errors. *(11.3: unmount at 1 s, then no frames are pending.)*
3. **Reduced motion or the tour opening mid-dance.** The pebbles jump to the rest pose in the DOM, not just in state. *(11.3: flip `hold` at 1 s, then every path's `transform` equals the rest transform.)*
4. **A background tab or a long frame gap** (timestamps seconds apart). The dance never skips to its end; it advances at most 50 ms per frame. *(11.3: two frames 5 s apart and it is still `dancing`.)*
5. **sessionStorage throws** (Safari private mode, blocked site data). Nothing crashes, and the dance plays once per page load. *(11.1: `session` with a throwing `sessionStorage`.)*

---

## Task 11.0: Plan and tracking

**Files:** this plan; `docs/BUILD_PLAN.md`.

- [x] **Step 1:** Commit this plan.
- [x] **Step 2:** In `docs/BUILD_PLAN.md`:
  - add Phase 11 to the overview table (`◐ In progress`, branch `phase-11-brand-motion`);
  - add a "Phase 11: Brand motion" section with tasks 11.0–11.5 (same shape as Phase 10);
  - point "Start here" at Phase 11 and task 11.1.
- [x] **Step 3:** Create the GitHub milestone and issue, then put the issue link in the overview row:

  ```bash
  gh api repos/StefanNav/agent-control-plane/milestones -f title="Phase 11: Brand motion"
  gh issue create --title "Phase 11: Brand motion" --milestone "Phase 11: Brand motion" --body "…"
  ```

  The issue body lists the five tasks and links the spec.
- [x] **Step 4:** Commit: `docs: Phase 11 plan and tracking`.

## Task 11.1: Geometry and the session flag

**Files:**
- Create: `src/prototype/AttuneMark/geometry.ts`, `src/prototype/AttuneMark/session.ts`
- Test: `src/prototype/AttuneMark/geometry.test.ts`, `src/prototype/AttuneMark/session.test.ts`

**Interfaces (produces):**

```ts
export type Pose = readonly [x: number, y: number, rotation: number, scale: number, circle: number, stretch: number]
export const PEBBLES = 4
export const WELCOME_S = 2.25, SETTLE_S = 0.52, WELCOME_TOTAL_S = 2.77, MAX_STEP_S = 0.05
export function isDeep(i: number): boolean               // i === 0 || i === 3
export function restPose(i: number): Pose                // [...HOME[i], 0, 1, 0, 1]
export function pebblePath(i: number, circle: number, stretch: number): string
export function transformOf(pose: Pose): string          // `translate(x y) rotate(r) scale(s)`
export function quietPose(t: number, i: number): Pose
export function welcomePose(t: number, i: number): Pose  // t clamped to [0, WELCOME_S]
export function settlePose(from: Pose, t: number, i: number): Pose
export function welcomeFrame(elapsed: number): Pose[]    // dance, then settle from welcomePose(WELCOME_S, i)
// session.ts
export function hasWelcomed(): boolean
export function markWelcomed(): void
export function forgetWelcomed(): void                   // tests only: clears storage key and fallback
```

**Porting the geometry:**
- `HOME`, `RADII`, `clamp`, `ease`, `mix`, `path`, `quiet` and the `welcome` branch of `pose` are ported verbatim from the kit, with the same expression order so the numbers match.
- `settlePose` is the kit's `complete` blend: `mix(from, rest(i), ease((t - i * 0.025) / 0.42))`.

- [x] **Step 1: Write the failing tests.**
  - In `geometry.test.ts`:
    - `the still mark matches the kit's symbol`:
      - import `reference/attune-motion-kit/assets/attune-symbol.svg?raw`;
      - parse each `<g transform="translate(x y)"><path d="…">`;
      - for each i, expect every number in `pebblePath(i, 0, 1)` to be `toBeCloseTo` the symbol path's numbers (9 places), and the translate to equal `restPose(i).slice(0, 2)`.
    - `the welcome starts at rest`: `welcomeFrame(0)[i]` is close to `restPose(i)` for all i.
    - `the dance hands over to the settle without a jump`: `welcomeFrame(WELCOME_S - 1e-6)[i]` is close to `welcomePose(WELCOME_S, i)` within 1e-3. `welcomePose(WELCOME_S, i)` equals `quietPose(0, i)`.
    - `the settle reaches rest`: `welcomeFrame(WELCOME_TOTAL_S)[i]` equals `restPose(i)` (close to 9 places) for all i.
    - `mid-dance the pebbles travel`: at `welcomeFrame(1.1)`, at least one pebble's x is more than 10 units from its rest x.
    - `transformOf` formats `restPose(0)` as `translate(-27.6 -25.35) rotate(0) scale(1)`.
  - In `session.test.ts`:
    - it starts unwelcomed, and `markWelcomed()` then makes `hasWelcomed()` true;
    - the flag lives in `sessionStorage['attune-welcomed'] === '1'`;
    - when `sessionStorage.getItem` and `setItem` throw (`vi.spyOn(Storage.prototype, …)`), `markWelcomed()` doesn't throw and `hasWelcomed()` is true.
    - `afterEach(forgetWelcomed)`.
- [x] **Step 2: Watch them fail.** Run `pnpm vitest run src/prototype/AttuneMark`. It should fail because the modules don't exist.
- [x] **Step 3: Implement** `geometry.ts` and `session.ts` to the interfaces above.
- [x] **Step 4: Watch them pass.** Run `pnpm vitest run src/prototype/AttuneMark`; it should pass. Then run `pnpm check`; it should be green.
- [x] **Step 5: Commit:** `feat(brand): the Attune mark's geometry and once-a-session flag`.

## Task 11.2: Tokens, the still mark and the tab icon

**Files:**
- Modify: `src/design-system/tokens.css`, `src/design-system/tokens.test.ts`, `public/favicon.svg`, `src/app/meta.test.ts`
- Create: `src/prototype/AttuneMark/AttuneMark.tsx`, `AttuneMark.module.css`, `index.ts`
- Test: `src/prototype/AttuneMark/AttuneMark.test.tsx`

**Interfaces:**
- **Consumes:** `pebblePath`, `restPose`, `transformOf` and `isDeep` from 11.1.
- **Produces:**

  ```ts
  export interface AttuneMarkProps { size: number; tone?: 'surface' | 'ink'; className?: string }
  export function AttuneMark(props: AttuneMarkProps): JSX.Element
  // index.ts re-exports AttuneMark and AttuneWelcome (after 11.3)
  ```

- [x] **Step 1: Write the failing tests.**
  - `tokens.test.ts`:
    - extend `LIGHT` with the four `:root` values from R2;
    - extend `DARK` with `--cs-mark-deep` and `--cs-mark-soft`.
  - `meta.test.ts`, new test `the tab icon is the Attune mark on ink`:
    - import `../../public/favicon.svg?raw`;
    - expect four `<path` elements, two with `fill="#8aa8f7"` and two with `fill="#c0d0f9"`, and a `rect` with `fill="#1c1b18"`.
  - `AttuneMark.test.tsx`:
    - `renders four decorative pebbles`: the `svg` has `aria-hidden="true"`, `focusable="false"`, `data-attune="mark"` and 4 `path`s; `width="14"` and `height="13"` for `size={14}`.
    - `deep and soft pebbles`: paths 0 and 3 carry the deep class and 1 and 2 the soft class (read `className`).
    - `tone`: the default is `data-tone="surface"`, and `tone="ink"` gives `data-tone="ink"`.
- [x] **Step 2: Watch them fail.**
- [x] **Step 3: Implement.**
  - Add the tokens to `tokens.css` under a comment: "The Attune mark (prototype layer): product indigo, and a pair for the ink prototype bar."
  - In `AttuneMark`, each path gets `d={pebblePath(i, 0, 1)}` and `transform={transformOf(restPose(i))}`.
  - The CSS module fills paths from the tokens, switching pairs on `[data-tone='ink']`. `display: inline-block`, `flex-shrink: 0`; no layout margins (callers place it with `className`).
  - Redraw `public/favicon.svg` to R3. Wrap the four paths in `<g transform="translate(16 16) scale(0.17)">`, then tune the scale so the mark is about 24 px wide inside the square.
- [x] **Step 4: Watch them pass.** `pnpm check` should be green.
- [x] **Step 5: Commit:** `feat(brand): the still Attune mark, its indigo tokens and the tab icon`.

## Task 11.3: The welcome

**Files:**
- Create: `src/prototype/AttuneMark/AttuneWelcome.tsx`, `useWelcomeMotion.ts`, `usePrefersReducedMotion.ts`
- Modify: `src/prototype/AttuneMark/index.ts`
- Test: `src/prototype/AttuneMark/AttuneWelcome.test.tsx`

**Interfaces:**
- **Consumes:** `welcomeFrame`, `restPose`, `pebblePath`, `transformOf`, `isDeep`, `WELCOME_TOTAL_S` and `MAX_STEP_S` (11.1); `hasWelcomed` and `markWelcomed` (11.1); the `AttuneMark.module.css` fill classes (11.2).
- **Produces:**

  ```ts
  export function usePrefersReducedMotion(): boolean   // useSyncExternalStore on '(prefers-reduced-motion: reduce)'; false without matchMedia
  export function useWelcomeMotion(paths: RefObject<(SVGPathElement | null)[]>, hold: boolean): 'dancing' | 'still'
  export interface AttuneWelcomeProps { size?: number; hold?: boolean }   // size defaults to 140, hold to false
  export function AttuneWelcome(props: AttuneWelcomeProps): JSX.Element
  ```

**Behaviour of `useWelcomeMotion`:**
- **Initial decision:** made in a **pure** `useState` initializer as `!hold && !reduced && !hasWelcomed()`. It must not write anything: React calls the initializer twice under StrictMode.
- **Leaving the dance:** if `hold` or `reduced` becomes true while dancing, set `still`.
- **The loop** is a `useLayoutEffect` keyed on `state === 'dancing'`. On start it calls `markWelcomed()` and requests a frame. Each frame:
  - `step = prev ? min((now - prev) / 1000, MAX_STEP_S) : 0`;
  - `elapsed += step`;
  - write `d` and `transform` from `welcomeFrame(elapsed)`;
  - once `elapsed >= WELCOME_TOTAL_S`, set `still` and stop.
- **Cleanup** cancels the frame and writes the rest pose to every path. It runs when the dance ends, holds or unmounts. The rest pose has to be written directly because React's props never changed, so React won't rewrite the attributes.
- **Rendering:** the paths render the rest pose as React props. Only the loop moves them.

- [x] **Step 1: Write the failing tests** in `AttuneWelcome.test.tsx`.
  - Fake `requestAnimationFrame` and `cancelAnimationFrame` as in `src/prototype/tour/VoiceLevel.test.tsx`, but `nextFrame(at: number)` passes an explicit timestamp in ms.
  - Stub `matchMedia` as in `DesktopGate.test.tsx`.
  - `afterEach(forgetWelcomed)`.
  - The tests:
    - `dances on the first visit, then rests and stops asking for frames`:
      - after the first render, `data-state="dancing"`;
      - after frames every 16 ms up to 2800 ms, `data-state="still"`, no frames are pending, and every path's `transform` equals `transformOf(restPose(i))`.
    - `mid-dance the pebbles move`: at 1100 ms at least one path's `transform` differs from its rest transform.
    - `plays once a session`: unmount after the dance, render again, and it is `still` with no frames requested.
    - `under StrictMode the first visit still dances`: wrap in `<StrictMode>` and expect `dancing`, then `still` after frames to 2800 ms.
    - `reduced motion keeps it still and asks for no frame`: `matches: true` gives `still` and zero `requestAnimationFrame` calls.
    - `hold keeps it still`: `hold` gives `still` and no frames.
    - `hold mid-dance jumps to rest`: rerender with `hold` at 1000 ms, then `still`, every path at rest, and no frames pending.
    - `leaving mid-dance cancels the frame`: unmount at 1000 ms and no frames are pending.
    - `a long gap never skips the dance`: frames at 0, 16 and 5016 ms and it is still `dancing`.
    - `decorative`: the svg has `aria-hidden="true"` and `data-attune="welcome"`; `width` and `height` are `140` by default.
- [x] **Step 2: Watch them fail.**
- [x] **Step 3: Implement** the three files to the interfaces and behaviour above, and export `AttuneWelcome` from `index.ts`.
- [x] **Step 4: Watch them pass.** `pnpm check` should be green.
- [x] **Step 5: Commit:** `feat(brand): First hello, once a session, still under reduced motion or the tour`.

## Task 11.4: Placements

**Files:**
- Modify:
  - `src/prototype/Landing/Landing.tsx` and `Landing.module.css`
  - `src/prototype/PrototypeBar/PrototypeBar.tsx` and `PrototypeBar.module.css`
  - `src/prototype/About/About.tsx` and `About.module.css`
  - `src/prototype/DesktopGate/DesktopGate.tsx` and `DesktopGate.module.css`
- Test:
  - `Landing.test.tsx`, `PrototypeBar.test.tsx`, `About.test.tsx`, `DesktopGate.test.tsx`
  - `tests/e2e/landing.spec.ts`

**Interfaces:**
- **Consumes:** `AttuneMark` (11.2), `AttuneWelcome` (11.3), and `useTourOpen` (`src/prototype/tour/useTour.ts`).

- [x] **Step 1: Write the failing unit tests.**
  - `Landing`:
    - `the hero carries the Attune welcome`: `[data-attune="welcome"]` exists.
    - `with the tour open the welcome holds still`: open the tour first with `runtime.player.getState().open(0, false)`; the welcome then has `data-state="still"`.
    - Stub `requestAnimationFrame` in this file's `beforeEach`, and add `afterEach(forgetWelcomed)`.
  - `PrototypeBar`: the link is still named `Attune · Agent Control Plane · Prototype`, and contains `[data-attune="mark"][data-tone="ink"]`.
  - `About`: `[data-attune="mark"]` is in the header.
  - `DesktopGate`: when narrow, `[data-attune="mark"]` is shown.
- [x] **Step 2: Write the failing e2e tests** in `landing.spec.ts`:

  ```ts
  test('the Attune mark welcomes once a session, then rests', async ({ page }) => {
    await page.goto('/')
    const mark = page.locator('[data-attune="welcome"]')
    await expect(mark).toHaveAttribute('aria-hidden', 'true')
    await expect(mark).toHaveAttribute('data-state', 'still', { timeout: 4000 })
    await page.reload()
    await expect(mark).toHaveAttribute('data-state', 'still')
  })
  test('under reduced motion the mark is still from the start', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('[data-attune="welcome"]')).toHaveAttribute('data-state', 'still')
  })
  ```

  The existing gate test also asserts `page.locator('[data-attune="mark"]')` is visible at 800 px. A new test asserts the bar's mark on `/operations`.
- [x] **Step 3: Implement.**
  - **Landing:** wrap the intro `section` and `<div className={styles.mark}><AttuneWelcome hold={useTourOpen()} /></div>` in `<div className={styles.hero}>`. Lay out `.hero` as `display: grid; grid-template-columns: minmax(0, 720px) 140px; justify-content: space-between; align-items: start; gap: 24px`.
  - **PrototypeBar:** `<AttuneMark size={14} tone="ink" className={styles.mark} />` as the link's first child, with `.mark { vertical-align: -2px; margin-right: 8px }`. **Keep `.brand` inline:** as a flex container it would trim the space before "Prototype".
  - **About:** wrap the mono line as `<span className={styles.brand}><AttuneMark size={16} /><span className={type.mono}>…</span></span>`, with `.brand { display: flex; align-items: center; gap: 8px }`.
  - **DesktopGate:** put `<AttuneMark size={32} />` above the mono line.
- [x] **Step 4: Watch them pass.**
  - `pnpm check` is green.
  - `pnpm e2e` is green: the whole suite, including the tour specs and `a11y.spec`.
- [x] **Step 5: Do a visual pass.** Start `pnpm dev` and screenshot at 1440 and 1024 px:
  - the landing mid-dance (about 1 s) and settled;
  - the bar on `/operations`;
  - About;
  - the gate at 800 px.

  Then tune `.mark`'s top offset so the resting mark lines up with the H1.
- [x] **Step 6: Commit:** `feat(brand): the welcome on the landing, the still mark in the bar, About and the gate`.

## Task 11.5: Phase checkpoint

- [x] **Step 1: Review.** Request a whole-branch code review (superpowers:requesting-code-review) against the spec and this plan. Fix anything Critical or Important, test-first.
- [x] **Step 2: Update `docs/BUILD_PLAN.md`:**
  - tick 11.0–11.5;
  - write the Phase 11 handoff notes;
  - add decision-log rows (the four listed in spec §6) and a session-log row;
  - set "Start here" to "Phase 11 at checkpoint".
- [x] **Step 3: Push and open the PR.**
  - The forbidden-terms check prints nothing.
  - `git push -u origin phase-11-brand-motion`.
  - Open the PR "Phase 11: Brand motion" (closes the issue), with the task checklist, the Vercel preview URL and screenshots.
- [x] **Step 4: STOP.** Ask Stefan to review the preview: the landing in Chrome and Safari, a reload, reduced motion on, the bar, About, the gate and the tab icon. Merge only after he approves.
