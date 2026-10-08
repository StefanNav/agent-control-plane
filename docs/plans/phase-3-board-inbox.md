# Phase 3: Command Board and inbox

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners supervise by exception (E4, E5). The Command Board covers hospital, division, agent and wall views; the inbox covers detail, dismiss, digest, log and escalation. All of it is built from the store, so actions change what every view shows.

**Architecture:**
- Screens live in `src/features/board/` and `src/features/inbox/`. Each feature has a `selectors.ts` that maps `DemoState` to the Phase 2 component view models, plus page-only view models.
- Selectors derive "overdue", "escalated" and monitor freshness from `state.now` in one place.
- Pages read the store with `useDemo(selector)` and change it only through store actions.
- Routes are wired by adding pages to `PAGES` in `src/app/router.tsx`.

**Tech stack:** as Phase 2. No new dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.5, §5.5 routes, §8 frames 4a–4f and 5a–5d).

**Design sources** (copy and values verbatim):
- `designs/E4 Command Board.dc.html`. Its 1440 frames in file order are: 4d tiles, 4e wall, 4f exceptions-first, 4a table with the Revenue cycle detail panel, 4a·wall, and 4c agent view.
- `designs/DivisionView.dc.html` (4b, including the selected-agent panel).
- `designs/E5 Exception Inbox.dc.html`, in file order: 5a list and detail; 5b with the dismiss dialog; 5c, the 720 px digest email; 5d, Priya's escalated item.
- Use `pnpm designs` and devtools for exact values. Product components keep their Phase 2 specs.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- Times come from `state.now` through `src/lib/clock.ts`.
- Bump `SEED_VERSION` with every seed change.
- Every new store action is test-first and goes through `runAction`.
- Buttons whose flow arrives in a later phase are never dead. They link to the screen where that flow will live: "Pause agent" and "Return to Shadow" go to the agent view (Phase 4 adds the dialogs), and "Open incident" goes to `/operations/incidents/inc-0029` (a Phase 4 placeholder).

## Phase-2 facts this plan relies on

- **Components:** `AgentTable`/`AgentRowView`, `ExceptionList`/`ExceptionView`, `StatusChip` (`align`, `muted`), `MonitorHealth`, `PrivilegeCard`, `AutonomyLadder`, `ActionTrace`, `Modal` (`footNote`), `Table` (`groups`, `density="board"`, `columnGap`), `Sparkline` (`domain`).
- **Store:**
  - `useDemo` and `createDemoStore`
  - `runAction(state, { action, ctx, audit, mutate })`
  - `claimException`, which refuses claimed or resolved items and makes the claimer the owner
  - `can()` and `lockReason()`
- **Clock:** `formatRelative`, `formatAgo`, `formatClock`, `formatClockSeconds`, `minutesBetween`.
- **Trend:** `trendPoints(index, trend)` gives seven values on 75–100.
- **Personas:** `PERSONAS` and `personaById`.

---

### Task 3.1: Seed refinement from the E4 and E5 frames

**Files:**
- Modify `src/data/types.ts` and `src/data/seed/{activities,exceptions,actions,divisions,index}.ts`
- Create `src/data/seed/events.ts`
- Test: extend `src/data/seed/seed.test.ts`

**Interfaces (Produces):**
- `AgentException` gains three fields:
  - `kind: 'review' | 'question' | 'notify' | 'incident'`
  - `snoozedUntil?: string`
  - `detail?: ExceptionDetail`, where `ExceptionDetail = { headline: string; trendLabel?: string; trend?: number[]; target?: number; breakdown?: { label: string; count: number }[]; breakdownLabel?: string; cause?: string; timeline?: { at: string; title: string; sub?: string }[]; silence?: string }`
- `Division` gains `page?: { at: string; ackAt?: string; who: string }`, `incidentId?: string`, `note?: string` (e.g. "9 drafts went to the auth team"), `resumeNeeds?: string[]`, and `trend: Trend`.
- `LogEvent { id: string; at: string; agentId?: string; text: string; sub?: string }` and `ChangeEvent { id: string; at: string; text: string; sub: string }`.
- `DemoState` gains `logEvents: LogEvent[]` and `changeEvents: ChangeEvent[]`.
- `SEED_VERSION = 3`

