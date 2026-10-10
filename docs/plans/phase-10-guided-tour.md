# Phase 10: Guided tour

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A narrated tour that plays the prototype by itself: Stefan's recorded voice, a cursor that clicks real controls, cards that show the decisions and the work behind each screen, and a player bar the visitor can pause, skip and take over.

**Architecture:**
- **The tour is data** (`src/prototype/tour/script.ts`): chapters → steps (one screen, one moment, one person) → beats (one sentence + the actions that fire when it starts).
- **A pure engine** (`engine.ts`) does navigation, timing and URL decisions. **A player store** (`player.ts`, Zustand, not persisted) runs beats: a beat ends when its clip **and** its actions are done. Every step loads its own scenario on entry, so steps are self-contained.
- **Actions drive the real DOM** through `data-story-target` (`actions.ts`); the real dialogs and store actions run.
- **Voice** is an interface: real audio clips, or a silent timer voice for tests (`?tourVoice=silent`).
- **Audio** comes from a manifest (`public/tour/audio/manifest.json`) written by `pnpm tour:audio` (placeholders from macOS `say`), then replaced clip by clip from a dev-only recording page.

**Tech stack:** as Phase 9. No new dependencies. Node scripts load TypeScript modules through Vite's `ssrLoadModule`; audio and images go through `ffmpeg` (installed via Homebrew; no WebP encoder, so images are JPEG).

**Spec:** [`docs/specs/2026-10-09-guided-tour-design.md`](../specs/2026-10-09-guided-tour-design.md). Read it first; this plan argues from it.

