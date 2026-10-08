# Agent Control Plane prototype: design spec

- **Date:** 2026-10-08
- **Status:** Approved in conversation, pending written review
- **Owner:** Stefan (stefan.nav7@gmail.com, GitHub `StefanNav`)
- **Build plan:** `docs/BUILD_PLAN.md` (the living, trackable plan; start there when resuming work)

---

## 1. Purpose

Build a front-end-only, clickable prototype of **Agent Control Plane**, the operations side of an AI management system (AIMS) for hospitals, from the **Countersign** designs in `designs/`. It is a portfolio piece. It must:

1. Show the user experience at high fidelity.
2. Communicate what the product does and **how each persona uses it**.
3. Be structured like a real product (routing, component library, typed data model, state), running entirely on mock data.
4. Be publicly shareable: anyone with the link can click through it in a browser.

### Success criteria

- Every one of the 55 designed frames in E1–E15 is reachable in the running app and visually matches its frame at 1440 px wide.
- A visitor who has never heard of the product can pick a persona on the landing page and follow that persona's story end to end without getting lost.
- In free explore, switching persona visibly changes what that person can do (locked controls, landing page, inbox contents).
- Actions change the mock data and the change shows everywhere it should (pause an agent, and the board, agent view and inbox agree).
- The work is on GitHub in a public repo, each phase is a reviewed PR, and `main` auto-deploys to a public Vercel URL.
- A new agent session with no memory of this conversation can resume the build from `CLAUDE.md` and `docs/BUILD_PLAN.md` alone.

## 2. Scope

**In scope**
- Epics E1–E15 (all designed frames) plus the 10 Countersign product components.
- A prototype layer: landing page, persona switcher, guided stories, reset, About page, component gallery, desktop-only gate.
- Mock data for one hospital (Lakeshore Health), held in a client-side store.

**Out of scope**
- Any backend, authentication, real integrations or real-time data.
- Epics E16–E21 (v3; not designed).
- Mobile or tablet layouts. The designs are 1440 px desktop.
- Reproducing Epic's real UI. The Epic screens (E10) are a neutral stand-in; only the right-hand panel is ours.

## 3. Sources of truth

| Source | Use it for |
|---|---|
| `README.md` (design handoff) | Tokens, type scale, spacing, primitive specs, the 10 components, interaction rules, data model, open issues |
| `designs/*.dc.html` | Exact layout, copy and values per frame. Serve with `npx serve designs` (or `python3 -m http.server` from `designs/`) and inspect with devtools |
| `reference/cs-build.js` | The most compact, exact statement of tokens and primitives. Read before building primitives |
| `reference/epics-and-stories.txt` | Stories and acceptance criteria (E1–E21) |
| `reference/source-docs/*.docx` | PRD, Vision, Roadmap, design brief. **Local only; git-ignored; never committed.** Summaries live in this spec |

Copy on screens is final: take it from the frames. People, IDs, counts and dates are sample data, but use the frames' values so screens match.

## 4. Visitor experience

### 4.1 Prototype bar

A thin dark strip (about 32 px) sits **above** the product's own 48 px top nav. It holds the demo controls so they never mix with the designed UI:

- "Agent Control Plane · Prototype" (links to `/`)
- Persona switcher: "Viewing as **Marcus** · Agent owner ▾"
- Stories (menu of the 7 stories)
- Reset demo
- About

It is styled from Countersign tokens (ink background, white and `meta`-equivalent text, mono labels) and is visually clearly "not the product". It is hidden on `/wall` (kiosk display), where a small corner control replaces it.

### 4.2 Landing page (`/`)

- One-paragraph pitch: what the product is and who it is for.
- Seven persona cards: name, role, one line on what they do in the product, and "Follow {name}'s story →".
- "Explore freely" button (enters free explore as Marcus, the primary user).
- Link to About.
- Built with Countersign primitives; calm, not marketing-styled.

### 4.3 Guided stories

A story walks a visitor through one persona's flow across the real screens.

