# Agent Control Plane prototype: build plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, clickable, high-fidelity prototype of Agent Control Plane (E1–E15 of the Countersign designs) on mock data, with guided persona stories and free explore.

**Architecture:** Static Vite + React + TypeScript SPA. Countersign tokens as CSS custom properties with CSS Modules per component; a Zustand store holds the mock hospital (persisted, versioned, scenario presets); React Router maps the designed nav. Vercel deploys `main` publicly and every PR to a preview URL.

**Tech stack:** Node 24, pnpm, Vite, React 19, TypeScript (strict), React Router v8, Zustand, CSS Modules, @fontsource IBM Plex Sans/Mono, Vitest + Testing Library, Playwright, GitHub Actions, Vercel.

**Spec:** [`docs/specs/2026-10-08-agent-control-plane-prototype-design.md`](specs/2026-10-08-agent-control-plane-prototype-design.md). Read it before your first task. This plan says *what to do next*; the spec says *what and why*.

---

## ▶ Start here

Update this block every time a session stops, even mid-phase.

| | |
|---|---|
| **Current phase** | Phase 6: Governance and fast follows (⏸ at checkpoint, awaiting Stefan's review) |
| **Branch** | `phase-6-governance` |
| **Last completed** | Phase 6 built, fresh-reviewed and fixed; PR #16 open (2026-10-08) |
| **Next task** | Stefan reviews PR #16 on the preview → squash-merge → Phase 7 Task 7.0 (write `docs/plans/phase-7-autonomy.md`; read Phase 6's handoff notes first) |
| **Blockers** | None |
| **Repo** | [github.com/StefanNav/agent-control-plane](https://github.com/StefanNav/agent-control-plane) (public) |
| **Live URL** | https://agent-control-plane-mocha.vercel.app (public, deploys from `main`) |
| **Latest preview** | https://agent-control-plane-git-phase-6-governance-stefannavs-projects.vercel.app (PR [#16](https://github.com/StefanNav/agent-control-plane/pull/16); behind Vercel login) |

### How to resume in a new session

1. Read this block. `CLAUDE.md` (auto-loaded) has the conventions.
2. Run `git status`, `git branch --show-current`, `git log --oneline -5`. Confirm you are on the branch named above.
3. Open the current phase's plan file (`docs/plans/phase-N-*.md`). If it doesn't exist yet, writing it is the phase's first task (see "Phase plan files" below).
4. Find the first unchecked `- [ ]` step and continue from there.
5. When you stop: tick completed steps, update this block, add a row to the session log, and commit `docs/`.

### Phase plan files (rolling-wave detail)

Each phase gets a step-by-step plan in `docs/plans/phase-N-<slug>.md`, written in the superpowers:writing-plans format (files, interfaces, failing test → implement → pass → commit). Phases 0 and 1 are written. **The first task of every later phase is to write its plan file** from the task list below, the spec, and the previous phase's handoff notes, then commit it before any code. This keeps detail accurate to what actually exists.

---

## Global constraints

Every task implicitly includes these. Values are verbatim from the spec.

- **Never commit** `reference/source-docs/` or any `.docx`. Never name the real company the source docs were written for, anywhere in the repo or site. The brand is **Signal** (stand-in; spec D7). Before every push, run the forbidden-terms check in `CLAUDE.md` ("Brand and the real company name"); it must print nothing.
- Stack is fixed: Vite, React 19, TypeScript strict, React Router v8, Zustand, CSS Modules + `src/design-system/tokens.css`. **No UI component library, no icon library, no Tailwind.**
- Fonts: IBM Plex Sans and IBM Plex Mono, weights **400 and 600 only**, via `@fontsource`.
- Colours only through `--cs-*` tokens (OKLCH, values from `docs/design-handoff.md` "Design tokens"). Indigo = primary action and current/selected. Teal = review waiting only. Amber/red = warning/critical only. Healthy = grey. No gradients, no emoji, no coloured left-border cards.
- Every status pairs colour + shape + word. Dashed border means "no data" (stale) only.
- `font-variant-numeric: tabular-nums` globally. Monitoring screens 13 px; forms and signing 16 px with 44 px fields.
- Copy is final: take it verbatim from the frames in `designs/`. Sample values (names, IDs, counts, dates) also come from the frames.
- Demo clock "now" = **Tue 08 Dec 2026, 09:52** (`2026-12-08T09:52:00`). No `Date.now()` in product code; use `src/lib/clock.ts`.
- Layer rules: `design-system` has no domain knowledge; `components` are pure (props in, callbacks out, no store); `features` read via selectors and write only via store actions; permission checks only via `can()` in `src/store/permissions.ts`.
- Designed for 1440 px; flex to 1280; horizontal scroll 1024–1280; "best viewed on desktop" page below 1024.
- Epic (E10) is a neutral stand-in; only the right-hand panel uses our design language.
- Every PR: `pnpm check` and `pnpm e2e` green. Every phase ends at a checkpoint and **stops for Stefan's review** before merge.

## Review focus

The failure modes most likely to bite a visitor that no screen-level test naturally covers. Each has a pinned test in the owning task.

1. **Stale saved state after a seed change.** A returning visitor has `localStorage` from an older seed version → app must reset to the new seed, not crash. Pinned in Phase 2 (store task): rehydrate with mismatched version returns the seed.
2. **`localStorage` unavailable** (private mode, blocked storage) → app still runs in memory. Pinned in Phase 2 (store task): storage that throws still yields a working store.
3. **Deep links and refresh on Vercel.** Opening `/operations/agents/med-rec` directly or refreshing must not 404. Pinned in Phase 1 (Task 1.8 Playwright smoke loads every route directly; `vercel.json` rewrite).
4. **Unknown paths and IDs in URLs** (`/no-such-page`, `/operations/agents/nope`, `?story=x&step=99`) → in-shell "Not found" or a clamped step, never a blank screen. Pinned in Phase 1 (Task 1.8: unknown path), Phase 3 (Task 3.3: unknown agent ID renders `NotFound`; every later detail page follows the same pattern) and Phase 8 (Task 8.1: story engine clamps).
5. **A persona reaching an action they can't take** (Jordan opens `/inventory/privileges/prv-0142/sign` directly) → screen is read-only and the store action itself refuses with no state change. Pinned in Phase 2 (permissions + store task): action called as Jordan returns `{ ok: false }` and state is unchanged.

---

## Workflow

- **Branch per phase:** `phase-N-<slug>` off `main`.
- **GitHub:** milestone `Phase N: <name>` and one issue per phase whose body is that phase's task checklist. The phase PR says `Closes #<issue>`.
- **Commits:** small, one per plan step group, conventional prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). Commit and PR attribution follows the harness's guidance (as `CLAUDE.md` says).
- **Checkpoint protocol** (end of every phase):
  1. `pnpm check` and `pnpm e2e` green.
  2. Screenshot every new screen at 1440 px and compare side by side with its frame (`pnpm designs` serves the design files on port 4599). Fix differences. Tick the frame in the tracker below.
  3. Update this file: tick tasks, write the phase's **handoff notes**, update **Start here**, add to the decision log and session log.
  4. Push, open the PR (task checklist, preview URL, screenshots), update the issue.
  5. **STOP. Ask Stefan to review the preview URL.** Merge only after approval. After merge, update Start here to the next phase.

---

## Phase overview

| # | Phase | Status | Branch | Issue | PR | Plan file |
|---|---|---|---|---|---|---|
| 0 | Setup | ☑ Merged | `main` | [#1](https://github.com/StefanNav/agent-control-plane/issues/1) | no PR (docs on `main`) | [phase-0-setup.md](plans/phase-0-setup.md) |
| 1 | Foundation | ☑ Merged | `phase-1-foundation` | [#2](https://github.com/StefanNav/agent-control-plane/issues/2) | [#11](https://github.com/StefanNav/agent-control-plane/pull/11) | [phase-1-foundation.md](plans/phase-1-foundation.md) |
| 2 | Components and data | ☑ Merged | `phase-2-components-data` | [#3](https://github.com/StefanNav/agent-control-plane/issues/3) | [#12](https://github.com/StefanNav/agent-control-plane/pull/12) | [phase-2-components-data.md](plans/phase-2-components-data.md) |
| 3 | Command Board and inbox | ☑ Merged | `phase-3-board-inbox` | [#4](https://github.com/StefanNav/agent-control-plane/issues/4) | [#13](https://github.com/StefanNav/agent-control-plane/pull/13) | [phase-3-board-inbox.md](plans/phase-3-board-inbox.md) |
| 4 | Controls and audit | ☑ Merged | `phase-4-controls-audit` | [#5](https://github.com/StefanNav/agent-control-plane/issues/5) | [#14](https://github.com/StefanNav/agent-control-plane/pull/14) | [phase-4-controls-audit.md](plans/phase-4-controls-audit.md) |
| 5 | Onboarding and go-live | ☑ Merged | `phase-5-onboarding` | [#6](https://github.com/StefanNav/agent-control-plane/issues/6) | [#15](https://github.com/StefanNav/agent-control-plane/pull/15) | [phase-5-onboarding.md](plans/phase-5-onboarding.md) |
| 6 | Governance and fast follows | ⏸ At checkpoint | `phase-6-governance` | [#7](https://github.com/StefanNav/agent-control-plane/issues/7) | [#16](https://github.com/StefanNav/agent-control-plane/pull/16) | [phase-6-governance.md](plans/phase-6-governance.md) |
| 7 | Earned autonomy | ☐ Not started | `phase-7-autonomy` | [#8](https://github.com/StefanNav/agent-control-plane/issues/8) | – | to write (Task 7.0) |
| 8 | Stories and portfolio layer | ☐ Not started | `phase-8-stories` | [#9](https://github.com/StefanNav/agent-control-plane/issues/9) | – | to write (Task 8.0) |
| 9 | Polish and launch | ☐ Not started | `phase-9-polish` | [#10](https://github.com/StefanNav/agent-control-plane/issues/10) | – | to write (Task 9.0) |

GitHub issue numbers are phase + 1 (issue #1 = Phase 0). Status values: ☐ Not started · ◐ In progress · ⏸ At checkpoint (awaiting review) · ☑ Merged.

---

## Phase 0: Setup

**Goal:** The project exists on GitHub with this plan, the conventions file and tracking in place.
**Detailed steps:** [`docs/plans/phase-0-setup.md`](plans/phase-0-setup.md)

- [x] 0.1 Move the design handoff README to `docs/design-handoff.md`; write a short project `README.md`; update references
- [x] 0.2 Write `CLAUDE.md` (done during planning, 2026-10-08)
- [x] 0.3 Create the public repo `StefanNav/agent-control-plane` and push `main`
- [x] 0.4 Create labels, the 10 phase milestones and the 10 phase issues
- [x] 0.5 Checkpoint: Stefan reviews the repo, issues and plan on GitHub (approved 2026-10-08)

**Done when:** repo is public, `main` has spec + plan + `CLAUDE.md`, 10 milestones and 10 issues exist, no `.docx` in history.
**Handoff notes (2026-10-08):**
- Repo: https://github.com/StefanNav/agent-control-plane (public, default branch `main`, topics set). Phase 0 worked directly on `main`; from Phase 1 every phase uses a branch and a PR.
- Tracking: milestones 1–10 and issues #1–#10 are Phases 0–9 in order (**issue number = phase + 1**). Labels: `phase-0`…`phase-9`, `checkpoint`, `design-qa`. When ticking a phase task, tick it here and in that phase's issue body.
- The design handoff now lives at `docs/design-handoff.md`; the root `README.md` is an interim project README (Phase 9 replaces it).
- Brand is **Signal** (spec D7). The real company name is listed only in the local, never-committed `info/forbidden-terms` file in the git common dir; run the check in `CLAUDE.md` before every push (must print nothing). A fresh clone won't have that file: ask Stefan.
- History was rewritten once, before the first push, to remove a leaked mention. Nothing after the first push has been rewritten; never rewrite pushed history.
- Gotcha: the Bash tool's shell is zsh, where arrays start at 1. Wrap scripts that use arrays in `bash -c '…'`.
- Vercel isn't linked yet; that's Phase 1 Task 1.10.

## Phase 1: Foundation

**Goal:** A deployed app shell where every designed route exists (as a placeholder naming its frames), built on the full Countersign token and primitive layer.
**Detailed steps:** [`docs/plans/phase-1-foundation.md`](plans/phase-1-foundation.md)

- [x] 1.1 Scaffold Vite + React + TS with pnpm, ESLint, Prettier, Vitest; `pnpm check`
- [x] 1.2 Tokens, global styles, fonts, keyboard-only focus rings
- [x] 1.3 Icon set
- [x] 1.4 Form primitives: Button, Field, Input, Select, Textarea, Checkbox, RadioCardGroup, Segmented, FilterPill
- [x] 1.5 Display primitives: Card, Paper, DefinitionList, Notice, StatStrip, Sparkline, ProgressBar, RuleTag, LogRow, Avatar
- [x] 1.6 Interactive structures: Table, Tabs, WizardSteps, Menu, Modal
- [x] 1.7 Layout: TopNav, PageHeader, Split / SplitL / Body, AppShell with prototype bar shell, NotFound
- [x] 1.8 Route table + router + placeholder pages + Playwright route smoke
- [x] 1.9 Primitives gallery at `/about/components`
- [x] 1.10 CI, Vercel link and first deploy; checkpoint (approved and merged 2026-10-08)

**Done when:** every route in spec §5.5 loads directly on the Vercel URL inside the shell; gallery shows every primitive; CI green.
**Handoff notes (2026-10-08):**
- **What exists**
  - `src/design-system/`: `tokens.css` (light + `[data-theme="dark"]`), `type.module.css` (type roles), `global.css`, `focus.ts` (keyboard-only rings), `icons/`, `primitives/<Name>/` (24 primitives), and the barrel `index.ts`. Import primitives from `src/design-system`.
  - `src/layout/`: `TopNav`, `PageHeader` (breadcrumb, title, status, idLine, chips, people, sub, actions, tabs, steps), `layouts.tsx` (`Split`, `SplitL`, `Body`), `NotFound`.
  - `src/app/`: `nav.ts` (`NAV_ITEMS`, `NavSection`, `ShellKind`, `RouteHandle`), `routes.ts` (`routeTable`, `redirects`: pure data, also read by Playwright), `router.tsx` (the `PAGES` map), `AppShell`, `Placeholder`.
  - `src/prototype/`: `PrototypeBar` (static for now), `ComponentGallery` (`/about/components`).
  - `tests/e2e/`: `routes.spec.ts` (every route loads directly with no console errors, plus not-found, redirect and current-nav checks), `gallery.spec.ts`, and the `console.ts` error collector.
- **How to replace a placeholder with a real screen:** build the page under `src/features/<area>/`, then add `'<route path>': <Page />` to `PAGES` in `src/app/router.tsx`. The route smoke test covers it automatically.
- **Versions:** React 19.2, React Router 8.4, Vite 8.3, Vitest 5, TypeScript 6.0, ESLint 10 (flat config via `defineConfig`), Playwright 1.6x, pnpm 11.5.1 (pinned in `packageManager`), Node 24.
- **Gotchas**
  - Vitest needs `css: true`; otherwise CSS imports are empty.
  - React Hooks v7 lint rejects writing refs during render.
  - React Refresh lint warns when a component file also exports functions, so put helpers in a sibling `.ts`.
  - `tsconfig.e2e.json` type-checks `tests/` and `playwright.config.ts`.
  - Playwright builds and previews on port 4173.
  - `.claude/launch.json` starts `dev` (5173) and `designs` (4599) for the in-app browser.
- **Behaviour decided in review:**
  - `Modal` owns the keyboard while open: Escape closes it, Tab is trapped, and focus that escapes is pulled back. Clicking the scrim does **not** close it, so a typed reason can't be lost.
  - Every route has an `errorElement` (`RouteError`), so a page that throws shows an in-app screen inside the shell.
  - `Table` row keys ignore events from controls inside cells.
  - `WizardSteps` has a `none` mark (not started: no icon, muted label). Mark sizes match E1.
  - For Phase 3: every table row is a Tab stop (per the handoff), so consider roving tabindex for long boards.
- **Design values not in the handoff:** dark `--cs-fill` = `oklch(0.25 0.005 90)`. The product page title has no letter-spacing (as in `cs-build.js`).
- **Vercel:** project `stefannavs-projects/agent-control-plane`, production branch `main`, public URL https://agent-control-plane-mocha.vercel.app. PR previews sit behind Vercel login (default protection). The project's first deployment came from this branch and was auto-promoted to production; merging to `main` replaces it.
- **What Phase 2 needs to know**
  - `PrototypeBar` hardcodes "Viewing as Marcus", and `AppShell` passes `avatarInitial="M"`. Wire both to the store's persona.
  - Add a "Product components" section (light + dark) to `ComponentGallery`.
  - Product components should compose primitives (`Table` for agent rows, `Modal` for pause/resume, `Notice`, `RuleTag`, `Icon`).
  - `Table` already supports `groups` (inbox), `density="board"`, `isMuted` and `textSize`.

## Phase 2: Components and data

**Goal:** The 10 Countersign product components and the whole mock data layer, with persona switching working.

- [x] 2.0 Write `docs/plans/phase-2-components-data.md`; commit
- [x] 2.1 Domain types `src/data/types.ts` (spec §6.1; settle field shapes by reading the frames; log choices)
- [x] 2.2 Clock and formatters `src/lib/clock.ts`, `src/lib/format.ts`: `DEMO_NOW`, `formatClock`, `formatDay`, `formatRelative` ("in 48 min", "Overdue 12 min"), `formatMs` (`09:38:04.512`); tests use frame values
- [x] 2.3 Seed `src/data/seed/*`: people, role assignments, 5 divisions, 41 agents (Medications fully detailed), activities, privileges, hard stops, grants, exceptions, actions, incidents; invariant tests (counts 6/20/8/4/3, referential integrity, unique IDs)
- [x] 2.4 Permissions `src/store/permissions.ts`: `can(personaId, action, ctx)`; table-driven test mirroring spec §7
- [x] 2.5 Store `src/store/*`: Zustand + persist (versioned key, migrate-to-seed), persona slice, audit log, actions guarded by `can()`; **Review focus 1, 2, 5 tests**
- [x] 2.6 Scenarios `src/data/scenarios/*`: registry + `loadScenario(id)`; one test per scenario from spec §6.3
- [x] 2.7 Product components 01–05: StatusChip, AgentRow, ExceptionItem, PrivilegeCard, AutonomyLadder (design handoff data rules as tests)
- [x] 2.8 Product components 06–10: HardStopCard + InstructionCard, SystemsVerbsGrid, PauseDialog + ResumeDialog, ActionTrace, MonitorHealth
- [x] 2.9 Gallery: components section in light and dark (`data-theme="dark"` wrapper)
- [x] 2.10 Prototype bar: PersonaSwitcher, Reset demo; TopNav avatar from persona; persona landing routes (spec §4.4); checkpoint

**Done when:** gallery matches `designs/Countersign Components.dc.html` side by side in light and dark; switching persona changes avatar and lock states; Reset demo restores seed.
**Handoff notes (2026-10-08):**
- **What exists**
  - `src/data/`: `types.ts` (the domain model; `DemoState` is everything), `seed/` (`createSeed()`, `SEED_VERSION = 1`) and `scenarios/` (`buildScenario(id)`: baseline, med-rec-paused, resume-requested, awaiting-signature, step-down-threshold).
  - `src/lib/`: `clock.ts` (`DEMO_NOW` and formatters that take an explicit `now`) and `trend.ts` (`trendPoints(index, { end, drift })` reproduces the design's sparklines).
  - `src/store/`:
    - `index.ts`: `useDemo` (the app store), `createDemoStore(storage)` for tests, and `dataOf()`.
    - `runAction.ts`: the only way to change state; it checks `can()` and writes the audit log.
    - `permissions.ts`: `can(state, personaId, action, ctx)` and `lockReason()`.
    - `storage.ts`: `safeStorage` (localStorage with a memory fallback) and `createMemoryStorage()`.
    - `selectors.ts`: `selectPersona` and `selectCan`.
  - `src/components/`: the 10 product components, all pure and exported from `src/components/index.ts`, each with a view-model type (`AgentRowView`, `ExceptionView`, `PrivilegeCardView`, `ActionTraceView`, …).
  - `src/prototype/`: `personas.ts` (`PERSONAS` with landing routes), `PersonaSwitcher`, the wired `PrototypeBar`, and `ComponentGallery` (`fixtures.tsx` holds the component-sheet data verbatim).
- **How to show data on a screen:** write a selector that maps domain objects to a component's view model, formatting times with `src/lib/clock.ts` against `state.now`. Keep components pure.
- **How to add a state change:** add a method to `DemoActions` in `src/store/index.ts` that calls `act({ action, ctx, audit, mutate })`, with a failing store test first. If the seed or `DemoState` shape changes, bump `SEED_VERSION`.
- **Review fixes (fresh reviewer, all test-first)**
  - Saved state is used only if it's a full snapshot of the current seed version with a known persona.
  - `claimException` refuses already-claimed or resolved items and makes the claimer the owner.
  - `can()` fails closed on unknown agents.
  - Dana keeps exactly the program-lead column: new sponsors Hana (Imaging referrals) and Owen (Patient messages).
  - Omar is technical owner outside Medications.
  - `resume-requested` keeps the 09:52 clock (paused at 07:38). `SEED_VERSION` is 2.
- **Deferred to later phases:** in dark mode, white icons on ink surfaces (the hard-stop lock and the resume dialog's "done" check) should use `--cs-raised`. Persona names live in both the seed and `PERSONAS`. An ESLint `no-restricted-imports` rule could keep `src/components` free of store imports.
- **Seed facts**
  - The 20 Medications agents are verbatim from the division view's `AG` array.
  - The other 21 agents are invented, except Prior Auth Agent and Discharge Summary Agent.
  - Baseline privileges follow the 08 Dec division view.
  - Inbox times are aligned to 09:52. Phase 3 refines exceptions against the E5 frames and bumps `SEED_VERSION`.
- **Gotchas**
  - After renaming a module's file extension, restart the Vite dev server, or it keeps resolving the old path and the page goes blank.
  - Chrome serializes custom-property colours differently from computed colours, so tests should compare resolved colours.
  - `Menu` sets its own ink and focus colour, so it reads correctly inside the dark prototype bar.
  - Board-density table rows are exactly 32 px with no vertical padding.
- **What Phase 3 needs**
  - Selectors for the hospital board (division summaries), the division rows (`AgentRowView` from agents, activities and privileges, with `trendPoints(index, metrics.trend)`) and the inbox groups (`ExceptionView`, overdue computed from `state.now`).
  - Entity "Not found" for unknown ids (Review focus 4).
  - Consider roving tabindex for long boards.
  - Match the E5 frames' copy and times.

## Phase 3: Command Board and inbox

**Goal:** Owners supervise by exception (E4, E5).

- [x] 3.0 Write `docs/plans/phase-3-board-inbox.md`; commit
- [x] 3.1 Seed refinement from E4/E5 (exceptions, activities, recent actions, events; `SEED_VERSION` 3)
- [x] 3.2 Board and inbox selectors (severity sort, overdue/escalation/freshness from `now`)
- [x] 3.3 Hospital board 4a with View toggle → tiles 4d and exceptions-first 4f
- [x] 3.4 Division view 4b with the selected-agent panel
- [x] 3.5 Agent view 4c with tabs (Activities, Actions, Privileges, History composed; Scorecard in Phase 5); unknown agent renders `NotFound` (**Review focus 4 test**)
- [x] 3.6 Wall display `/wall` (4e): dark, own type scale, no controls (corner "Exit wall display")
- [x] 3.7 Inbox 5a: list + detail with the 14-day chart, claim and snooze
- [x] 3.8 Dismiss with a reason 5b
- [x] 3.9 Daily digest 5c, Log, Waiting on others
- [x] 3.10 Escalated to the sponsor 5d (`stale-escalated` scenario, assign, `?scenario=` param)
- [x] 3.11 E2E journey "find the one problem among 20"; checkpoint

**Done when:** frames 4a–4f, 5a–5d built and visually checked.
**Handoff notes (Phase 3 → Phase 4)**

- **What exists**
  - Board: `/operations` (4a; `?view=tiles` 4d, `?view=exceptions` 4f, `?division=`), `/operations/divisions/:id` (4b, `?agent=`), `/operations/agents/:id` (4c, `?tab=`, `?control=`), `/wall` (4e, kiosk shell).
  - Inbox: `/operations/inbox[/:exceptionId]` with `?tab=waiting|log` and `?view=digest` (5a–5d).
  - Store actions: `claimException`, `snoozeException`, `dismissException`, `assignException`, `answerQuestion`. All go through `runAction`.
  - Scenario `stale-escalated` (clock 12:00 via `advanceClock`, which keeps live heartbeats live). `?scenario=<id>` on any app URL loads a scenario once and drops the param.
  - Primitives gained `LinkButton`, Table `minRowHeight` (default rows now 56), Sparkline `color`, a `stale` Notice mark. Components gained `noticeMark(status)`. Feature-level `TrendChart` (inbox).
- **Review fixes (fresh reviewer, all test-first):** keyboard Enter/Space select table rows; notice marks follow status; paused rows withdraw metrics; the Controls menu opens a pending-control notice; the inbox detail follows state, kind and viewer (closed outcome, incident link, answerable questions, sponsor-only escalation notice, no stale deadline line, dismiss refusal shown); unknown exception ids say so. `SEED_VERSION` is 4.
- **Deferred minors:** snooze hides items from copied people and holds escalation (fix before Phase 8 moves the clock); 4a "Open exceptions" counts agents; fixed-text silence durations; "Work N exceptions" counts the whole inbox; unknown `?agent=`; banner "Open PRV-…" target; assign to current owner; the "E" shortcut (WCAG 2.1.4), 4f filter `aria-pressed`, arrow keys not moving the division panel, lock reasons on native-disabled buttons; composed agent tabs thin outside Medications; small code tidy (duplicated status icon maps, raw colours in two CSS files, unused `log`/`logTotal`, whole-store subscriptions); `isCurrentSnapshot` checks only top-level keys.
- **What Phase 4 needs**
  - Replace the `?control=` pending notice in `AgentView` with the real dialogs (`PauseDialog`/`ResumeDialog` exist in components). Links already point there: division panel "Pause agent", inbox "Return to Shadow", escalated "Pause …".
  - **Audit pauses as action `'Paused'`.** The wall's "last hour" count reads that string.
  - `/operations/incidents/inc-0029` is linked from the inbox incident and the board; it is still a placeholder.
  - Locked controls should use the designed locked state, not native `disabled` + `title`.
- **Gotchas**
  - The Tabs primitive is a labelled `nav` of links, so e2e finds tabs as links (`navigation "Inbox" → link "Needs me · 4"`).
  - Playwright won't click an `aria-disabled` button; assert the attribute and `click({ force: true })`.
  - Caps labels are Plex **Mono** 12/16 600 with 0.05em tracking.
  - `figure` has a default 40px margin; reset it.
  - CSS-module order lets a feature class override a primitive's `min-height` (the dismiss reason box).

## Phase 4: Controls and audit

**Goal:** Stop easy, resume deliberate; any action can be reconstructed (E6, E7, 8c).

- [x] 4.0 Write `docs/plans/phase-4-controls-audit.md`; commit
- [x] 4.1 Data: incidents, pause detail, inventory records, ACT-88171, tiers; `resume-requested` at 11:58 (`SEED_VERSION` 5)
- [x] 4.2 Locked buttons (designed locked state) and the control menu 6a
- [x] 4.3 Pause with impact preview 6b; board, division and agent views agree
- [x] 4.4 Fix one thing 6c: return an activity to Shadow, revoke a tool
- [x] 4.5 Two-person resume 6d, 6e (stays paused until both; each reason logged)
- [x] 4.6 Inventory 8c (Drafts rows from 1i; Intake and Retired composed); disable or retire 6f (typed confirmation)
- [x] 4.7 Action list 7a and action trace 7b; open an incident
- [x] 4.8 Incidents list (composed) and incident record 7c
- [x] 4.9 Export for a surveyor 7d
- [x] 4.10 E2E journey "stop easy, resume deliberate"; checkpoint

**Done when:** frames 6a–6f, 7a–7d, 8c built and visually checked.
**Handoff notes (Phase 4 → Phase 5)**

- **What exists**
  - Agent view controls (6a–6f): `AgentView` mounts the dialogs from `?control=pause-activity|pause-agent|pause-division|shadow|revoke|disable|retire` (`pause` is an alias). Only a live agent offers pause and narrow fixes; a disabled one offers only Retire.
  - The resume panel (6d/6e) is inline on the agent view for any pause, including activity pauses and seeded pauses without detail.
  - New pages: `/inventory` (8c; Drafts rows from 1i, Intake and Retired composed), `/operations/actions` (7a), `/operations/actions/:id` (7b), `/operations/incidents` (composed), `/operations/incidents/:id` (7c), `/reports/export` (7d).
  - Store actions: `pauseAgent`, `returnToShadow`, `revokeTool`, `requestResume`/`approveResume`/`declineResume`/`withdrawResume`, `disableAgent`, `retireAgent`, `openIncident`, `addIncidentEntry`, `completeCorrection`, `closeIncident`, `buildExport`. Shared pure mutations in `src/store/mutations.ts`.
  - Seed v5: incidents (INC-0029 open, INC-0030 closed), pause detail, six retired agents (RET-01..06), intakes, drafts, exports, `stats24h.actionsToday`, actions that carry their own `context` (privilege, checks, conditions).
  - Design system: `Button locked` (designed locked state, reason via aria-describedby), `FilterPill` passes button props (menu trigger), `ActionTrace layout="rows"` (7b), `PauseDialog` follows 6b.
- **Review fixes (fresh reviewer, all test-first):**
  - Disable, pause and resume compose: disabled agents can't be paused, and disable or retire clears any pause and resume request.
  - Activity pauses and seeded pauses show, and can be resumed.
  - A pause is written to the agent's open incident.
  - Past actions read as they happened.
  - A retired agent's header says Retired.
  - Exports need the audit right for every agent.
  - The board's incident badge and resume line are derived from data.
  - Dialogs opened by URL are read only for personas without the right.
  - Smaller fixes: disabled agents withdraw their numbers; the single-activity menu reads "Its one activity".
- **Deferred minors:**
  - A few refusals in the incident page are swallowed (the controls only show to allowed personas).
  - Incident close/complete permissions sit outside `can()`.
  - 7d's period doesn't filter its contents.
  - The Fix-one-thing mode switch uses Tabs semantics.
  - A division pause needs one resume per agent.
  - The other party isn't told of a resume request in the inbox.
  - 7b doesn't show existing linked incidents.
  - Activity- or division-level disable (story E6.4) isn't built.
- **What Phase 5 needs**
  - Onboarding owns 1i: "Continue" to the first missing field and the Drafts tab's visual check; the drafts are `state.onboardingDrafts`.
  - `returnToShadow` drafts a v+1 privilege in state `awaiting` (Shadow, proposed Draft) for the sponsor. Phase 5's signing (3c) should pick it up.
  - `requestGoLive`, the committee tier rule (risk tiers are now seeded from 8c) and Sam's "technical only" scope are still open from Phase 2.
  - `/inventory/agents/:id` (2d) is linked from the inventory record panel and the agent view's "Open in Inventory".
- **Gotchas**
  - Every pause goes through `applyPause`, which writes a `log-pause-*` event. The export counts pauses from those events.
  - A `useDemo` selector must return state, a primitive or an object already in state, never a freshly built array (React #185 loop).
  - In React 19, `ref` is an ordinary prop; that's how `FilterPill` becomes a Menu trigger.

## Phase 5: Onboarding and go-live

**Goal:** Intake to signed privilege (E1, E2, E3).
**Note from the Phase 2 review:** the permission matrix needs three additions here. Add a `requestGoLive` action for owners. Make committee go-live approval tier-aware (medium and high only). Decide whether Sam's "technical only" exception scope differs from "own agents".

- [x] 5.0 Write `docs/plans/phase-5-onboarding.md`; commit
- [x] 5.1 Data model, catalogue, progress and `rewindTo` (onboarding records replace static drafts; Lena; Tier 4; seed v6)
- [x] 5.2 Wizard shell (6 steps, marks derived from the record), start from intake 1a + name the humans 2a (all four required; span warning above 7); `onboarding-intake`
- [x] 5.3 Job description 1b (7 fields, "5 of 7", missing listed, welcome back, `?field=`) and Drafts 1i (Continue opens the first missing field); `onboarding-at-5-of-7`
- [x] 5.4 Systems and verbs 1c (nothing granted until ticked; Sign and Order locked by `ORG-POL-02`; changed ring; reach line); `onboarding-systems`
- [x] 5.5 Tools and hard stops 1d (library or plain language; "would have blocked" counts; Send to Priya unlocks at 12 of 13; inbox hand-off); `onboarding-tools-tested`
- [x] 5.6 Sponsor approval 1e, request changes on HS-11 1f, returned to Sam 1g (only HS-11 reopens; any edit resets Priya's review); `onboarding-sponsor-review`, `onboarding-returned-hs11`
- [x] 5.7 Ready for review 1h (frozen v1.0); `onboarding-ready`
- [x] 5.8 Agent record and risk tier 2b (factors shown; changing it requires a reason; tier-aware committee); `review-risk-tier`
- [x] 5.9 Committee packet 2c (Approve / with conditions / Re-review / Deny) and decision logged 2d (conditions carry onto the privilege); `review-committee`, `review-decided`
- [x] 5.10 Shadow scorecard 3a and sample case 3b (side by side, line by line); `requestGoLive`; `shadow-day-21`
- [x] 5.11 Sign the privilege 3c (missed target → written reason) and My privileges 3d (overdue review raises an exception; renewal); `awaiting-signature` at 06 Nov
- [x] 5.12 E2E: intake → job → systems → tools → approval → committee → (skip 21 days) → sign; checkpoint (awaiting Stefan's approval)

**Done when:** frames 1a–1i, 2a–2d, 3a–3d built and visually checked.
**Handoff notes (Phase 5 → Phase 6)**

- **What exists**
  - Onboarding (E1, 2a): `/inventory/agents/:id/onboarding/:step` (`intake | job | systems | tools | approval | review`). It's one record per agent in `state.onboardings`. The rail, side panels and Drafts read the pure rules in `src/store/onboardingRules.ts`:
    - `stepStates`, `openStep`, `recordItems`, `jobFields`, `systemsProgress`, `reachLine`
    - `riskFactors`, `shadowProgress`, `criteriaStatus`, `conditionRange`
  - AIMS Review (E2):
    - `/inventory/agents/:id`: the record. 2d once decided; composed for the 40 agents without a record.
    - `/inventory/agents/:id/risk-tier` (2b)
    - `/portfolio/reviews/:id` (2c)
  - Go-live (E3):
    - the agent view's Scorecard tab (3a, with `?activity=`)
    - `/operations/agents/:id/cases/:caseId` (3b)
    - `/inventory/privileges/:code/sign` (3c), which signs, renews, or shows a privilege read only
    - `/portfolio/privileges` (3d, `?tab=all|overdue|due`)
  - Store actions (all on `runAction`):
    - `startOnboarding`, `updateJob`, `updateSystems`, `testHardStop`, `sendToSponsor`
    - `requestSponsorChanges`, `replyToSponsor`, `approveAsSponsor`
    - `setRiskTier`, `recordDecision`
    - `requestGoLive`, `extendShadow`, `flagCaseLine`
    - `signPrivilege`, `returnPrivilegeRequest`, `askForEvidence`
  - Pure mutations live in `src/store/onboarding.ts`; scenarios replay them.
  - Hand-offs raise inbox items with a `link` (R9). `raiseOverdueReviews` runs whenever a scenario moves the clock forward.
- **Time model (R1).** `rewindTo(s, at)` in `src/data/scenarios/rewind.ts` turns the hospital back to how it stood at `at`. `medRecAt(stage)` in `src/data/scenarios/onboarding.ts` rewinds, removes Med Rec, then replays its dated timeline. The new scenarios are:
  - `onboarding-intake`, `onboarding-at-5-of-7`, `onboarding-systems`, `onboarding-tools-tested`
  - `onboarding-sponsor-review`, `onboarding-returned-hs11`, `onboarding-ready`
  - `review-risk-tier`, `review-committee`, `review-decided`
  - `shadow-day-21`, and `awaiting-signature` (now at 06 Nov 09:52)
- **Seed v6:**
  - Onboarding records: Med Rec's complete record, plus the live draft Culture Follow-up (REQ-0099)
  - Intakes now reserve the agent's id and code
  - The catalogue (`src/data/seed/catalogue.ts`): job templates, gateway tools, the hard-stop library, tier rules (Tier 4 added), board meetings
  - Scorecards and 12 sample cases (4105 verbatim), and ACT-61840
  - Lena (Discharge technical owner)
  - Privilege codes count down from PRV-0141, so PRV-0142 comes next in October
  - Privileges have versions: the latest by code wins; `latestByCode` / `latestPrivilege`
- **Design system and components:** `RadioCardGroup columns`, `SystemsVerbsGrid selected/policyText`, `HardStopCard children`, and `addDays` in the clock (safe across daylight saving).
- **What Phase 6 needs to know**
  - The "Suggest a split" button on 2a links to `/settings/divisions/<id>` (8a).
  - `onBoard()` now also excludes `onboarding` and `inReview` agents. New agent lists should use it.
  - Moving the clock forward in a scenario raises overdue reviews. `epic-fixed-later` (+9 days) will raise them for anything due by 17 Dec. The lapse to Shadow 14 days later isn't built.
  - Drafts can be started at baseline from REQ-0106 and REQ-0108 (Dana, Inventory → Intake → Open).
- **Review fixes (fresh reviewer, all test-first):**
  - A go-live request sent back and asked again can be signed. New versions number from the code's highest version, and the sign page resolves to the version in force.
  - Tier 1 starts shadow with no board, and the packet, record and header say so.
  - The re-review inbox item closes when the tier is set again.
  - Sending the set back to the technical owner needs the hard stop it's about.
  - Rewind rolls later signings back a review cycle, so nothing is signed after `now`.
  - The export reads the record as it stood.
  - Hand-offs with a link never escalate, and the tier hand-off is due the day before the board.
  - The Activities tab reads the privilege in force, and new version ids come from the code.
- **Deferred minors:**
  - `signReason` is copied onto later versions.
  - `startOnboarding` accepts any people, and an out-of-range tier would throw.
  - Deny doesn't mark the intake closed.
  - Some Med Rec copy shows on generic intakes ("21-day shadow", "pharmacist").
  - Small duplication in `selectSignature`.
  - Activities can't be removed or renamed.
  - The tools hand-off is missed if the never list is filled after the grid.
  - The send-back-to-Marcus copy overstates what reopens.
  - Closed v1 cards read "Awaiting signature".
  - A shadow agent's board review date shows the shadow end.
  - A self-escalation line shows on the sponsor's own hand-offs.
- **Gotchas**
  - Privileges have several versions per code. Never `find` by activity; use `currentPrivilege` (board), `latestPrivilege` or `latestByCode` (store).
  - Number new versions with `nextVersion(s, code)`.
  - Scenario stages are cumulative: `medRecAt(stage)` replays every step up to the stage. Pins (versions, autosave times) are steps too.
  - Adding minutes across 01 Nov shifts the local hour. Use `addDays` for day arithmetic.
  - The persona switcher navigates to the persona's landing, so e2e tests switch first, then `goto`.

## Phase 6: Governance and fast follows

**Goal:** Divisions and access, change detection, clinician feedback, reviewer behaviour (E8, E9, E10, E11).

- [x] 6.0 Write `docs/plans/phase-6-governance.md`; commit
- [x] 6.1 Division settings 8a (owner, sponsor, lapse policy that acts on save and when the clock moves, escalation chain; seed v7)
- [x] 6.2 New division and split (composed from 8a; the board takes a sixth division)
- [x] 6.3 People and roles 8b (Sam gets a second division; `can()` results follow the role change; add, remove, invite)
- [x] 6.4 Epic stand-in `/epic`: flag in one action 10a (reason prefilled from Ana's edit; the flag reaches Marcus's inbox)
- [x] 6.5 New version held at the gateway 9a (v1.5.0; re-validate before it serves; `change-detected-v150`)
- [x] 6.6 "Fixed in v1.5.0" 10b (`?day=later`, scenario `epic-fixed-later`)
- [x] 6.7 Unregistered caller 9b (flagged to Dana; start onboarding from REQ-0081)
- [x] 6.8 Reviewer behaviour 11a and drill into 6 North 11b (by unit and shift, never by named pharmacist; Priya signs the sampling change)
- [x] 6.9 E2E journeys (flag → v1.5.0 → fixed; access follows accountability); checkpoint

**Done when:** frames 8a, 8b, 9a, 9b, 10a, 10b, 11a, 11b built and visually checked.
**Handoff notes (Phase 6 → Phase 7)**

- **What exists**
  - Settings (E8):
    - `/settings/divisions/:id` (8a): owner, sponsor, lapse policy, grace, escalation chain; `?tab=agents` (composed); `?split=1` / `?new=1` open the composed new-division modal
    - `/settings/people` (8b, `?person=`): roles add / remove / invite; the capability list is `can()` on the chosen role alone
  - Changes (E9.1): the agent view's Changes tab (9a) for agents with a change record; `src/store/changes.ts` (`applyDeploy`, `applyReplay`, `applySystemsSignOff`, `applyHardStopApproval`, `applyAccept`, `withdrawExpiredChanges`); catalogue `V150`
  - Gateway (E9.2): `/inventory/unregistered(/:callerId)` (9b, `?tab=low|dismissed`); `state.callers`; Dana's caller items; REQ-0081 → `discharge-huddle` (AGT-0180)
  - Epic (E10): `/epic` (10a, 10b; `?day=later` loads `epic-fixed-later`); `state.epicDrafts`, `state.flags`; flag items `kind: 'flag'` in the owner's inbox
  - Reviewers (E11): `/operations/reviewers` (11a, `?division=`, `?weeks=4`) and `/:unitId` (11b, `?respond=`); catalogue `REVIEWER_STATS`; `state.reviewChanges`; the division tab strip `DivisionTabs` (Board · Reviewer behaviour) on 4b, 11a, 11b
  - Store actions (all on `runAction`): `updateDivisionSettings`, `createDivision`, `addRole`, `removeRole`, `invitePerson`, `flagDraft`, `answerFlag`, `dismissFixNotice`, `startReplay`, `signOffSystems`, `approveChangeHardStop`, `acceptChange`, `blockCaller`, `dismissCaller`, `messageCallerOwner`, `proposeReviewChange`, `signReviewChange`, `declineReviewChange`, `shareReviewerFinding`
  - New `PermAction`s: `flagDraft` (frontline), `revalidateChange` (owner), `decideCaller` (program lead), `proposeReviewChange` (owner, program lead), `signReviewChange` (sponsor); `manageDivisions` is now used; technical owners gain `pause`
- **Time model (R1).** v2 frames are re-dated with `fromMarch(iso, E10_SHIFT | E11_SHIFT)` (`src/data/seed/redate.ts`). Phase 7's E12–E15 (also "March 2027") should follow the same rule: put each frame's "today" on the day it is shown and shift its other dates.
- **The clock** (`src/data/scenarios/clock.ts`): `advanceClock` keeps live heartbeats live however often it moves, then raises overdue reviews, applies lapse policies and withdraws expired held builds (each idempotent). `settleBefore(s, day)` marks earlier items handled for scenarios that skip days.
- **Seed v7:** division `graceDays` and `escalation`; role `since`; flags FB-2277…FB-2290; Epic draft DR-88412 and ACT-88209; three unregistered callers plus 7 low-volume and 12 dismissed; REQ-0081.
- **Review fixes (fresh reviewer, all test-first; 2 minors re-graded up):**
  - I1: after a grace period the lapse acts at 17:00 when the overdue item falls due (so 9a at 09:52 shows Duplicate Rx still at Draft, lapsing that evening); a grace change moves open deadlines; 3d's notice follows the policy and says what happened once it acted.
  - I2: a technical-owner role can't be removed while the person is named technical owner of agents in that division.
  - I3: items from a non-persona or with no agent name their source (no "—" or "undefined"); hand-offs with a link have no "goes to" line.
  - I4: `Privilege.lapsedAt` marks that the policy acted, so a resume or a later save doesn't pause again.
  - I5: items about a unit carry `divisionId` and follow role changes; a split hands the moved agents' owner and sponsor items over.
  - M6 (re-graded): someone left with no role reads "No division".
  - M9 (re-graded): October rewinds drop later callers, flags, Epic drafts, changes and review changes.
- **Deferred minors** (see the session's final message for the full list): empty-slug names; "Priya told" as a shared log row; same-save sponsor + escalation edit; snoozing agent-less items; three a11y nits (nested <main> on /epic, `htmlFor` in read-only settings, 9a's check state visual only); 9a's timeline without days; one reason text for every unit's proposal; week-old leftovers after the skip; "In progress · <owner>" names the current owner; lapses act on disabled agents; two comments glued to braces.
- **Gotchas**
  - Exceptions with `agentId: ''` (caller and unit items): every list that looks up the agent must tolerate it (the 4f board filters them out).
  - `advanceClock(s, to)` captures the old clock first; `applyLapses(s, from)` uses it to date a lapse.
  - Scenarios that skip days call `settleBefore` so last week's items don't sit overdue.
  - The Epic page lives in the prototype shell: no TopNav, and `?scenario=` still works there.

- **What Phase 7 needs to know**
  - E13's sampling queue and review levels: 11b's signed "sampling" change leaves `state.reviewChanges` entries (`until` = +14 days); the 6 North rate reads 20 % while it runs. The "Sampling" division tab is left for Phase 7 to add to `DivisionTabs`.
  - E15 step-down: PRV-0142's "New version" trigger must not fire for a build accepted through re-validation (R10). 11a's "7 West and 8 East: see the step-down in E15" line was left out; add it when a step-down exists.
  - Items about a caller or a unit have `agentId: ''`; the Exceptions-first board skips them. Any new list of exceptions that looks up the agent must do the same.
  - `can()` and `lockReason()` take any person id.



## Phase 7: Earned autonomy

**Goal:** RUAIH evidence, review levels, promotion, step-down (E12–E15). After this phase all 55 frames exist.

- [ ] 7.0 Write `docs/plans/phase-7-autonomy.md`; commit
- [ ] 7.1 RUAIH coverage 12a (14 agents × 7 elements; gaps with owners and due dates) and export packet 12b (gaps listed, not hidden)
- [ ] 7.2 Review level and rules 13a (rules move the level; people can tighten, never loosen) and sampling queue 13b
- [ ] 7.3 Sponsor signs a one-branch promotion 14a; above Tier 2 the board decides 14b
- [ ] 7.4 Step down on threshold breach 15a (Draft → Shadow) and on version change 15b (Supervised → Draft; moving up always needs a signature)
- [ ] 7.5 Frame audit: every row in the frame tracker is built; checkpoint

**Done when:** frames 12a–15b built and visually checked; frame tracker has no unbuilt rows.
**Handoff notes:** _written at the end of the phase._

## Phase 8: Stories and portfolio layer

**Goal:** Visitors can follow any persona's story or explore freely (spec §4).

- [ ] 8.0 Write `docs/plans/phase-8-stories.md`; commit
- [ ] 8.1 Story engine: `Story`/`Step` types, `?story=&step=` URL sync, scenario load on start, narration panel, `data-story-target` outline; **Review focus 4 test** (unknown story ignored, out-of-range step clamped)
- [ ] 8.2 Landing page `/`
- [ ] 8.3 Stories: Marcus, Priya, Dana (add `data-story-target` attributes to screens as needed)
- [ ] 8.4 Stories: Sam, Dr. Lee, Ana, Jordan
- [ ] 8.5 About page `/about`
- [ ] 8.6 Desktop gate below 1024 px
- [ ] 8.7 E2E: every story runs from step 1 to the end; checkpoint

**Done when:** all 7 stories complete in Playwright and by hand on the preview URL.
**Handoff notes:** _written at the end of the phase._

## Phase 9: Polish and launch

**Goal:** Portfolio-ready public release.

- [ ] 9.0 Write `docs/plans/phase-9-polish.md`; commit
- [ ] 9.1 Keyboard and accessibility pass (axe on key routes; modal focus; row keyboard paths)
- [ ] 9.2 Reduced motion and final interaction polish
- [ ] 9.3 Visual QA of every frame against its design; fix drift; tick "QA'd" in the tracker
- [ ] 9.4 Wall display legibility check for the ring-overload issue (spec O1)
- [ ] 9.5 Portfolio `README.md` (what it is, personas, stories, screenshots, stack, how to run), social preview image, page meta
- [ ] 9.6 Final production deploy, repo description and topics; checkpoint

**Done when:** every frame QA'd; production URL shared; README presents the project.
**Handoff notes:** _written at the end of the phase._

---

## Frame tracker

Tick **Built** when the screen exists at its route; tick **QA'd** after the side-by-side visual check at a checkpoint.

| Frame | Name | Route | Phase | Built | QA'd |
|---|---|---|---|---|---|
| 4a | Hospital view | `/operations` | 3 | ☑ | ☑ |
| 4a·wall/4e | Wall display | `/wall` | 3 | ☑ | ☑ |
| 4b | Division view | `/operations/divisions/medications` | 3 | ☑ | ☑ |
| 4c | Agent view | `/operations/agents/med-rec` | 3 | ☑ | ☑ |
| 4d | Tile grid | `/operations?view=tiles` | 3 | ☑ | ☑ |
| 4f | Exceptions first | `/operations?view=exceptions` | 3 | ☑ | ☑ |
| 5a | Inbox and detail | `/operations/inbox/:id` | 3 | ☑ | ☑ |
| 5b | Dismiss with a reason | inbox modal | 3 | ☑ | ☑ |
| 5c | Daily digest | `/operations/inbox?view=digest` | 3 | ☑ | ☑ |
| 5d | Escalated to Priya | inbox item | 3 | ☑ | ☑ |
| 6a | Control menu | agent view | 4 | ☑ | ☑ |
| 6b | Impact preview | agent view modal | 4 | ☑ | ☑ |
| 6c | Return activity to Shadow | agent view modal | 4 | ☑ | ☑ |
| 6d | Resume requested | agent view | 4 | ☑ | ☑ |
| 6e | Priya approves resume | agent view panel | 4 | ☑ | ☑ |
| 6f | Disable or retire | `/inventory` modal | 4 | ☑ | ☑ |
| 7a | Action list | `/operations/actions` | 4 | ☑ | ☑ |
| 7b | Action trace | `/operations/actions/act-88213` | 4 | ☑ | ☑ |
| 7c | Incident record | `/operations/incidents/:id` | 4 | ☑ | ☑ |
| 7d | Export for a surveyor | `/reports/export` | 4 | ☑ | ☑ |
| 8c | Inventory linked to ops | `/inventory` | 4 | ☑ | ☑ |
| 1a | Start from intake | `…/onboarding/intake` | 5 | ☑ | ☑ |
| 1b | Job description | `…/onboarding/job` | 5 | ☑ | ☑ |
| 1c | Systems and verbs | `…/onboarding/systems` | 5 | ☑ | ☑ |
| 1d | Tools and hard stops | `…/onboarding/tools` | 5 | ☑ | ☑ |
| 1e | Sponsor approval | `…/onboarding/approval` | 5 | ☑ | ☑ |
| 1f | Request changes | `…/onboarding/approval` | 5 | ☑ | ☑ |
| 1g | Returned to Sam | `…/onboarding/tools` | 5 | ☑ | ☑ |
| 1h | Ready for review | `…/onboarding/review` | 5 | ☑ | ☑ |
| 1i | Drafts in Inventory | `/inventory?tab=drafts` | 5 | ☑ | ☑ |
| 2a | Name the humans | `…/onboarding/intake` | 5 | ☑ | ☑ |
| 2b | Risk tier | `/inventory/agents/med-rec/risk-tier` | 5 | ☑ | ☑ |
| 2c | Committee packet | `/portfolio/reviews/med-rec` | 5 | ☑ | ☑ |
| 2d | Decision logged | `/inventory/agents/med-rec` | 5 | ☑ | ☑ |
| 3a | Shadow scorecard | `/operations/agents/med-rec?tab=scorecard` | 5 | ☑ | ☑ |
| 3b | Sample case | `/operations/agents/med-rec/cases/:id` | 5 | ☑ | ☑ |
| 3c | Sign the privilege | `/inventory/privileges/prv-0142/sign` | 5 | ☑ | ☑ |
| 3d | My privileges | `/portfolio/privileges` | 5 | ☑ | ☑ |
| 8a | Division settings | `/settings/divisions/medications` | 6 | ☑ | ☑ |
| 8b | People and roles | `/settings/people` | 6 | ☑ | ☑ |
| 9a | Version held at gateway | `/operations/agents/med-rec?tab=changes` (`change-detected-v150`) | 6 | ☑ | ☑ |
| 9b | Unregistered caller | `/inventory/unregistered(/:id)` | 6 | ☑ | ☑ |
| 10a | Flag from Epic | `/epic` | 6 | ☑ | ☑ |
| 10b | Fixed in v1.5.0 | `/epic?day=later` | 6 | ☑ | ☑ |
| 11a | Reviewer behaviour | `/operations/reviewers` | 6 | ☑ | ☑ |
| 11b | Drill into 6 North | `/operations/reviewers/6-north` | 6 | ☑ | ☑ |
| 12a | RUAIH coverage | `/reports/evidence` | 7 | ☐ | ☐ |
| 12b | Export packet | `/reports/evidence/med-rec` | 7 | ☐ | ☐ |
| 13a | Review level and rules | `/portfolio/activities/:id` | 7 | ☐ | ☐ |
| 13b | Sampling queue | `/operations/sampling` | 7 | ☐ | ☐ |
| 14a | Sponsor signs promotion | `/inventory/promotions/:id` | 7 | ☐ | ☐ |
| 14b | Board decides | `/portfolio/promotions/:id` | 7 | ☐ | ☐ |
| 15a | Threshold breach | agent view | 7 | ☐ | ☐ |
| 15b | Version change | `/portfolio/activities/:a/branches/:b` | 7 | ☐ | ☐ |
| C | Component sheet (light + dark) | `/about/components` | 2 | ☑ | ☑ (Phase 2 visual pass) |

---

## Decision log

Dated decisions that aren't obvious from the code. Newest last.

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | Stories + free explore with persona switcher (spec D1) | Shows each persona's use of the product and lets reviewers roam |
| 2026-10-08 | Public repo; `.docx` source docs git-ignored; source company not named (D2) | Portfolio visibility without publishing private framing |
| 2026-10-08 | Vite + React + TS + CSS Modules + Zustand + React Router; Vercel (D3) | Static, exact control over the spec, preview URL per PR |
| 2026-10-08 | Board table default; tiles / exceptions-first as a View toggle; `/wall` route (D4) | Keeps the alternative designs visible without competing |
| 2026-10-08 | Undesigned tabs composed from existing primitives only (D5) | Nav stays believable without inventing visuals |
| 2026-10-08 | Desktop only; gate below 1024 px (D6) | Designs are 1440 px |
| 2026-10-08 | Rolling-wave planning: each phase writes its detailed plan file as task N.0 | Later phases depend on interfaces built earlier |
| 2026-10-08 | Brand is **Signal**, a stand-in for the real company (spec D7). Top-nav wordmark stays "AIMS" | Stefan's call; keeps the real name out while giving the prototype a brand |
| 2026-10-08 | React Router **v8** instead of the spec's v7: v8.4 is current and still exports every API the plan uses (`createBrowserRouter`, `RouterProvider`, `matchPath`, `useMatches`, `Link`, `MemoryRouter`) | Start a new project on the current major |
| 2026-10-08 | Phase 1 Task 1.1 updated for create-vite 9.2 (template now ships oxlint, no `eslint.config.js`, no `vite-env.d.ts`, `types: ["vite/client"]`): swap oxlint for the ESLint stack, keep `vite/client` in `types`, set `packageManager: pnpm@11.5.1` for CI | Found in the Phase 0 review |
| 2026-10-08 | Stack versions at scaffold: React 19.2, React Router 8.4, Vite 8.3, Vitest 5, TypeScript 6.0, ESLint 10, Playwright 1.6x, pnpm 11.5.1 | Recorded per Phase 1 Task 1.1 |
| 2026-10-08 | Dark `--cs-fill` = `oklch(0.25 0.005 90)` (not in the handoff); product page title has no letter-spacing (as in `cs-build.js`) | Gaps and conflicts in the design source |
| 2026-10-08 | Modals don't close on scrim click; every route has an in-shell error screen | Phase 1 review: protect typed reasons; never show a raw error page to visitors |
| 2026-10-08 | Vercel project linked to the repo; production branch `main`; PR previews behind Vercel login | Public link is the production domain |
| 2026-10-08 | Seed: agents outside Medications are invented except Prior Auth Agent (E4) and Discharge Summary Agent (PRD); Prior Auth's rule tag `PA-11 v1` is invented | Frames name only Medications agents |
| 2026-10-08 | Seed: baseline privileges come from the 08 Dec division view (one per Medications activity; PRV-0142 v3 Med Rec active, PRV-0127 v2, PRV-0098 v4 overdue, PRV-0131 v3); the component sheet's awaiting / lapsed / stepped-down cards (dated Oct) live in gallery fixtures and scenarios | The sheet is dated early Oct; the demo clock is 08 Dec |
| 2026-10-08 | Seed: inbox times aligned to the 09:52 clock (sheet uses 09:42); Phase 3 refines against E5 | One consistent "now" |
| 2026-10-08 | Invented people: Tom (Revenue cycle manager), Nina (Director of Revenue Cycle), Elena (Discharge services manager), Ravi (Imaging operations manager), Grace (Patient access manager), Hana (Director of Imaging, sponsor), Owen (Director of Patient Access, sponsor), Omar (Integration analyst, technical owner outside Medications) | Every division needs named owner, sponsor and technical owner; frames name only owners |
| 2026-10-08 | Claiming an exception makes the claimer its owner; claimed or resolved items can't be re-claimed | Phase 2 review: "Needs me" must follow who took it |
| 2026-10-08 | Phase 3 split into 3.0–3.11: seed refinement and selectors come before screens; inbox tabs follow E5 (Needs me / Waiting on others / Log), digest at `?view=digest` | E5 frames differ from the spec's assumed `tab=digest` |
| 2026-10-08 | Seed v3 (E4/E5): exceptions EXC-5501/5508/5530/5512 from the frames; EXC-5514 (Sam's question), 5497 (Duplicate Rx review overdue), 5503 (C2 report) have invented codes. "Needs me" = items you own; "Waiting on others" = items you're copied on (reproduces 5a's 4/2 and 5d's 3/1). Monitor-stale timeline reads "no data after 06:41" to match the board's 3 h (frames disagree) | One consistent inbox model across frames |
| 2026-10-08 | Forbidden-terms check: real company name lives only in local `.git/info/forbidden-terms`; Phase 0 history was rewritten (before any push) to remove a leaked mention | A plan step had quoted the name literally |
| 2026-10-08 | Severity order: critical, then review/warn/stale tied (seed order), then normal, paused, shadow | Matches the division view's own row order |
| 2026-10-08 | Table rows default to 56 px (44 + padding, content-box in the frames); hospital rows 68; board-density rows 32 | Measured against 4a/4b |
| 2026-10-08 | "Needs a human" counts agents by judgment, so dismissing an exception doesn't lower it; the 7-day column is open exceptions per day | Dismissal closes the alert, not the agent's out-of-scope behaviour |
| 2026-10-08 | Inbox: escalation = past deadline, unclaimed, unassigned, not an incident → the division sponsor. Snooze hides from the inbox until its time. Assigning keeps the previous owner and the assigner copied. Digest carries needs-me items not due within 2 h | Reproduces 5a–5d from one model |
| 2026-10-08 | The wall's "last hour" pause count reads audit entries with action `'Paused'`; Phase 4 must use that string | Cross-phase contract |
| 2026-10-08 | Buttons for later flows set `?control=` on the agent view and say where the flow lives (Phase 4) | "Never dead" rule; one place to wire the dialogs |
| 2026-10-08 | Questions are answered in the inbox (`answerQuestion`: Answer yes / Answer no) | The digest's "Answer" link needed a destination; no frame shows it (composed) |
| 2026-10-08 | Product copy avoids gendered pronouns ("It reached their inbox…") | Names don't tell us pronouns |
| 2026-10-08 | Frames and stories beat the PRD matrix where they're more specific: the technical owner may return an activity to Shadow (6c); the menu says "Program lead or sponsor" because §7 lets sponsors disable and retire | One consistent permission model |
| 2026-10-08 | A pause doesn't open an incident; incidents are opened explicitly (7a: Jordan opens INC-0031). A pause is written to an already-open incident | Matches 7c's timeline |
| 2026-10-08 | Resume needs the agent's owner and sponsor, each with a reason; the requester can't approve; disabled or retired agents can't be paused or resumed | Two-person rule, and stops that compose |
| 2026-10-08 | `resume-requested` runs at 11:58 with the pause at 09:47 (6d/6e verbatim); `advanceClock` keeps live heartbeats live | Replaces Phase 2's 07:38/09:52 compromise |
| 2026-10-08 | Retired agents stay in `state.agents` (lifecycle retired) and leave every board through `onBoard()`; retiring closes open exceptions | One record, one filter |
| 2026-10-08 | Actions carry their own context (privilege, checks, conditions) so the audit never recomputes the past from today's state | "Any action can be reconstructed" |
| 2026-10-08 | Counts come from data when a frame's number conflicts (7 tool grants, Drafts · 3, by-hand counts, hard-stop tests, export contents) | Realism over copying frame literals |
| 2026-10-08 | Phase 5 split into 5.0–5.12: data and rewind first, then one task per wizard step and review screen. Onboarding frames happen 29 Sep–06 Nov, so scenarios `rewindTo` the hospital at that moment and replay Med Rec's onboarding through the store's own mutations; baseline keeps the completed record plus one live draft (Culture Follow-up, invented). Full rulings R1–R19 in the phase plan | Frames tell an October story; the demo clock is 08 Dec |
| 2026-10-08 | Onboarding is one record per agent (`state.onboardings`); static `OnboardingDraft` rows removed. Drafts list real records only (1i's other rows are live by 08 Dec). Intakes reserve the agent's id and code | One model for the wizard, Drafts and inbox (R2) |
| 2026-10-08 | Items across the record = 10 + one per hard stop (Med Rec 13; a draft with no never list "4 of 10") | Counts from data |
| 2026-10-08 | 1a and 2a are one screen; candidates sort the intake's division first, then by name; span counts from data ("22 activities") | R3, R4 |
| 2026-10-08 | Lena is Discharge's technical owner; Omar is "Clinical informatics analyst"; Tier 4 added and 8c's "Medium" fixed to "Moderate" | R5, R6 (2a, 2b) |
| 2026-10-08 | The technical owner may edit the job description (spec §7); anyone who may edit or configure may send the set | Spec beats the plan's draft test |
| 2026-10-08 | Never items become hard stops: library matches take the library's HS code and rule, others are plain language with the next code; a read on a system with write needs no reason or tool | R10; reproduces 1c's 5 reasons and 1d's 5 tools |
| 2026-10-08 | Any edit or re-test while the sponsor reviews resets the review; after v1.0 the record is frozen and edits are refused | R8, Review focus 1 |
| 2026-10-08 | Privilege versions: sponsor approval drafts v1 (awaiting the board), the decision makes v2 Shadow with conditions, the owner's request drafts v3; new versions number from the code's highest; seed auto codes count down from PRV-0141 | R11: lands on 3c's "PRV-0142 v3" without pinning |
| 2026-10-08 | Tier 1 starts shadow with no board; the board decides Tier 2+ (`can()` tier-aware); re-review clears the tier for the next meeting; deny archives like a retirement | R7, 2c's four outcomes |
| 2026-10-08 | Hand-offs raise inbox items with a link; they close by doing the step and never escalate; Claim and Dismiss are not offered on them | R9; dismissing would orphan the step |
| 2026-10-08 | Review date = signing date + cycle + 1 days (06 Nov → 05 Feb); `addDays` added because minutes across 01 Nov shifted the local hour | R12, 3c/3d |
| 2026-10-08 | `rewindTo` keeps other agents' privileges but rolls a later signing back one cycle at a time; boards calm; export facts hold only from 08 Dec | R1, review fixes I4/I5 |
| 2026-10-08 | `awaiting-signature` now runs at 06 Nov 09:52 by replay | R17, replaces Phase 2's compromise |
| 2026-10-08 | My privileges lists everything the sponsor signed (17); renewals re-sign at the same level and close the overdue exception; overdue reviews are raised when a scenario moves the clock | R13, 3d |
| 2026-10-08 | v2 frames (E9–E11, drawn March 2027) are re-dated: each frame's "today" becomes the day it is shown (10a, 9b, 11a, 11b at 08 Dec; 9a 15 Dec; 10b 17 Dec); other dates shift with it via `fromMarch`. Live Med Rec stays v1.3.0 · SOP v1.3.1; v1.5.0 is the held build | Phase 6 R1; one hospital, one clock |
| 2026-10-08 | Ana's live flag is FB-2291 (seed flags stop at FB-2290); the eye-drops flag becomes FB-2286 | R2 |
| 2026-10-08 | Settings act: the lapse policy applies on save and whenever the clock moves (Duplicate Rx lapses on 15 Dec); escalation follows the division's chain (first past the deadline, then the second after 4 h); a lapsed privilege is re-signed through 3c's renewal | R4 |
| 2026-10-08 | Changing a division's owner or sponsor moves the role, the agents and their open items; FYIs ("Priya told", "Share with Priya") are log events with a `to` list | R5, R18 |
| 2026-10-08 | Roles decide scope: a technical-owner role in a division covers its agents, and the named technical owner may act on their agent; technical owners may pause (8b) | R7 |
| 2026-10-08 | 9a: Med Rec already reads Pyxis, so v1.5.0's systems change is a wider Epic read; the replay finishes at once; a held build sets "Re-validation needed"; skipping days settles last week's items | R9–R12 |
| 2026-10-08 | Epic stand-in uses its own `--cs-ehr-*` tokens; the stand-in's buttons only explain they belong to Epic; Ana's draft trace is ACT-88209 | R13 |
| 2026-10-08 | 9b's intake is REQ-0081 "Discharge Huddle Summary Agent" (AGT-0180), so 8c reads "Intake · 3"; caller and sampling items have no agent and stay off the agent boards | R3, R16 |
| 2026-10-08 | Reviewer behaviour sits behind a division tab strip (Board · Reviewer behaviour) on 4b, 11a and 11b; 4 or 8 weeks; Priya signs sampling changes on 11b | R17 |


## Session log

One row per working session. Newest last.

| Date | Phase | What happened | Next |
|---|---|---|---|
| 2026-10-08 | – | Brainstormed and approved design; wrote spec, this plan, Phase 0 and 1 step files, and `CLAUDE.md`; local git repo with design handoff | Stefan reviews plan → Phase 0 |
| 2026-10-08 | 0 | Moved handoff to `docs/`, interim README, adopted Signal brand, created public repo, milestones, labels, issues #1–#10 | Stefan reviews Phase 0 → Phase 1 |
| 2026-10-08 | 0 | Fresh review: 3 Important fixed (Phase 1 Task 1.1 vs create-vite 9.2, CI pnpm version, PR issue number) + 4 minors fixed; Stefan approved; #1 closed | Phase 1 Task 1.1 |
| 2026-10-08 | 1 | Built Phase 1 (scaffold, tokens, icons, 24 primitives, layout, route table, gallery, CI, Vercel). Fresh review: 4 Important + 3 re-graded fixed test-first; 3 minors deferred (menu hover-on-focus look, row Tab stops, dark checkbox fill). PR #11 open | Stefan reviews Phase 1 → merge → Phase 2 Task 2.0 |
| 2026-10-08 | 1 | Stefan approved; PR #11 squash-merged; #2 closed | Phase 2 Task 2.0 |
| 2026-10-08 | 2 | Built Phase 2 (types, clock, seed, permissions, store, scenarios, 10 product components, gallery light + dark, persona switcher, reset). Visual pass vs component sheet. Fresh review: 3 Important + 3 re-graded fixed test-first; 4 minors deferred. PR #12 open | Stefan reviews Phase 2 → merge → Phase 3 Task 3.0 |
| 2026-10-08 | 2 | Stefan approved; PR #12 squash-merged; #3 closed | Phase 3 Task 3.0 |
| 2026-10-08 | 3 | Built Phase 3 (seed v3→4, board and inbox selectors, 4a–4f, 5a–5d, journey e2e) with measured visual checks per frame. Fresh review: 5 Important + 2 re-graded fixed test-first; minors deferred (see handoff notes). PR #13 open | Stefan reviews Phase 3 → merge → Phase 4 Task 4.0 |
| 2026-10-08 | 3 | Stefan approved (frame departures for realism and UX welcomed); PR #13 squash-merged; #4 closed | Phase 4 Task 4.0 |
| 2026-10-08 | 4 | Built Phase 4 (seed v5, control menu, pause, fix one thing, two-person resume, inventory, retire, action list and trace, incidents, export, journey e2e) with measured visual checks per frame. Fresh review: 7 Important + 4 re-graded fixed test-first; minors deferred (see handoff notes). PR #14 open | Stefan reviews Phase 4 → merge → Phase 5 Task 5.0 |
| 2026-10-08 | 4 | Stefan approved; PR #14 squash-merged; #5 closed | Phase 5 Task 5.0 (new session) |
| 2026-10-08 | 5 | Built Phase 5 (seed v6, onboarding records and rewind, 1a–1i, 2a–2d, 3a–3d, journey e2e) with side-by-side visual checks. Fresh review: 1 Critical + 7 Important fixed test-first, docs updated; 11 minors deferred (see handoff notes). PR #15 open | Stefan reviews Phase 5 → merge → Phase 6 Task 6.0 |
| 2026-10-08 | 5 | Stefan approved; PR #15 squash-merged; #6 closed | Phase 6 Task 6.0 |
| 2026-10-08 | 6 | Built Phase 6 (seed v7, division settings and split, people and roles, Epic flag and fix, v1.5.0 held at the gateway, unregistered callers, reviewer behaviour, 2 journeys) with side-by-side visual checks. Fresh review: 5 Important + 2 re-graded fixed test-first; 11 minors deferred (see handoff notes). PR #16 open | Stefan reviews Phase 6 → merge → Phase 7 Task 7.0 |