## Global Constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- **The real company name never appears** in any file, image or clip. Run the forbidden-terms check (`CLAUDE.md`) before every push. Images are viewed before they leave `reference/tour-inbox/` (git-ignored).
- **Brand is Attune** from Task 10.12 on; the top-nav wordmark stays **AIMS** (Stefan, 2026-10-09).
- **Product screens change only by gaining `data-story-target` attributes** (and the `AppShell` mount in 10.6). `SEED_VERSION` stays 8; no seed or `DemoState` changes.
- **Colour:** indigo only for Play/Pause, "Resume tour" and a decision card's chosen dot; ink for the cursor, ring and outline; no teal, amber or red in the tour layer. No gradients, emoji or display type. IBM Plex Sans/Mono, weights 400 and 600.
- **Narration:** first person (Stefan), people named, no he/she/him/her/his/hers (the stories' `GENDERED` regex); numbers, names and dates match the step's screen.
- **No `Date.now()`.** Durations come from the manifest; the player times beats from voice promises.
- **Layering:** the tour lives in `src/prototype/tour/`; it reads the store through `useDemo` actions only (`loadScenario`, `setPersona`, `reset`) and never writes product state except through the real UI.
- Every task: `pnpm check` green; tasks that touch the browser also `pnpm e2e` green.

## Rulings (record in the BUILD_PLAN decision log when the task lands)

- **R1 Chapter ids** (script approved 2026-10-09, the hybrid flow): `open`, `problem`, `people`, `onboarding`, `earning-trust`, `supervising`, `step-down`, `decisions`, `process`, `validate`, `close`. A step may span screens reached by its own click actions; Resume restarts it from its route.
- **R2 Positions are 0-based** `{ chapter, step, beat }`; the URL carries only the chapter (`?tour=decisions`).
- **R3 Timing values:** silent voice = manifest ms ÷ 10; missing manifest entry = `estimateMs(text)` = `max(1500, words × 400)`; action target wait 2000 ms then skip; cursor glide 600 ms ÷ rate; typing 25 ms per character ÷ rate; rates 1, 1.25, 1.5.
- **R4 The bar** is 88 px tall, full width, z-index 60, `--cs-raised`, top border `--cs-line-strong`; the shell adds 88 px under `<main>` while the tour is open. Cards are 320 px wide, 24 px from the viewport edge, bottom at least 24 px above the bar.
- **R5 Exit and end** call `reset()` (seed, clock, Marcus) and drop `?tour`; if the current step's route is an interlude (`/tour/…`) they go to `/`, otherwise the visitor stays on the route. The last chapter runs on `/`, so ending stays there.
- **R6 Every step entry** loads its scenario (even if already loaded), switches persona, navigates, and increments `stepKey`; `AppShell` keys the outlet by `stepKey`, so local UI (an open dialog) never survives a step entry.
- **R7 Images** are JPEG (ffmpeg `-q:v 3`), max 1600 px wide, metadata stripped, in `public/tour/artifacts/`. The spec said WebP; the local ffmpeg has no WebP encoder.
- **R8 The recording page** is a vanilla HTML page at `/__tour/recorder`, served by a Vite plugin with `apply: 'serve'`, with JSON endpoints under `/__tour/`. "Hear it inside its step" = a link that opens its chapter in the tour (`/?tour=<chapter>`).
- **R9 The manifest is imported statically** into the bundle (`import manifest from '…/manifest.json'`), so the timeline is known at load.

## Review Focus

The failure modes most likely to bite a reviewer that no screen-level test naturally covers. Each has its test in the owning task.

1. **A clip fails to load or the browser blocks audio** (network, Safari, a missing file) → the beat still ends after its manifest duration, captions keep going, the tour never stalls. *(10.4: `createAudioVoice` resolves on `error` after ms ÷ rate.)*
2. **Rapid clicking** (Next three times, Play twice, a chapter jump mid-beat) → one runner, ending on the last requested position; earlier actions are aborted, never half-applied on the next screen. *(10.5: rapid `next()` test with an action log.)*
3. **Taking over leaves the screen dirty** (the visitor opens a dialog or switches persona, then presses Resume tour) → the step restarts clean: no stray dialog, its persona and scenario back. *(10.5 unit: resume re-enters; 10.7 e2e: open Controls → Resume → no dialog.)*
4. **The tab is hidden or the window drops below 1024 px mid-tour** → the tour pauses; audio never plays on with nothing on screen. *(10.6: `visibilitychange` → paused; unmounting `TourLayer` stops the voice.)*
5. **A shared `?tour=` link opened on a browser with old saved demo state** (an agent the visitor retired, a persona switched) → the chapter opens on its own scenario and person; unknown chapter ids are stripped. *(10.2: `tourUrlAction`; 10.5: entry loads the scenario regardless of current state; 10.7 e2e: deep link after a retire.)*

---

## Review checkpoints for Stefan

The tour is reviewed while it grows, not only at the end. Each **CHECKPOINT** is a stop: report, link, wait for Stefan's go-ahead.

| Checkpoint | After | Stefan reviews | Blocks |
|---|---|---|---|
| **A · Script** | 10.1 | `docs/tour/script.md`: wording, order, length | Encoding beats (10.7 onward). 10.2–10.6 go ahead in parallel |
| **B · First chapter plays** | 10.7 | The cold open on a preview URL, placeholder voice: pacing, cursor, bar, captions | 10.8 onward |
| **C · Whole tour, placeholder voice** | 10.11 | Every chapter, every card and exploration image, on the preview | Landing, rename and recording |
| **D · Real voice** | 10.14 | The tour in Stefan's voice; lines to re-record | Case study and launch |
| **E · Phase checkpoint** | 10.16 | The PR and preview (BUILD_PLAN protocol) | **Merge** |

---

### Task 10.0: Plan and tracking

**Files:** Create `docs/plans/phase-10-guided-tour.md` (this file). Modify `docs/BUILD_PLAN.md` (Start here, phase overview row 10, Phase 10 section, decision log, session log).

- [x] **Step 1:** Write this plan.
- [x] **Step 2:** Add Phase 10 to `docs/BUILD_PLAN.md`: Start here (current phase 10, branch `phase-10-guided-tour`, next task), a row in Phase overview, a "Phase 10: Guided tour" section with this plan's task list, decision-log rows (tour T1–T11, Attune, AIMS kept), a session-log row.
- [x] **Step 3:** With Stefan's OK, create GitHub milestone "Phase 10: Guided tour" and issue #20 ("Phase 10: Guided tour", body = the task list), label `phase-10`. Run the forbidden-terms check on the body first.
- [x] **Step 4:** Commit: `docs: Phase 10 plan`.

### Task 10.1: Script draft — **CHECKPOINT A**

**Files:** Create `docs/tour/script.md`.

- [x] **Step 1:** Draft about 1,000 words in Stefan's voice: conversational, story first, little jargon (explain "privilege", "shadow", "hard stop" in plain words the first time). One sentence per line, numbered per chapter; actions in `[brackets]`; each chapter headed with its screen, date and person. Facts from the story scripts (Phase 8 plan), the research notes, the explorations handoff.
- [x] **Step 2:** Run the forbidden-terms check on the file and the `GENDERED` regex over the narration lines.
- [x] **Step 3:** Commit: `docs: tour script draft`.
- [x] **Step 4: CHECKPOINT A.** Stefan edits the wording and may reorder chapters. Record the approved order in this plan's "Running order" note below and in spec §3 if it changed.

**Running order:** approved 2026-10-09: the hybrid flow in `docs/tour/script.md` (spec §3).

### Task 10.2: Types, engine and text hash

**Files:**
- Create: `src/prototype/tour/types.ts`, `src/prototype/tour/engine.ts`, `src/prototype/tour/hash.ts`, `src/prototype/tour/fixtures.ts` (a 2-chapter, 3-step test tour), `src/prototype/tour/engine.test.ts`, `src/prototype/tour/hash.test.ts`

**Interfaces:**
- Produces (`types.ts`): `ChapterId` (R1), `TourAction`, `Beat`, `TourStep`, `Chapter` exactly as spec §5.1; `Position { chapter: number; step: number; beat: number }`; `ManifestEntry { ms: number; source: 'placeholder' | 'recorded'; textHash: string }`; `Manifest = Record<string, ManifestEntry>`; `Timeline { total: number; chapterStartMs: number[]; beatStartMs: Record<string, number>; beatMs: Record<string, number> }`.
- Produces (`engine.ts`):
  - `beatAt(chapters: Chapter[], pos: Position): Beat`, `stepAt(chapters, pos): TourStep`
  - `chapterStart(chapterIndex: number): Position`
  - `nextStep(chapters, pos): Position | null`, `prevStep(chapters, pos): Position | null` (both land on beat 0; `prevStep` on step 0 of chapter 0 is `null`)
  - `nextBeat(chapters, pos): Position | null` (crosses steps and chapters)
  - `enterStep(step: TourStep): { load: ScenarioId | null; persona: PersonaId | null; route: string }`
  - `estimateMs(text: string): number` (R3)
  - `buildTimeline(chapters, manifest: Manifest): Timeline`
  - `elapsedMs(timeline, chapters, pos, intoBeatMs: number): number`
  - `tourUrlAction(params: URLSearchParams, chapters): { kind: 'none' } | { kind: 'strip' } | { kind: 'open'; chapter: number }`
  - `isInterlude(route: string): boolean` (`/tour/` prefix)
- Produces (`hash.ts`): `textHash(text: string): string`: FNV-1a 32-bit over the text with runs of whitespace collapsed and ends trimmed, as 8 lowercase hex digits.

- [x] **Step 1: Write the failing tests** (`engine.test.ts`, on `fixtures.ts`):
  - `nextStep` from the last step of chapter 0 → `{ chapter: 1, step: 0, beat: 0 }`; from the last step of the last chapter → `null`.
  - `prevStep({0,0,2})` → `null`; `prevStep({1,0,1})` → last step of chapter 0, beat 0.
  - `nextBeat` crosses a step boundary and a chapter boundary.
  - `enterStep` of an interlude step → `{ load: null, persona: null, route: '/tour/why' }`; of a product step → its scenario, persona and route.
  - `buildTimeline` with a manifest missing one beat uses `estimateMs`; `total` = sum of beats; `chapterStartMs[1]` = sum of chapter 0's beats.
  - `estimateMs('one two three')` = 1500; a 10-word line = 4000.
  - `tourUrlAction`: no `tour` → none; `tour=decision-1` → open at that chapter's index; `tour=nope` → strip; `tour=` (empty) → strip.
- [x] **Step 2:** Run `pnpm vitest run src/prototype/tour` — expect FAIL (modules missing).
- [x] **Step 3:** Write `hash.test.ts`: `textHash('a  b ')` equals `textHash('a b')`; two different lines differ; result matches `/^[0-9a-f]{8}$/`.
- [x] **Step 4:** Implement `types.ts`, `engine.ts`, `hash.ts`, `fixtures.ts`.
- [x] **Step 5:** Run `pnpm vitest run src/prototype/tour` — expect PASS. Run `pnpm check`.
- [x] **Step 6:** Commit: `feat: tour engine and types`.

### Task 10.3: Manifest, placeholder audio and script printer

**Files:**
- Create: `src/prototype/tour/script.ts` (`export const CHAPTERS: Chapter[] = []` for now), `src/prototype/tour/manifest.ts`, `src/prototype/tour/manifest.test.ts`, `public/tour/audio/manifest.json` (`{}`), `scripts/tour-load.mjs`, `scripts/tour-audio.mjs`, `scripts/tour-print.mjs`
- Modify: `package.json` (scripts `tour:audio`, `tour:script`)

**Interfaces:**
- Consumes: `Chapter`, `Manifest` (10.2), `textHash` (10.2).
- Produces: `MANIFEST: Manifest` and `clipUrl(beatId: string): string` (`/tour/audio/<id>.m4a`) from `manifest.ts`; `loadTour(): Promise<{ CHAPTERS: Chapter[]; textHash: (s: string) => string }>` from `scripts/tour-load.mjs` (Vite `createServer({ appType: 'custom', server: { middlewareMode: true } })` + `ssrLoadModule`, closed after use).

- [x] **Step 1:** Write `manifest.test.ts`: `clipUrl('cold-1')` = `'/tour/audio/cold-1.m4a'`; `MANIFEST` is an object.
- [x] **Step 2:** Run it — FAIL. Implement `manifest.ts`. Run — PASS.
- [x] **Step 3:** Implement `scripts/tour-audio.mjs`. For each beat in order:
  - recorded clip present → keep it; if its `textHash` differs from the line's, report it as **out of date**;
  - otherwise (no entry, placeholder, or file missing) → `say -o <tmp>.aiff "<text>"`, then `ffmpeg -y -i <tmp>.aiff -af loudnorm=I=-16:TP=-1.5:LRA=11 -ac 1 -c:a aac -b:a 64k -map_metadata -1 public/tour/audio/<id>.m4a`, entry `source: 'placeholder'`;
  - duration of every clip from `ffprobe -v error -show_entries format=duration -of csv=p=0`, rounded to ms;
  - delete clips and entries for beat ids no longer in the script; write the manifest with keys in script order, 2-space JSON;
  - `--check` flag: write nothing, exit 1 if any beat is placeholder, missing or out of date (used in 10.14 and 10.16).
  - Print a summary: `N beats · R recorded · P placeholder · O out of date · total m:ss`.
- [x] **Step 4:** Implement `scripts/tour-print.mjs`: prints `CHAPTERS` as Markdown (chapter title, step route/scenario/persona, one line per beat with its actions in brackets) to stdout, so `pnpm tour:script > docs/tour/script.md` regenerates the readable script once beats are the source.
- [x] **Step 5:** Add `"tour:audio": "node scripts/tour-audio.mjs"`, `"tour:script": "node scripts/tour-print.mjs"`. Run `pnpm tour:audio` — expect `0 beats … total 0:00` and `{}` unchanged.
- [x] **Step 6:** `pnpm check`. Commit: `feat: tour audio manifest and placeholder pipeline`.

### Task 10.4: Voice and action runner

**Files:**
- Create: `src/prototype/tour/voice.ts`, `src/prototype/tour/voice.test.ts`, `src/prototype/tour/actions.ts`, `src/prototype/tour/actions.test.ts`

**Interfaces:**
- Consumes: `Manifest`, `TourAction` (10.2); `clipUrl` (10.3).
- Produces (`voice.ts`):
  - `interface Voice { play(beatId: string): Promise<void>; pause(): void; resume(): void; stop(): void; setRate(rate: number): void; currentMs(): number; preload(beatId: string): void }`
  - `createAudioVoice(msFor: (beatId: string) => number, url: (beatId: string) => string): Voice`: one `HTMLAudioElement`, `preservesPitch = true`, a second element for `preload`; `play` resolves on `ended`, or on `error`/rejected `play()` after `msFor(id) ÷ rate` (Review focus 1); `stop` resolves the pending promise.
  - `createSilentVoice(msFor: (beatId: string) => number, factor = 10): Voice`: timers that honour pause/resume with the remaining time.
- Produces (`actions.ts`):
  - `interface ActionHost { setOutline(target: string | null): void; setCard(card: { id: string; side: 'left' | 'right' } | null): void; moveCursor(x: number, y: number, click: boolean): Promise<void>; rate(): number; reducedMotion(): boolean }`
  - `findTarget(target: string, signal: AbortSignal, timeoutMs = 2000, doc = document): Promise<HTMLElement | null>` (polls each animation frame)
  - `typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string, perCharMs: number, signal: AbortSignal): Promise<void>` (native value setter from the element's prototype, then a bubbling `input` event, per character; whole text at once when `perCharMs` is 0)
  - `cardSide(targetRect: DOMRect | null, viewportWidth: number, override?: 'left' | 'right'): 'left' | 'right'` (override wins; target centre right of the middle → `'left'`; no target → `'right'`)
  - `runActions(actions: TourAction[], host: ActionHost, signal: AbortSignal): Promise<{ skipped: string[] }>`: in order; `outline` sets it and scrolls the target into view; `click` moves the cursor to the target's centre (`click: true`) then calls `el.click()`; `type` moves, clicks to focus, types at 25 ms ÷ rate (0 under reduced motion); `card` resolves the side from the current outline's rect; `wait` sleeps ms ÷ rate; a missing target is skipped, pushed to `skipped` and `console.warn`ed; abort stops at the next await.

- [x] **Step 1: Write the failing tests.**
  - `voice.test.ts` (fake timers, stubbed `HTMLMediaElement.prototype.play/pause`): silent voice resolves after ms ÷ 10; pause holds it, resume finishes the remainder; audio voice resolves on the `ended` event; on an `error` event it resolves after `msFor ÷ rate`; `stop()` resolves a pending play.
  - `actions.test.ts`: `click` on a rendered `<button data-story-target="x">` calls `moveCursor(…, true)` before the click handler runs; `type` into a React-controlled `<input data-story-target="r">` (rendered with Testing Library) ends with the component's state equal to the text; a missing target resolves after 2000 ms (fake timers) with `skipped: ['click:nope']` and one `console.warn`; aborting the signal mid-`wait` stops before the next action; `cardSide` cases: right-half target → left, left-half → right, null → right, override → override.
- [x] **Step 2:** Run `pnpm vitest run src/prototype/tour` — FAIL.
- [x] **Step 3:** Implement `voice.ts` and `actions.ts`.
- [x] **Step 4:** Run — PASS. `pnpm check`.
- [x] **Step 5:** Commit: `feat: tour voice and action runner`.

### Task 10.5: Player

**Files:**
- Create: `src/prototype/tour/player.ts`, `src/prototype/tour/player.test.ts`

**Interfaces:**
- Consumes: engine (10.2), `Voice` and `runActions`/`ActionHost` (10.4).
- Produces:
  - `type TourStatus = 'idle' | 'playing' | 'paused' | 'driving' | 'ended'`
  - `interface PlayerDeps { chapters: Chapter[]; timeline: Timeline; voice: Voice; demo: { loadScenario(id: ScenarioId): void; setPersona(id: PersonaId): void; reset(): void }; navigate(to: string): void; exitStory(): void; run: typeof runActions; host: () => ActionHost }`
  - `interface TourState { status: TourStatus; pos: Position; rate: 1 | 1.25 | 1.5; captions: boolean; outline: string | null; card: { id: string; side: 'left' | 'right' } | null; cursor: { x: number; y: number; visible: boolean; click: boolean }; stepKey: number; skipped: string[] }`
  - `interface TourControls { open(chapter: number, autoplay: boolean): void; play(): void; pause(): void; takeOver(): void; resume(): void; next(): void; prev(): void; jump(chapter: number): void; setRate(rate: 1 | 1.25 | 1.5): void; toggleCaptions(): void; exit(): void }`
  - `createTourPlayer(deps: PlayerDeps): UseBoundStore<StoreApi<TourState & TourControls>>`
- Behaviour: entering a step = `exitStory()` on first open, `loadScenario` (always, R6), `setPersona`, `navigate(route)`, `stepKey + 1`, clear outline and card. A beat = `Promise.all([voice.play(id), run(actions, host, signal)])`; then `nextBeat`; a step change re-enters; no next beat = end (R5). Each entry or navigation aborts the previous run (one `AbortController` per run; a run checks its token before every state write).

- [x] **Step 1: Write the failing tests** (fake voice whose `play` returns controllable promises; fake demo, navigate, run that records calls; `fixtures.ts`):
  - `open(0, false)`: status `paused`, `loadScenario` called with step 0's scenario even when the fake demo already reports that scenario (Review focus 5), `setPersona`, `navigate` with its route, `stepKey` 1, `exitStory` called once.
  - `play()`: beat 0's voice and actions start together; resolving the voice alone does not advance; resolving both advances to beat 1.
  - Crossing a step boundary re-enters (second `loadScenario`, `stepKey` 2).
  - Finishing the last beat: `reset()` called, status `idle`, `navigate('/')` when the last step's route is an interlude (R5).
  - `takeOver()` while playing → `driving`, `voice.pause` called, cursor hidden; `resume()` → re-enters the same step (scenario reloaded, `stepKey` + 1) and plays from beat 0 (Review focus 3).
  - Rapid `next(); next(); next()` while playing → position is three steps on; the runs started by the first two are aborted (their signals `aborted`), and only the last step's actions were recorded after the third call (Review focus 2).
  - `jump(1)` → chapter 1 step 0 beat 0, entered; `setRate(1.5)` → `voice.setRate(1.5)`; `exit()` → `reset()`, `voice.stop()`, status `idle`.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Implement `player.ts`.
- [x] **Step 4:** Run — PASS. `pnpm check`.
- [x] **Step 5:** Commit: `feat: tour player`.

### Task 10.6: Tour layer, bar, cursor and cards

**Files:**
- Create: `src/prototype/tour/useTour.ts`, `src/prototype/tour/cards.ts`, `src/prototype/tour/TourLayer.tsx`, `src/prototype/tour/TourBar.tsx`, `src/prototype/tour/TourBar.module.css`, `src/prototype/tour/TourCursor.tsx`, `src/prototype/tour/TourCard.tsx`, `src/prototype/tour/TourCard.module.css`, `src/prototype/tour/TourBar.test.tsx`, `src/prototype/tour/TourLayer.test.tsx`
- Modify: `src/app/AppShell.tsx` (render `<TourLayer />` beside `<StoryLayer />`; key the outlet's wrapper by `stepKey` while the tour is open; add the 88 px spacer), `src/prototype/StoryPanel/StoryLayer.tsx` (render nothing while the tour is open)

**Interfaces:**
- Consumes: player (10.5), voice and actions (10.4), manifest (10.3), engine (10.2), `useDemo`, `useStory` (`exit`), `scrollDelta` (`src/prototype/StoryPanel/scroll.ts`), `Menu`, `Button`, `VisuallyHidden`.
- Produces:
  - `useTour`: the app's single player, created lazily with real deps (`createAudioVoice`, or `createSilentVoice` when the URL has `tourVoice=silent`); its `navigate` dep forwards to a router `navigate` that `TourLayer` binds on mount with `bindNavigate(fn: (to: string) => void): () => void` (returns the unbind); `useTourOpen(): boolean` (status ≠ `idle`).
  - `cards.ts`: `type TourCard = { kind: 'decision'; n: 1 | 2 | 3; title: string; options: { label: string; chosen?: boolean }[]; tradeoff: string } | { kind: 'excerpt'; quote: string; source: string } | { kind: 'story'; epic: string; story: string; criterion: string } | { kind: 'image'; src: string; alt: string; caption: string }`; `CARDS: Record<string, TourCard>` (empty here; chapters add theirs).
  - `TOUR_BAR_HEIGHT = 88`.
- UI, per spec §4.2–4.6 and R4:
  - Bar: `<aside aria-label="Tour" data-modal-companion>`; caption row (hidden when captions are off); controls row: "Play tour"/"Pause tour" (`Button variant="primary"`), chapter `Menu` trigger `"{n} · {title} ▾"` (items: title, start time, "Decision n" sub-label), one progress segment per chapter (`button`, `aria-label="Go to chapter {n}: {title}"`, filled share in ink-2), `m:ss / m:ss` in mono, speed button cycling `1×` → `1.25×` → `1.5×`, "Captions" toggle (`aria-pressed`), "Exit tour" ghost button. Driving: "Paused. You’re driving." and a primary "Resume tour". A `VisuallyHidden role="status"` announces the chapter title when the chapter changes.
  - Cursor: fixed overlay, `pointer-events: none`, 20 px ink arrow and a 26 px ink ring on click; `transform` transition 600 ms ÷ rate, none under reduced motion; hidden unless playing.
  - Card: fixed, 320 px, side from state, kinds rendered per spec §4.3; an image card's thumbnail opens a `Modal` with the full image when the tour is paused.
  - Outline: one `<style>` rule for `[data-story-target="…"]`, as `StoryPanel`, with the target scrolled clear of the bar.
  - Listeners (in `TourLayer`): URL sync with `tourUrlAction` (open paused; strip; while open, re-add `?tour=<chapter-id>` with `replace` when a product link drops it); Space toggles play/pause and ←/→ step when focus is on `body`, `main` or inside the bar; a capture-phase `pointerdown` outside the bar and card while playing → `takeOver()`; `keydown` inside a form field or control in `<main>` while playing → `takeOver()`; `visibilitychange` to hidden → `pause()`; unmount → `voice.stop()`.
- [x] **Step 1: Write the failing tests.**
  - `TourBar.test.tsx`: renders "Play tour" when paused and "Pause tour" when playing; driving shows "Paused. You’re driving." and "Resume tour"; ten progress segments with their labels; speed cycles through the three labels; captions toggle hides the caption line.
  - `TourLayer.test.tsx` (MemoryRouter, fixtures, silent voice): `/?tour=<chapter>` opens paused at that chapter; `?tour=nope` is stripped; Space on `body` starts playing; a `pointerdown` on `main` while playing → `driving`; `document.visibilityState = 'hidden'` + `visibilitychange` → `paused` (Review focus 4); unmounting calls the voice's `stop`; `StoryLayer` renders nothing while the tour is open.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Implement the files and the `AppShell` / `StoryLayer` changes.
- [x] **Step 4:** Run — PASS. `pnpm check`; `pnpm e2e` (existing suites unaffected).
- [x] **Step 5:** Commit: `feat: tour bar, cursor and cards`.

### Task 10.7: Opening chapter (vertical slice) — **CHECKPOINT B**

**Files:**
- Modify: `src/prototype/tour/types.ts` (`ChapterId` = R1's eleven ids), `src/prototype/tour/fixtures.ts` and the tests that name old ids (use new ids; behaviour unchanged), `src/prototype/tour/script.ts` (chapter `open` from `docs/tour/script.md`); add `data-story-target` to the Medications row link on the hospital board (`board-medications`, `src/features/board/HospitalBoard.tsx`) and the Med Rec row link on the division view (`division-med-rec`, `src/features/board/DivisionView.tsx`)
- Create: `src/prototype/tour/script.test.ts`, `tests/e2e/tour.spec.ts`
- Generate: `public/tour/audio/*.m4a` and `src/prototype/tour/manifest.json` via `pnpm tour:audio`

**Encoding `open`:** one step, route `/operations`, scenario `baseline`, persona `marcus`; beats `open-1` … `open-7`, text verbatim from the script's spoken lines (without the brackets). Actions: `open-1` outline `board-divisions`; `open-2` click `board-medications`; `open-3` click `division-med-rec`; `open-4` outline `agent-summary`; `open-5`…`open-7` none.

- [x] **Step 1: Write the script integrity tests** (`script.test.ts`, over `CHAPTERS` and `MANIFEST`), applying to every chapter added later:
  - every chapter has at least one step and every step at least one beat; beat ids unique; every beat has a manifest entry;
  - every step's `scenario` is in `SCENARIO_IDS`, `persona` in `PERSONA_IDS`, and `route`'s pathname matches a `routeTable` path (`matchPath`);
  - no beat text matches `GENDERED`; every `card` action's id is in `CARDS`;
  - `buildTimeline(CHAPTERS, MANIFEST).total` ≤ 450 000 ms (7:30).
- [x] **Step 2:** Run — FAIL once `open` exists without clips.
- [x] **Step 3:** Encode `open`; add the two targets; run `pnpm tour:audio`; run tests — PASS.
- [x] **Step 4: E2E** in `tour.spec.ts` (`?tourVoice=silent`, `page.emulateMedia({ reducedMotion: 'reduce' })`): `/?tour=open` → "Play tour" → expect `/operations/agents/med-rec` and `[data-story-target="agent-summary"]` visible; the bar's skipped count is `0`; no console errors (`collectErrors`). Also: while driving, open Controls, press "Resume tour" → no `dialog` visible and the tour is back on `/operations` (Review focus 3); with saved state where Med Rec was retired, `/?tour=open` still shows Med Rec live (Review focus 5); `?tour=nope` is stripped.
- [x] **Step 5:** `pnpm check`, `pnpm e2e`. Commit: `feat: tour opening chapter`.
- [ ] **Step 6: CHECKPOINT B.** Forbidden-terms check; push the branch; open a **draft** PR (Stefan approved, 2026-10-09) for the Vercel preview; Stefan watches the opening (placeholder voice) and comments on pacing, cursor, bar and captions. Apply feedback before 10.8.

### Task 10.8: Walkthrough I (`onboarding`, `earning-trust`)

**Files:**
- Modify: `script.ts`, `cards.ts` (excerpt "Hard stops run outside the model": hard stops sit between the agent and the hospital's systems, so the agent can't argue past them)
- Add targets: the technical-owner picker on the intake step (`intake-tech-owner`, `src/features/onboarding/IntakeStep.tsx`); on the committee packet the "Approve with conditions" option, the reason field and the record button (`packet-approve-conditions`, `packet-reason`, `packet-record`, `src/features/review/PacketPage.tsx`); on the sign page the reason field and the sign button (`sign-reason`, `sign-submit`, `src/features/golive/SignPage.tsx`)
- Modify: `tests/e2e/tour.spec.ts`

**Encoding:** `onboarding`: step intake (`/inventory/agents/med-rec/onboarding/intake`, `onboarding-intake`, `dana`) beats 1–3; step tools (`/inventory/agents/med-rec/onboarding/tools`, `onboarding-tools-tested`, `sam`) beats 4–6; step packet (`/portfolio/reviews/med-rec`, `review-committee`, `drlee`) beat 7. `earning-trust`: step scorecard (`/operations/agents/med-rec?tab=scorecard`, `shadow-day-21`, `priya`) beat 1; step sign (`/inventory/privileges/prv-0142/sign`, `awaiting-signature`, `priya`) beats 2–3. Typed reasons are short, plausible and name no one by pronoun.

- [ ] **Step 1: Write the e2e tests:** `onboarding` ends with the committee decision recorded on Med Rec's record; `earning-trust` ends with Med Rec's admission activity at Draft signed by Priya; no skipped actions.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Encode both chapters; add the card and targets; `pnpm tour:audio`.
- [ ] **Step 4:** `pnpm check`, `pnpm e2e` — PASS. Commit: `feat: tour walkthrough, onboarding and earning trust`.

### Task 10.9: Walkthrough II (`supervising`, `step-down`)

**Files:**
- Modify: `script.ts`
- Add targets: the agent view's Controls trigger and its "Pause agent" item (`controls-trigger`, `controls-pause`), the pause dialog's impact list and confirm button (`pause-impact`, `pause-confirm`, `src/features/controls/PauseFlow.tsx`), the resume approval reason and button (`resume-reason`, `resume-approve`, `src/features/controls/ResumePanel.tsx`), the independent-check figure on Reviewer behaviour (`reviewers-check`, `src/features/reviewers/ReviewersPage.tsx`); Epic's flag submit if the flag needs a confirm (`epic-flag-submit`)
- Modify: `tests/e2e/tour.spec.ts`

**Encoding:** `supervising`: step Epic (`/epic`, `baseline`, `ana`) beats 1–2 (outline `epic-agent-panel`, click `epic-flag`); step pause (`/operations/agents/med-rec`, `baseline`, `marcus`) beats 3–4; step resume (`/operations/agents/med-rec`, `resume-requested`, `priya`) beat 5; step reviewers (`/operations/reviewers`, `baseline`, `marcus`) beats 6–8 (outline `reviewers-finding`, then `reviewers-check`). `step-down`: step (`/operations/agents/med-rec`, `step-down-threshold`, `priya`) beats 1–2, outline `stepdown-notice`.

- [ ] **Step 1: Write the e2e tests:** Ana's flag is sent; Med Rec is paused after beat 4 and live again after beat 5 with Priya's approval in its history; `stepdown-notice` is visible in `step-down`; no skipped actions. Check at 1440 × 900 that the pause dialog's confirm button isn't under the 88 px bar (deferred from 10.6).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Encode; add targets; `pnpm tour:audio`.
- [ ] **Step 4:** `pnpm check`, `pnpm e2e` — PASS. Commit: `feat: tour walkthrough, supervising and step-down`.

### Task 10.10: Interludes (`problem`, `process`, `validate`) and the landing chapters (`people`, `close`)

**Files:**
- Create: `src/prototype/tour/interludes/Interlude.module.css`, `ProblemPage.tsx`, `ProcessPage.tsx`, `ValidatePage.tsx`, `useReveal.ts`, `interludes.test.tsx`
- Modify: `src/app/routes.ts` (`/tour/problem` "The problem", `/tour/process` "How I got here", `/tour/validate` "How I’d validate it"; `prototype` shell, phase 10, no frames), `src/app/router.tsx` (`PAGES`), `script.ts` (`problem`, `people`, `process`, `validate`, `close`), `cards.ts` (excerpts R1–R3, spec §7.3)
- Add targets on the landing page: the story-card grid (`people-cards`) and each card (`people-<personaId>`, `src/prototype/Landing/Landing.tsx`)
- Modify: `tests/e2e/tour.spec.ts`, `tests/e2e/a11y.spec.ts` (the three routes)

**Interfaces:**
- Produces: `useReveal(stepId: string): Set<string> | 'all'`: the `reveal` ids of beats already reached in that step while the tour is on it; `'all'` when the page is visited outside the tour.
- Pages: page title type, a single column. Problem: three lines (agents that act; a person approving everything; how hospitals trust someone new). Process: nine tiles in a row (Research, Vision, PRD, Roadmap, Epics and stories, Design system brief, Explorations, 55 frames, 10 build phases), each with one line under it. Validate: three short lists from spec §7.4. Reached items `--cs-text2`, the current one `--cs-ink` with the 2 px ink outline, unreached ones `visibility: hidden`.
- `people` runs on `/` (`baseline`, `marcus`): beat 4 outlines Dana, Sam and Dr. Lee in turn (outline, `wait`, outline, `wait`, outline). `close` runs on `/` (`baseline`, `marcus`); ending stays there (R5).
- [ ] **Step 1: Write the failing tests:** `interludes.test.tsx`: outside the tour every item is visible; on a step with two beats reached, exactly those items show and the second is current. E2E: each of the five chapters runs with no skips; axe passes on the three routes.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement; encode the five chapters; `pnpm tour:audio`.
- [ ] **Step 4:** `pnpm check`, `pnpm e2e` — PASS. Commit: `feat: tour interludes and landing chapters`.

### Task 10.11: The decisions page (`decisions`) and the explorations — **CHECKPOINT C**

**Files:**
- Review and convert: `reference/tour-inbox/attune-design-explorations/*.png` → `public/tour/artifacts/*.jpg`; screenshots of the screens each decision played out on (from `docs/screenshots/` or captured with `pnpm capture`) → `public/tour/artifacts/`
- Create: `src/prototype/tour/interludes/DecisionsPage.tsx`
- Modify: `routes.ts` / `router.tsx` (`/tour/decisions`, "Three key decisions"), `script.ts` (`decisions`), `cards.ts` (decision cards 1–3 per spec §7.2, each with its screen thumbnail; image cards for the explorations), `tests/e2e/tour.spec.ts`, `tests/e2e/a11y.spec.ts`

- [ ] **Step 1: Review every image** before converting: open each PNG and check for any company name, URL or real person's name (the handoff says names were swapped to Attune; confirm it). Reject or crop any that fail. Only the images the script uses are converted: the five overviews (`ds-01`…`ds-05`), the Ledger conflict (`ds-09`), the stress test (`ds-07`, `ds-12`), the final division view (`ds-22`).
- [ ] **Step 2:** Convert each used image: `ffmpeg -y -i <in>.png -vf "scale='min(1600,iw)':-2" -q:v 3 -map_metadata -1 public/tour/artifacts/<name>.jpg` (R7). View one converted file to confirm legibility.
- [ ] **Step 3: Write the e2e test:** chapter `decisions` runs with no skips and shows all three decision cards; axe passes on `/tour/decisions`.
- [ ] **Step 4:** Run — FAIL. Implement the page (same reveal model as 10.10: the three decision cards in order, with Decision 2's explorations in a row with captions, direction name and one line from the handoff), encode the chapter, add cards. `pnpm tour:audio`.
- [ ] **Step 5:** `pnpm check`, `pnpm e2e` — PASS. Commit: `feat: tour decisions and explorations`.
- [ ] **Step 6: CHECKPOINT C.** Forbidden-terms check; push; Stefan plays the whole tour on the preview (placeholder voice) and reviews every chapter, card and image. Apply feedback, including any script edits (re-run `pnpm tour:audio`).

### Task 10.12: Landing, credit and the Attune rename

**Files:**
- Modify: `src/prototype/Landing/Landing.tsx`, `Landing.module.css`, `Landing.test.tsx`; `src/prototype/PrototypeBar/PrototypeBar.tsx`; `src/prototype/About/About.tsx` (brand words only; the rewrite is 10.15); `src/prototype/DesktopGate/DesktopGate.tsx`; `src/app/pageTitle.ts` (`PRODUCT = 'Attune Agent Control Plane'`, `HOME = 'Attune · Agent Control Plane'`); `src/app/routes.ts` (home title); `index.html` (title, `og:title`, `twitter:title` if present); `README.md`; `CLAUDE.md` (brand section: Attune, still a stand-in; forbidden-terms rule unchanged); the tests that assert the brand (`pageTitle.test.ts`, `meta.test.ts`, `usePageChrome.test.tsx`, `About.test.tsx`, `Landing.test.tsx`, `tests/e2e/keyboard.spec.ts`, `tests/e2e/focus.spec.ts`)
- Add: `public/tour/stefan.jpg` (from `reference/tour-inbox/`, square, 160 px for 2× of 80 px, metadata stripped)

- [ ] **Step 1: Update the tests first:** brand strings to Attune; `Landing.test.tsx`: the primary button is "Play the tour · 7 min" (the total from the timeline, rounded to whole minutes) and starts the tour at chapter 0 playing; "Narrated by Stefan" with the photo (`alt="Stefan"`); "Explore freely" is a secondary button; the story cards render under "Or explore on your own".
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement. `git grep -n -w Signal -- src tests index.html README.md CLAUDE.md` returns nothing.
- [ ] **Step 4:** `pnpm check`, `pnpm e2e` — PASS. Commit: `feat: Attune brand and tour on the landing page`.
- [ ] **Step 5:** Decision-log row: brand renamed to Attune (Stefan, 2026-10-09); AIMS kept; earlier plans and specs left as records.

**Blocked on:** Stefan's photo in `reference/tour-inbox/`. If it isn't there, ship the credit without a photo and add it later.

### Task 10.13: Recording page (dev only)

**Files:**
- Create: `tooling/tourRecorder.ts` (Vite plugin, `apply: 'serve'`), `tooling/recorder.html` (vanilla page + script)
- Modify: `vite.config.ts` (add the plugin), `tsconfig.node.json` if it must include `tooling/`

**Interfaces:**
- Consumes: `scripts/tour-load.mjs` logic (use `server.ssrLoadModule` inside the plugin), `textHash`.
- Endpoints: `GET /__tour/recorder` (the page); `GET /__tour/lines` → `[{ chapter, step, id, text, status: 'placeholder' | 'recorded' | 'out-of-date', ms }]`; `POST /__tour/record?beat=<id>` (body: the MediaRecorder blob, `audio/webm`) → writes `<tmp>.webm`, converts with the 10.3 `ffmpeg` command to `public/tour/audio/<id>.m4a`, updates that manifest entry (`source: 'recorded'`, `textHash`, `ms` from `ffprobe`), returns the entry; unknown beat → 404.
- Page: lines grouped by chapter with status; select a line (↑/↓), **R** starts/stops recording, **P** plays the take, **K** keeps it (uploads), **N** goes to the next line; a "Play the original" control for the current clip; a link "Hear it in the tour" → `/?tour=<chapter>` (R8). Shows only the line's text.
- [ ] **Step 1:** Implement the plugin and page.
- [ ] **Step 2: Verify by hand** in `pnpm dev`: record one line, keep it, confirm the file, the manifest entry and `pnpm tour:audio` reporting it as recorded; edit that line's text and confirm it shows as out of date.
- [ ] **Step 3: Verify it never ships:** `pnpm build && ! grep -rq "__tour/" dist` (exit 0); add an e2e test that `GET /__tour/lines` on the preview server doesn't return JSON.
- [ ] **Step 4:** `pnpm check`, `pnpm e2e`. Commit: `feat: tour recording page (dev only)`.

### Task 10.14: Recording — **CHECKPOINT D**

- [ ] **Step 1:** Stefan records every line on the recording page (`pnpm dev`, `/__tour/recorder`). Suggested: a quiet room, the same mic and distance throughout, one chapter per sitting.
- [ ] **Step 2:** `pnpm tour:audio` (durations refresh), then `pnpm tour:audio --check` — exit 0 (no placeholder, missing or out-of-date clips). `pnpm vitest run src/prototype/tour/script.test.ts` — total ≤ 7:30.
- [ ] **Step 3:** Spot-check five clips by ear for anything said that isn't in its line (the forbidden-terms check can't hear audio). Commit: `feat: tour narration recorded`.
- [ ] **Step 4: CHECKPOINT D.** Push; Stefan plays the tour on the preview in their own voice and lists lines to re-record; repeat Steps 1–3 for those.

### Task 10.15: Case study (About)

**Files:**
- Modify: `src/prototype/About/About.tsx`, `About.module.css`, `About.test.tsx`; `tests/e2e/a11y.spec.ts` (About already covered; keep it passing)

**Interfaces:**
- Consumes: `CHAPTERS`, `CARDS`, `STORIES` and `stepHref` (story links).
- Page: title "About this work"; for each chapter except `close`: its title, its narration joined into paragraphs, its cards at full width (decision cards with their images; excerpts with sources), and links **"Play from here"** (`/?tour=<chapter-id>`) and, for product chapters, **"Open the live screen"** (the matching story step: open → Marcus 3; onboarding → Dana 1; earning-trust → Priya 2; supervising → Marcus 6; step-down → Priya 7). Then the existing Principles, Countersign and "How it's built" sections.
- [ ] **Step 1: Write the failing tests:** every chapter title renders as a heading; "Play from here" links point at `/?tour=<id>`; the three decision cards render with "Decision n of 3"; "Open the live screen" for `supervising` is Marcus's step 6 href.
- [ ] **Step 2:** Run — FAIL. Implement. Run — PASS.
- [ ] **Step 3:** `pnpm check`, `pnpm e2e`. Commit: `feat: About becomes the case study`.

### Task 10.16: Phase checkpoint — **CHECKPOINT E**

- [ ] **Step 1:** `pnpm check`, `pnpm e2e`, `pnpm tour:audio --check` green.
- [ ] **Step 2:** Play the whole tour at 1440 × 900 in Chrome and Safari at 1×; note anything off; fix.
- [ ] **Step 3:** `pnpm capture` to regenerate `public/og.png` and README screenshots with the Attune bar; add one screenshot of the tour bar to `docs/screenshots/tour.png`; README: a "Watch the tour" line linking `/?tour=open`.
- [ ] **Step 4:** BUILD_PLAN: tick tasks, handoff notes, Start here, decision log (R1–R9 and anything new), session log.
- [ ] **Step 5:** Forbidden-terms check (must print nothing). Push. Mark the PR ready ("Closes #20"), with the task list, preview URL and screenshots.
- [ ] **Step 6: CHECKPOINT E. STOP.** Ask Stefan to review the preview URL. Merge only after approval.