- **Model:** `Story { id, personaId, title, summary, scenarioId, steps: Step[] }` and `Step { route, title, body, target?, scenarioPatch? }`.
  - `route`: where the step happens.
  - `body`: 2–3 sentences of narration.
  - `target`: optional `data-story-target` value; the element gets a 2 px ink outline (same language as focus), no dimming or spotlight.
  - `scenarioPatch`: optional state change applied when the step opens (for steps that skip ahead in time).
- **URL state:** `?story=<id>&step=<n>` on any route. Refreshing or sharing the link resumes at that step.
- **Starting a story** switches persona to the story's persona and loads the story's scenario, so it always works regardless of what the visitor did before. **Exiting** keeps the current state.
- **Narration panel:** docked bottom-right, about 360 px wide. Shows story title, "Step 3 of 8", step title, body, and Back / Next / Exit. Visitors can click around freely; Next navigates back onto the scripted path.
- **Stories (outline; exact steps written in Phase 8):**

| Story | Persona | Path | Epics |
|---|---|---|---|
| Bring an agent on safely | Dana, AI program lead | Start from intake → name the humans → raise the risk tier with a reason → unregistered caller found at the gateway → RUAIH coverage → export packet → retire an agent | E1.1, E2.1–2.2, E9.2, E12, E7.2, E6.4 |
| Supervise by exception | Marcus, agent owner | Hospital board → Medications division (stale + warning rows) → Med Rec Agent → inbox → dismiss with a reason → pause with impact preview → request resume → reviewer behaviour → sampling queue | E4, E5, E6.1, E6.3, E11, E13.2 |
| Sign for the work | Priya, clinical sponsor | Shadow scorecard → sign privilege with a written reason → My privileges (overdue review) → approve resume → promote one branch → automatic step-down | E3, E6.3, E13.1, E14.1, E15 |
| Enforce the limits | Sam, technical owner | Tools and hard stops → HS-11 returned → return one activity to Shadow → v1.5.0 held at the gateway | E1.4, E1.5 loop, E6.2, E9.1 |
| Approve what you can see | Dr. Lee, AI review board chair | Committee packet → approve with conditions → decision logged → Tier 3 promotion comes to the board | E2.3, E14.2 |
| Flag it where you work | Ana, pharmacist | Epic stand-in → flag a draft in one action → nine days later, "Fixed in v1.5.0" | E10 |
| Reconstruct what happened | Jordan, risk manager | Action list (read only) → action trace ACT-88213 → incident record → export | E7, E8.3 |

### 4.4 Free explore and the persona switcher

Switching persona changes:

1. **Landing route** (where "Explore as X" and the switcher send you):

| Persona | Role | Lands on |
|---|---|---|
| Dana | AI program lead | `/operations` (hospital board) |
| Priya | Clinical sponsor | `/portfolio/privileges` |
| Marcus | Agent owner | `/operations/divisions/medications` |
| Sam | Technical owner | `/inventory` |
| Dr. Lee | AI review board chair | `/portfolio/reviews/med-rec` (the Med Rec committee packet) |
| Ana | Pharmacist (no console access) | `/epic` |
| Jordan | Risk manager (read only) | `/operations/actions` |

2. **What is allowed.** Controls a persona can't use render in the designed locked state (lock icon, `off` text, `not-allowed`). Jordan sees the same screens with no mutating controls. See §7.
3. **"Needs me" inbox contents**, filtered to exceptions that persona owns.
4. **The avatar initial** in the product top nav.

### 4.5 Mock state, demo clock and reset

- One hospital, **Lakeshore Health**: 5 divisions, 41 agents.
  - Revenue cycle (Tom, 6 agents), **Medications (Marcus, 20 agents; fully detailed)**, Discharge (Elena, 8), Imaging referrals (Ravi, 4), Patient messages (Grace, 3).
- **Frozen demo clock:** "now" is **Tue 08 Dec 2026, 09:52** (from the frames), so relative times ("in 48 min", "Overdue 12 min") match the designs. Stories may move the clock with a `scenarioPatch` (E10.2 is "nine days later").
- Store actions really change data (pause → Paused chip on the board, agent view and division row; sign → privilege state Active).
- State persists to `localStorage` under a **versioned key**. Bumping the seed version discards old saved state automatically, so visitors with stale state never see broken screens.
- **Reset demo** restores the seed and clears story progress.