**Content (verbatim from the frames):**
- **Exceptions**, replacing the Phase 2 set:
  - EXC-5501 Prior Auth "Wrong-patient draft", crit, kind `incident`, raised 08:05, owner Tom, incident INC-0029, detail text from the 4a panel.
  - EXC-5508 Formulary Swap "Monitor stale", raised 06:46, due 10:46, owner Marcus, with the 5d timeline and "What silence means here".
  - EXC-5530 Med Rec "Review: 3 drafts" (HS-04 v2), due 11:00, action "confirm the block worked and route the drafts". It's linked from the ACT-88213 trace.
  - EXC-5512 Renal Dosing "Edit rate rising" (MR-12 v1), raised 07:15, due 15:00. Its detail has the 14-day trend with a dashed target at 10%, "What pharmacists changed · 32 edits since Monday" (23 / 6 / 3), and the "Likely cause" text.
  - A Question from Sam (Med Rec): "Move pyxis.dispense.read to the v2 endpoint? Same data, faster.", due tomorrow, owner Marcus, kind `question`.
  - Duplicate Rx "Review overdue" (PRV-0098), owner Priya, due 15 Dec.
  - Med Rec "Report" C2 (weekly edit-rate report, week 5 of 4), owner Priya, due Friday.
  - Plus two "waiting on others" items for Marcus, chosen from the frames' counts and logged as invented.
- **Activities:**
  - Med Rec "Flag allergy conflicts" moves to **Shadow** (signed by Dr. Lee · 14 Oct).
  - Discharge Meds gets a second activity, "Flag discharge interactions" (Shadow, Dr. Lee, rev 02 Dec, 7 West · adults). Its privilege row comes from the 4b panel.
- **Actions:** Med Rec's five recent actions from 4c: ACT-88240, 88213, 88207, 88199, 88188, with time, encounter, acting for, policy result and reviewer outcome. Discharge Meds' two from 4b. Only ACT-88213 has full trace steps; the rest have `steps: []`.
- **Divisions:** Revenue cycle's `page` (08:05, ack 08:06, Tom), `incidentId: 'inc-0029'`, `note` "9 drafts went to the auth team", and `resumeNeeds` Tom and Nina. Every division gets a `trend` from its row in 4a.
- **Events:** the 5c digest's two "Changed yesterday" items, and 41 log events. Seed 6 representative rows (deploys, config reads, routine policy passes) and store the total as data.

- [x] **Step 1: Failing tests**
  - Medications has exactly four judgments needing a human (review, warn, warn, stale).
  - `exceptions.filter(e => e.ownerId === 'marcus' && open)` has length 4, with types `['Monitor stale', 'Review: 3 drafts', 'Edit rate rising', 'Question']`.
  - EXC-5512's detail has a 14-point trend and its breakdown sums to 32.
  - Med Rec activities are `[draft, shadow]`, and Discharge Meds has 2 activities.
  - ACT-88213 still has 8 steps.
  - The invariants from Phase 2 still pass, and `SEED_VERSION === 3`.
- [x] **Step 2: Run** `pnpm test src/data`. Expected: FAIL.
- [x] **Step 3: Implement.** Update the scenarios that referenced removed exception ids, and log the invented items in the BUILD_PLAN decision log.
- [x] **Step 4: Run** `pnpm check`. Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(data): board and inbox seed from E4 and E5"`.

### Task 3.2: Board and inbox selectors

**Files:**
- Create `src/features/board/selectors.ts` and `src/features/inbox/selectors.ts`
- Tests: `src/features/board/selectors.test.ts`, `src/features/inbox/selectors.test.ts`

**Interfaces (Produces):**
- `severityRank(status: Status): number`. The order is crit > warn > review > stale > paused > shadow > normal, giving the board's "Status ↓" sort. Ties keep seed order.
- `selectDivisionSummaries(s): DivisionSummary[]`
  - `DivisionSummary = { id, name, owner, agentCount, status: Status, judgment: string, counts: Partial<Record<Status, number>>, needsHuman: number, trend: number[], attention: { agentId, name, status, reason, age }[], nextDeadline?: { at: string; to: string } }`
  - Sorted with divisions that need a human first, then by severity.
