# Phase 4: Controls and audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stopping is easy and resuming is deliberate, and any action can be reconstructed (E6, E7, 8c). Pause, return to Shadow, revoke, two-person resume, disable and retire change the store, so the board, division and agent views agree. Jordan can replay any action, read the incident record, and export for a surveyor.

**Architecture:**
- Control flows live in `src/features/controls/`: dialogs and the agent view's paused and resume panels. The agent view (`src/features/board/AgentView.tsx`) mounts them from `?control=<id>`, the hook Phase 3 left in place.
- Audit screens live in `src/features/audit/`: action list, action trace, incidents and export. The inventory lives in `src/features/inventory/`. Each feature has a `selectors.ts`.
- Every state change is a store action built on `runAction`. Shared mutations (pausing, resuming) live as pure functions in `src/store/mutations.ts`, so scenarios build their state the same way the UI does.
- Agents with `lifecycle: 'retired'` leave every board. The predicate `onBoard(agent)` in `src/features/board/selectors.ts` is the only filter.

**Tech stack:** as Phase 3. No new dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.4 locked state, §5.5 routes, §6 Incident and ResumeRequest, §7 permissions, §8 frames 6a–6f, 7a–7d, 8c).

**Design sources** (copy and values verbatim, except where a ruling says otherwise):
- `designs/E6 Stop and Resume.dc.html`, in file order:
  - 6a: control menu
  - 6b: pause impact preview
  - 6c: Sam, return one activity to Shadow
  - 6d: resume requested, at 11:58
  - 6e: Priya approves
  - 6f: Dana, disable or retire, on the inventory
- `designs/E7 Replay and Audit.dc.html`, in file order:
  - 7a: action list, filtered
  - 7b: trace ACT-88213
  - 7c: incident INC-0031
  - 7d: export
- `designs/E8 Divisions and Access.dc.html`: 8c is its third frame.
- `designs/E1 Onboarding Countersign.dc.html`: 1i, the Drafts tab.
- Use `pnpm designs` and devtools for exact values. Measure each frame at 1440 px before building it, as Phase 3 did.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- Times come from `state.now` through `src/lib/clock.ts`. A live pause at 09:52 logs 09:52, not the frame's 09:47.
- Bump `SEED_VERSION` to 5 in Task 4.1. Any later seed or `DemoState` change in this phase stays on 5, because v5 is unreleased until merge.
- Every new store action is test-first and goes through `runAction`. A refusal changes nothing; tests compare `dataOf` before and after.
- **Locked controls use the designed locked state**, never native `disabled`. That means `Button` with a `locked` reason (Task 4.2), with the reason reachable by keyboard. Menu items keep their `locked` flag.
- **Counts come from data.** Where a frame's number conflicts with the seed (for example Drafts · 4, when Med Rec has been live since 06 Nov), show the data and record a ruling.
- Product copy uses no gendered pronouns. Write "Marcus's reason", not 7a's "his" or 6e's "His reason".
- Audit pauses with action `'Paused'`: the wall's last-hour count reads it. Resumes use `'Resumed'`.
- Buttons whose flow arrives later stay alive and link to the screen where the flow will live.

## Phase-3 facts this plan relies on

- **Agent view:** `AgentView` reads `?control=` and shows a pending-control notice. Task 4.2 replaces that notice with the real dialogs. These links already point to `?control=pause` or `?control=shadow`:
  - the division panel's "Pause agent"
  - the inbox's "Return to Shadow"
  - the escalated item's "Pause …"
- **Components:** `PauseDialog`, `ResumeDialog`, `ActionTrace` (Phase 2), `noticeMark(status)`, `StatusChip`, `PrivilegeCard`, `SystemsVerbsGrid`. **Design system:** `LinkButton`, `Notice` (`stale` mark), `Table` (keyboard Enter selects without `onOpen`), `Modal`, `RadioCardGroup`, `Segmented`, `Field`, `Textarea`, `Input`, `Checkbox`, `Menu`.
- **Store:**
  - `runAction`, `can`, `lockReason`
  - `openException`, a guard inside the store
  - `advanceClock(s, to)` in scenarios, which keeps live heartbeats live
  - `?scenario=<id>` on any URL
- **Board selectors:** `selectAgentOverview`, `selectAgentRows`, `selectDivisionSummaries`, `selectAgentHistory` (audit and log by agent code or name), `personName`.
- **Seed:**
  - Med Rec activities are `med-rec-admission` (Draft, PRV-0142 v3) and allergy (Shadow).
  - ACT-88213 has the full trace.
  - Prior Auth is paused by Tom; its division carries `incidentId: 'inc-0029'` and `resumeNeeds: ['Tom', 'Nina']`.

