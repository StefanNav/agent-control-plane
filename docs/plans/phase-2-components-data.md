# Phase 2: Components and data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 10 Countersign product components and the mock-data layer (types, clock, seed, permissions, store, scenarios). Persona switching and Reset demo work in the prototype bar.

**Architecture:**
- Domain types live in `src/data/types.ts`. The seed (`src/data/seed/`) is plain typed data copied from the frames.
- A Zustand store (`src/store/`) holds one `DemoState`. It persists to `localStorage` under a versioned key and runs every mutation through `runAction`, which checks `can()` and appends an audit entry.
- Product components (`src/components/`) are pure. They take view-model props and never touch the store. Phase 3+ selectors map domain data to those props.
- The gallery renders the components from fixtures copied from the component sheet, not from the seed. So it mirrors `designs/Countersign Components.dc.html` exactly.

**Tech stack:** as Phase 1 (React 19, TS strict, Zustand 5 with `persist`, CSS Modules, Vitest, Playwright). No new runtime dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.4 personas, §4.5 state and clock, §5.3 layer rules, §6 data, §7 permissions).

**Design sources:**
- `designs/Countersign Components.dc.html`: the 10 components, their states and copy, plus the dark section.
- `designs/CountersignCore.dc.html`: components 01–03 in light and dark, plus the `AR`, `EXB` and `DIVS` data.
- `designs/DivisionView.dc.html`: the 20 Medications agents in the `AG` array.
- `designs/E4 Command Board.dc.html`: divisions and the hospital view.
- `docs/design-handoff.md` §"The 10 product components": exact sizes and rules.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints. Added from this phase on:
- **Seed versioning:** `SEED_VERSION` in `src/data/seed/index.ts` must be bumped whenever seed data or `DemoState` shape changes. Stale saved state then resets itself (Review focus 1).
- **Time:** product code reads "now" from the store (`state.now`, default `DEMO_NOW = '2026-12-08T09:52:00'`) and formats through `src/lib/clock.ts`. It never calls `new Date()` without an argument, and never calls `Date.now()`.
- **Purity:** product components import only from `src/design-system`, `src/lib`, and their own folder.

## Phase-1 facts this plan relies on

- **Primitives:** import them from `src/design-system`.
- **Table:** supports `groups`, `density="board"`, `isMuted`, `textSize` and `hideHeader`. It ignores row keys that come from controls inside cells.
- **Modal:** owns the keyboard while open. Clicking the scrim does not close it.
- **App shell:** `AppShell` hardcodes `avatarInitial="M"`, and `PrototypeBar` hardcodes "Viewing as Marcus". Task 2.10 replaces both.
- **Pages:** real pages go in `PAGES` in `src/app/router.tsx`.

---

### Task 2.1: Domain types

**Files:** Create `src/data/types.ts`