- `selectAgentRows(s, divisionId): AgentRowView[]`, sorted by severity. The ladder comes from the agent's main activity level, and stale or paused rows withdraw their metrics.
- `selectAgentPanel(s, agentId): AgentPanelView`: judgment, versions, people, activities and privileges, last-7-days stats, and recent actions.
- `selectAgentOverview(s, agentId): AgentOverviewView | null`. It returns `null` for an unknown id, which the page renders as NotFound (Review focus 4). It includes the banner, stats, activities, recent actions, hard stops today, monitoring and people.
- `isOverdue(e, now)`: `deadline < now` and not resolved or dismissed.
- `isEscalated(e, now)`: overdue and unclaimed, so it goes to the division's sponsor.
- `monitorFreshness(lastSeen, intervalMin, now)` returns `'live' | 'delayed' | 'stale'`. Stale means more than 3 intervals since the last data.
- `selectInbox(s, personaId)` returns `{ needsMe: InboxItemView[]; waiting: InboxItemView[]; log: LogEvent[]; logTotal: number }`
  - "Needs me" is open items you own, plus escalated items in divisions where you're sponsor. Snoozed items are hidden while `snoozedUntil > now`. Items are sorted by deadline.
  - `InboxItemView = { id, status, type, agent, ruleTag, due: string, reason, action, escalated?: string }`
- `selectExceptionDetail(s, id): ExceptionDetailView | null`

- [x] **Step 1: Failing tests**
  - The board puts Revenue cycle and Medications first. Medications' counts are `{ warn: 2, review: 1, stale: 1 }`, and Discharge's judgment is "Within scope".
  - The Medications rows start with Med Rec Agent (the review). Formulary Swap shows "—" for every metric.
  - `selectAgentOverview(s, 'nope')` is `null`.
  - Marcus's inbox has 4 items in "Needs me", deadline order: Monitor stale (10:46), Review: 3 drafts (11:00), Edit rate rising (15:00), then the Question.
  - With `now = 2026-12-08T12:00:00`, EXC-5508 is escalated and appears in Priya's "Needs me" with "1 h 14 min late".
  - A snoozed item leaves "Needs me" until its time, then comes back.
  - `monitorFreshness` returns stale for Formulary Swap and live for Med Rec.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** `pnpm check`. Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(board): selectors for board and inbox"`.

### Task 3.3: Hospital board (4a), tiles (4d), exceptions first (4f)

**Files:** Create `src/features/board/{HospitalBoard.tsx,BoardHeader.tsx,DivisionTable.tsx,DivisionPanel.tsx,TileGrid.tsx,ExceptionsFirst.tsx}` with CSS Modules. Modify `src/app/router.tsx` (`/operations`). Test: `tests/e2e/board.spec.ts`

**What it shows:**
- A shared header (`BoardHeader`):
  - breadcrumb "Operations / Board", title "Lakeshore Health", status "Hospital · 5 divisions · 41 agents"
  - "Updated 09:52 · every 30 s" (from `now`)
  - tabs Board / Inbox · N / Actions / Incidents, where N is the persona's "Needs me" count; Actions and Incidents link to their routes
  - a View toggle (Table / Tiles / Exceptions first) using `Segmented` `control`, which sets `?view=`
- **4a:**
  - "2 divisions need a human", and filter pills "All · 5" / "Needs a human · 2"
  - a table of divisions: Division | Owner | Agents | Judgment | Open exceptions | 7 days
  - Clicking a row selects it and opens `DivisionPanel` on the right; Revenue cycle is selected by default, as in 4a.
  - The panel shows the detail text, incident, resume needs and exception, plus "Open division" and "Open incident".
- **4d tiles:** each division is a tile with one square per agent. Divisions needing a human come first and are larger, as in the frame.
- **4f:** the exception table "5 open exceptions across the hospital", sorted critical first, then by deadline. A filter strip of divisions, the "Quiet" summary and the "Last 24 hours" stats.

