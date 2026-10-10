# Guided tour: design

**Date:** 2026-10-09 · **Phase:** 10 (Guided tour) · **Branch:** `phase-10-guided-tour`
**Builds on:** [`2026-10-08-agent-control-plane-prototype-design.md`](2026-10-08-agent-control-plane-prototype-design.md) (the prototype spec) and Phase 8's story engine.

---

## 1. Goal

A narrated tour that plays the prototype on its own. The visitor presses Play; Stefan's recorded voice explains the work while the screens change, a cursor clicks real controls and cards show the decisions and the artifacts behind each screen. The visitor can pause at any time, take over the mouse and resume.

It is the walkthrough for a job application: a hiring team reviewing a Lead Product Designer candidate. The application asks for a walkthrough of a project with complex workflows, including:

1. why this example was chosen,
2. the key design decisions,
3. how the designer knew it worked,

and to show the work. The tour answers all three in about seven minutes without asking the reviewer to find their way through 55 frames and seven stories.

### Success criteria

- A reviewer who presses Play and does nothing else sees the whole story, start to finish, in about seven minutes (hard ceiling 7:30).
- The three key decisions are impossible to miss: each is marked "Decision n of 3", shows the options weighed, and appears in the chapter list.
- The reviewer can pause, click around, and resume without breaking the tour.
- Stefan records the narration without editing video: one sentence at a time, re-recording any line in seconds.
- Nothing that ships names the real company (see §8).

### What Stefan said (inputs)

- The audience must get a very clear understanding of the work and its depth without being overwhelmed; hold their hand through it.
- Show the process: research, problem definition, vision, PRD, roadmap, epics and stories, design system explorations, then the build.
- Show key decisions, using the Claude Design explorations (design system variants, Command Board options).
- No user testing was possible. The application email says so and promises "how I'd validate it"; the tour matches that.
- Limited time for editing: no montage; artifacts appear on screen in time with the story.
- The stand-in brand becomes **Attune** (replacing "Signal", §9).
- Credit: "Narrated by Stefan", with a photo.
- An AI chat that answers reviewers' questions is a v2 idea, not this phase.

## 2. Decisions taken in brainstorming

| # | Decision | Why |
|---|---|---|
| T1 | A **performed live tour** of the real prototype, not a recorded video | Sharp at any size; pausable and explorable; re-recording a line never means re-editing; a screen recording of the tour gives a video for free |
| T2 | **One protagonist**: the Med Rec agent, from approved intake to automatic step-down | Collapses 15 epics and 7 personas into one story; matches the email ("follows a medication reconciliation agent … from onboarding through supervision") |
| T3 | **The three decisions get their own chapter** after the walkthrough (revised 2026-10-09 with the approved script; the first draft wove them into the story), each card showing the screen it played out on | Maps to the application's explicit ask ("the key design decisions"); the walkthrough stays uninterrupted |
| T4 | **Player bar** along the bottom, full width (not a corner card) | Reads instantly as "a video I can pause"; captions get a full line; the product keeps its width |
| T5 | **Actions drive the real interface** (the cursor clicks real controls) | The real dialogs, store actions and audit log run; no second implementation of any flow |
| T6 | **Navigation is per step**; every step loads its own scenario on entry | Deterministic; nothing to fast-forward; a visitor's own changes can't break the tour |
| T7 | **Sync by beats**: one clip per sentence, actions fire when it starts | No timestamps to tune; re-recording a line can't break sync |
| T8 | **Local recording page** (dev only) for Stefan's voice | One line at a time, hear it in context, re-record in seconds, saved straight into the project |
| T9 | **About becomes the case study**, generated from the tour's data | One reading version for reviewers who won't press Play; one source of truth |
| T10 | Brand **Attune** replaces "Signal" everywhere it shows | Stefan's call; a name clearly distinct from the real company |
| T11 | AI chat is **v2**; the bar leaves room for it | Needs a server function, an API key, a spend cap and grounding; out of scope here |

## 3. Running order