**Interfaces (Produces).** These are the exact names later tasks use. Field lists can grow; renames are breaking changes.
- `PersonaId = 'dana' | 'priya' | 'marcus' | 'sam' | 'drlee' | 'ana' | 'jordan'`
- `Role = 'programLead' | 'sponsor' | 'owner' | 'techOwner' | 'committee' | 'readOnly' | 'frontline'`
- `Person { id: string; name: string; initial: string; title: string }`: personas use their `PersonaId` as `id`. Other people (Tom, Elena, Ravi, Grace, Nina) use lowercase ids.
- `RoleAssignment { personId: string; divisionId: string | 'all'; role: Role }`
- `Status = 'normal' | 'review' | 'warn' | 'crit' | 'stale' | 'shadow' | 'paused'`: the status-chip states.
- `Level = 'shadow' | 'draft' | 'supervised' | 'autonomous'`
- `Lifecycle = 'onboarding' | 'inReview' | 'live' | 'paused' | 'disabled' | 'retired'`
- `Judgment { status: Status; label: string; ruleTag?: string }`
- `Trend { end: number; drift: number }`: the design's sparkline seed. Points come from `trendPoints` in Task 2.2.
- `AgentMetrics { day: number | null; signedAsIs: number | null; edited: number | null; blocked: number | null; trend: Trend }`: `null` renders as "—". All four are `null` when monitoring is stale.
- `MonitorState { lastSeen: string; expectedIntervalMin: number }` (ISO times)
- `Division { id: string; name: string; ownerId: string; sponsorId: string; lapsePolicy: 'nothing' | 'shadow' | 'pause'; monitor: { state: 'live' | 'delayed' | 'stale'; lastAt: string } }`
- `Agent { id: string; code: string; name: string; version: string; sop?: string; platform: string; divisionId: string; ownerId: string; techOwnerId: string; sponsorId: string; riskTier: 1 | 2 | 3; lifecycle: Lifecycle; level: Level; grantorId: string; reviewDate: string; judgment: Judgment; metrics: AgentMetrics; monitor: MonitorState; pausedBy?: string; pausedAt?: string }`
- `Activity { id: string; agentId: string; name: string; level: Level; reviewLevel: 'tightened' | 'normal' | 'reduced'; branches: { id: string; name: string; favourable: boolean }[] }`
- `PrivilegeState = 'awaiting' | 'active' | 'due' | 'lapsed' | 'steppedDown'`
- `Privilege { id: string; code: string; version: number; activityId: string; agentId: string; level: Level; proposedLevel?: Level; domain: string; conditions: string[]; evidence: string; grantedBy?: string; grantedAt?: string; reviewDate: string; state: PrivilegeState; stepDownTriggers: string[]; movedBy?: string; trigger?: string }`
- `HardStop { id: string; code: string; version: number; title: string; text: string; ownerId: string; approvedBy: string; approvedAt: string; agentId: string; blocks30d: number; actions30d: number }`
- `Instruction { id: string; agentId: string; text: string; ownerId: string; editedAt: string; sopVersion: string }`
- `Verb = 'read' | 'draft' | 'write' | 'submit' | 'sign' | 'order'`; `GrantCell = 'granted' | 'none' | 'changed' | 'locked'`; `SystemGrant { agentId: string; system: string; detail: string; cells: Record<Verb, GrantCell> }`
- `ExceptionState = 'new' | 'claimed' | 'overdue' | 'resolved' | 'dismissed'`
- `AgentException { id: string; code: string; status: Status; type: string; reason: string; agentId: string; ruleTag: string; raisedAt: string; action: string; actionSub: string; ownerId: string; claimedAt?: string; deadline: string; state: ExceptionState; route: 'page' | 'inbox' | 'digest' | 'log'; outcome?: string; outcomeSub?: string; closedAt?: string; dismissReason?: string; escalatedTo?: string }` (named `AgentException` to avoid shadowing the global `Exception`-like names)
- `TraceStepKind = 'input' | 'tool' | 'policyPassed' | 'policyBlocked' | 'output' | 'reviewer'`; `TraceStep { at: string; kind: TraceStepKind; title: string; ruleTag?: string; detail?: string; meta?: string }`
- `AgentAction { id: string; code: string; title: string; agentId: string; agentVersion: string; sop: string; actingFor: string; steps: TraceStep[] }`
- `ResumeRequest { agentId: string; requestedBy: string; requestedAt: string; reason: string; approvals: { personId: string; reason: string; at: string }[] }`
- `AuditEntry { id: string; at: string; who: PersonaId; action: string; target: string; reason?: string }`
- `DemoState { version: number; now: string; personaId: PersonaId; people: Person[]; roles: RoleAssignment[]; divisions: Division[]; agents: Agent[]; activities: Activity[]; privileges: Privilege[]; hardStops: HardStop[]; instructions: Instruction[]; grants: SystemGrant[]; exceptions: AgentException[]; actions: AgentAction[]; resumeRequests: ResumeRequest[]; audit: AuditEntry[] }`

Later phases append their own types (job descriptions, scorecards, incidents, etc.) to this file and to `DemoState`, bumping `SEED_VERSION`.

- [ ] **Step 1: Write `src/data/types.ts`** with the exports above, each with a one-line doc comment.
- [ ] **Step 2: Verify** with `pnpm typecheck`. Expected: passes.
- [ ] **Step 3: Commit** with `git commit -m "feat(data): domain types"`.

### Task 2.2: Demo clock, formatters, trend points

**Files:** Create `src/lib/clock.ts`, `src/lib/trend.ts`. Test: `src/lib/clock.test.ts`, `src/lib/trend.test.ts`

**Interfaces (Produces):**
- `DEMO_NOW = '2026-12-08T09:52:00'`
- `formatClock(iso: string): string` → `'09:52'`
- `formatClockSeconds(iso: string): string` → `'09:42:17'`
- `formatMs(iso: string): string` → `'09:38:04.512'`
- `formatDay(iso: string): string` → `'Tue 08 Dec'`
- `formatDate(iso: string): string` → `'08 Dec'`
- `formatRelative(target: string, now: string): string`
  - Future: under 60 min → `'in 48 min'`; under 24 h → `'in 2 h 18 min'` (or `'in 2 h'` when the minutes are 0); otherwise `'in 6 days'` (or `'in 1 day'`).
  - Past: `'Overdue 12 min'`, `'Overdue 1 h 47 min'`, `'Overdue 7 days'`.
- `formatAgo(then: string, now: string): string` → `'2 h 14 min ago'`, `'12 min ago'`, `'3 days ago'`
- `minutesBetween(a: string, b: string): number` (b − a, rounded)
- ISO strings are local and timezone-free (`YYYY-MM-DDTHH:MM:SS[.mmm]`). Parse them with `new Date(iso)` and format with local getters, so output is the same on every machine. Weekday and month names come from fixed English arrays, not `toLocaleString`.
- `trendPoints(index: number, trend: Trend): number[]`: seven values that reproduce the design's sparkline:
  - `noise(i, j) = frac(sin(i * 12.9898 + j * 78.233) * 43758.5453) - 0.5) * 1.2`, where `frac(x) = x - floor(x)`
  - `v_j = end - drift * (6 - j) + (j === 6 ? 0 : noise(index, j))`
  - each value is clamped to [75, 100]