### 4.6 About and component gallery

- `/about`: short case-study context: the problem, the product principles, the Countersign design system, and how to use the prototype. Written from the source docs without naming the company those docs were written for.
- `/about/components`: the 10 product components and the primitives, in light and dark, mirroring `designs/Countersign Components.dc.html`.

### 4.7 Viewport policy

- Designed for 1440 px. Layouts flex where the design uses `1fr`, down to 1280 px.
- Between 1024 and 1280 px the page scrolls horizontally rather than breaking layouts.
- Below 1024 px: a "Best viewed on a desktop" page with the pitch, persona overview and a link to the GitHub repo.

## 5. Architecture

### 5.1 Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 19 + TypeScript (strict) | Static SPA, no server needed |
| Package manager | pnpm (Node 24) | Installed locally |
| Routing | React Router v7 (`createBrowserRouter`) | Real URLs, nested layouts |
| State | Zustand + `persist` middleware | Small, typed, easy scenario loading |
| Styling | CSS custom properties (tokens) + CSS Modules | 1:1 with the README's exact pixel specs |
| Fonts | `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` (400, 600) | Self-hosted, no external font request |
| Icons | Inline SVG from the README paths | No icon library; exact shapes |
| Unit tests | Vitest + Testing Library | Store, permissions, scenarios, clock, story engine |
| E2E smoke | Playwright | Every route renders; every story completes |
| CI | GitHub Actions | typecheck, lint, unit, build, e2e on every PR |
| Hosting | Vercel, linked to the GitHub repo | Preview URL per PR; `main` → production |
| Lint/format | ESLint (typescript-eslint, react-hooks) + Prettier | Consistency across sessions |

### 5.2 Folder layout

```
src/
  app/            router.tsx, routes.ts (route table), AppShell, providers
  prototype/      Landing, PrototypeBar, PersonaSwitcher, StoryPanel, story engine,
                  ResetDemo, DesktopGate, About, ComponentGallery
    stories/      dana.ts, marcus.ts, priya.ts, sam.ts, drlee.ts, ana.ts, jordan.ts
  design-system/  tokens.css (light + dark), global.css, icons/, and primitives:
                  Button, Field, Input, Select, Textarea, RadioCard, Checkbox,
                  Segmented, FilterPill, Table, Card, Paper, Modal, Menu, Tabs,
                  WizardSteps, DefinitionList, Notice, StatStrip, Sparkline,
                  ProgressBar, RuleTag, LogRow, Avatar
  components/     StatusChip, AgentRow, ExceptionItem, PrivilegeCard, AutonomyLadder,
                  HardStopCard + InstructionCard, SystemsVerbsGrid,
                  PauseDialog + ResumeDialog (impact preview), ActionTrace, MonitorHealth
  layout/         TopNav, PageHeader, layouts (Split, SplitL, Body), NotFound
  features/       board/, inbox/, controls/, audit/, inventory/, onboarding/,
                  validation/, settings/, changes/, feedback/, reviewers/,
                  evidence/, review-levels/, promotion/, step-down/
  data/           types.ts, seed/ (one file per entity), scenarios/
  store/          index.ts, slices/, selectors.ts, permissions.ts, auditLog.ts
  lib/            clock.ts, format.ts (times, durations, IDs), cx.ts
tests/e2e/        Playwright specs
docs/             BUILD_PLAN.md, specs/
```

### 5.3 Layer rules

- `design-system` knows nothing about the hospital domain. Primitives take generic props.
- `components` (product components) are pure: data in through props, events out through callbacks. No store access.
- `features` pages read via selectors and change data **only** through store actions.
- `data/seed` is plain typed data; no logic. `data/scenarios` are pure functions `(seed) => state`.
- Permission checks go through one function: `can(personaId, action, { divisionId?, agentId? })` in `store/permissions.ts`.
- Every store action appends an `AuditEntry { who, action, target, at, reason? }`, which powers the designed stamps ("Logs Marcus · 09:47") and History tabs.

### 5.4 Styling

