# Phase 0: Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The project lives in a public GitHub repo with the spec, build plan, conventions file and per-phase tracking (milestones + issues).

**Architecture:** No app code. Docs and GitHub setup only. Work happens directly on `main` (there is nothing to review as a diff yet); the checkpoint is Stefan looking at the repo.

**Tech stack:** git, GitHub CLI (`gh`, signed in as `StefanNav`).

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§10 Workflow, §11 Handoff system).

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints. Most relevant here: never commit `reference/source-docs/` or any `.docx`; never name the company the source docs were written for.

---

### Task 0.1: Make room for the portfolio README

The root `README.md` is currently the design handoff. Move it under `docs/` so the root README can describe the project.

**Files:**
- Move: `README.md` → `docs/design-handoff.md`
- Create: `README.md`
- Modify: `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§3 sources table), `docs/BUILD_PLAN.md` (Global constraints mention "README"), `CLAUDE.md` (Key docs)

- [x] **Step 1: Move the file with history**

Run: `git mv README.md docs/design-handoff.md`

- [x] **Step 2: Fix relative paths inside the moved file**

The handoff refers to `designs/…` and `reference/…` from the repo root. Add one line under its title: `> Moved from the repo root. Paths below (designs/, reference/) are relative to the repo root.` Do not change any other content.

- [x] **Step 3: Update references**

In the spec §3 table, the BUILD_PLAN global constraints, and `CLAUDE.md`, replace references to the handoff `README.md` with `docs/design-handoff.md`. Leave references to the future portfolio README alone.

Verify: `grep -rn "README" docs CLAUDE.md` shows only (a) `docs/design-handoff.md` references, (b) Phase 9's "portfolio README" task, (c) this plan.

- [x] **Step 4: Write the interim project `README.md`**

Contents (short; Phase 9 replaces it):
- Title: `Signal Agent Control Plane: clickable prototype` (brand set by Stefan on 2026-10-08)
- One paragraph: a front-end prototype of an operations console for supervising AI agents in a hospital (onboarding, staged privileges, live supervision, stopping, audit), built from the Countersign design system, mock data only, fictional hospital Lakeshore Health.
- `Status: in progress.` Link to `docs/BUILD_PLAN.md`.
- Links: spec, design handoff, `designs/` (how to view: `cd designs && python3 -m http.server 4599`).
- No company names from the source docs.

- [x] **Step 5: Commit**

```bash
git add -A README.md docs CLAUDE.md
git commit -m "docs: move design handoff under docs/, add project README"
```

### Task 0.2: Conventions file (`CLAUDE.md`)

Written during the planning session on 2026-10-08. Verify it is current after Task 0.1's path change.

- [x] **Step 1: `CLAUDE.md` exists at the repo root with: start-here protocol, key docs, commands, conventions, checkpoint protocol**
- [x] **Step 2: Confirm the Key docs section points at `docs/design-handoff.md`** (done in Task 0.1 Step 3)

### Task 0.3: Create the public GitHub repo

**Files:** none (remote setup)

- [x] **Step 1: Prove no source docs are in history**

Run: `git log --all --name-only --format= | grep -ci "docx\|source-docs"`
Expected: `0`

- [x] **Step 2: Prove the company name is absent from tracked files**

Run: `git grep -il -f "$(git rev-parse --git-common-dir)/info/forbidden-terms" ; echo "exit=$?"` (the terms file is local-only, never committed; if it's missing, ask Stefan for the terms)
Expected: no file names, `exit=1`

- [x] **Step 3: Create and push**

```bash
gh repo create StefanNav/agent-control-plane --public --source . --remote origin --push \
  --description "Signal Agent Control Plane: clickable prototype of an operations console for supervising AI agents in hospitals (Countersign design system, mock data)"
```

- [x] **Step 4: Verify**

Run: `gh repo view StefanNav/agent-control-plane --json visibility,url,defaultBranchRef --jq '.visibility + " " + .url + " " + .defaultBranchRef.name'`
Expected: `PUBLIC https://github.com/StefanNav/agent-control-plane main`

- [x] **Step 5: Add topics**

```bash
gh repo edit StefanNav/agent-control-plane --add-topic prototype,react,typescript,vite,design-system,healthcare,ai-governance
```

### Task 0.4: Milestones, labels and phase issues

**Files:**
- Modify: `docs/BUILD_PLAN.md` (Phase overview table: Issue column)

- [x] **Step 1: Labels**

```bash
for n in 0 1 2 3 4 5 6 7 8 9; do gh label create "phase-$n" --color BFD4F2 --force; done
gh label create checkpoint --color 2D46A1 --description "Phase checkpoint awaiting review" --force
gh label create design-qa --color C47D04 --description "Visual difference from a design frame" --force
```

- [x] **Step 2: Milestones** (titles exactly as in the BUILD_PLAN phase overview)

```bash
for t in "Phase 0: Setup" "Phase 1: Foundation" "Phase 2: Components and data" \
  "Phase 3: Command Board and inbox" "Phase 4: Controls and audit" "Phase 5: Onboarding and go-live" \
  "Phase 6: Governance and fast follows" "Phase 7: Earned autonomy" \
  "Phase 8: Stories and portfolio layer" "Phase 9: Polish and launch"; do
  gh api repos/StefanNav/agent-control-plane/milestones -f title="$t" --silent
done
gh api repos/StefanNav/agent-control-plane/milestones --jq '.[].title'
```
Expected: the 10 titles.

- [x] **Step 3: One issue per phase**

For each phase N, the issue body is that phase's section from `docs/BUILD_PLAN.md` (Goal, task checklist, Done when), followed by `Plan: docs/BUILD_PLAN.md · Spec: docs/specs/2026-10-08-agent-control-plane-prototype-design.md`. Extract each section with `awk` between `## Phase N:` and the next `## ` heading into a temp file in the scratchpad, then:

```bash
gh issue create --repo StefanNav/agent-control-plane \
  --title "Phase N: <name>" --milestone "Phase N: <name>" --label "phase-N" --body-file <tmpfile>
```

Verify: `gh issue list --repo StefanNav/agent-control-plane --limit 20 --json number,title --jq '.[] | "\(.number) \(.title)"'` lists 10 issues.

- [x] **Step 4: Record issue numbers** in the BUILD_PLAN Phase overview "Issue" column as links (`[#3](https://github.com/StefanNav/agent-control-plane/issues/3)`).

- [x] **Step 5: Tick Phase 0 tasks 0.1–0.4 on the Phase 0 issue** (`gh issue edit` with the updated body) and in BUILD_PLAN.

### Task 0.5: Checkpoint

- [x] **Step 1: Update `docs/BUILD_PLAN.md`**
  - Phase overview: Phase 0 → ⏸ At checkpoint.
  - Start here: Repo URL; Next task = Phase 1, Task 1.1; Blockers = "Stefan reviewing Phase 0".
  - Phase 0 handoff notes: repo URL, issue numbers, anything surprising.
  - Session log row.
- [x] **Step 2: Commit and push**

```bash
git add docs README.md CLAUDE.md
git commit -m "docs: Phase 0 checkpoint"
git push
```

- [x] **Step 3: STOP. Ask Stefan to review** the repo page, the issues/milestones, and `docs/BUILD_PLAN.md` on GitHub. After approval: close the Phase 0 issue (#1) and remove its `checkpoint` label, tick 0.5 and set Phase 0 to ☑ Merged in BUILD_PLAN, point Start here at Phase 1 Task 1.1, commit + push.