- [ ] **Step 1: Failing tests**, with `NOW = '2026-12-08T09:52:00'`:
  - `formatClock(NOW) === '09:52'`
  - `formatClockSeconds('2026-12-08T09:42:17') === '09:42:17'`
  - `formatMs('2026-12-08T09:38:04.512') === '09:38:04.512'`
  - `formatDay(NOW) === 'Tue 08 Dec'`
  - `formatDate('2027-01-05T00:00:00') === '05 Jan'`
  - `formatRelative('2026-12-08T10:40:00', NOW) === 'in 48 min'`
  - `formatRelative('2026-12-08T12:10:00', NOW) === 'in 2 h 18 min'`
  - `formatRelative('2026-12-08T09:40:00', NOW) === 'Overdue 12 min'`
  - `formatRelative('2026-12-14T09:52:00', NOW) === 'in 6 days'`
  - `formatRelative('2026-12-01T09:52:00', NOW) === 'Overdue 7 days'`
  - `formatAgo('2026-12-08T07:38:00', NOW) === '2 h 14 min ago'`
  - `trendPoints(0, { end: 91, drift: 0.2 })` has length 7, last value `91`, every value in [75, 100]
  - `trendPoints(1, { end: 78, drift: -1.8 })[6] === 78`, and its first value is greater than its last (the edit-rate decline)
- [ ] **Step 2: Run** `pnpm test src/lib`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** `clock.ts` and `trend.ts`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(lib): demo clock, formatters, design trend points"`.

### Task 2.3: Seed

**Files:**
- Create `src/data/seed/{people.ts,divisions.ts,agents.ts,activities.ts,privileges.ts,policies.ts,exceptions.ts,actions.ts,index.ts}`
- Test: `src/data/seed/seed.test.ts`

**Interfaces (Produces):**
- `SEED_VERSION = 1`
- `createSeed(): DemoState`: returns a fresh deep copy every call, with `now: DEMO_NOW`, `personaId: 'marcus'` and empty `audit`.

**Content** (values verbatim from the frames; where a frame is silent, invent plausibly and log it in the BUILD_PLAN decision log):
- **People:**
  - Dana (D), AI program lead
  - Priya (P), Director of Pharmacy
  - Marcus (M), Pharmacy informatics manager
  - Sam (S), Integration analyst
  - Dr. Lee (L), Chair, AI review board
  - Ana R., PharmD (A), Pharmacist, 7 West
  - Jordan (J), Risk manager
  - Division owners Tom, Elena, Ravi and Grace, plus Nina (Revenue cycle sponsor, from 4d "Resume needs Tom and Nina")
- **Roles:**
  - Dana is `programLead` for `all`
  - Priya is `sponsor` for `medications`; Marcus is `owner` for `medications`
  - Sam is `techOwner` for `medications`
  - Dr. Lee is `committee` for `all`; Jordan is `readOnly` for `all`
  - Ana is `frontline` for `medications`
  - Tom, Elena, Ravi and Grace are `owner` of their divisions; Nina is `sponsor` for `revenue-cycle`
- **Divisions** (ids are slugs), with owners and agent counts from `CountersignCore` `DIVS` and E4 4a:
  - `revenue-cycle` (Tom, 6 agents)
  - `medications` (Marcus, sponsor Priya, 20 agents)
  - `discharge` (Elena, 8 agents)
  - `imaging-referrals` (Ravi, 4 agents)
  - `patient-messages` (Grace, 3 agents)
  - Monitor: Medications is `live` at `09:42:17`; Revenue cycle is `delayed`, last at `09:36`.
- **Agents (41):**
  - **Medications:** the 20 rows of `DivisionView` `AG`, in order, verbatim: judgment status, label and rule tag; name; version; 24h; signed as is; edited; blocked; level; grantor; review date; and trend `{ end, drift }`. Slug ids, e.g. `med-rec`, `renal-dosing`, `formulary-swap`. Codes follow `AGT-0123` for Med Rec Agent and increase from there.
    - The `stale` row has every metric `null`.
    - The `paused` row has `pausedBy: 'marcus'` and `lifecycle: 'paused'`.
    - `shadow` rows have `level: 'shadow'`.
  - **Revenue cycle:** Prior Auth Agent is `crit`, labelled "Wrong-patient draft · paused", `pausedBy: 'tom'`, paused at 08:12. Its 5 sibling agents are `normal`.
  - **Discharge:** 8 agents, all `normal`, including "Discharge Summary Agent".
  - **Imaging referrals:** 4 agents, all `normal`.
  - **Patient messages:** 3 agents, all `shadow`.
