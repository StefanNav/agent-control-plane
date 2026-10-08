# Agent Control Plane prototype

A clickable, front-end-only prototype of **Agent Control Plane**: the operations console of an AI management system (AIMS) for hospitals, where named humans onboard AI agents, grant staged privileges, supervise them live, stop them and produce audit evidence. Built from the **Countersign** designs in `designs/`. Mock data only (fictional hospital: Lakeshore Health). It's a public portfolio piece.

## Start every session here

1. Read **`docs/BUILD_PLAN.md` → "▶ Start here"**. It names the current phase, branch, next task and blockers.
2. Check `git status`, `git branch --show-current`, `git log --oneline -5` match it.
3. Open the current phase file in `docs/plans/`. If it doesn't exist, writing it is the phase's task N.0. Continue at the first unchecked `- [ ]` step.
4. Before you stop (even mid-phase): tick finished steps, update "Start here", add a session-log row, commit `docs/`.

## Key docs

| Doc | What it's for |
|---|---|
| `docs/BUILD_PLAN.md` | Progress: phases, task checklists, frame tracker, decision log, session log |
| `docs/plans/phase-N-*.md` | Step-by-step instructions for one phase |
| `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` | What and why: scope, visitor experience, architecture, routes, data model, permissions, frame inventory |
| `docs/design-handoff.md` | Design handoff: tokens, type, primitives, the 10 components, interaction rules |
| `reference/cs-build.js` | Exact token and primitive specs (wins over the handoff for E2–E15 detail) |
| `designs/*.dc.html` | The frames. Copy, layout and values come from here |
| `reference/epics-and-stories.txt` | Stories and acceptance criteria |
| `reference/source-docs/` | PRD, Vision, Roadmap (.docx). **Local only, git-ignored. Never commit them and never name the company they were written for.** |

View the designs: `pnpm designs` (after Phase 1) or `cd designs && python3 -m http.server 4599`, then open `http://localhost:4599`.

## Commands (available from Phase 1)

- `pnpm dev`: dev server
- `pnpm check`: typecheck, lint, unit tests, build. Must pass before every commit that touches code.
- `pnpm e2e`: Playwright smoke tests (routes; later, stories)
- `pnpm designs`: serve the design frames on port 4599 for side-by-side comparison

## Conventions

- **Layers:** `src/design-system` (tokens and primitives, no hospital domain) → `src/components` (the 10 product components: pure, props in, callbacks out, no store) → `src/features` (pages: read via selectors, write only via store actions). Permissions only through `can()` in `src/store/permissions.ts`. Routes only through the table in `src/app/routes.ts`.
- **Styling:** CSS Modules + `--cs-*` tokens from `src/design-system/tokens.css`. No UI or icon libraries, no Tailwind, no raw colour values in components. Plex Sans/Mono, weights 400 and 600 only. Tabular numbers everywhere.
- **Colour semantics:** indigo = primary action and current/selected; teal = review waiting only; amber/red = warning/critical only; healthy = grey. Every status is colour + shape + word. Dashed = no data (stale) only. No gradients, emoji or coloured left-border cards.
- **Copy:** verbatim from the frames. Sample names, IDs, counts and dates also from the frames.
- **Time:** the demo clock is Tue 08 Dec 2026, 09:52. Never call `Date.now()` in product code; use `src/lib/clock.ts`.
- **Undesigned screens** (a tab with no frame) are composed only from existing primitives and components, and marked "composed" in the build plan.
- **Tests:** test-first for logic (store, permissions, scenarios, clock, story engine). Playwright for route and story smoke. Visual fidelity is checked by side-by-side screenshots at 1440 px against the frames at each checkpoint.

## Git and checkpoints

- One branch per phase (`phase-N-<slug>`), small commits with conventional prefixes, one PR per phase that closes that phase's GitHub issue.
- Repo: `StefanNav/agent-control-plane` (public). Vercel posts a preview URL on every PR; `main` deploys production.
- **At the end of every phase: run the checkpoint protocol in `docs/BUILD_PLAN.md`, then STOP and ask Stefan to review the preview URL. Never merge a phase PR without his approval.** Never force-push `main`.
- Commit and PR attribution: follow the harness's attribution guidance.