## Review focus

These are the failure modes the spec implies that no screen test naturally covers. Each has a pinned test in the task named.

1. **Two-person rule bypass.** The same person requests and approves, Dana (no resume right) approves, or someone approves with no request. All are refused and nothing changes. Pinned in Task 4.5.
2. **Acting on the wrong state.** Pausing a paused agent, resuming a live one, returning a Shadow activity to Shadow, revoking an ungranted tool, or retiring an already retired agent. Each is refused with a reason and nothing changes. Pinned in Tasks 4.3–4.6.
3. **Retired agents leaking.** After a retire, the agent leaves the board, division, tiles, wall and inventory Agents tab, and the counts drop by one. Its actions, audit and trace still open, and its agent view says "Retired" instead of crashing. Pinned in Task 4.6.
4. **Typed confirmation.** A near-miss name ("iv-to-oral agent", trailing space handled, "IV to Oral Agent") keeps Retire blocked. Only the exact name, after trimming, enables it. Pinned in Task 4.6.
5. **Unknown and trace-less records.** `/operations/actions/nope` and `/operations/incidents/nope` show NotFound. An action with no stored steps shows "No step-level trace was kept for this action" instead of an empty timeline. Pinned in Tasks 4.7 and 4.8.

---

### Task 4.1: Data for controls and audit (seed v5)

**Files:**
- Modify `src/data/types.ts`, `src/data/seed/{agents,activities,actions,events,index}.ts` and `src/data/scenarios/index.ts`.
- Create `src/data/seed/incidents.ts`, `src/data/seed/inventory.ts` and `src/store/mutations.ts`.
- Modify `src/features/board/selectors.ts` (`onBoard`).
- Tests: `src/data/seed/seed.test.ts`, `src/data/scenarios/scenarios.test.ts`, `src/features/board/selectors.test.ts`.

**Interfaces (Produces):**
- `Incident`:
  ```
  { id: 'inc-0031', code: 'INC-0031', title, agentId,
    state: 'open' | 'corrections' | 'closed',
    openedAt, openedBy, commanderId, harm: string, summary: string,
    linkedActionIds: string[],
    rootCause?: { text: string; by: string },
    corrections: { id: string; text: string; sub?: string; ownerId: string; done: boolean; status: string }[],
    timeline: { at: string; title: string; sub?: string; by?: string }[],
    closedAt?: string }
  ```
- `PauseDetail`, stored on `Agent.pause`:
  ```
  { scope: 'activity' | 'agent' | 'division', activityId?: string, reason?: string,
    routed: number, wasJudgment: Judgment,
    changes?: { title: string; sub: string; meta: string }[] }
  ```
  - `pausedBy` and `pausedAt` stay where they are.
  - `Activity.paused?: boolean` marks an activity-scope pause.
- `Agent.queue?: { inProgress: number; awaitingReview: number; perHour: number }`. Med Rec is `{ inProgress: 12, awaitingReview: 4, perHour: 6 }`. Without a queue, the selectors derive `inProgress = round(day / 12)`, `awaitingReview = round(day / 35)` and `perHour = round(day / 24)`.
- Retirement fields: `Agent.retiredAt?`, `Agent.archiveCode?` ('RET-01'…) and `Agent.disabledAt?`.
- Privilege changes: `PrivilegeState` adds `'closed'`.
- `IntakeRequest { id, code, title, divisionId, requestedBy, approvedAt }` and `OnboardingDraft { id, agentName, divisionId, requestCode, step, stepName, waiting, waitingOnId?, progress, lastChange }`. The total is always 13.
- `ExportRecord { id, code, agentIds, from, to, format: 'packet' | 'csv', masked, by, at }`.
- `DemoState` gains `incidents`, `intakeRequests`, `onboardingDrafts` and `exports`. `stats24h.actionsToday` is `1912`.
- `mutations.ts`:
  - `applyPause(s, agentIds, detail, by)`
  - `applyResume(s, agentId)`
  - `nextIncidentCode(s): string`, which gives 'INC-0031' on the seed
  - `nextArchiveCode(s): string`, which gives 'RET-07' on the seed
- `onBoard(a: Agent): boolean`, false for retired agents. Every board, division, tile, wall and inventory "Agents" count uses it.

**Seed facts** (verbatim unless noted):
- Incidents:
  - **INC-0029:** Prior Auth, open, commander Tom, opened 08:05 by Tom. Harm: "None reached a patient". The summary comes from EXC-5501. It is composed, since no frame shows it.
  - **INC-0030:** Discharge Meds, closed 02 Dec. It is invented so the next incident is INC-0031, as in 6d and 7c.