- **Activities:** Med Rec Agent has "Reconcile home medications at admission" (`draft`) and "Flag allergy conflicts" (`draft`). Every other agent has one activity named after its job, at the agent's level.
- **Privileges:** the five component-sheet privileges, re-dated so they read correctly on the 08 Dec clock. Keep each one's codes, versions, titles, agents, domains, evidence and conditions; log the re-dating.
  - PRV-0142 v3 Med Rec, `awaiting`
  - PRV-0127 v2 Discharge Meds, `active`
  - PRV-0118 v4 Duplicate Rx, `due`
  - PRV-0109 v2 IV-to-Oral, `lapsed`, moved by `ORG-LAPSE-01`
  - PRV-0131 v3 Renal Dosing, `steppedDown`, trigger `MR-12 v1`
  - Plus PRV-0098, Duplicate Rx's overdue review from the division view.
- **Policies for Med Rec:**
  - Hard stops: HS-04 v2 "Never change a dose" (7 blocked of 8,912), HS-07 v1 "Never remove an allergy" (2), HS-11 v1 "Patient identity must match the encounter" (0).
  - The two component-sheet instructions.
  - System grants from the sheet's grid: Epic, Pharmacy worklist (write is `changed`), Pyxis, Teams. Sign and Order are `locked`.
- **Exceptions:** the five `CountersignCore` `EXB` items (drafts, edit, stop, stale, priv), with states and times as in its inbox (one overdue, three due soon, one resolved). Dates align to 08 Dec.
- **Actions:** ACT-88213 with the nine trace steps from the component sheet.

- [ ] **Step 1: Failing invariant tests**
  - 5 divisions; agents per division `{ revenue-cycle: 6, medications: 20, discharge: 8, imaging-referrals: 4, patient-messages: 3 }`; 41 in total.
  - Every id is unique within its collection.
  - Every reference resolves: agent division, owner, tech owner, sponsor and grantor; activity agent; privilege activity and agent; exception agent and owner; role person and division.
  - Medications agents are in `AG` order. Their judgment statuses, in order, start `['review', 'warn', 'warn', 'stale', 'normal', …]` and end `['paused', 'shadow', 'shadow', 'shadow']`.
  - Formulary Swap Agent has all four metrics `null`.
  - Med Rec Agent: `code === 'AGT-0123'`, `version === 'v1.3.0'`, `judgment.label === 'Review: 3 drafts'`, `judgment.ruleTag === 'HS-04 v2'`, `metrics.day === 138`.
  - `createSeed() !== createSeed()`, and mutating one doesn't change the other.
  - `createSeed().personaId === 'marcus'`, and `now === DEMO_NOW`.
- [ ] **Step 2: Run** `pnpm test src/data`. Expected: FAIL.
- [ ] **Step 3: Implement** the seed files. `index.ts` assembles them and `structuredClone`s.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(data): Lakeshore Health seed from the frames"`, and add the decision-log rows for invented names and re-dated privileges.

### Task 2.4: Permissions

**Files:** Create `src/store/permissions.ts`. Test: `src/store/permissions.test.ts`

**Interfaces (Produces):**
- `PermAction = 'viewBoard' | 'startOnboarding' | 'editJobDescription' | 'configureTools' | 'approveTools' | 'prepareGoLive' | 'signPrivilege' | 'approveGoLive' | 'pause' | 'returnToShadow' | 'revokeTool' | 'resume' | 'disable' | 'retire' | 'resolveException' | 'viewAudit' | 'manageDivisions'`
- `can(state: Pick<DemoState, 'roles' | 'agents'>, personaId: PersonaId, action: PermAction, ctx?: { divisionId?: string; agentId?: string }): boolean`
  - Implements spec §7. "Own division" means a role assignment on that division, or `'all'`.
  - Sam's "own agents" means agents where `techOwnerId === 'sam'`. `ctx.agentId` resolves the agent's division and tech owner.
  - Without `ctx`, scoped roles pass if they hold the role anywhere.
  - `readOnly` and `frontline` can never do anything mutating. `viewBoard` and `viewAudit` stay true for read-only.
- `lockReason(action: PermAction): string`, e.g. `'Program lead only'` for `retire`/`disable`/`manageDivisions` and `'Read-only access'` otherwise. Used in locked menus.

- [ ] **Step 1: Failing table-driven test.** One `test.each` row per cell of spec §7 for the six console personas, using `createSeed()` and `ctx = { divisionId: 'medications' }`. Plus:
  - `can(s, 'marcus', 'pause', { divisionId: 'revenue-cycle' }) === false`
  - `can(s, 'sam', 'revokeTool', { agentId: 'med-rec' }) === true`
  - `can(s, 'sam', 'pause', { agentId: 'med-rec' }) === false`
  - `can(s, 'dana', 'retire') === true`
  - `can(s, 'priya', 'manageDivisions') === false`
  - `can(s, 'jordan', 'viewAudit') === true`
  - `can(s, 'jordan', 'resolveException', ctx) === false`
  - `can(s, 'ana', 'viewBoard') === false`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Encode the matrix as data: `Record<PermAction, Partial<Record<Role, 'all' | 'own' | 'ownAgents' | false>>>`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(store): permission matrix and can()"`.

