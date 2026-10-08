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
| **Current phase** | Phase 0: Setup (⏸ at checkpoint, awaiting Stefan's review) |
| **Branch** | `main` (pushed to `origin`) |
| **Last completed** | Phase 0 Tasks 0.1–0.4: repo public, 10 milestones, labels, 10 phase issues (2026-10-08) |
| **Next task** | After Stefan approves Phase 0: finish Phase 0 Task 0.5 Step 3 (close #1, remove its `checkpoint` label, set Phase 0 ☑ Merged, push), then Phase 1 Task 1.1 in [`docs/plans/phase-1-foundation.md`](plans/phase-1-foundation.md) (creates branch `phase-1-foundation`) |
| **Blockers** | Stefan reviewing Phase 0 (repo, issues, plan on GitHub) |
| **Repo** | [github.com/StefanNav/agent-control-plane](https://github.com/StefanNav/agent-control-plane) (public) |
| **Live URL** | none yet (first deploy in Phase 1) |
| **Latest preview** | none |

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
- **Commits:** small, one per plan step group, conventional prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). End each message with the attribution trailer in `CLAUDE.md`.
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
| 0 | Setup | ⏸ At checkpoint | `main` | [#1](https://github.com/StefanNav/agent-control-plane/issues/1) | no PR (docs on `main`) | [phase-0-setup.md](plans/phase-0-setup.md) |
| 1 | Foundation | ☐ Not started | `phase-1-foundation` | [#2](https://github.com/StefanNav/agent-control-plane/issues/2) | – | [phase-1-foundation.md](plans/phase-1-foundation.md) |
| 2 | Components and data | ☐ Not started | `phase-2-components-data` | [#3](https://github.com/StefanNav/agent-control-plane/issues/3) | – | to write (Task 2.0) |
| 3 | Command Board and inbox | ☐ Not started | `phase-3-board-inbox` | [#4](https://github.com/StefanNav/agent-control-plane/issues/4) | – | to write (Task 3.0) |
| 4 | Controls and audit | ☐ Not started | `phase-4-controls-audit` | [#5](https://github.com/StefanNav/agent-control-plane/issues/5) | – | to write (Task 4.0) |
| 5 | Onboarding and go-live | ☐ Not started | `phase-5-onboarding` | [#6](https://github.com/StefanNav/agent-control-plane/issues/6) | – | to write (Task 5.0) |
| 6 | Governance and fast follows | ☐ Not started | `phase-6-governance` | [#7](https://github.com/StefanNav/agent-control-plane/issues/7) | – | to write (Task 6.0) |
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
- [ ] 0.5 Checkpoint: Stefan reviews the repo, issues and plan on GitHub

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

- [ ] 1.1 Scaffold Vite + React + TS with pnpm, ESLint, Prettier, Vitest; `pnpm check`
- [ ] 1.2 Tokens, global styles, fonts, keyboard-only focus rings
- [ ] 1.3 Icon set
- [ ] 1.4 Form primitives: Button, Field, Input, Select, Textarea, Checkbox, RadioCardGroup, Segmented, FilterPill
- [ ] 1.5 Display primitives: Card, Paper, DefinitionList, Notice, StatStrip, Sparkline, ProgressBar, RuleTag, LogRow, Avatar
- [ ] 1.6 Interactive structures: Table, Tabs, WizardSteps, Menu, Modal
- [ ] 1.7 Layout: TopNav, PageHeader, Split / SplitL / Body, AppShell with prototype bar shell, NotFound
- [ ] 1.8 Route table + router + placeholder pages + Playwright route smoke
- [ ] 1.9 Primitives gallery at `/about/components`
- [ ] 1.10 CI, Vercel link and first deploy; checkpoint

**Done when:** every route in spec §5.5 loads directly on the Vercel URL inside the shell; gallery shows every primitive; CI green.
**Handoff notes:** _written at the end of the phase._

## Phase 2: Components and data

**Goal:** The 10 Countersign product components and the whole mock data layer, with persona switching working.

- [ ] 2.0 Write `docs/plans/phase-2-components-data.md`; commit
- [ ] 2.1 Domain types `src/data/types.ts` (spec §6.1; settle field shapes by reading the frames; log choices)
- [ ] 2.2 Clock and formatters `src/lib/clock.ts`, `src/lib/format.ts`: `DEMO_NOW`, `formatClock`, `formatDay`, `formatRelative` ("in 48 min", "Overdue 12 min"), `formatMs` (`09:38:04.512`); tests use frame values
- [ ] 2.3 Seed `src/data/seed/*`: people, role assignments, 5 divisions, 41 agents (Medications fully detailed), activities, privileges, hard stops, grants, exceptions, actions, incidents; invariant tests (counts 6/20/8/4/3, referential integrity, unique IDs)
- [ ] 2.4 Permissions `src/store/permissions.ts`: `can(personaId, action, ctx)`; table-driven test mirroring spec §7
- [ ] 2.5 Store `src/store/*`: Zustand + persist (versioned key, migrate-to-seed), persona slice, audit log, actions guarded by `can()`; **Review focus 1, 2, 5 tests**
- [ ] 2.6 Scenarios `src/data/scenarios/*`: registry + `loadScenario(id)`; one test per scenario from spec §6.3
- [ ] 2.7 Product components 01–05: StatusChip, AgentRow, ExceptionItem, PrivilegeCard, AutonomyLadder (design handoff data rules as tests)
- [ ] 2.8 Product components 06–10: HardStopCard + InstructionCard, SystemsVerbsGrid, PauseDialog + ResumeDialog, ActionTrace, MonitorHealth
- [ ] 2.9 Gallery: components section in light and dark (`data-theme="dark"` wrapper)
- [ ] 2.10 Prototype bar: PersonaSwitcher, Reset demo; TopNav avatar from persona; persona landing routes (spec §4.4); checkpoint

**Done when:** gallery matches `designs/Countersign Components.dc.html` side by side in light and dark; switching persona changes avatar and lock states; Reset demo restores seed.
**Handoff notes:** _written at the end of the phase._

## Phase 3: Command Board and inbox

**Goal:** Owners supervise by exception (E4, E5).

- [ ] 3.0 Write `docs/plans/phase-3-board-inbox.md`; commit
- [ ] 3.1 Hospital board 4a with MonitorHealth header, severity sort, View toggle → tiles 4d and exceptions-first 4f
- [ ] 3.2 Division view 4b (AgentRow, stale row rules, keyboard: click selects, Tab focus, Arrow moves, Enter opens)
- [ ] 3.3 Agent view 4c with tabs (Overview, Scorecard placeholder for Phase 5; Activities, Actions, Privileges, History composed); unknown agent ID renders `NotFound` (**Review focus 4 test**)
- [ ] 3.4 Wall display `/wall` (4e): dark theme, own larger type scale, no controls, no prototype bar (a small corner "Exit wall display" control instead)
- [ ] 3.5 Inbox 5a: segmented Needs me / Daily digest / Log (Needs me filtered to the current persona's exceptions), groups Overdue / Due soon / Resolved today, detail panel, claim
- [ ] 3.6 Dismiss with a reason 5b (reason required; tunes the rule; audit entry)
- [ ] 3.7 Daily digest 5c (720 px, 07:00) and Log tab
- [ ] 3.8 Escalation 5d (deadline past demo clock → overdue, escalated to sponsor)
- [ ] 3.9 E2E: from the board, reach the one agent needing action among Marcus's 20; checkpoint

**Done when:** frames 4a–4f, 5a–5d built and visually checked.
**Handoff notes:** _written at the end of the phase._

## Phase 4: Controls and audit

**Goal:** Stop easy, resume deliberate; any action can be reconstructed (E6, E7, 8c).

- [ ] 4.0 Write `docs/plans/phase-4-controls-audit.md`; commit
- [ ] 4.1 Control menu 6a (scope first, narrow fixes, program-lead actions locked for others)
- [ ] 4.2 Pause with impact preview 6b; store `pause(scope, reason?)` routes queued drafts; board, division and agent views agree
- [ ] 4.3 Return one activity to Shadow 6c; revoke a tool
- [ ] 4.4 Resume request 6d and sponsor approval 6e (two-person rule; stays paused until both; each reason logged)
- [ ] 4.5 Inventory 8c (tabs Agents / Drafts / Intake / Retired; Intake and Retired composed) and Disable or retire 6f (typed confirmation)
- [ ] 4.6 Action list 7a (read only, filters) and action trace 7b (ACT-88213, ms timestamps, policy blocked step expanded)
- [ ] 4.7 Incidents list (composed) and incident record 7c
- [ ] 4.8 Export for a surveyor 7d
- [ ] 4.9 E2E: pause → board shows Paused → request resume → approve as Priya → resumed; checkpoint

**Done when:** frames 6a–6f, 7a–7d, 8c built and visually checked.
**Handoff notes:** _written at the end of the phase._

## Phase 5: Onboarding and go-live

**Goal:** Intake to signed privilege (E1, E2, E3).

- [ ] 5.0 Write `docs/plans/phase-5-onboarding.md`; commit
- [ ] 5.1 Onboarding wizard shell (6 steps: Intake, Job description, Systems and verbs, Tools and hard stops, Sponsor approval, Ready for review; marks derived from the record) + intake 1a + name the humans 2a (all four required; span-of-control warning above 7 activities)
- [ ] 5.2 Job description 1b (7 required fields, "5 of 7", missing fields listed, submit gated)
- [ ] 5.3 Systems and verbs 1c (default read only; Sign and Order locked by `ORG-POL-02`; changed ring)
- [ ] 5.4 Tools and hard stops 1d (library or plain language; "would have blocked" counts; Send to Priya unlocks when all tested)
- [ ] 5.5 Sponsor approval 1e, request changes on HS-11 1f, returned to Sam 1g (only HS-11 reopens; Priya's review resets)
- [ ] 5.6 Ready for review 1h (frozen) and Drafts in Inventory 1i (Continue opens the first missing field)
- [ ] 5.7 Risk tier 2b (factors shown; changing it requires a reason)
- [ ] 5.8 Committee packet 2c (Approve / Approve with conditions / Re-review / Deny) and decision logged 2d (conditions carry onto the privilege)
- [ ] 5.9 Shadow scorecard 3a and sample case 3b (side by side, line by line)
- [ ] 5.10 Sign the privilege 3c (missed target → written reason required) and My privileges 3d (overdue review raises an exception)
- [ ] 5.11 E2E: intake → job → systems → tools → approval → committee → sign; checkpoint

**Done when:** frames 1a–1i, 2a–2d, 3a–3d built and visually checked.
**Handoff notes:** _written at the end of the phase._

## Phase 6: Governance and fast follows

**Goal:** Divisions and access, change detection, clinician feedback, reviewer behaviour (E8, E9, E10, E11).

- [ ] 6.0 Write `docs/plans/phase-6-governance.md`; commit
- [ ] 6.1 Division settings 8a (owner, sponsor, lapse policy)
- [ ] 6.2 People and roles 8b (Sam gets a second division; `can()` results follow the role change)
- [ ] 6.3 New version held at the gateway 9a (v1.5.0; re-validate before it serves)
- [ ] 6.4 Unregistered caller 9b (flagged to Dana)
- [ ] 6.5 Epic stand-in `/epic`: flag in one action 10a (reason prefilled from Ana's edit) and "Fixed in v1.5.0" 10b (`?day=later`, scenario `epic-fixed-later`)
- [ ] 6.6 Reviewer behaviour 11a and drill into 6 North 11b (by unit and shift, never by named pharmacist); checkpoint

**Done when:** frames 8a, 8b, 9a, 9b, 10a, 10b, 11a, 11b built and visually checked.
**Handoff notes:** _written at the end of the phase._

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
| 4a | Hospital view | `/operations` | 3 | ☐ | ☐ |
| 4a·wall/4e | Wall display | `/wall` | 3 | ☐ | ☐ |
| 4b | Division view | `/operations/divisions/medications` | 3 | ☐ | ☐ |
| 4c | Agent view | `/operations/agents/med-rec` | 3 | ☐ | ☐ |
| 4d | Tile grid | `/operations?view=tiles` | 3 | ☐ | ☐ |
| 4f | Exceptions first | `/operations?view=exceptions` | 3 | ☐ | ☐ |
| 5a | Inbox and detail | `/operations/inbox/:id` | 3 | ☐ | ☐ |
| 5b | Dismiss with a reason | inbox modal | 3 | ☐ | ☐ |
| 5c | Daily digest | `/operations/inbox?tab=digest` | 3 | ☐ | ☐ |
| 5d | Escalated to Priya | inbox item | 3 | ☐ | ☐ |
| 6a | Control menu | agent view | 4 | ☐ | ☐ |
| 6b | Impact preview | agent view modal | 4 | ☐ | ☐ |
| 6c | Return activity to Shadow | agent view modal | 4 | ☐ | ☐ |
| 6d | Resume requested | agent view | 4 | ☐ | ☐ |
| 6e | Priya approves resume | agent view modal | 4 | ☐ | ☐ |
| 6f | Disable or retire | `/inventory` modal | 4 | ☐ | ☐ |
| 7a | Action list | `/operations/actions` | 4 | ☐ | ☐ |
| 7b | Action trace | `/operations/actions/act-88213` | 4 | ☐ | ☐ |
| 7c | Incident record | `/operations/incidents/:id` | 4 | ☐ | ☐ |
| 7d | Export for a surveyor | `/reports/export` | 4 | ☐ | ☐ |
| 8c | Inventory linked to ops | `/inventory` | 4 | ☐ | ☐ |
| 1a | Start from intake | `…/onboarding/intake` | 5 | ☐ | ☐ |
| 1b | Job description | `…/onboarding/job` | 5 | ☐ | ☐ |
| 1c | Systems and verbs | `…/onboarding/systems` | 5 | ☐ | ☐ |
| 1d | Tools and hard stops | `…/onboarding/tools` | 5 | ☐ | ☐ |
| 1e | Sponsor approval | `…/onboarding/approval` | 5 | ☐ | ☐ |
| 1f | Request changes | `…/onboarding/approval` | 5 | ☐ | ☐ |
| 1g | Returned to Sam | `…/onboarding/tools` | 5 | ☐ | ☐ |
| 1h | Ready for review | `…/onboarding/review` | 5 | ☐ | ☐ |
| 1i | Drafts in Inventory | `/inventory?tab=drafts` | 5 | ☐ | ☐ |
| 2a | Name the humans | `…/onboarding/intake` | 5 | ☐ | ☐ |
| 2b | Risk tier | `/inventory/agents/med-rec/risk-tier` | 5 | ☐ | ☐ |
| 2c | Committee packet | `/portfolio/reviews/med-rec` | 5 | ☐ | ☐ |
| 2d | Decision logged | `/inventory/agents/med-rec` | 5 | ☐ | ☐ |
| 3a | Shadow scorecard | `/operations/agents/med-rec?tab=scorecard` | 5 | ☐ | ☐ |
| 3b | Sample case | `/operations/agents/med-rec/cases/:id` | 5 | ☐ | ☐ |
| 3c | Sign the privilege | `/inventory/privileges/prv-0142/sign` | 5 | ☐ | ☐ |
| 3d | My privileges | `/portfolio/privileges` | 5 | ☐ | ☐ |
| 8a | Division settings | `/settings/divisions/medications` | 6 | ☐ | ☐ |
| 8b | People and roles | `/settings/people` | 6 | ☐ | ☐ |
| 9a | Version held at gateway | agent view | 6 | ☐ | ☐ |
| 9b | Unregistered caller | `/inventory/unregistered/:id` | 6 | ☐ | ☐ |
| 10a | Flag from Epic | `/epic` | 6 | ☐ | ☐ |
| 10b | Fixed in v1.5.0 | `/epic?day=later` | 6 | ☐ | ☐ |
| 11a | Reviewer behaviour | `/operations/reviewers` | 6 | ☐ | ☐ |
| 11b | Drill into 6 North | `/operations/reviewers/6-north` | 6 | ☐ | ☐ |
| 12a | RUAIH coverage | `/reports/evidence` | 7 | ☐ | ☐ |
| 12b | Export packet | `/reports/evidence/med-rec` | 7 | ☐ | ☐ |
| 13a | Review level and rules | `/portfolio/activities/:id` | 7 | ☐ | ☐ |
| 13b | Sampling queue | `/operations/sampling` | 7 | ☐ | ☐ |
| 14a | Sponsor signs promotion | `/inventory/promotions/:id` | 7 | ☐ | ☐ |
| 14b | Board decides | `/portfolio/promotions/:id` | 7 | ☐ | ☐ |
| 15a | Threshold breach | agent view | 7 | ☐ | ☐ |
| 15b | Version change | `/portfolio/activities/:a/branches/:b` | 7 | ☐ | ☐ |
| C | Component sheet (light + dark) | `/about/components` | 2 | ☐ | ☐ |

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
| 2026-10-08 | Forbidden-terms check: real company name lives only in local `.git/info/forbidden-terms`; Phase 0 history was rewritten (before any push) to remove a leaked mention | A plan step had quoted the name literally |

## Session log

One row per working session. Newest last.

| Date | Phase | What happened | Next |
|---|---|---|---|
| 2026-10-08 | – | Brainstormed and approved design; wrote spec, this plan, Phase 0 and 1 step files, and `CLAUDE.md`; local git repo with design handoff | Stefan reviews plan → Phase 0 |
| 2026-10-08 | 0 | Moved handoff to `docs/`, interim README, adopted Signal brand, created public repo, milestones, labels, issues #1–#10 | Stefan reviews Phase 0 → Phase 1 |