- `tokens.css` defines every README token as a CSS custom property in OKLCH (`--cs-ink`, `--cs-line`, `--cs-acc`, …), light on `:root` and dark under `[data-theme="dark"]`.
- Type roles become utility classes or CSS Module composes (`.pageTitle`, `.label`, `.mono`, …) matching the README table.
- Global: `font-variant-numeric: tabular-nums`, antialiasing, keyboard-only focus rings (shown after Tab/Arrow, hidden on mousedown), 150 ms row background transition disabled under `prefers-reduced-motion`.
- Colour semantics are enforced in review: indigo = primary/current, teal = review waiting only, amber/red = warning/critical only, healthy = grey. No gradients, no emoji, no coloured left-border cards.

### 5.5 Routing

Routes use readable entity slugs from the seed (for example `med-rec`, `medications`) for agents and divisions, and the design's IDs for records (`act-88213`, `exc-5530`, `prv-0142`). Secondary states (view toggles, selected tab, inbox tab) live in query params so every state is linkable.

| Nav | Route | Frames |
|---|---|---|
| — | `/` | Landing |
| — | `/about`, `/about/components` | About, gallery |
| Operations | `/operations` (`?view=table\|tiles\|exceptions`) | 4a, 4d, 4f |
| Operations | `/operations/divisions/:divisionId` | 4b (= Screens 1a) |
| Operations | `/operations/agents/:agentId` (`?tab=overview\|activities\|scorecard\|actions\|privileges\|history`) | 4c, 6a–6e, 9a, 15a; scorecard tab = 3a |
| Operations | `/operations/agents/:agentId/cases/:caseId` | 3b |
| Operations | `/operations/inbox` and `/operations/inbox/:exceptionId` (`?tab=needs-me\|digest\|log`) | 5a, 5b, 5c, 5d |
| Operations | `/operations/actions`, `/operations/actions/:actionId` | 7a, 7b |
| Operations | `/operations/incidents`, `/operations/incidents/:incidentId` | composed list, 7c |
| Operations | `/operations/reviewers`, `/operations/reviewers/:unitId` | 11a, 11b |
| Operations | `/operations/sampling` | 13b |
| Inventory | `/inventory` (`?tab=agents\|drafts\|intake\|retired`) | 8c, 1i, 6f |
| Inventory | `/inventory/agents/:agentId` | 2d (agent record, governance side) |
| Inventory | `/inventory/agents/:agentId/onboarding/:step` (`intake\|job\|systems\|tools\|approval\|review`) | 1a, 2a, 1b, 1c, 1d, 1g, 1e, 1f, 1h |
| Inventory | `/inventory/agents/:agentId/risk-tier` | 2b |
| Inventory | `/inventory/privileges/:privilegeId/sign` | 3c (= Screens 1b) |
| Inventory | `/inventory/unregistered/:callerId` | 9b |
| Inventory | `/inventory/promotions/:promotionId` | 14a |
| Portfolio | `/portfolio` → redirects to `/portfolio/privileges` | — |
| Portfolio | `/portfolio/privileges` | 3d |
| Portfolio | `/portfolio/reviews/:reviewId` | 2c |
| Portfolio | `/portfolio/promotions/:promotionId` | 14b |
| Portfolio | `/portfolio/activities/:activityId` | 13a |
| Portfolio | `/portfolio/activities/:activityId/branches/:branchId` | 15b |
| Reports | `/reports` → redirects to `/reports/evidence` | — |
| Reports | `/reports/evidence`, `/reports/evidence/:agentId` | 12a, 12b |
| Reports | `/reports/export` | 7d |
| Settings | `/settings` → redirects to `/settings/divisions/medications` | — |
| Settings | `/settings/divisions/:divisionId`, `/settings/people` | 8a, 8b |
| Outside console | `/wall` | 4e / 4a·wall (dark, no controls) |
| Outside console | `/epic` (`?day=later` for 10b) | 10a, 10b |
| — | `*` | Not found, inside the app shell |

**Composed screens (no frame).** A few tabs exist in the designs without their own frame (Operations › Incidents list; agent tabs Activities, Actions, Privileges, History; Inventory tabs Intake and Retired). These are composed from existing primitives and product components only, following the nearest designed pattern, and are listed as "composed" in the build plan. Nothing new is invented visually.