### Task 2.5: Store

**Files:**
- Create `src/store/{index.ts,storage.ts,runAction.ts,selectors.ts}`
- Test: `src/store/store.test.ts`
- Modify `CLAUDE.md` (add the seed-versioning rule under Conventions)

**Interfaces:**
- Consumes: `createSeed`, `SEED_VERSION` (2.3); `can` (2.4); clock (2.2).
- Produces:
  - `useDemo`: a Zustand hook over `DemoStore = DemoState & DemoActions`.
  - `DemoActions`:
    - `setPersona(id: PersonaId): void`
    - `reset(): void`: restores `createSeed()`, keeping nothing.
    - `loadScenario(id: ScenarioId): void`: wired in 2.6.
    - `claimException(id: string): ActionResult`
  - `ActionResult = { ok: true } | { ok: false; reason: string }`
  - `runAction(state: DemoState, spec: { action: PermAction; ctx?: { divisionId?: string; agentId?: string }; audit: { action: string; target: string; reason?: string }; mutate: (draft: DemoState) => void }): { state: DemoState; result: ActionResult }`. It's pure:
    - If `can()` fails, it returns the same state object and `{ ok: false, reason: lockReason(action) }`.
    - Otherwise it `structuredClone`s, applies `mutate`, appends `AuditEntry { id: 'aud-<n>', at: state.now, who: state.personaId, … }`, and returns `{ ok: true }`.
  - `safeStorage`: a `StateStorage` that wraps `localStorage` in try/catch and falls back to an in-memory `Map`.
  - Persist options: `name: 'acp-demo'`, `version: SEED_VERSION`, `storage: createJSONStorage(() => safeStorage)`, `partialize` to `DemoState` fields only, `migrate: () => createSeed()` (any version mismatch resets).
  - Selectors: `selectPersona(s): Person`, `selectCan(s, action, ctx?)`.
  - `PERSONAS` comes later, in `src/prototype/personas.ts` (2.10). The store holds only the `personaId`.

- [ ] **Step 1: Failing tests**
  - `setPersona('jordan')` changes `personaId`.
  - `reset()` after `setPersona('jordan')` restores `marcus` and seed data.
  - `runAction` as Marcus on a Medications exception: the result is ok, the claimed state is applied, and one audit entry `{ who: 'marcus', at: DEMO_NOW }` exists.
  - **Review focus 5:** `runAction` as Jordan returns `{ ok: false }`, and the returned state is `===` the input state (unchanged).
  - `claimException('exc-…')` as Marcus sets `claimedAt` to `state.now` and `state` to `'claimed'`. As Jordan it returns `ok: false`.
  - **Review focus 1:** store a saved state with `version: SEED_VERSION - 1` (or a `{ version: 0, state: {…garbage…} }` payload) under `acp-demo`, then create the store. Its state equals `createSeed()` fields.
  - **Review focus 2:** with a `localStorage` whose `getItem`/`setItem` throw (`vi.stubGlobal`), `safeStorage` works in memory, so `setItem` then `getItem` returns the value, and the store can still be created and `setPersona` works.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Export a `createDemoStore()` factory (for tests) and the app singleton `useDemo`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Add to `CLAUDE.md` Conventions:** "Bump `SEED_VERSION` (src/data/seed/index.ts) whenever seed data or `DemoState` changes; mutate state only through store actions built on `runAction`."
- [ ] **Step 6: Commit** with `git commit -m "feat(store): demo store with versioned persistence and guarded actions"`.

### Task 2.6: Scenarios

**Files:** Create `src/data/scenarios/index.ts`. Test: `src/data/scenarios/scenarios.test.ts`

**Interfaces (Produces):**
- `ScenarioId = 'baseline' | 'med-rec-paused' | 'resume-requested' | 'awaiting-signature' | 'step-down-threshold'`. Later phases add `onboarding-*`, `change-detected-v150` and `epic-fixed-later` with their data.
- `scenarios: Record<ScenarioId, (seed: DemoState) => DemoState>`
- `buildScenario(id: ScenarioId): DemoState` = `scenarios[id](createSeed())`
- The store's `loadScenario(id)` replaces state with `buildScenario(id)` and keeps the current `personaId`.

- [ ] **Step 1: Failing tests**
  - `baseline` deep-equals `createSeed()`.
  - `med-rec-paused`: Med Rec `lifecycle === 'paused'`, `pausedBy === 'marcus'`, and `judgment` is `{ status: 'paused', label: 'Paused by Marcus' }`.
  - `resume-requested`: as `med-rec-paused`, plus one `ResumeRequest` from Marcus with the sheet's reason and no approvals.
  - `awaiting-signature`: PRV-0142 has state `awaiting`, level `shadow` and proposed level `draft`.
  - `step-down-threshold`: Med Rec's "Reconcile home medications at admission" is at level `shadow`, and its privilege is `steppedDown` with `trigger` set.
  - `useDemo.getState().loadScenario('med-rec-paused')` keeps `personaId`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(data): named scenarios"`.