- Actions:
  - Add ACT-88171: 09:02:17, enc 4403, Ana R. · 7 West, blocked HS-04 v2, "Edited 1 line, signed".
  - Set ACT-88199 to 09:24:51 and "Edited 1 line, signed", to match 7a.
- Risk tiers from 8c and 6f:
  - Tier 3: Med Rec, Allergy Recon, Renal Dosing, Duplicate Rx, Prior Auth.
  - Tier 2: Formulary Swap, IV-to-Oral.
- Six retired agents, RET-01 to RET-06 (names invented, two per division at most), with `retiredAt` before 06 Nov.
- Two approved intakes. The drafts are 1i's rows without Med Rec, which has been live since 06 Nov: Discharge Summary, Prior Auth v2 and Referral Triage.
- Three past exports.

**Scenarios:**
- **`med-rec-paused`:** Marcus paused the agent scope at 09:47 with 6b's reason, through `applyPause`. 12 drafts are routed, and there is no incident yet.
- **`resume-requested`:**
  - It now matches 6d and 6e: `advanceClock` to 11:58 and a pause at 09:47.
  - INC-0031 is open:
    - opened by Jordan at 10:05; commander Marcus
    - root cause by Sam at 11:40
    - 4 corrections (3 done, 1 due 15 Dec)
    - the timeline up to "Resume requested" at 11:58
  - The pause `changes` are 6e's three rows.
  - Marcus's request and reason are recorded.
  - This replaces Phase 2's 07:38/09:52 compromise; `advanceClock` makes that compromise unnecessary.

- [x] **Step 1: Failing tests**
  - **Seed:**
    - `SEED_VERSION` is 5.
    - INC-0029 and INC-0030 exist, and `nextIncidentCode(seed)` is 'INC-0031'.
    - `nextArchiveCode(seed)` is 'RET-07'.
    - ACT-88171 is blocked by HS-04 v2.
    - The tiers match 8c.
    - Med Rec's queue is 12/4/6.
  - **Board:** `selectDivisionSummaries(seed)` still has 41 agents and Medications 20; retired agents are excluded. `onBoard` is false for retired agents.
  - **Scenarios:**
    - In `resume-requested`, now is 11:58 and Med Rec is paused by Marcus at 09:47 with `pause.routed` 12.
    - INC-0031 has 3 of 4 corrections done.
    - The resume request has Marcus's reason and Marcus's approval only.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement.** Make `applyPause` and `applyResume` pure, operating on a draft state, so the scenarios use them now and the store uses them in Tasks 4.3 and 4.5.
- [x] **Step 4: Run** `pnpm check`. Expected: PASS. Update any Phase 2 or 3 test that pinned `resume-requested`'s old clock, and ledger it.
- [x] **Step 5: Commit** with `git commit -m "feat(data): incidents, pause detail, inventory and seed v5"`.

### Task 4.2: Locked buttons and the control menu (6a)

**Files:**
- Modify `src/design-system/primitives/Button/{Button.tsx,Button.module.css,Button.test.tsx}`.
- Modify `src/features/board/AgentView.tsx`.
- Create `src/features/controls/controlMenu.ts`.
- Tests: Button unit tests and `tests/e2e/controls.spec.ts`.