## 6. Data model, seed and scenarios

### 6.1 Types (`src/data/types.ts`)

From the README model, extended for the flows:

- `Person { id, name, initial, title }` and `RoleAssignment { personId, divisionId | 'all', role }`, where `role` is one of `programLead | sponsor | owner | techOwner | committee | readOnly | frontline`.
- `Division { id, name, ownerId, sponsorId, lapsePolicy, agentIds[] }`
- `Agent { id, code ('AGT-0123'), name, version, sop, platform, divisionId, ownerId, techOwnerId, sponsorId, riskTier, lifecycle ('onboarding'|'inReview'|'live'|'paused'|'disabled'|'retired'), judgment, metrics, monitor { lastSeen, expectedIntervalMin } }`
- `Activity { id, agentId, name, branches[], level ('shadow'|'draft'|'supervised'|'autonomous'), reviewLevel ('tightened'|'normal'|'reduced') }`
- `Privilege { id, code, version, activityId, level, proposedLevel?, domain, conditions[], evidence, grantedBy, grantedAt, reviewDate, state ('awaiting'|'active'|'due'|'lapsed'|'steppedDown'), stepDownTriggers[] }`
- `HardStop { id, code, version, title, text, ownerId, approvedBy, blocks30d, testResult? }`, `Instruction { text, ownerId, sopVersion, editedAt }`
- `SystemGrant { system, verb ('read'|'draft'|'write'|'submit'|'sign'|'order'), granted, changed, lockedByPolicy? }`
- `JobDescription { agentId, version, purpose, activities, never[], actingFor, escalation[], successCriteria[], rolloutDomain, completeness }`
- `IntakeRequest { id ('REQ-0093'), … }`, `ReviewPacket` + `ReviewDecision { decision, conditions[], reason, by, at }`
- `Exception { id, type, severity, reason, agentId, ruleId, raisedAt, action, ownerId, claimedAt?, deadline, state, dismissReason?, escalatedTo? }`
- `Action { id, agentVersion, actingFor, encounter, steps[], reviewerOutcome }`, `Incident { id, commanderId, timeline[], rootCause, corrections[], linkedActionIds[] }`
- `ResumeRequest { agentId, requestedBy, reason, approvals[] }`
- Scorecards, sample cases, reviewer stats by unit and shift (never by named pharmacist), RUAIH coverage, review-level rules, sampling queue, promotions, step-down events, unregistered callers, Epic stand-in data.

Exact field shapes are settled in Phase 2 and recorded in the build plan's decision log.

### 6.2 Seed

- Values come from the frames: names, IDs (`AGT-0123`, `PRV-0142 v3`, `HS-04 v2`, `HS-11`, `MR-12 v1`, `ORG-POL-02`, `ORG-LAPSE-01`, `REQ-0093`, `ACT-88213`, `EXC-5530`, `INC-0029`), counts and copy.
- Medications is fully detailed. Other divisions carry just enough to render the hospital board, tiles, wall display and inventory.

### 6.3 Scenarios

Named presets, each `(seed) => state`. Initial list (extended as phases need them):

| Scenario | State |
|---|---|
| `baseline` | The board as drawn at Tue 08 Dec 09:52 |
| `onboarding-at-5-of-7` | Med Rec draft with the job description at 5 of 7 (1b) |
| `onboarding-tools-tested` | All 3 hard stops tested; Send to Priya unlocked (1d) |
| `onboarding-returned-hs11` | HS-11 returned to Sam; Priya's review reset (1g) |
| `awaiting-signature` | PRV-0142 awaiting Priya, one target missed (3c) |
| `med-rec-paused` | Med Rec paused by Marcus, 12 drafts routed to pharmacists (6b result) |
| `resume-requested` | Marcus requested resume; Priya pending (6d) |
| `change-detected-v150` | v1.5.0 held at the gateway (9a) |
| `epic-fixed-later` | Clock +9 days; Ana's flag fixed in v1.5.0 (10b) |
| `step-down-threshold` | Med Rec dropped Draft → Shadow on edit rate (15a) |