### Task 2.7: Product components 01–05

**Files:** `src/components/<Name>/{Name.tsx,Name.module.css,Name.test.tsx}`, with a barrel at `src/components/index.ts`

**Interfaces (Produces):**
- **01 `StatusChip({ status: Status; label: string; size?: 'compact' | 'header' | 'comfortable' })`**
  - `normal` renders the plain word in `--cs-meta`, with no box or icon.
  - Other states render a box with an icon and the word:
    - review: teal ring
    - warn: amber diamond
    - crit: red triangle
    - stale: dashed ring with a **dashed** border
    - shadow: half ring, `lineStrong` border
    - paused: pause bars, `lineStrong` border
  - Text is 600 for review, warn, crit and stale, and 400 otherwise, in the colour from handoff table 01.
  - Sizes:
    - `compact`: 22 high, padding 0 7 0 6, r2, 12 px icon, 13/18
    - `header`: 24 high, 14/20
    - `comfortable`: 30 high, padding 0 10 0 8, r3, 15 px icon, 16/24
  - Expose `data-status`.
- **02 `AgentTable({ rows: AgentRowView[]; selectedId?: string | null; onSelect?(id); onOpen?(id); ariaLabel: string })`**
  - `AgentRowView = { id, status: Status, label, ruleTag?, name, version, day: string, signedAsIs: string, edited: string, blocked: string, trend: number[], ladder: LadderStep[], level: string, grantor: string, reviewDate: string }`
  - Built on `Table` with `density="board"`, a 12 px column gap (add an optional `columnGap` prop to `Table`) and columns `304px | minmax(0,1fr) | 40px | 76px | 56px | 56px | 56px | 224px`.
  - Headers: `Status · rule ↓`, `Agent`, `24h`, `Signed as is`, `Edited`, `Blocked`, `7 days`, `Privilege`.
  - Data rules from handoff 02:
    - A warning row with an edit label shows Edited in `warnT` 600.
    - Blocked > 0 shows `strong` 600.
    - Stale rows show "—" in meta for every metric, and a dashed `off` sparkline.
    - Paused and stale rows hide the sparkline end dot.
  - The sparkline is 56×16 on a fixed 75–100 domain: add an optional `domain?: [number, number]` to `sparklinePath`/`Sparkline`, so the design's scale is reproduced.
  - The privilege cell is the compact ladder, then level, grantor and review date.
- **03 `ExceptionList({ groups: { id, label, count, items: ExceptionView[] }[]; selectedId?; onSelect?(id); onOpen?(id) })`** and **`ExceptionItem`**
  - `ExceptionView = { id, status, type, reason, agent, ruleTag, raised, action, actionSub, owner, claim: string, deadline: string, deadlineSub: string, state: ExceptionState, outcome?, outcomeSub? }`
  - Grid `8px | 176px | minmax(0,1fr) | 236px | 128px | 148px`, gap 12, padding 12 16, top-aligned. Group headers are sunk rows with a mono label and count.
  - Lifecycle per handoff 03:
    - new: 6 px ink dot and a 600 reason
    - overdue: deadline in `crit` 600
    - resolved: chip greyed (line border, `off` icon, meta text), with the outcome in the action column and "Closed hh:mm"
  - Rows are focusable: click selects, Enter opens.
- **04 `PrivilegeCard({ view: PrivilegeCardView; onAction?(): void })`**
  - `PrivilegeCardView = { state: PrivilegeState, statusLabel, code, title, scope, ladder: LadderStep[], ladderCaption, rows: { key, value }[], footnote, actionLabel }`
  - The status mark and colour per state come from the component sheet (read them from the markup).
  - Head padding 14 16 12; body rows on a `96px 1fr` grid with padding 8 16; footer note and action.
- **05 `AutonomyLadder({ variant: 'full' | 'compact'; size?: 'row' | 'panel'; steps: LadderStep[] })`**
  - `LadderStep = { level: Level; state: 'passed' | 'current' | 'proposed' | 'available' | 'locked'; caption?: string; evidence?: string }`
  - Full: a 4-column card with cells min-h 80 and padding 12 16.
    - current: `--cs-fill` background, 600 name
    - proposed: `inset 0 0 0 2px ink`
    - passed: check icon and a `text2` name
    - locked: sunk background, lock icon, meta text
    - each cell has a mono 12 evidence line
  - Compact: four segments, r1. `row` is 8×8 with gap 2; `panel` is 28×6 with gap 3.
    - passed = `--cs-lad-pass` fill
    - current = ink fill
    - proposed = 1.5 px ink outline
    - available = 1 px `off` outline
    - locked = `--cs-lad-lock` fill
  - Expose `data-state` per segment.