- [x] **Step 1: Failing e2e:**
  - `/operations` shows "2 divisions need a human".
  - The first row is Revenue cycle, and the panel shows "INC-0029 · open".
  - Clicking Medications selects it, and "Open division" goes to `/operations/divisions/medications`.
  - `?view=tiles` shows 41 agent squares.
  - `?view=exceptions` lists 5 exceptions, with "Wrong-patient draft" first.
  - The "Needs a human" pill hides Discharge.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against E4 frames 4a, 4d and 4f at 1440.
- [x] **Step 4: Run** `pnpm check` and `pnpm e2e`. Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(board): hospital view with tiles and exceptions-first views"`.

### Task 3.4: Division view (4b)

**Files:** Create `src/features/board/{DivisionView.tsx,AgentPanel.tsx}`. Modify `router.tsx`. Test: extend `board.spec.ts`

**What it shows:**
- Header: breadcrumb "Operations / Lakeshore Health / Medications", status "20 agents · 4 need a human · owner Marcus · sponsor Priya", `MonitorHealth` from the division monitor, and the primary button "Work 4 exceptions", which goes to the inbox.
- An `AgentTable` from `selectAgentRows`. `?agent=` holds the selection, defaulting to the first agent needing a human (the frame shows Discharge Meds, so the gallery keeps that example).
- The `AgentPanel` on the right shows the selected agent:
  - name, versions, judgment and people
  - activities and privileges
  - last 7 days
  - recent actions
  - "Pause agent" and "Open trace" (to the agent view)
- Clicking a row selects it; Enter or double-click opens the agent view.
- An unknown division renders NotFound.

- [x] **Step 1: Failing e2e:**
  - Marcus's landing route shows 20 rows, with Med Rec Agent first and its chip reading "Review: 3 drafts".
  - The Formulary Swap row shows "No data for 3h".
  - Clicking Discharge Meds shows its panel with "Flag discharge interactions".
  - Pressing Enter on the focused Med Rec row goes to `/operations/agents/med-rec`.
  - `/operations/divisions/nope` shows "Page not found".
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against `DivisionView.dc.html`.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(board): division view with agent panel"`.

### Task 3.5: Agent view (4c) and its tabs

**Files:** Create `src/features/board/AgentView.tsx` and `src/features/board/agent-tabs/{Overview,Activities,Actions,Privileges,History}.tsx`. Modify `router.tsx`. Test: extend `board.spec.ts`