## 7. Permissions

From the PRD matrix. `can()` implements this table; "own division" is resolved from role assignments.

| Action | Program lead (Dana) | Sponsor (Priya) | Owner (Marcus) | Tech owner (Sam) | Committee (Dr. Lee) | Read-only (Jordan) |
|---|---|---|---|---|---|---|
| View Command Board | All | Own division | Own division | Own agents | All | All |
| Start onboarding | Yes | Yes | Yes | Yes | No | No |
| Edit job description | Yes | Yes | Yes | Yes | No | No |
| Configure tools and hard stops | No | Approves | No | Yes | No | No |
| Approve go-live | Prepares packet | Signs privilege | Requests | No | Approves (medium/high tier) | No |
| Pause, return to Shadow | Yes | Yes | Yes | No | No | No |
| Revoke a tool | Yes | Yes | Yes | Yes | No | No |
| Resume after a pause | No | Yes, with owner | Yes, with sponsor | No | No | No |
| Disable or retire | Yes | Yes | No | No | No | No |
| Resolve exceptions | All | Own division | Own division | Technical only | No | No |
| View audit trail | All | Own division | Own division | Own agents | All | All |
| Manage divisions and roles | Yes | No | No | No | No | No |

Ana (frontline) has no console access; selecting her opens `/epic`. In the prototype, "own division" scoping shows other divisions as read-only rather than hiding them, so the board stays explorable.

## 8. Screen inventory

55 frames. "Phase" is where each is built (see §9).

| Frame | Name | Persona | Route | Phase |
|---|---|---|---|---|
| 4a | Hospital view | Dana | `/operations` | 3 |
| 4a·wall / 4e | Wall display (dark) | — | `/wall` | 3 |
| 4b | Division view (incl. Monitor stale) | Marcus | `/operations/divisions/medications` | 3 |
| 4c | Agent view | Marcus | `/operations/agents/med-rec` | 3 |
| 4d | Tile grid | Dana | `/operations?view=tiles` | 3 |
| 4f | Exceptions first | Dana | `/operations?view=exceptions` | 3 |
| 5a | Inbox and detail | Marcus | `/operations/inbox/:exceptionId` | 3 |
| 5b | Dismiss with a reason | Marcus | inbox, modal | 3 |
| 5c | Daily digest at 07:00 (720 px) | Marcus | `/operations/inbox?tab=digest` | 3 |
| 5d | Escalated to Priya | Priya | inbox, escalated item | 3 |
| 6a | Control menu | Marcus | agent view, menu | 4 |
| 6b | Impact preview (pause) | Marcus | agent view, modal | 4 |
| 6c | Return one activity to Shadow | Sam | agent view, modal | 4 |
| 6d | Resume requested | Marcus | agent view, modal + state | 4 |
| 6e | Priya approves resume | Priya | agent view, modal | 4 |
| 6f | Disable or retire (typed confirm) | Dana | `/inventory`, modal | 4 |
| 7a | Action list (read only) | Jordan | `/operations/actions` | 4 |
| 7b | Action trace ACT-88213 | Jordan | `/operations/actions/act-88213` | 4 |
| 7c | Incident record | Jordan | `/operations/incidents/:incidentId` | 4 |
| 7d | Export for a surveyor | Dana | `/reports/export` | 4 |
| 8c | Inventory linked to operations | Dana | `/inventory` | 4 |
| 1a | Start from intake REQ-0093 | Dana | `…/onboarding/intake` | 5 |
| 1b | Job description, 5 of 7 | Marcus | `…/onboarding/job` | 5 |
| 1c | Systems and verbs | Marcus | `…/onboarding/systems` | 5 |
| 1d | Tools and hard stops | Sam | `…/onboarding/tools` | 5 |
| 1e | Sponsor approval | Priya | `…/onboarding/approval` | 5 |
| 1f | Request changes on HS-11 | Priya | `…/onboarding/approval`, state | 5 |
| 1g | Returned to Sam | Sam | `…/onboarding/tools`, state | 5 |
| 1h | Ready for review (frozen) | Priya | `…/onboarding/review` | 5 |
| 1i | Drafts in Inventory | Marcus | `/inventory?tab=drafts` | 5 |
| 2a | Name the humans | Dana | `…/onboarding/intake`, humans section | 5 |
| 2b | Risk tier | Dana | `/inventory/agents/med-rec/risk-tier` | 5 |
| 2c | Committee packet | Dr. Lee | `/portfolio/reviews/:reviewId` | 5 |
| 2d | Decision logged | Dana | `/inventory/agents/med-rec` | 5 |
| 3a | Shadow scorecard | Marcus | `/operations/agents/med-rec?tab=scorecard` | 5 |
| 3b | Sample case, side by side | Marcus | `/operations/agents/med-rec/cases/:caseId` | 5 |
| 3c | Sign the privilege (= Screens 1b) | Priya | `/inventory/privileges/prv-0142/sign` | 5 |
| 3d | My privileges | Priya | `/portfolio/privileges` | 5 |
| 8a | Division settings | Dana | `/settings/divisions/medications` | 6 |
| 8b | People and roles | Dana | `/settings/people` | 6 |
| 9a | New version held at the gateway | Marcus | agent view, state | 6 |
| 9b | Unregistered caller | Dana | `/inventory/unregistered/:callerId` | 6 |
| 10a | Flag from Epic | Ana | `/epic` | 6 |
| 10b | Fixed in v1.5.0 | Ana | `/epic?day=later` | 6 |
| 11a | Reviewer behaviour | Marcus | `/operations/reviewers` | 6 |
| 11b | Drill into 6 North | Marcus | `/operations/reviewers/6-north` | 6 |
| 12a | RUAIH coverage | Dana | `/reports/evidence` | 7 |
| 12b | Export packet | Dana | `/reports/evidence/med-rec` | 7 |
| 13a | Review level and its rules | Priya | `/portfolio/activities/:activityId` | 7 |
| 13b | Sampling queue | Marcus | `/operations/sampling` | 7 |
| 14a | Sponsor signs the promotion | Priya | `/inventory/promotions/:promotionId` | 7 |
| 14b | Board decides (Tier 3) | Dr. Lee | `/portfolio/promotions/:promotionId` | 7 |
| 15a | Threshold breach, Draft → Shadow | Priya | agent view, state | 7 |
| 15b | Version change, Supervised → Draft | Priya | `/portfolio/activities/:a/branches/:b` | 7 |