- [ ] **Step 1: Failing tests**
  - StatusChip: `normal` renders no svg, and the text has the meta class. `stale` has a dashed border class and the dashed ring icon. `crit` renders a triangle. `data-status` is set.
  - AgentTable:
    - The header labels match the order above.
    - The stale row shows four "—", and its sparkline path has `stroke-dasharray="2 2"`.
    - The warn row with "Edit rate rising" marks Edited with the warning class.
    - Blocked "3" carries the strong class.
    - The paused row has no end-dot `circle`.
    - Clicking selects the row.
  - ExceptionList:
    - Group label and count render.
    - A new item has the dot and a 600 reason.
    - An overdue deadline carries the crit class.
    - A resolved item shows its outcome and `Closed 10:21`.
    - Enter on a focused item calls `onOpen`.
  - PrivilegeCard: the awaiting card shows "Awaiting signature", `PRV-0142 v3`, and an action button "Review and sign" that calls `onAction`.
  - AutonomyLadder:
    - Compact has 4 segments with `data-state` in order.
    - Full marks the proposed cell `data-state="proposed"`, and locked cells contain a lock icon.
  - `sparklinePath([75, 100], 72, 20, [75, 100])` returns `'M2 18L70 2'`.
- [ ] **Step 2: Run** `pnpm test src/components src/design-system`. Expected: FAIL.
- [ ] **Step 3: Implement**, including the additive `Table.columnGap` and `Sparkline`/`sparklinePath` `domain` props.
- [ ] **Step 4: Run** the full suite. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(components): status chip, agent table, exception list, privilege card, autonomy ladder"`.

### Task 2.8: Product components 06–10

**Files:** `src/components/<Name>/…`

**Interfaces (Produces):**
- **06 `HardStopCard({ code, version, title, description, rows: { key, value }[], footer })`** and **`InstructionCard({ text, rows: { key, value }[], onEdit?(): void, footer })`**
  - Hard stop:
    - `--cs-fill` body, **1.5 px ink border, r2**
    - ink header bar with white mono uppercase "HARD STOP · ENFORCED AT THE GATEWAY", a lock icon, and the rule ID at right
    - 18/600 title
  - Instruction:
    - white, 1 px `line`, **r6**
    - header label "Instruction · in the agent's prompt" with a ghost Edit button
    - text in a sunk r4 well at 16/24
    - footer "Guidance only: the model may not follow it, so nothing safety-critical lives here."
  - Never a dashed border.
- **07 `SystemsVerbsGrid({ rows: { system, detail, cells: Record<Verb, GrantCell> }[]; policyId: string; onToggle?(system, verb): void })`**
  - Columns `1fr` + 6×96.
  - Cells:
    - granted: 16 px ink square, r3, white check
    - none: 1.5 px `off` border
    - changed: granted plus `box-shadow 0 0 0 2px var(--cs-raised), 0 0 0 3.5px var(--cs-ink)`
    - locked: 28×20 `--cs-fill` with a lock
  - The policy is named once below the grid.
  - With `onToggle`, unlocked cells are buttons with `aria-pressed`. Locked cells are never buttons.
- **08 `PauseDialog`** and **`ResumeDialog`**, both on `Modal`, with the copy from the sheet:
  - `PauseDialog({ open, agentName, scopes: RadioCardOption[], scope, onScopeChange, effect: { lead, text }, resumeRule, reason, onReasonChange, audit, onCancel, onConfirm })`
    - title `Pause ${agentName}?`
    - description "Takes effect at the gateway within seconds."
    - primary **Pause agent**
  - `ResumeDialog({ open, mode: 'request' | 'approve', agentName, pausedBy, pausedAt, pausedAgo, needs: { name, role, status }[], returnsTo: { activity, level }[], reason, onReasonChange, statusLine, onCancel, onSubmit })`
    - title "Request to resume …"
    - the reason is **required**: the submit button is `blocked` until it's non-empty after trimming
    - primary **Request resume** or **Approve resume**
- **09 `ActionTrace({ view: ActionTraceView; onExport?(): void })`**
  - `ActionTraceView = { title, code, agent, version, sop, actingFor, steps: TraceStep[] }`
  - Header with the title, mono code, meta line and an **Export for surveyor** button. Steps sit on a vertical timeline with mono ms timestamps and a label per kind ("Input", "Tool call", "Policy check · passed", "Policy check · blocked", "Output", "Reviewer outcome").
  - The blocked step is expanded: detail text and a meta line.
- **10 `MonitorHealth({ state: 'live' | 'delayed' | 'stale'; at: string; delayMin?: number; staleFor?: string })`**
  - live: 6 px `--cs-icon` dot and mono "Live · 09:42:17" in meta
  - delayed: "Delayed 6 min · last 09:36" in stronger words, no colour
  - stale: `StatusChip status="stale"` with "No data for 3h · last 06:41"