**Interfaces (Produces):**
- `Button` gains `locked?: string`. When set, it renders the blocked look with a lock icon and `aria-disabled`. Clicking does nothing. The reason sits in a visually hidden node referenced by `aria-describedby`, and is also the `title`.
- `controlMenu(s, personaId, agentId): MenuGroup-like data`, a pure function. It returns 6a's groups and items, with subs and locks:
  - **PAUSE:**
    - "Pause this activity…": sub "Reconcile home medications" (the main activity's name), control `pause-activity`
    - "Pause this agent…": sub "Both activities" (or "All N activities"), control `pause-agent`
    - "Pause every agent in Medications…": sub "20 agents", control `pause-division`
  - **NARROW FIXES:**
    - "Revoke a tool…": sub "5 tools granted", counted from grants, control `revoke`
    - "Return an activity to Shadow…": sub "Back to Draft needs Priya again", control `shadow`
  - **PROGRAM LEAD ONLY:**
    - "Disable…" and "Retire…", each with sub "Dana" (whoever holds the right), controls `disable` and `retire`
  - Lock reasons come from `lockReason`.
- Valid `?control=` ids: `pause-activity | pause-agent | pause-division | shadow | revoke | disable | retire`. `pause` is kept as an alias for `pause-agent`, because Phase 3 links use it. Unknown ids are ignored.
- While the agent is paused or retired, the header hides Controls (as 6d does) and shows only "Open in Inventory".

- [x] **Step 1: Failing tests**
  - **Button:** `locked="Read-only access"` gives `aria-disabled="true"`, a lock icon, an accessible description "Read-only access", and no `onClick` call.
  - **`controlMenu` as Marcus on med-rec:**
    - group labels `['Pause', 'Narrow fixes', 'Program lead only']`
    - "Pause every agent in Medications…" has sub "20 agents"
    - Disable and Retire are locked with sub "Dana"
  - **`controlMenu` as Jordan:** every item is locked.
  - **e2e:** Controls shows the three groups; choosing "Pause this agent…" sets `?control=pause-agent`. Task 4.3 makes it open the dialog.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 6a: menu width, group labels, subs and lock rows.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(controls): control menu and locked buttons"`.

### Task 4.3: Pause with impact preview (6b)

**Files:**
- Create `src/features/controls/{PauseFlow.tsx,selectors.ts,controls.module.css}`.
- Modify `src/components/ImpactDialogs/ImpactDialogs.tsx`, `src/store/index.ts`, `AgentView.tsx` and `agent-tabs/Overview.tsx`.
- Tests: `src/store/store.test.ts`, `src/features/controls/selectors.test.ts`, `tests/e2e/controls.spec.ts`.

**Interfaces:**
- **Store:** `pauseAgent(agentId: string, input: { scope: 'activity' | 'agent' | 'division'; activityId?: string; reason?: string }): ActionResult`.
  - Permission: `pause` (division scope checks the division).
  - It refuses with 'Already paused' when the target is already paused or retired.
  - It uses `applyPause`:
    - lifecycle `paused`
    - `pausedBy`, `pausedAt = now`
    - judgment `{ status: 'paused', label: 'Paused by <name>' }`
    - `pause.wasJudgment` saved
    - `routed = queue.inProgress`
    - activity scope sets `Activity.paused` and keeps the agent live
    - division scope pauses every on-board, non-paused agent in the division
  - It adds a log event "<n> drafts routed to pharmacists" and one audit entry `{ action: 'Paused', target: agent.code, reason }`.
- **Selector:** `selectPausePreview(s, agentId, scope)` returns:
  - the scope options: "This activity", "This agent", "Every agent in Medications", each with its 6b sub
  - three effects:
    - `{ value: '12', lead: 'drafts in progress go back to pharmacists', text: 'They appear in the 7 West and 8 East worklists within a minute.' }`
    - `{ value: '4', lead: 'drafts waiting for review stay', … }`
    - `{ value: '~6', lead: 'admissions an hour reconciled by hand', … }`
    - division scope sums the queues
  - the resume rule "Resuming needs Priya and you, both with a reason. Each activity returns to the level it had."
  - the audit line "Logs Marcus · 09:52"
- **Component:** `PauseDialog` swaps `effect` for `effects: { value: string; lead: string; text: string }[]` and shows 6b's numbered rows. Update the gallery fixture.
- **Agent view when paused (6d's top half):**
  - status "Paused · since 09:52"
  - chip "Paused by Marcus"
  - the banner "Paused by Marcus at 09:52. 12 drafts went to pharmacists. New admissions on 7 West and 8 East are reconciled by hand until both of you approve a resume."
  - a "While paused" side card:
    - Drafts routed: 12 at 09:52
    - Reconciled by hand: `perHour × hours since`
    - Incident: the open incident, or "None · Open incident"
    - Paused for: the duration
  - Activities show "Paused · was Draft".

- [x] **Step 1: Failing tests**
  - **Store:**
    - Pausing Med Rec as Marcus sets the paused judgment and audit `'Paused'`.
    - A second pause is refused with 'Already paused' and changes nothing.
    - Jordan is refused.
    - Division scope pauses the 19 Medications agents not already paused (Controlled Drug Agent is paused in the seed), with one audit entry.
  - **Selector:** the 6b effect values are '12', '4' and '~6'.
  - **e2e:** Controls → "Pause this agent…" → the dialog "Pause Med Rec Agent?" → Pause agent.
    - The agent view shows "Paused by Marcus".
    - The division row shows the paused chip with numbers withdrawn.
    - The hospital board's Medications breakdown counts 1 paused.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 6b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(controls): pause with impact preview"`.

### Task 4.4: Fix one thing: return to Shadow, revoke a tool (6c)

**Files:**
- Create `src/features/controls/FixOneThing.tsx`.
- Modify `src/store/index.ts` and `src/store/permissions.ts`.
- Tests: store, permissions and `controls.spec.ts`.

**Interfaces:**
- `returnToShadow(activityId: string, reason: string): ActionResult`.
  - The reason is required ('A reason is required').
  - It refuses 'Already in Shadow'.
  - The activity's level becomes `shadow`, and the agent's main `level` follows.
  - The current privilege goes to `state: 'closed'`, and a new version `v+1` is drafted with `state: 'awaiting'`, `level: 'shadow'` and `proposedLevel: 'draft'`. That is 6c's "PRV-0142 v3 closes; a new version is drafted for her".
  - Audit: `'Returned to Shadow'`, with the activity name in the reason.
- `revokeTool(agentId: string, grant: { system: string; verb: Verb }, reason: string): ActionResult`.
  - The reason is required. It refuses 'Not granted'.
  - The cell becomes `'none'`. Audit: `'Revoked tool'`.
- **Permissions (ruling, to record):** `returnToShadow` adds `techOwner: 'ownAgents'`. 6c and the "Enforce the limits" story show Sam doing it; spec §7's matrix says no. The frames and stories are the more specific source.
- **Dialog (6c):**
  - title "Fix one thing", sub "Change one tool or one activity. The rest of Med Rec Agent keeps working."
  - a Segmented control "Revoke a tool | Return to Shadow"
  - activity radio cards: the Shadow ones are disabled with "Already in Shadow"
  - the four "What happens" lines from 6c
  - Reason (Required)
  - "Logs Sam · technical owner"
  - Revoke mode is composed: radio cards for each granted system × verb, then the same reason and log line.

- [x] **Step 1: Failing tests**
  - **Store:**
    - Sam returns `med-rec-admission` to Shadow. PRV-0142 v3 is closed, v4 is awaiting, and the audit entry is written.
    - An empty reason is refused.
    - A second call is refused.
    - Revoking an ungranted cell is refused.
    - Jordan is refused.
  - **Permissions:** Sam can `returnToShadow` med-rec, but not prior-auth.
  - **e2e:** as Sam, open the menu, choose Return to Shadow, enter a reason and confirm. The Activities tab shows Shadow for "Reconcile home medications", and History shows "Returned to Shadow".
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 6c.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(controls): return to Shadow and revoke a tool"`.

### Task 4.5: Two-person resume (6d, 6e)

**Files:**
- Create `src/features/controls/{ResumePanel.tsx,ApproveResume.tsx}`.
- Modify `src/store/index.ts` and `src/features/controls/selectors.ts`.
- Tests: store, selectors and `controls.spec.ts`.

**Interfaces:**
- **Actions:**
  - `requestResume(agentId: string, reason: string): ActionResult`
  - `approveResume(agentId: string, reason: string): ActionResult`
  - `declineResume(agentId: string, reason: string): ActionResult`
  - `withdrawResume(agentId: string): ActionResult`
- **The rule:** a resume needs both the agent's owner and its sponsor (`resume` permission), each with a reason.
  - **Request:** the agent must be paused; the request's first approval is the requester.
  - **Approve:**
    - Refused if there's no request ('No resume request').
    - Refused if the approver has already approved ('You already approved; the other person must').
    - Refused if the approver isn't the owner or sponsor (the `can()` refusal; Dana included).
    - When both have approved, `applyResume` restores the judgment, levels and lifecycle, clears the pause and adds the incident timeline entry "Resume approved · Priya". Audit: `'Resumed'`.
  - **Decline:** by the other party; it removes the request. Audit: `'Declined resume'`.
  - **Withdraw:** only the requester.
- **6d, an inline panel on the paused agent view:**
  - "Request to resume" or "Requested 11:58"
  - NEEDS BOTH (rows with status)
  - RETURNS TO (activity → level)
  - "Reason · Marcus" (the quote)
  - Resume (locked with "Stays paused until Priya approves") and Withdraw request
  - The requester's form is a Reason field and "Request resume".
- **6e, a Modal for the other party:**
  - "Marcus asks to resume Med Rec Agent"
  - NEEDS BOTH
  - "Marcus's reason" (not "His reason")
  - WHAT CHANGED SINCE THE PAUSE: `pause.changes` plus the incident row; "Nothing recorded since the pause" when empty
  - "Your reason" (required)
  - "Approve and resume", "Decline", and "Resumes at the gateway within seconds"
- Fix the Phase 2 deferred dark-mode issue: the resume dialog's white "done" check on ink must use `--cs-raised`.

- [x] **Step 1: Failing tests (Review focus 1)**
  - Marcus requests; Priya approves → the agent is live, the judgment is restored, and audit has `'Resumed'`.
  - Marcus approving his own request is refused, and nothing changes.
  - Dana approving is refused.
  - Approving with no request is refused.
  - Requesting on a live agent is refused.
  - Withdraw by Priya is refused.
  - **e2e:** in `resume-requested`, as Priya: the panel shows "Requested 11:58" → Approve → "Your reason" → Approve and resume. The board's Medications has no paused agent, and History shows "Resumed".
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 6d and 6e.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(controls): two-person resume"`.

### Task 4.6: Inventory (8c) and disable or retire (6f)

**Files:**
- Create `src/features/inventory/{InventoryPage.tsx,RecordPanel.tsx,RetireDialog.tsx,selectors.ts,inventory.module.css}`.
- Modify `src/store/index.ts` and `router.tsx`.
- Tests: store, selectors and `tests/e2e/inventory.spec.ts`.

**Interfaces:**
- **Actions:**
  - `disableAgent(agentId: string, reason: string): ActionResult`. Sets lifecycle `disabled`, revokes every grant, and sets judgment `{ status: 'paused', label: 'Disabled by Dana' }`. Audit: `'Disabled'`.
  - `retireAgent(agentId: string, input: { typedName: string; reason: string }): ActionResult`.
    - It refuses unless `typedName.trim() === agent.name` ('Type the agent's name exactly').
    - It refuses an empty reason.
    - It refuses 'Already retired'.
    - It sets lifecycle `retired`, `retiredAt` and `archiveCode = nextArchiveCode`.
    - It revokes every grant and closes the privileges.
    - It closes the agent's open exceptions, with outcome "Closed: agent retired".
    - Audit: `'Retired'`.
- **Selectors:**
  - `selectInventory(s, tab)` returns the rows per tab, and the counts "Agents · 41", "Drafts · 3" (ruling, see Task 4.1), "Intake · 2" and "Retired · 6".
  - `selectRecord(s, agentId)` returns 8c's "One record" panel:
    - Record "AGT-0123 · v1.0"
    - Risk tier "Tier 3 · High"
    - Committee "Approved with C1–C3 · 14 Oct" (Med Rec only; others "—")
    - Privileges "1 Draft · 1 Shadow"
    - Next review "05 Feb 2027"
    - Agent build
    - Last data
  - `selectRetirePreview(s, agentId)` returns 6f's four lines, with counts from data:
    - "Revokes N gateway tools and the agent's credentials"
    - "Closes N privilege(s), <codes> (<levels>)"
    - "Archives the record under RET-07; still searchable in audit and exports"
    - "Moves it to Inventory → Retired; it leaves every board"
- **Page:**
  - **Header:** "Inventory", with "Export inventory" linking to `/reports/export`.
  - **Tabs:** via `?tab=`.
  - **Agents (8c):**
    - columns AGENT, DIVISION, LEVEL, OPERATIONS (status chip), SPONSOR, TIER, REVIEW
    - rows in seed order
    - selecting a row opens the record panel, with "Open operations view" and "Open record" (`/inventory/agents/:id`, a Phase 5 placeholder)
    - the panel shows "Disable or retire…" for people with the right; for everyone else it's locked
  - **Drafts:** 1i's table, rows only. Phase 5.6 owns 1i: its "Continue" to the first missing field and its visual check.
  - **Intake and Retired:** composed tables.
  - **Retire dialog (6f):**
    - radio cards: Disable or "Retire for good"
    - RETIRING DOES THIS
    - "Type the agent's name to confirm"
    - Reason (Required)
    - "Logs Dana · program lead"
    - Retire agent, blocked until the name matches and there is a reason
  - The agent view's "Disable…" and "Retire…" open the same dialog.
- **Retired agent view:** when an agent is retired, its view shows "Retired · RET-07 · <date>" in place of the controls.

- [x] **Step 1: Failing tests (Review focus 2, 3, 4)**
  - **Store:**
    - Retire IV-to-Oral as Dana with "IV-to-Oral Agent" → retired, RET-07, grants none, privileges closed.
    - Trying "iv-to-oral agent" is refused.
    - Marcus is refused.
    - A second retire is refused.
  - **Selectors:**
    - After the retire, `selectDivisionSummaries` has 40 agents, Medications 19, and Inventory "Retired · 7".
    - `selectAgentOverview` for the retired agent still returns, with `retired: { code: 'RET-07' }`.
  - **e2e:**
    - As Dana on `/inventory`, select IV-to-Oral → Disable or retire… → Retire for good. Retire agent stays blocked until the exact name and a reason are given. After confirming, the Retired tab lists it and `/operations/divisions/medications` shows 19 agents.
    - As Marcus, the button is locked with the reason.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 8c and 6f.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(inventory): inventory and disable or retire"`.

### Task 4.7: Action list (7a) and action trace (7b)

**Files:**
- Create `src/features/audit/{ActionsPage.tsx,ActionTracePage.tsx,selectors.ts,audit.module.css}`.
- Modify `src/store/index.ts` (`openIncident`), `src/store/permissions.ts` and `router.tsx`.
- Tests: selectors, store and `tests/e2e/audit.spec.ts`.

**Interfaces:**
- `selectActions(s, filters: { agentId?: string; policy?: 'any' | 'blocked' | 'passed'; reviewer?: string })` returns rows:
  - TIME: mono with seconds
  - ACTION
  - WHAT
  - AGENT VERSION: "v1.3.0 · SOP v1.3.1"
  - ACTING FOR
  - POLICY DECISIONS: "HS-04 v2 blocked · 3 passed", or "4 passed"
  - REVIEWER
  - plus the summary "3 of 1,912 actions today", or "Latest N of 1,912 actions today" when unfiltered
- Filters are query params (`?agent=med-rec&policy=blocked`). Jordan's landing link keeps `/operations/actions`, with no filter.
- `selectTrace(s, actionId)` returns `ActionTraceView` plus the side cards:
  - "Who and what": Agent, SOP, Acting for, Privilege
  - "Policy decisions": "4 checked · 1 blocked", each rule's result, and "C1 · pharmacist signs"
  - "Linked": Exception "EXC-5530 · Marcus", and "Same rule today", i.e. the other actions blocked by the same rule
  - It returns null for unknown ids.
  - A trace-less action has `steps: []`, and the page says "No step-level trace was kept for this action."
- **Permissions:** add `PermAction 'openIncident'`, using `ALL_VIEWERS` (Jordan included: 7a's "the one thing [Jordan] can create").
- `openIncident(agentId: string, input: { title: string; actionIds: string[] }): ActionResult` creates `nextIncidentCode`:
  - state `open`
  - `openedBy` the persona; commander the agent's owner
  - the linked actions
  - a timeline built from the linked actions' block times, plus the pause if the agent is paused
  - Audit: `'Opened incident'`
- **The pages read 7a and 7b:**
  - The header actions are "Export these N" and "Export for surveyor", both linking to `/reports/export?agent=…`, and "Open incident" (store action, then navigate to the record).
  - The Operations tabs are shared with `BoardHeader`.
  - 7a's footnote becomes gender-neutral: "Read only: Jordan can open anything on any board and replay any action, but has no controls. Opening an incident is the one thing Jordan can create. Every view is logged."

- [x] **Step 1: Failing tests (Review focus 5)**
  - **Selectors:**
    - Filters `{ agentId: 'med-rec', policy: 'blocked' }` give ACT-88213, ACT-88199 and ACT-88171, newest first, with the summary "3 of 1,912 actions today".
    - The trace of ACT-88213 has 8 steps and the "4 checked · 1 blocked" card.
    - `selectTrace(s, 'nope')` is null.
  - **Store:** Jordan opens an incident from ACT-88213. The new code is INC-0031, `openedBy` is jordan, and the commander is marcus.
  - **e2e:**
    - As Jordan, `/operations/actions?agent=med-rec&policy=blocked` lists 3 rows.
    - Opening ACT-88213 shows "POLICY · BLOCKED" with "HS-04 v2".
    - `/operations/actions/nope` is NotFound.
    - ACT-88240 shows the no-trace message.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 7a and 7b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(audit): action list and trace"`.

### Task 4.8: Incidents list and incident record (7c)

**Files:**
- Create `src/features/audit/{IncidentsPage.tsx,IncidentPage.tsx}`.
- Modify the store and `router.tsx`.
- Tests: store, selectors and `audit.spec.ts`.

**Interfaces:**
- **Actions:**
  - `addIncidentEntry(incidentId: string, text: string): ActionResult`. Permission `openIncident`. An empty text is refused. It appends `{ at: now, title: text, by: persona }`.
  - `closeIncident(incidentId: string, reason: string): ActionResult`. Only the commander, or the program lead. It refuses 'Corrections still open (N)' while any correction isn't done. It sets `state: 'closed'` and `closedAt`, and adds a timeline entry.
- **Selectors:** `selectIncident(s, id)` returns 7c's header, people, summary, linked actions (rows from `selectActions`), root cause, corrections and timeline. `selectIncidents(s)` gives the composed list: code, title, agent, state, commander, opened, linked count. Open incidents come first.
- **Page (7c):**
  - title, with the status "Corrections · opened 10:05" and the chip "Open · 1 correction left"
  - a people line: Commander, Opened by, Sponsor, Technical, Harm
  - SUMMARY
  - LINKED ACTIONS, as rows that link to the traces
  - ROOT CAUSE · SAM
  - CORRECTIONS
  - "Close incident", locked with "1 correction open. Marcus closes the incident when it's done; Priya is told."
  - Timeline, with "Add an entry" (an inline field)
- **Composed list at `/operations/incidents`:** the Operations tabs and a table.

- [ ] **Step 1: Failing tests**
  - **Store:**
    - Closing INC-0031 in `resume-requested` is refused with 'Corrections still open (1)'.
    - Adding an entry as Jordan works; an empty entry is refused.
    - Closing INC-0029 as Tom when it has no open corrections works.
  - **e2e:**
    - In `resume-requested`, `/operations/incidents/inc-0031` shows "Commander Marcus", "ROOT CAUSE · SAM" and 4 corrections, with Close incident locked.
    - `/operations/incidents/nope` is NotFound.
    - The board's and inbox's "Open incident INC-0029" links land on its record.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against 7c.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(audit): incident record and list"`.

### Task 4.9: Export for a surveyor (7d)

**Files:**
- Create `src/features/audit/ExportPage.tsx`.
- Modify the store and `router.tsx`.
- Tests: store, selectors and `audit.spec.ts`.

**Interfaces:**
- `buildExport(input: { agentIds: string[]; from: string; to: string; format: 'packet' | 'csv'; masked: boolean }): ActionResult`. Permission `viewAudit`. It refuses an empty agent list. It adds an `ExportRecord` and an audit entry `'Built export'`.
- `selectExportContents(s, agentIds, from, to)` returns 7d's eight rows.
  - Med Rec's job-description and committee rows come from the 7d copy (4 · v1 to v4; 1 · approved with C1 to C3).
  - Every other row is counted from data: privileges and signatures, hard-stop tests, actions and traces (2,961 for Med Rec from 06 Nov), exceptions and how each closed, incidents, pauses and resumes.
  - Other agents show "—" where there is no data.
- **Page (7d):**
  - "Export records", "For a survey or an audit", and "Past exports · N"
  - What to export: Agents (Select, prefilled from `?agent=`) and Period (06 Nov 2026 to 08 Dec 2026)
  - CONTENTS
  - FORMAT radio cards
  - Mask patient identifiers (Checkbox, on)
  - "Build export", with "About 2 min · logged as Dana"
  - The packet preview list
  - After building, a Notice: "EXP-0004 built · logged as Dana". It adds to Past exports. No file is produced; ledger this as a prototype ruling.

- [ ] **Step 1: Failing tests**
  - **Selectors:** Med Rec contents show Incidents "1 · INC-0031" in `resume-requested`, and Pauses and resumes "1 · with both reasons" after an approve.
  - **Store:** building with no agents is refused; Jordan can build.
  - **e2e:** as Dana, `/reports/export?agent=med-rec` → Build export → "Past exports · 4".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against 7d.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(audit): export for a surveyor"`.

### Task 4.10: Journey test and checkpoint

- [ ] **Step 1: e2e journey** (`tests/e2e/journeys.spec.ts`), "stop easy, resume deliberate":
  - As Marcus, pause Med Rec from the division panel's "Pause agent". Then:
    - The board shows the paused agent.
    - The agent view shows "Paused by Marcus".
    - Request a resume with a reason.
    - Marcus can't approve it.
  - Switch to Priya, approve with a reason. Then:
    - The agent is live again at Draft.
    - The wall's "last hour" shows "2 pauses".
  - As Jordan, the action list → ACT-88213 → Open incident → the record shows the linked action.
- [ ] **Step 2: `pnpm check` and `pnpm e2e` green.**
- [ ] **Step 3: Checkpoint** per the BUILD_PLAN protocol:
  - Push, then open the PR "Phase 4: Controls and audit" with `Closes #5`.
  - Run the fresh whole-branch review and apply its fixes test-first.
  - Visual QA of 6a–6f, 7a–7d and 8c; tick them in the frame tracker.
  - Write the handoff notes, then update Start here, the decision and session logs, issue #5 and the PR body.
  - **STOP and ask Stefan to review.**