Countersign Screens 1a and 1b are the same screens as 4b and 3c. The component sheet is built in Phase 2 as `/about/components`.

## 9. Phases and checkpoints

Each phase ends at a checkpoint: a PR with a Vercel preview URL that Stefan reviews before merge. Detailed tasks live in `docs/BUILD_PLAN.md`.

| # | Phase | Builds | Checkpoint (what Stefan reviews) |
|---|---|---|---|
| 0 | Setup | git repo, `.gitignore` (source docs, `.DS_Store`), public GitHub repo `StefanNav/agent-control-plane`, `CLAUDE.md`, `docs/BUILD_PLAN.md`, milestones and phase issues, Vercel project linked | Repo exists; plan and issues visible on GitHub |
| 1 | Foundation | Vite scaffold, lint/format, tokens, fonts, icons, all primitives, TopNav, PageHeader, layouts, full route table with placeholders, prototype bar shell, CI, first deploy | Live URL: every nav link works; primitives gallery |
| 2 | Components and data | 10 product components (light + dark) in the gallery; types, seed, store, scenarios, permissions, audit log, clock; persona switcher wired; Reset demo | Gallery side by side with the Countersign component sheet; switching persona changes the avatar and locks |
| 3 | Command Board and inbox | E4 (4a–4f, wall) and E5 (5a–5d) | Find the one agent needing action among 20; dismiss needs a reason |
| 4 | Controls and audit | E6 (6a–6f), E7 (7a–7d), inventory 8c | Pause → board updates → two-person resume; trace ACT-88213 |
| 5 | Onboarding and go-live | E1 (1a–1i), E2 (2a–2d), E3 (3a–3d) | Intake → signed privilege end to end |
| 6 | Governance and fast follows | E8 (8a–8b), E9, E10, E11 | All v1 and fast-follow frames built |
| 7 | Earned autonomy | E12, E13, E14, E15 | All 55 frames built |
| 8 | Stories and portfolio layer | Landing, story engine, 7 stories, About, desktop gate | Every story clicks through end to end |
| 9 | Polish and launch | Keyboard and a11y pass, reduced motion, visual QA against every frame, portfolio README, social preview image, final production deploy | Final public URL |