- [ ] **Step 1: Failing tests**
  - HardStopCard renders the uppercase header text and the rule ID. InstructionCard's Edit button calls `onEdit`.
  - SystemsVerbsGrid:
    - Sign and Order cells have `data-cell="locked"` and contain no button.
    - A `changed` cell has `data-cell="changed"`.
    - Clicking a `none` cell calls `onToggle('Teams', 'write')`.
    - The policy id is rendered once.
  - PauseDialog: the title is "Pause Med Rec Agent?", choosing a scope calls `onScopeChange`, and **Pause agent** calls `onConfirm`.
  - ResumeDialog: **Request resume** is `aria-disabled` with an empty or whitespace reason and doesn't call `onSubmit`. With a reason it calls `onSubmit`.
  - ActionTrace: renders `ACT-88213` and step timestamps in order. The blocked step shows its detail. **Export for surveyor** calls `onExport`.
  - MonitorHealth: `live` shows "Live · 09:42:17" with no status chip, and `stale` renders a chip with `data-status="stale"`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full suite. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(components): policy cards, systems grid, pause/resume dialogs, action trace, monitor health"`.

### Task 2.9: Gallery: product components, light and dark

**Files:**
- Create `src/prototype/ComponentGallery/fixtures.ts`: component-sheet data, verbatim, including the sheet's own dates.
- Create `src/prototype/ComponentGallery/ProductSection.tsx`
- Modify `ComponentGallery.tsx`
- Test: extend `tests/e2e/gallery.spec.ts`

**What it shows:**
- A "Product components" `h2` section that renders 01–10 in their sheet states:
  - every chip state
  - the `AR` rows in an AgentTable
  - the inbox groups
  - five privilege cards
  - full and compact ladders
  - hard stop and instruction
  - the grid
  - pause and resume dialogs, opened by buttons
  - the trace
  - three monitor states
- A "Dark" `h2` section in a `data-theme="dark"` panel with chips, the AgentTable and ExceptionList (as the sheet's dark section), plus a primary button and a checked checkbox. These cover Phase 1's deferred dark-fill minor; fix the checkbox fill to `--cs-acc-fill` if it fails contrast.

- [ ] **Step 1: Failing e2e:**
  - `h2` "Product components" and `h2` "Dark" are visible.
  - Seven status chips are visible.
  - "Open pause dialog" opens a dialog titled "Pause Med Rec Agent?".
  - The dark panel's chip text colour differs from the light one (computed `color` of the review chip label).
  - No console errors.
- [ ] **Step 2: Run** `pnpm e2e tests/e2e/gallery.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full e2e. Expected: PASS.
- [ ] **Step 5: Visual check** against `designs/Countersign Components.dc.html` at 1440 (`pnpm designs`), section by section. Fix differences and commit.
- [ ] **Step 6: Commit** with `git commit -m "feat(prototype): product components in the gallery, light and dark"`.

### Task 2.10: Persona switcher, Reset demo, checkpoint

**Files:**
- Create `src/prototype/personas.ts` and `src/prototype/PersonaSwitcher/…`
- Modify `PrototypeBar.tsx` and `AppShell.tsx`
- Tests: `src/prototype/personas.test.ts`, `tests/e2e/persona.spec.ts`

**Interfaces (Produces):**
- `PERSONAS: { id: PersonaId; name: string; initial: string; roleLabel: string; landing: string }[]`, in this order, with landings from spec §4.4:

  | Persona | Role label | Landing |
  |---|---|---|
  | Marcus | Agent owner | `/operations/divisions/medications` |
  | Priya | Clinical sponsor | `/portfolio/privileges` |
  | Dana | AI program lead | `/operations` |
  | Sam | Technical owner | `/inventory` |
  | Dr. Lee | AI review board chair | `/portfolio/reviews/med-rec` |
  | Ana | Pharmacist | `/epic` |
  | Jordan | Risk manager | `/operations/actions` |

- `personaById(id): Persona`
- The PersonaSwitcher is a `Menu` in the prototype bar. Its trigger reads "Viewing as **Name** · Role ▾". Each item shows the name with the role as its sub-line, and the current persona is `selected`. Choosing one calls `setPersona` and then navigates to that persona's landing route.
- Reset demo calls `useDemo.getState().reset()` and navigates to `/operations/divisions/medications`.
- `AppShell` passes the persona's initial to `TopNav`.

- [ ] **Step 1: Failing tests**
  - Unit: `PERSONAS` has 7 entries, and every `landing` matches a route in `routeTable`.
  - e2e:
    - Open `/operations` and choose Jordan in the switcher. The URL becomes `/operations/actions`, the avatar shows "J", and the bar reads "Viewing as Jordan".
    - Reloading keeps Jordan (persisted).
    - Reset demo returns the bar to Marcus.
    - Choosing Ana lands on `/epic`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm check` and `pnpm e2e`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(prototype): persona switcher and reset demo"`.
- [ ] **Step 6: Checkpoint** per the `docs/BUILD_PLAN.md` checkpoint protocol:
  - Push, then open the PR "Phase 2: Components and data" with `Closes #3`.
  - Run the fresh whole-branch review and apply its fixes test-first.
  - Do the visual check on the deployed build.
  - Update BUILD_PLAN: tick tasks, mark frame tracker row C built, write the handoff notes, update Start here, add decision and session log entries.
  - Update issue #3 and the PR body.
  - **STOP and ask Stefan to review.**