**Approved 2026-10-09: the hybrid flow.** Stefan rewrote the first draft with Claude into three versions (merged, traditional, hybrid). The hybrid was chosen with eight edits; the spoken text is in [`docs/tour/script.md`](../tour/script.md). It replaces the first draft's running order. About 7:00 at 1×, roughly 1,050 words.

The tour opens on the live product for a short hook and an agenda, then runs in a traditional order. The walkthrough is one continuous story, split into four chapters in the menu (chapter titles aren't spoken).

| # | Chapter (`id`) | Time | Screens (scenario, persona) | What it does |
|---|---|---|---|---|
| 1 | Open on the product (`open`) | 0:45 | Hospital board → Medications → Med Rec agent (`baseline`, Marcus) | The hook: 41 agents, colour only where a person is needed, the agent that was stopped three times; then the agenda and "you can pause and click around" |
| 2 | The problem (`problem`) | 0:40 | Interlude `/tour/problem` | Why this example; approving everything fails (research R1–R3); hospitals already know how to trust someone new |
| 3 | Who it's for (`people`) | 0:30 | Landing `/` (`baseline`, Marcus) | The seven people, outlined on their story cards |
| 4 | Bring it on (`onboarding`) | 0:45 | Intake (`onboarding-intake`, Dana) → tools and hard stops (`onboarding-tools-tested`, Sam) → board packet (`review-committee`, Dr. Lee) | Four named people; hard stops outside the model, tested on 30 days; approved with conditions |
| 5 | Earn trust (`earning-trust`) | 0:30 | Scorecard (`shadow-day-21`, Priya) → sign (`awaiting-signature`, Priya) | Three weeks in shadow; one target missed, signed with a written reason |
| 6 | Supervise (`supervising`) | 1:10 | Epic (`baseline`, Ana) → Med Rec agent pause (`baseline`, Marcus) → resume (`resume-requested`, Priya) → Reviewer behaviour (`baseline`, Marcus) | Flag in one click; pause in one action with its impact; resume needs Priya too; reviewers checking less, by unit and shift, never by name |
| 7 | Trust drops (`step-down`) | 0:20 | Med Rec agent (`step-down-threshold`, Priya) | Back to shadow by rule; nothing climbs back without a signature |
| 8 | Three key decisions (`decisions`) | 1:00 | Interlude `/tour/decisions` | Decision 1 (privileges per task), Decision 2 (protect attention: the five directions, the Ledger conflict, judged on crowded screens), Decision 3 (stop with one, restart with two); each card shows its screen |
| 9 | How I got here (`process`) | 0:30 | Interlude `/tour/process` | Research first, then vision, PRD, roadmap, stories, design system, build with Claude Code; "I made the calls and signed off on each one" |
| 10 | How I'd validate it (`validate`) | 0:35 | Interlude `/tour/validate` | What I checked; who I'd bring in; what I'd measure (§7.4) |
| 11 | Close (`close`) | 0:15 | Landing `/` (`baseline`, Marcus) | The seven walkthroughs, free explore, Reset |

**Left out** (still in the seven stories): the risk-tier override, the inbox, unregistered callers, survey evidence, version holds, promoting one branch, retiring an agent, Jordan's action trace.

## 4. Visitor experience

### 4.1 Starting

- The landing page's primary action becomes **"Play the tour · 7 min"** (indigo), with one line on what it covers and the credit "Narrated by Stefan" beside a small round photo. "Explore freely" becomes a secondary button; the seven story cards stay below under "Or explore on your own".
- Play is the user gesture that lets the browser play audio.
- `?tour=<chapter-id>` on any route opens the tour at that chapter, paused, with a "Play" prompt in the bar (so the email can link to `?tour=decisions`). A refresh mid-tour returns to the start of the chapter, paused. Unknown chapter ids are ignored and stripped (same rule as stories).
- Starting the tour exits any story in progress; the story panel doesn't render while the tour runs.

### 4.2 The player bar

Fixed to the bottom of the viewport, full width, `--cs-raised`, 1 px `--cs-line-strong` top border, z-index 60 (above dialogs, as the story panel), a `data-modal-companion` region so it stays usable while a dialog traps focus. The shell adds space under `<main>` equal to the bar's height so nothing is stuck beneath it.

Two rows:

1. **Caption line**: the sentence being spoken (14 px, `--cs-ink`). Hidden when captions are off.
2. **Controls**: Play/Pause (the one indigo control) · chapter menu button ("6 · Stop easy ▾") · progress, one segment per chapter, filled to the current point (click a segment to jump to its chapter) · elapsed / total in mono ("4:12 / 6:50") · speed (1×, 1.25×, 1.5×) · captions on/off · "Exit tour".

The **chapter menu** lists the ten chapters with their start times; the three decisions carry a "Decision n" label.

States the bar can show: playing · paused · "Paused. You're driving." with **Resume tour** (§4.5) · ended (the bar is replaced by the landing page's "Your turn").

### 4.3 On screen

- **Cursor.** A 20 px ink arrow that glides (about 600 ms at 1×, scaled by speed) from its last position to the target's centre, then shows a 26 px ink ring pulse and clicks. It lives in a fixed overlay with `pointer-events: none` and is hidden while the tour is paused.
- **Outline.** The existing story outline: `outline: 2px solid var(--cs-ink); outline-offset: 2px` on `[data-story-target="…"]`, scrolled into view clear of the bar.
- **Typing.** Text appears into the field character by character (about 25 ms per character at 1×), through the field's real input events.
- **Cards** float on the side of the viewport away from the current outline (override per beat), 320 px wide, `--cs-raised`, 1 px `--cs-line-strong`, radius 6, `--cs-shadow-modal`. Kinds:
  - **Decision**: label "Decision n of 3", title, the options weighed (the chosen one marked with a filled indigo dot and the word "Chosen"; the others with an empty dot), one line "Trade-off: …".
  - **Excerpt**: a short quote, its source line ("Research notes · Chen et al. 2026, preprint"; "PRD · The problem"), set as text.
  - **Image**: a thumbnail of a Claude Design export with a caption; clicking it while paused opens it larger.
  - **Story**: an epic's story and one acceptance criterion, verbatim from `reference/epics-and-stories.txt`.
- **Interludes** (`/tour/problem`, `/tour/decisions`, `/tour/process`, `/tour/validate`) are calm prototype-layer pages: page title type, no hero images, no display type, no gradients. Each beat reveals or highlights one item (a line, a tile, an option); revealed items stay, the current one is ink, earlier ones are `--cs-text2`.
- **"Viewing as"** changes with each step's persona, so the bar at the top shows the permissions follow the person.

### 4.4 Colour

Indigo only for Play/Pause and the chosen option's dot. Ink for the cursor, ring and outline. No teal, amber or red in the tour layer (the product screens keep theirs). No gradients, no emoji.

### 4.5 Taking over

- Any pointer down or key press inside the product (outside the bar) while playing pauses the tour and shows "Paused. You're driving." The click itself goes through: the visitor is now using the prototype.
- **Resume tour** restarts the current step: reloads its scenario, persona and route, then plays from its first beat.
- Using the persona switcher, Reset demo or a story link also counts as taking over.

### 4.6 Keyboard and accessibility

- Space: play/pause (when focus is not in a text field or on another button). ← / →: previous / next step. The chapter menu is the `Menu` primitive.
- Captions on by default (WCAG 1.2.2, prerecorded audio). Everything is pausable (2.2.2).
- The bar is `<aside aria-label="Tour">`; a status region announces the chapter title on each chapter change (not every caption, which would double the audio for screen-reader users).
- `prefers-reduced-motion`: the cursor jumps instead of gliding, no ring pulse, typing appears whole, scrolling is instant.
- With sound off, captions carry the tour; timing still follows the clips.
- axe (WCAG 2.1 A/AA + best practice) on the bar, every interlude and the case study.

### 4.7 Ending and exiting

- The tour ends on the landing page with "Your turn" and the story cards.
- Ending or **Exit tour** resets the demo to `baseline` as Marcus (the tour's own actions shouldn't be what the visitor explores) and removes `?tour`.

## 5. Architecture

### 5.1 Data model (`src/prototype/tour/types.ts`)

```ts
type TourAction =
  | { kind: 'outline'; target: string }
  | { kind: 'scroll'; target: string }
  | { kind: 'click'; target: string }
  | { kind: 'type'; target: string; text: string }
  | { kind: 'card'; card: CardId; side?: 'left' | 'right' }
  | { kind: 'clearCard' }
  | { kind: 'wait'; ms: number }

interface Beat {
  /** Stable id; names its clip (`public/tour/audio/<id>.m4a`). */
  id: string
  /** The sentence as spoken; also the caption. */
  text: string
  /** Run in order when the beat starts. */
  actions?: TourAction[]
  /** Interludes: the item this beat reveals. */
  reveal?: string
}

interface TourStep {
  id: string
  route: string
  /** Loaded on entry; interludes have none. */
  scenario?: ScenarioId
  persona?: PersonaId
  beats: Beat[]
}

interface Chapter {
  id: ChapterId // 'open', 'problem', 'people', 'onboarding', …, 'decisions', 'process', 'validate', 'close'
  title: string
  decision?: 1 | 2 | 3
  steps: TourStep[]
}
```

The script lives in `src/prototype/tour/script.ts` (chapters in order); cards in `src/prototype/tour/cards.ts`.

### 5.2 Engine (`src/prototype/tour/engine.ts`, pure, test-first)

- Position = `{ chapter, step, beat }`. Flatten, next/previous step, chapter of a step, step start, clamping.
- Timing from the audio manifest: per-beat duration, chapter start times, elapsed at a position, total.
- URL: parse `?tour=`, decide strip / open / ignore (mirrors `urlAction` in the story engine).
- What to do on entering a step: `{ load: ScenarioId | null, persona, route }` (always load when the step has a scenario, T6).

### 5.3 Player (`src/prototype/tour/player.ts`)

A small Zustand store (not persisted; the URL is the persistence) holding `status` (`idle | playing | paused | driving | ended`), the position, speed, captions on/off and the current card. A runner loop plays a beat: start its clip and run its actions in sequence; the beat ends when **both** the clip has ended and the actions are done; then the next beat, the next step (entering it per §5.2) or the end.

- **Voice** is an interface (`play(beatId, rate) → Promise<void>`, `pause()`, `resume()`): the real one wraps one `HTMLAudioElement` and preloads the next beat's clip; a **silent voice** (timers from the manifest's durations, divided by a factor) is used by tests via `?tourVoice=silent`.
- **Actions** run against the DOM through `data-story-target`. An action waits up to 2 s for its target to render; if it never does, the action is skipped and logged (`console.warn`), so the tour never hangs; tests fail on any skip.
- `click` dispatches a real click on the element; `type` sets the value through the native setter and dispatches `input`, so React sees it.
- Speed scales clip playback rate (pitch preserved) and cursor and typing durations.

### 5.4 Components

`src/prototype/tour/`: `TourLayer` (URL sync, takes-over listener, renders the pieces; mounted where `StoryLayer` is, in the `app` and `prototype` shells), `TourBar`, `TourCursor`, `TourCard`, `ChapterMenu`, and `interludes/` (`ProblemPage`, `DecisionsPage`, `ProcessPage`, `ValidatePage`). Interlude routes join the route table as `prototype`-shell routes. Product screens change only by gaining `data-story-target` attributes (Phase 8's rule).

### 5.5 Audio pipeline

- **Clips:** `public/tour/audio/<beat-id>.m4a`, AAC, mono, loudness-normalised (≈ −16 LUFS) and metadata stripped by `ffmpeg`.
- **Manifest:** `public/tour/audio/manifest.json`: per beat `{ ms, source: 'placeholder' | 'recorded', textHash }`. `textHash` is the hash of the line the clip was made from, so a line edited after recording shows up as out of date.
- **Placeholders:** `pnpm tour:audio` makes a clip for every beat without a recorded one (macOS `say` → `afconvert` → `ffmpeg`), measures durations with `ffprobe` and rewrites the manifest. Placeholders let the whole tour run, and be timed, before Stefan records anything.
- **Recording page** (dev only, never built for production): a Vite plugin (`apply: 'serve'`) adds a page and a `POST` endpoint. The page lists every line by chapter with its status (placeholder, recorded, out of date); select a line, press R to record (MediaRecorder), stop, play it back alone or inside its step, keep or redo. Keeping uploads the take; the endpoint converts and normalises it with `ffmpeg`, writes the clip and updates the manifest.

### 5.6 What doesn't change

`SEED_VERSION` stays 8; no seed or `DemoState` changes. Stories, the story engine and free explore keep working as they do.

## 6. Pages that change

- **Landing** (§4.1).
- **About → case study**, generated from the tour's data: each chapter a section with its narration as text, decision cards at full size with their images, excerpts with sources, and per section **"Play from here"** (`/?tour=<chapter>`) and **"Open the live screen"** (the matching story step link). Principles, Countersign and "How it's built" stay. Built last; it can be cut without affecting the tour.
- **README**: the tour, with a link to `?tour=open` and one screenshot of the bar.

## 7. Content

### 7.1 Script

- Stefan's voice, first person ("I", "my"). People are named, never he/she (the stories' unit test extends to the tour). Numbers, names and dates match what the screen shows in that step's scenario.
- Drafted by Claude as prose in `docs/tour/script.md` (chapter by chapter, one sentence per line, with the actions noted in brackets) for Stefan to edit; then encoded into `script.ts`. After that `script.ts` is the source, and `pnpm tour:script` prints it back as a readable document.
- Sources: the existing story copy (already checked against the screens), the research notes (§7.3), the PRD and Vision (local only; quoted with the brand as Attune), the decision log.

### 7.2 Decision cards (drafts; Stefan edits)

| # | Title | Options weighed | Chosen | Trade-off |
|---|---|---|---|---|
| 1 | Privileges, earned per activity | Approve every action · autonomy for the agent as a whole · privileges per activity, staged Shadow → Draft → Supervised → Autonomous, signed by a named person on evidence | The third | More ceremony at onboarding, less review on every action |
| 2 | Quiet by default | Board layouts: table · tiles · exceptions first (and the design system directions explored) | Table as default; tiles and exceptions-first kept as a View toggle and the wall display (D4); Countersign: grey is healthy, colour + shape + word only where a human is needed, dashed means no data | Less at-a-glance colour; the board reads as calm, so the colour that does appear is believed |
| 3 | Stop easy, resume deliberate | One person resumes · it resumes on its own after a fix · two people, each with a reason | Two people (owner and sponsor); the requester can't approve | Slower recovery, on purpose |

### 7.3 Research excerpts (from Stefan's research notes; proposed)

Cited on cards with their source; preprints labelled as such. Quotes the notes attribute to the real company's own pages are **not** used.

| Id | Where | Excerpt (paraphrase allowed in narration; card text quoted from the cited source) | Source |
|---|---|---|---|
| R1 | Ch. 1 | Plan-level oversight cut the odds of a problematic agent action by 76 %, while people blocked only about 1 in 5 bad actions that reached execution | Chen et al. 2026 (preprint) |
| R2 | Ch. 1 | Clinicians show strong automation bias, and explanations raise acceptance whether the AI is right or wrong | Jabbour et al., JAMA 2023; Bansal et al., CHI 2021 |
| R3 | Ch. 1 | Health systems already describe it as "shadow-like mode, then 'earn' autonomy", "staged autonomy", "crawl-walk-run" | Becker's (health-system leaders) |
| R4 | Ch. 4 | Only 22 % of hospitals are highly confident they could produce a complete AI audit trail within 30 days | Becker's on Black Book |
| R5 | Ch. 5 | On calm, hierarchical displays, operators caught problems before the alarm 48 % of the time, against 10 % | ASM Consortium (Errington et al. 2005) |
| R6 | Ch. 5 | 85–99 % of clinical alarms need no action | Alarm-fatigue literature cited in the notes |

The notes' "open questions to validate with real users" feed chapter 8 (§7.4).

### 7.4 How I'd validate it (chapter `validate`)

- **What I checked myself:** every screen traces to an acceptance criterion; the working model surfaced contradictions in the frames that were resolved (decision log); a greyscale and wall-distance check changed the stale mark to a dashed square (Phase 9 R10); axe on every screen; all seven stories run as automated tests.
- **Who I'd bring in first, and what I'd ask** (from the notes' open questions): who supervises a live agent day to day (AI office, sponsor or unit leader); whether "job description" or privileging language matches how staff think about scope; which actions must always stay human; pharmacists on the Epic flag; engineers on what the gateway can enforce.
- **What I'd measure:** time from an exception to a named owner; share of exceptions handled before their deadline; alerts per supervisor and dismissal rates; reviewer health (approval time, disagreement rate) next to independent quality checks; step-downs caught by rule.

### 7.5 Assets from Stefan

1. **Claude Design exports** via a handoff package (received 2026-10-09: 4 board layouts, 5 design system directions across 23 images, and `handoff.md` with status and reasons; in `reference/tour-inbox/attune-design-explorations/`): Command Board options and design system directions, PNG at 2× (2880 px for a 1440 frame), with a manifest naming each, its status (chosen / kept as an alternative / rejected) and the reason if recorded.
2. **Photo**: square, at least 400 px, for the credit.
3. **Voice**: recorded on the local recording page after the tour runs with placeholders.

Images go to `public/tour/artifacts/` after review (§8), optimised (WebP, max 1600 px wide for cards and the case study).

## 8. Keeping the real company out

- **Text** (script, captions, cards, case study): tracked files, covered by the forbidden-terms check before every push.
- **Images**: the check can't read pixels. Every export is viewed before it is committed; anything naming the company is cropped or rejected; metadata is stripped.
- **Audio**: each clip is a reading of a line that passed the check; the recording page shows only that line; `ffmpeg` strips metadata.
- **Research**: cited only as "Research notes"; no quotes from the company's own pages; the source docs stay local and git-ignored.
- **Brand in narration**: "Attune" where a company name is needed.

## 9. Brand: Attune

"Attune" replaces "Signal" everywhere the brand shows: prototype bar, landing, About, desktop gate, page titles (`… · Attune Agent Control Plane`), `index.html` title and Open Graph tags, README, `CLAUDE.md`, and the tests that assert them. `public/og.png` is regenerated with `pnpm capture`. Earlier specs and phase plans are records and stay as written; a decision-log row records the rename.

**Wordmark:** the product's top-nav wordmark stays **AIMS** as designed (Stefan, 2026-10-09: keep it for now; it may change later).

## 10. Testing

- **Unit, test-first:** engine (flattening, navigation, clamping, timing, URL actions); player state machine (play, pause, take over, resume restarts the step, end resets to baseline as Marcus); action runner (waits for a target, skips after 2 s, clicks, types into a React-controlled field); manifest reader.
- **Script integrity** (unit): every beat has a manifest entry; every scenario and persona exists; every route is in the route table; no he/she in narration; total ≤ 7:30 at 1×; beat ids unique; every card id resolves; every decision chapter opens with its decision card.
- **Playwright:** the whole tour with `?tourVoice=silent` at high speed, asserting each step's route and each action's effect (Med Rec paused in `supervising`, privilege signed in `earning-trust`); no skipped actions; take over then resume; chapter jump; `?tour=decisions` deep link and a bad id; reduced motion; axe on the bar, interludes and case study; existing story and route suites still pass.
- **Recording page:** not shipped; a build test asserts its route and endpoint are absent from `dist/`.

## 11. Out of scope (v2)

AI chat about the work; mobile (the desktop gate still applies below 1024 px); multiple narrators or languages; per-step video of Stefan.

## 12. Build order (detail in `docs/plans/phase-10-guided-tour.md`)

1. Script draft (`docs/tour/script.md`) for Stefan to edit, in parallel with 2–3.
2. Engine, player and silent voice (test-first); placeholder audio and manifest.
3. Bar, cursor, cards; actions against the DOM.
4. Product chapters (0, 3–7): steps, targets, actions.
5. Interludes (1, 2, 5's decision page, 8) and cards with assets.
6. Landing changes and the Attune rename.
7. Recording page; Stefan records; manifest flips to `recorded`.
8. Case study (About).
9. Checkpoint: `pnpm check`, `pnpm e2e`, a full play-through at 1440 px, forbidden-terms check, PR and preview for Stefan's review.