## 10. Workflow

- **Branches:** `phase-N-<slug>` off `main` (for example `phase-1-foundation`). Small, frequent commits with clear messages.
- **GitHub tracking:** one milestone per phase; one issue per phase holding its task checklist (mirrors `BUILD_PLAN.md`); the phase PR closes the issue.
- **Vercel:** GitHub integration; every PR gets a preview URL; merging to `main` deploys production. SPA rewrites in `vercel.json`.
- **Checkpoint protocol** (end of every phase):
  1. Run `pnpm check` (typecheck, lint, unit tests, build) and the Playwright smoke suite; all green.
  2. Visual check: screenshot each new screen at 1440 px and compare side by side with its design frame; fix differences.
  3. Update `docs/BUILD_PLAN.md`: tick tasks, write the phase's handoff notes, update the "Start here" block, add decisions to the log.
  4. Push, open the PR (checklist + preview URL + screenshots), and update the GitHub issue.
  5. **Stop and ask Stefan to review.** Merge only after approval.
- Within a phase, work may pause at any task boundary. The "Start here" block is updated whenever a session ends mid-phase.

## 11. Handoff system

- **`CLAUDE.md`** (repo root, loaded automatically by Claude Code): what the project is, the rule to read `docs/BUILD_PLAN.md` "Start here" first, commands, conventions, layer rules, colour semantics, and the checkpoint protocol.
- **`docs/BUILD_PLAN.md`**: the single source of progress.
  - **Start here** block: current phase, branch, last completed task, exact next task, blockers, live and preview URLs.
  - **Phase sections:** goal, task checklist, definition of done, handoff notes (written at the end of the phase: what was built, where, gotchas, what the next phase needs).
  - **Decision log:** dated decisions that aren't obvious from the code.
- **This spec:** the stable "what and why". Changes to scope or design update this spec and are logged in the decision log.

## 12. Verification

- **Typecheck and lint** on every change (`pnpm check`).
- **Unit tests (test-first)** for logic: store actions and their audit entries, `can()` against the permission table, scenario builders, clock and formatters, story engine (URL ↔ step).
- **Playwright smoke in CI:** every route renders without console errors (Phase 1 onward); every story runs start to finish (Phase 8 onward).
- **Visual fidelity:** manual side-by-side screenshots against the design frames at 1440 px at each checkpoint. No automated pixel diffs; the design files are canvases, so diffs would be brittle.
- **Accessibility (Phase 9):** keyboard paths through rows, menus and modals; focus management in modals; colour + shape + word for every status.

## 13. Decisions and open issues

| # | Item | Decision |
|---|---|---|
| D1 | Persona UX | Guided stories + free explore with persona switcher (§4) |
| D2 | Repo visibility | Public repo; `.docx` source docs git-ignored; company named in the source docs not used on the site |
| D3 | Stack | Vite + React + TS + CSS Modules + Zustand + React Router; Vercel (§5.1) |
| D4 | E4 alternatives | Table is the default board; tiles and exceptions-first are a View toggle; wall display is `/wall` |
| D5 | Undesigned tabs | Composed from existing primitives only, flagged "composed" (§5.5) |
| D6 | Viewport | Desktop only; gate below 1024 px (§4.7) |
| O1 | Ring overload (README issue 1) | Build as designed; check the wall display at Phase 9; if solid vs dashed fails at 12 px, stale becomes a dashed square |
| O2 | Wall display scale (issue 2) | `/wall` uses its own larger type scale taken from frame 4e |
| O3 | Dialog elevation (issue 3) | Use the modal shadow, as the README says |
| O4 | E16–E21 (issue 4) | Out of scope |