**What it shows:**
- Header: breadcrumb "Operations / Medications / Med Rec Agent", status "Draft · since 06 Nov", the ID line, the judgment chip "Review: 3 drafts held", "Controls" (a menu placeholder that links to Phase 4's control flows on this page) and "Open in Inventory".
- Tabs set `?tab=`:
  - **Overview (4c):** the banner notice with "Review 3 drafts" and "Open HS-04 v2", a stat strip with targets, the activities table, recent actions (ACT ids link to `/operations/actions/:id`), hard stops today, monitoring and people.
  - **Activities** (composed): the full activity table with `AutonomyLadder` full.
  - **Scorecard:** a placeholder that names Phase 5 and frame 3a.
  - **Actions** (composed): this agent's actions in a `Table`.
  - **Privileges** (composed): its `PrivilegeCard`s.
  - **History** (composed): its audit entries and log events as `LogRow`s.
- An unknown agent renders NotFound (**Review focus 4**).

- [ ] **Step 1: Failing e2e:**
  - `/operations/agents/med-rec` shows the "3 drafts held by HS-04 v2 need a pharmacist decision." banner, the stats "89.6 %" and "8.9 %", and the activities "Reconcile home medications" (Draft) and "Flag allergy conflicts" (Shadow).
  - The ACT-88213 link goes to `/operations/actions/act-88213`.
  - `?tab=privileges` shows a privilege card.
  - `/operations/agents/nope` shows "Page not found".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against E4 4c.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(board): agent view with tabs"`.

### Task 3.6: Wall display (4e)

**Files:** Create `src/features/board/WallDisplay.tsx` and `.module.css`. Modify `router.tsx` (`/wall`). Test: extend `board.spec.ts`

**What it shows:**
- Dark (`data-theme="dark"` on the page) at 1440×810, padding 36 48, gap 28, with its own larger type scale measured from the frame.
- "LAKESHORE HEALTH · AGENT BOARD", "2 divisions need a human", a large clock "09:52" and "Tue 08 Dec · live, every 30 s".
- Attention divisions as large cards with their items, then a "WITHIN SCOPE" strip, then "LAST HOUR" and "+1 more…".
- The footer reads "Read only · touch nothing here; act from your own screen".
- No controls, apart from a small corner "Exit wall display" link to `/operations`, visible on hover or focus.

- [ ] **Step 1: Failing e2e:**
  - `/wall` has `data-theme="dark"` and shows "2 divisions need a human" and "Read only".
  - It has no buttons except "Exit wall display".
  - It has no prototype bar or top nav.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against E4 4e (frame 1).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(board): wall display"`.

### Task 3.7: Inbox list and detail (5a), claim and snooze

**Files:**
- Create `src/features/inbox/{InboxPage.tsx,InboxItem.tsx,ExceptionDetail.tsx,TrendChart.tsx}`
- Modify `src/store/index.ts` (add `snoozeException`) and `router.tsx`
- Tests: `src/store/store.test.ts` (snooze) and `tests/e2e/inbox.spec.ts`

**Interfaces (Produces):** `snoozeException(id: string, until: string): ActionResult`. It needs `resolveException` permission and refuses resolved items.

**What it shows:**
- Header: "Operations / Inbox", "Inbox", and a status for the persona and division (e.g. "Marcus · Medications"), with "Delivery settings" (secondary; links to settings) and "Daily digest".
- Tabs: "Needs me · N", "Waiting on others · N" and "Log", via `?tab=`.
- Left column (460 px): `InboxItem` cards with the type chip, agent · rule, due, reason and action. A "How this reaches you" notice sits underneath.
- Right column: `ExceptionDetail` for `/operations/inbox/:exceptionId`, defaulting to the first item.
  - Title, mono meta line and `TrendChart` ("Edit rate · 14 days" with a dashed target line).
  - The "What pharmacists changed" breakdown and the "Likely cause" notice.
  - Actions: Investigate (goes to the agent view), Return to Shadow (goes to the agent view), Snooze (menu: 1 hour, or until tomorrow 07:00) and Dismiss… (Task 3.8).
  - The escalation line "Not handled by 15:00 → goes to Priya".
- **Load the `dataviz` skill before writing `TrendChart`.**

- [ ] **Step 1: Failing tests**
  - Store: `snoozeException` hides the item until the time and writes an audit entry. As Jordan it returns `ok: false`.
  - e2e:
    - `/operations/inbox` as Marcus shows "Needs me · 4" with Monitor stale first.
    - Selecting Edit rate rising shows "EXC-5512 · MR-12 v1 · raised 07:15" and the breakdown "Dose lowered for eGFR 30 to 44 · 23".
    - Snooze → 1 hour removes it, and the tab reads "Needs me · 3".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against E5 5a.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(inbox): list, detail, snooze"`.

### Task 3.8: Dismiss with a reason (5b)

**Files:** Create `src/features/inbox/DismissDialog.tsx`. Modify `src/store/index.ts` (add `dismissException`). Tests: store and `inbox.spec.ts`

**Interfaces (Produces):** `dismissException(id: string, input: { category: 'expected' | 'duplicate' | 'noisy' | 'other'; reason: string; tune?: string }): ActionResult`.
- It refuses an empty reason (after trimming) with `'A reason is required'`.
- It sets `state: 'dismissed'`, `dismissReason`, `closedAt`, and writes an audit entry with the reason.

**What it shows:** a `Modal` titled `Dismiss "Edit rate rising"?`, with the copy from 5b:
- category radio cards (Expected change / Duplicate / Rule is too noisy / Other)
- a required Reason textarea
- a checkbox "Raise the MR-12 threshold for Renal Dosing Agent to 20 % until 11 Dec" with its help text
- foot note "Logged as Marcus · EXC-5512"
- **Dismiss with reason**, blocked until the reason is filled

- [ ] **Step 1: Failing tests**
  - Store:
    - An empty reason is refused and nothing changes.
    - A valid dismissal sets the state and logs the reason.
    - Jordan is refused.
  - e2e: Dismiss… → the button is blocked; typing a reason enables it; confirming removes the item, the tab shows "Needs me · 3", and History on the agent view shows the dismissal.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(inbox): dismiss with a reason"`.

### Task 3.9: Digest (5c), Log, Waiting on others

**Files:** Create `src/features/inbox/{Digest.tsx,LogList.tsx}`. Modify `InboxPage.tsx`. Test: `inbox.spec.ts`

**What it shows:**
- `?view=digest` renders the 720 px email from 5c:
  - From / To lines, the subject "Medications · daily digest · Tue 08 Dec" and "2 things need you today"
  - "Needs you · 2" (the warnings, reviews and questions due today) with Open and Answer links
  - "Changed yesterday · 2" from `changeEvents`
  - "In the log, not here · 41 events" with "Open the log"
  - the footer
- `?tab=log` lists `logEvents` as `LogRow`s with the total.
- `?tab=waiting` lists the waiting items.

- [ ] **Step 1: Failing e2e:**
  - The digest shows "2 things need you today" and "Changed yesterday · 2".
  - "Open the log" goes to `?tab=log`, which shows "41 events".
  - "Waiting on others · 2" lists two items.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against E5 5c.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(inbox): daily digest, log, waiting on others"`.

### Task 3.10: Escalated to the sponsor (5d)

**Files:**
- Modify `src/data/scenarios/index.ts` (add `stale-escalated`, with `now = 2026-12-08T12:00:00`), `src/store/index.ts` (add `assignException`) and `ExceptionDetail.tsx`
- Tests: scenarios, store and `inbox.spec.ts`

**Interfaces (Produces):** `assignException(id: string, personId: string): ActionResult`. It sets the owner, keeps the previous owner copied and logs "Assigned to …".

**What it shows:** as Priya in `stale-escalated`, "Needs me · 3" lists Monitor stale first, marked "escalated" and "1 h 14 min late". The detail shows:
- "Escalated to you because nobody answered by the deadline."
- "Marcus is the owner…"
- the timeline (06:46 raised, 06:46 sent, 08:46 reminder, 10:46 escalated under ORG-ESC-01)
- "What silence means here"
- Assign to Sam / Answer myself / Pause Formulary Swap Agent (goes to the agent view)

- [ ] **Step 1: Failing tests**
  - The scenario puts EXC-5508 in Priya's "Needs me", escalated.
  - Store: assigning to Sam sets `ownerId: 'sam'` and logs it.
  - e2e: load the scenario through the store (test helper `page.evaluate` → `localStorage` seed via a `?scenario=` query param supported in dev and prod), view as Priya, open the inbox and see "1 h 14 min late". "Assign to Sam" removes it from Priya's list.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Add a `?scenario=<id>` URL param to `AppShell` that calls `loadScenario` once. Phase 8 stories will reuse it.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(inbox): escalation to the sponsor"`.

### Task 3.11: Journey test and checkpoint

- [ ] **Step 1: e2e journey** (`tests/e2e/journeys.spec.ts`), "find the one problem among 20", as Marcus:
  - Board → Medications → the first row is Med Rec Agent (review) → its agent view shows the 3 held drafts.
  - Then the inbox → Edit rate rising → dismiss with a reason. The board's Medications count of agents needing a human stays at 4: dismissing closes the exception but doesn't change the agent's judgment. Assert that explicitly; it's the designed behaviour.
- [ ] **Step 2: `pnpm check` and `pnpm e2e` green.**
- [ ] **Step 3: Checkpoint** per the BUILD_PLAN protocol:
  - Push, then open the PR "Phase 3: Command Board and inbox" with `Closes #4`.
  - Run the fresh whole-branch review and apply its fixes test-first.
  - Visual QA of frames 4a–4f and 5a–5d; tick them in the frame tracker.
  - Write the handoff notes, then update Start here, the decision and session logs, issue #4 and the PR body.
  - **STOP and ask Stefan to review.**
