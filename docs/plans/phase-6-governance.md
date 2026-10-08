# Phase 6: Governance and fast follows

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Divisions and access, change detection, the clinician feedback loop and reviewer behaviour (E8, E9, E10, E11). In this phase:
- Dana sets who answers for a division and what a lapsed review does.
- Dana gives Sam a second division, and what Sam can do follows.
- v1.5.0 of Med Rec Agent is held at the gateway until Marcus re-validates it.
- Dana finds a bot using hospital credentials with no registry record.
- Ana flags a draft from Epic in one action and, nine days later, sees it fixed.
- Marcus tells "the agent got better" from "reviewers stopped checking".

**Architecture:**
- **Time model (ruling R1).** E9–E11 are "v2" frames drawn in March 2027 (E13 says "Sample data moves to March 2027"). The prototype keeps one hospital and one clock, Tue 08 Dec 2026 09:52. So each v2 frame is re-dated: its "today" becomes the day it is shown, and every other date in it moves by the same number of days.

  | Frame | Drawn | Shown | Shift |
  |---|---|---|---|
  | 10a | 17 Mar | 08 Dec (baseline) | −99 days |
  | 9a | 24 Mar | 15 Dec (`change-detected-v150`) | −99 days |
  | 10b | 26 Mar | 17 Dec (`epic-fixed-later`, the spec's "+9 days") | −99 days |
  | 9b | 24 Mar | 08 Dec (baseline) | −106 days |
  | 11a, 11b | 24 Mar | 08 Dec (baseline) | −106 days |

  The seed writes the frame's March date and shifts it with `fromMarch(iso, days)` (`addDays`), so every value stays traceable to its frame.
  - **Builds:** the live build is the seed's v1.3.0 · SOP v1.3.1, as every December frame shows. The new build is v1.5.0 · SOP v1.5, as the spec names it. 9a's and 10a's "v1.4.2" becomes v1.3.0, and "SOP v1.4" becomes SOP v1.3.1.
- **Settings are real.** Division settings and role assignments live in `DemoState`. What they say happens:
  - `can()` reads role assignments.
  - The inbox escalates along the division's chain.
  - The lapse policy acts when it is saved and whenever a scenario moves the clock.
- **Pure mutations, store actions, replayed scenarios** (as in Phase 5).
  - New pure mutations live in `src/store/settings.ts` (E8), `src/store/changes.ts` (E9.1 and E9.2), `src/store/feedback.ts` (E10) and `src/store/reviewers.ts` (E11). Each has a store action on `runAction`.
  - `change-detected-v150` and `epic-fixed-later` are built from the baseline by replaying those mutations at the frames' re-dated times.
- **Static vs state.** Content that never changes is catalogue data in `src/data/seed/catalogue.ts`:
  - v1.5.0's diff, replay result and release note
  - the 10b draft
  - reviewer statistics
  
  Everything a person can change is in `DemoState`: divisions, roles, changes, flags, callers, review-level proposals.
- **Features:**
  - `src/features/settings/`: 8a, 8b
  - `src/features/changes/`: 9a's Changes tab
  - `src/features/gateway/`: 9b
  - `src/features/epic/`: 10a, 10b
  - `src/features/reviewers/`: 11a, 11b
  - Each has a `selectors.ts`.

**Tech stack:** as Phase 5. No new dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.3 stories that skip time, §4.4 Ana lands on `/epic`, §5.5 routes, §6.1 RoleAssignment and Division, §6.3 `change-detected-v150` and `epic-fixed-later`, §7 permissions incl. "Manage divisions and roles", §8 frames 8a, 8b, 9a, 9b, 10a, 10b, 11a, 11b).

**Design sources** (copy and values verbatim, except where a ruling says otherwise):
- `designs/E8 Divisions and Access.dc.html`: 8a, 8b (8c was built in Phase 4).
- `designs/E9 Changes and Unregistered.dc.html`: 9a, 9b.
- `designs/E10 Clinician Feedback.dc.html`: 10a, 10b.
- `designs/E11 Reviewer Behaviour.dc.html`: 11a, 11b.
- Frames sit two per row at x = 48 and x = 1536, and are 1440 px wide. A browser emulated at 1500 × 1400 with `window.scrollTo` shows one frame at a time. Measure each frame before building it.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- **Colour meanings in this phase:**
  - Teal is only "review waiting": "Re-validation needed", "Waiting for Priya", and "Review: …" items.
  - Amber is only for warnings:
    - the span warning on 8a
    - "Notes leave Epic" and the "3 callers this week" notice on 9b
    - the insight notice, "Checking less?" and the coverage note on 11a and 11b
  - Indigo is the primary action, and the selected row or option.
- **Epic is a neutral stand-in.** The EHR area uses neutral greys (still `--cs-*` tokens) and no Countersign components. Only the right-hand Med Rec Agent panel uses our design language. The prototype bar stays; the product TopNav does not appear on `/epic`.
- **Monitoring screens are 13 px** (8b's table, 9a, 9b, 11a, 11b). **Forms are 16 px with 44 px fields** (8a's selects, Add a role, the flag form, the modals).
- `SEED_VERSION` goes to **7** in Task 6.1. Later seed or `DemoState` changes in this phase stay on 7.
- **Every new store action is test-first and goes through `runAction`.** A refusal changes nothing; tests compare `dataOf` before and after.
- **Locked controls use `Button locked`** with the reason from `lockReason` or the gating message. Never use native `disabled`. People without the right see settings as read-only values, not editable fields.
- **Counts come from data.** Where that changes a frame's number, record a ruling.
- **No gendered pronouns** in product copy. 8b's caption "what he can do follows the role" is annotation, not product copy.
- **Times come from `state.now`.** Scenarios pin the frames' re-dated times.
- **Moving the clock goes through one function.** `advanceClock(s, to)` moves to `src/data/scenarios/clock.ts` and is exported. In this order it:
  1. raises overdue reviews
  2. applies lapse policies
  3. withdraws expired held builds
  
  Each step is idempotent.

## Phase-5 facts this plan relies on

- **Store:**
  - `runAction`, `can`, `lockReason`; `PermAction` already has `manageDivisions: { programLead: 'all' }` (unused until now).
  - `nextCode`, `nextExceptionCode` (floor EXC-5400) and `raiseOverdueReviews` in `src/store/mutations.ts`.
  - `raiseItem` and `resolveItems` in `src/store/onboarding.ts`. Hand-off items carry a `link`, never escalate, and show only their link and Snooze.
  - `applyPause(s, agentIds, { scope, activityId, reason }, by, at)`.
  - `returnToShadow` is inline in the store action (`src/store/index.ts:266`); Task 6.1 extracts it as a pure `applyReturnToShadow`.
- **Permissions:**
  - Scope is `'all' | 'own' | 'ownAgents'`.
  - A role assignment must match the agent's division; `'ownAgents'` also needs `agent.techOwnerId === personaId`.
  - `frontline` appears nowhere in the matrix.
  - `lockReason` gives Ana "Works in Epic, not the console" and Jordan "Read-only access".
- **Seed** (at baseline):
  - 16 people, 19 role assignments.
  - Marcus owns all 20 Medications agents, which have 22 activities, 17 of them at Draft.
  - Sam is technical owner of every Medications agent. Lena (Discharge) and Omar (the other three divisions) are the other technical owners.
  - `Division.lapsePolicy` is `'nothing' | 'shadow' | 'pause'`: Medications, Discharge and Revenue cycle `shadow`, the others `nothing`.
  - PRV-0098 (Duplicate Rx) is the only privilege past review (01 Dec, state `due`, EXC-5497 owned by Priya, deadline 15 Dec 17:00).
  - Med Rec is v1.3.0 · SOP v1.3.1, with HS-04 v2, HS-07 v1 and HS-11 v1. It already has **Pyxis read** ("Dispense history, 90 days").
  - Intakes REQ-0106 and REQ-0108 are not started.
  - The highest exception code is EXC-5530.
- **Routes** (all placeholders today):
  - `/epic` (prototype shell)
  - `/settings/divisions/:divisionId`, `/settings/people`
  - `/inventory/unregistered/:callerId` (sample `gw-caller-01`)
  - `/operations/reviewers`, `/operations/reviewers/:unitId`
  
  `routes.test.ts` pins the exact path list. `tests/e2e/routes.spec.ts` loads every `samplePath`.
- **Agent view:** `TABS = ['overview','activities','scorecard','actions','privileges','history']`. Header idLine `"{version} · SOP {sop} · {code}"`, the Controls menu, "Open in Inventory".
- **Division view (4b)** has no tabs. **Inbox:** `isEscalated` excludes incidents and link items. `sponsorOf` decides who an escalation reaches.
- **e2e:** `viewAs(page, name)` is redefined per spec, so set the persona before `?scenario=`. Rows are found with `[data-row-id]`. Assert `aria-disabled`, not clicks, on locked controls.

## Rulings (record each in the BUILD_PLAN decision log when its task lands)

- **R1 Time model.** As in Architecture.
  - `fromMarch(iso, -99)` is used for 9a, 10a and 10b; `fromMarch(iso, -106)` for 9b, 11a and 11b.
  - 10a's draft time "10:32" is after the 09:52 clock, so it becomes 09:32. Everything else shifts exactly.
- **R2 Flag and draft codes.** Ana's live flag takes the next code. The seed's highest flag is FB-2290, so it is **FB-2291**, as 9a and 10b show.
  - The eye-drops flag (10b and 11b, "FB-2302") exists before 08 Dec in the single timeline, so it becomes **FB-2286**.
  - FB-2277 is kept. Draft ids (DR-…) are kept verbatim.
- **R3 Counts from data:**
  - 8a's "Division · 20 agents · 4 activities at Draft" reads "20 agents · 17 activities at Draft".
  - "Marcus directly supervises 9 activities" reads 22.
  - "People and roles · 9" reads 16.
  - 8c's "Intake · 2" reads "Intake · 3", because REQ-0081 (R16) is an approved intake that was never started.
  - "3 callers", "Low volume · 7", "Dismissed · 12", "Changes · 4", "Your flags · 3" and "5 other pharmacists" are all counted.
- **R4 Settings act.**
  - The lapse policy applies from the moment it is saved, and whenever the clock moves:
    - `nothing`: the exception only.
    - `shadow`: back to Shadow at the review date + grace days.
    - `shadowNow` (new): back to Shadow at the review date.
    - `pause`: pause the activity at the review date.
  - So in `change-detected-v150` and `epic-fixed-later` Duplicate Rx is at Shadow from 15 Dec, as 8a's preview line promises.
  - `raiseOverdueReviews` takes its deadline from the division's grace days (it was a fixed 14).
  - The escalation chain is data: `Division.escalation = { first, then, afterHours: 4 }`. An unanswered item reaches `first` past its deadline, and also `then` once `afterHours` more have passed.
- **R5 Changing who answers.**
  - Changing a division's **owner** moves the owner role to the new person. Agents whose owner was the old owner move to the new one. Their open exceptions owned by the old owner move too, with the old owner copied.
  - Changing the **sponsor** does the same for the sponsor role, `agent.sponsorId` and open items. Signed privileges keep their grantor.
  - Saving tells the sponsor (and the previous sponsor, if changed) with an FYI item (R18).
- **R6 New division and split.** 8a draws "New division" and "Split this division" without their forms. One composed modal serves both. It takes a name, an owner and a sponsor and, for a split, the agents to move, showing both owners' spans as you tick. One action, `createDivision`, does the rest:
  - It adds the division with the parent's lapse policy and an escalation chain of {sponsor, Dana, 4 h}.
  - It gives the owner, the sponsor, the moved agents' technical owners and the parent's frontline people roles there.
  - It moves the agents and their owner's open items.
  
  The board shows the sixth tile.
- **R7 Roles decide scope.**
  - A technical-owner role in a division covers every agent in it: `'ownAgents'` passes when the person holds `techOwner` in the agent's division, or is the agent's `techOwnerId` with any `techOwner` assignment. That is how "Sam gets a second division" changes `can()`.
  - The technical owner gains `pause` (`'ownAgents'`): 8b lists "Tools · hard stops · pauses" and "Pause, return an activity to Shadow". Frames beat the PRD matrix where they are more specific, as in Phase 4.
- **R8 People and roles.**
  - **Rows:** the table lists everyone with a role (16), one row per person, in this order:
    1. hospital-wide roles (program lead, committee, read only)
    2. Medications (sponsor, owner, technical owner)
    3. the other divisions by name (sponsor, owner, technical owner)
    4. frontline last
    
    This reproduces 8b's order.
  - **The panel's capability list** is the frame's six lines plus three more ("Edit job descriptions", "Decide go-live in committee", "Manage divisions and roles"). Each is ticked or locked by `can()`, using the role chosen in "Add a role" (else the person's first role) in that division.
  - **Composed controls:**
    - "Remove" on each role, refusing to remove the last program lead or a division's named owner or sponsor
    - "Invite" (name, title, role, division)
- **R9 9a's systems row.** Med Rec already reads Pyxis (1c, Phase 5), so v1.5.0's systems change is a wider Epic read instead:
  - live: "Epic read · encounter, home med list, allergies"
  - held: "Epic read · adds structured sig fields", sub "frequency and timing", needing "Sign-off · Marcus"
  - The check reads "Sign off Epic sig read".
  - SOP §5.1's Pyxis line is kept verbatim (the SOP starts using a source it can already read).
  - HS-04's diff is the seed's v2 text against a v3 text in the seed's voice that adds "or a frequency".
- **R10 Re-validation.**
  - "Start replay" finishes at once (the demo clock doesn't run). It shows the catalogue's replay result and ticks "Replay matches or beats v1.3.0".
  - "Effect on activities" comes from data:
    - Shadow activities' scorecards restart on the held build at deploy (they reach no clinician).
    - Other activities stay on the live build until accepted.
  - Accepting is the re-validation, so PRV-0142's "New version" step-down trigger does not fire for an accepted build (a Phase 7 note).
- **R11 9a's header.**
  - While a build is held, the header status reads "v1.5.0 held at the gateway", the ID line "v1.3.0 live · AGT-0123", and the chip "Re-validation needed" sits beside any judgment chip.
  - "Compare builds" goes to the Changes tab.
  - **The Controls menu stays** (9a omits it), so stopping is never more than one click away.
  - The Changes tab appears only for agents with a change record: "Changes · 4" while held, "Changes" after.
- **R12 Where v1.5.0 comes from.** Only `change-detected-v150` deploys it; there is no deploy screen. Marcus gets "Re-validation needed" (Priya and Dana copied: "Told Marcus, Priya, Dana"). Priya gets her own "Review: HS-04 v3", because she must act.
- **R13 The Epic stand-in.**
  - Its own buttons (Add medication, Mark reviewed, Verify list) only say "Stand-in for Epic. Only the panel on the right is part of the prototype."
  - Ana's metoprolol edit is seeded.
  - One flag per draft per pharmacist; the button then reads "Flagged · FB-2291".
  - "View trace" opens the trace inline: Ana has no console access.
  - Anyone but a frontline pharmacist sees the page read-only, with "Flag a problem" locked.
  - A flag's title is its note if one was written, else "<reason> · <medication>".
- **R14 Flags reach the owner.** A flag raises an inbox item `kind: 'flag'` to the agent's owner. Its detail shows the edit, the reason, the note and "Open trace". There are three answers:
  - "Working on a fix" (a note, shown to Ana as "In progress · Marcus")
  - "Not a defect" (a reason)
  - "Reply to Ana"
  
  Accepting a build that lists the flag marks it fixed. Seeded flags are already answered, so 5a's "Needs me · 4" holds at baseline.
- **R15 `/epic?day=later`** loads `epic-fixed-later` (like `?scenario=`), then drops the param.
- **R16 9b's intake.** 9b's "Discharge Summary Agent · REQ-0081" clashes with the live Discharge Summary Agent (AGT-0161), so it becomes:
  - **REQ-0081, "Discharge Huddle Summary Agent"**, in Discharge
  - requested by Elena, approved 06 Nov (20 Feb − 106), never started
  - reserving the highest unused agent code below AGT-0184
  
  The callers and their decisions:
  - Starting onboarding moves the caller off "Unregistered".
  - A blocked caller stays listed as "Blocked".
  - "Not an agent" moves it to Dismissed.
  - "Message K. Osei" is logged (K. Osei isn't a console user).
  - Low volume and Dismissed rows are invented.
  - "Gateway rules" opens a read-only list of the three rules the page states.
  - Inventory gains a header link "Seen at the gateway · 3".
  - Dana gets one inbox item per unregistered caller.
- **R17 Reviewer behaviour.**
  - **Tabs:** 4b, 11a and 11b share a division tab strip, "Board · Reviewer behaviour". 11a's "Exceptions" and "Scorecards" have no designed page and are left out; "Sampling" arrives with Phase 7.
  - **Header controls:** "All agents" is a scope label. "8 weeks" is a select (4 or 8 weeks).
  - 11a's "7 West and 8 East: see the step-down in E15" is left out until Phase 7 has a step-down to link.
  - **Other units:** every unit opens a drill-in. 6 North is verbatim; the others' shifts and misses are invented.
  - **Respond:** "Send to Priya for sign-off" raises "Review: sampling change · 6 North" for the sponsor, who signs or declines on 11b (composed).
  - **Share:** "Share with Priya" sends an FYI.
- **R18 FYI items.** "Priya told" and "Share with Priya" are `kind: 'notify'` items with a link. Unlike hand-offs, an FYI can be dismissed ("Got it"), since there is no step that closes it.
- **R19 Composed screens:**
  - the 8a Agents tab (a read-only list)
  - Settings for divisions other than Medications
  - the Changes tab after acceptance
  - the 9b detail for callers with no matching intake
  - the confirmation after a flag is sent
  - Priya's sign-off on 11b
  - reviewer behaviour for divisions with no independent check ("No independent check runs in <division> yet.")

## Review focus

The failure modes most likely to bite a visitor that no screen test naturally covers. Each has a pinned test in the task named.

1. **Settings and roles change who can act, and nothing else.** Each of these must hold:
   - After Dana adds "Technical owner · Discharge" for Sam, Sam can revoke a Discharge Meds tool but still nothing in Revenue cycle.
   - After she removes it again, he can't.
   - After Dana changes the Medications owner to Elena, the Medications board, Marcus's inbox and `can()` all agree that Elena owns it.
   - Removing the last program lead, or a division's named owner's role, is refused.
   
   Pinned in Tasks 6.1 and 6.3.
2. **Moving the clock applies each rule once.**
   - Scenario chains (`change-detected-v150` → `epic-fixed-later`) and repeated `advanceClock` calls must not lapse twice, raise a second overdue review, pause twice, or withdraw a build that was accepted.
   - Saving "Back to Shadow at once" acts immediately, and saving it again does nothing more.
   
   Pinned in Tasks 6.1 and 6.5.
3. **Gates bypassed by calling the action directly.** Each is refused with a reason, and nothing changes:
   - accepting v1.5.0 before its three checks
   - Marcus approving HS-04 v3
   - Ana flagging the same draft twice, or Marcus flagging at all
   - Jordan saving settings
   - a split with no agents
   - blocking or dismissing a caller without a reason
   - signing a review-level change twice
   - Priya proposing one
   
   Pinned in Tasks 6.1 to 6.8.
4. **Unknown ids and wrong-state URLs.**
   - These show NotFound:
     - `/settings/divisions/nope`
     - `/inventory/unregistered/nope`
     - `/operations/reviewers/nope`
   - These fall back calmly:
     - `?tab=changes` on an agent with no change shows Overview.
     - `/epic?day=nope` shows today.
     - `/operations/reviewers?division=nope` shows the persona's division.
   
   Pinned in Tasks 6.1, 6.5, 6.6, 6.7 and 6.8.
5. **March leaks and baseline drift.**
   - No seed or catalogue string shows a March date or "v1.4.2".
   - At baseline, 4a and 4b, Marcus's 5a counts (4 / 2) and Priya's 5d counts are unchanged.
   - Pinned in Task 6.4 (a seed test that scans every string) and in each task's e2e.

---

### Task 6.1: Division settings (8a), lapse policy and escalation chain (seed v7)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,divisions,people,catalogue}.ts`
  - `src/store/{index,mutations,permissions}.ts`
  - `src/data/scenarios/index.ts`
  - `src/features/inbox/{selectors.ts,ExceptionDetail.tsx}`
  - `src/app/router.tsx`
- Create:
  - `src/store/settings.ts`
  - `src/data/scenarios/clock.ts`
  - `src/features/settings/{SettingsLayout,DivisionSettingsPage,AgentsTab}.tsx`
  - `src/features/settings/{selectors.ts,settings.module.css}`
- Tests:
  - `src/store/settings.test.ts`
  - `src/data/scenarios/clock.test.ts`
  - `src/features/settings/selectors.test.ts`
  - `src/features/inbox/selectors.test.ts`
  - `tests/e2e/settings.spec.ts`

**Interfaces (Produces):**
- **Types:**
  - `LapsePolicy = 'nothing' | 'shadow' | 'shadowNow' | 'pause'`.
  - `Division` gains `graceDays: number` and `escalation: { first: string; then: string; afterHours: number }`.
  - `RoleAssignment` gains `since: string` (ISO). Sam's Medications role is `2026-03-01` ("since Mar 2026"); others are plausible dates from 2025–2026.
  - `AgentException.kind` gains `'flag'` (used in Task 6.4).
- **Seed v7:** every division has `graceDays: 14` and `escalation: { first: <sponsorId>, then: 'dana', afterHours: 4 }`.
- **`src/store/settings.ts`:**
  - `applyReturnToShadow(s, activityId, by, reason, at)`: extracted from the store action, same behaviour. The store action now calls it.
  - `lapseDate(s, privilege): string | null`: when the division's policy acts (null for `nothing`).
  - `applyLapses(s): DemoState`. For every `due` privilege not at Shadow whose `lapseDate <= now`:
    - `shadow` / `shadowNow`: the privilege becomes `lapsed`, with `movedBy: 'ORG-LAPSE-01'` and `trigger: 'Review date passed <dd Mon>'`. The activity goes to Shadow, with the same history entries `applyReturnToShadow` writes.
    - `pause`: `applyPause(scope 'activity', reason 'Review date passed <dd Mon> · ORG-LAPSE-01', by 'ORG-LAPSE-01')`.
    - Idempotent.
  - `type DivisionPatch = Partial<Pick<Division, 'ownerId' | 'sponsorId' | 'lapsePolicy' | 'graceDays' | 'escalation'>>`.
  - `diffDivision(d, patch): string[]`: changed field labels, e.g. `['what happens when a review date passes']`.
  - `applyDivisionSettings(s, divisionId, patch, by, at)`: applies R5's ripple, raises the FYI(s) (R18), then calls `applyLapses`.
  - `escalationOf(s, e): string[]`: `[]` unless `isEscalated`. Then `[first]`, plus `then` once `now >= deadline + afterHours h`.
- **`src/data/scenarios/clock.ts`:** `export function advanceClock(s, to)` (moved from `scenarios/index.ts`), now calling `raiseOverdueReviews`, then `applyLapses`, then (Task 6.5) `withdrawExpiredChanges`.
- **`raiseOverdueReviews`:** the deadline is `reviewDate + graceDays` at 17:00 (unchanged for 14).
- **Inbox:** `sponsorOf` is replaced by `escalationOf`. "Needs me" includes items whose escalation reaches the viewer. The escalation notice names the person it reached.
  - **ExceptionDetail:** an item with `kind: 'notify'` and a `link` shows the link and "Got it" (dismiss, no reason needed). Hand-off rules are unchanged.
- **Store:** `updateDivisionSettings(divisionId: string, patch: DivisionPatch): ActionResult`.
  - Permission: `manageDivisions`.
  - Refused: an unknown division ("Division not found"), and a patch that changes nothing ("Nothing to save").
  - Audit: `Changed division settings`, target = division name, reason = the changed labels joined.
- **Selector `selectDivisionSettings(s, divisionId, draft: DivisionPatch)`:**
  - **Header:**
    - title = name
    - sub "Division · 20 agents · 17 activities at Draft"
    - tabs "Settings", "People and roles · 16", "Agents · 20"
  - **Left list:** "DIVISIONS · 5", with rows "Marcus · 20 agents" and the like, in seed order with the current one first as in 8a. Then "New division" (Task 6.2).
  - **Who answers:**
    - owner and sponsor options: people holding that role anywhere, as "Name"
    - helps "Supervises daily" and "Signs privileges"
    - the span line when the owner's span is over the guideline (`SPAN_GUIDELINE` 7): "**Marcus directly supervises 22 activities.** The guideline is 7. Splitting Medications in two keeps each owner within span." plus "Split this division"
  - **When a privilege's review date passes:** "Applies to every privilege in Medications. Changes are logged and the sponsor is told." with the four options:
    - "Raise an exception only" / "The activity keeps its level until someone acts"
    - "Raise an exception, then back to Shadow" / "After a grace period, drafts stop reaching clinicians"
    - "Back to Shadow at once" / "No grace period"
    - "Pause the activity" / "Pending work goes to people, like a pause"
  - **Grace period** (only for `shadow`): "7 days | 14 days | 30 days".
  - **The preview line**, for the division's most overdue privilege:
    - `shadow`: "Duplicate Rx Agent is 7 days past its review date. With this setting it returns to Shadow on 15 Dec." It says "when you save" when that date has passed.
    - `nothing`: "… With this setting it keeps its level until someone acts."
    - `shadowNow`: "… it returns to Shadow when you save."
    - `pause`: "… its activity is paused when you save."
    - With nothing overdue: "No privilege in Medications is past its review date. Next: <agent> on <dd Mon>."
  - **Unanswered exceptions:**
    - "Escalate to" (help "After the deadline") and "Then to" (help "If still unanswered after 4 h")
    - options: the division's sponsor, owner and the program lead, as "Priya · clinical sponsor" and the like
  - **Footer:**
    - "Save changes", locked with "Nothing to save" when there are no changes
    - "1 change · logged as Dana · Priya told" (`N changes`); "No changes" otherwise
  - **Read-only mode** (without `manageDivisions`): values as text and Save locked with `lockReason('manageDivisions')`.
- **Pages:**
  - `/settings/divisions/:divisionId` renders `DivisionSettingsPage` (NotFound for an unknown id).
  - `?tab=agents` renders `AgentsTab`, a read-only table (Agent, Level, Owner, Technical owner, Tier) whose rows link to `/inventory/agents/:id` (R19).
  - The "People and roles" tab links to `/settings/people`.

- [x] **Step 1: Failing tests**
  - **`clock.test.ts`:**
    - `advanceClock(seed, '2026-12-15T09:52:00')` sets PRV-0098 to `lapsed` and Duplicate Rx's activity to Shadow. A second `advanceClock` to 17 Dec changes nothing more.
    - Advancing to 14 Dec 23:59 leaves it `due`.
  - **`settings.test.ts`:**
    - **Lapse effects:**
      - `applyDivisionSettings` with `{ lapsePolicy: 'shadowNow' }` lapses PRV-0098 at once; applying it twice is idempotent.
      - `'pause'` pauses `duplicate-rx` (activity scope) and doesn't pause it twice.
      - `'nothing'` leaves it `due`.
    - **Diff and ripple:**
      - `diffDivision` counts one change for a lapse switch, and none for an identical patch.
      - Owner → `elena`:
        - every Medications agent's `ownerId` is `elena`
        - EXC-5530 is owned by `elena`, with `marcus` copied
        - `roles` holds elena/owner/medications and not marcus/owner/medications
        - an FYI for Priya exists with a link to `/settings/divisions/medications`
    - **Escalation:**
      - `escalationOf` for a past-deadline unclaimed item returns `['priya']`.
      - 4 h later it returns `['priya', 'dana']`.
      - It returns `[]` for an incident or a link item.
    - **Permissions:** `updateDivisionSettings` as Marcus or Jordan is refused, and the state is unchanged.
  - **`inbox/selectors.test.ts`:** at baseline, Marcus's Needs me is 4 and Waiting is 2. In `stale-escalated`, Priya's 5d counts are unchanged.
  - **`settings/selectors.test.ts`:** the sub reads "Division · 20 agents · 17 activities at Draft", the span says 22, and the preview line reads "… returns to Shadow on 15 Dec." for the seed's policy.
  - **e2e `settings.spec.ts`:**
    - As Dana, `/settings/divisions/medications`: choose "Back to Shadow at once" → the footer reads "1 change · logged as Dana · Priya told" → Save. `/operations/divisions/medications` shows Duplicate Rx at Shadow.
    - As Jordan, the same page has Save `aria-disabled`.
    - `/settings/divisions/nope` shows Not found.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 8a. Bump `SEED_VERSION` to 7. Update every `lapsePolicy` reader (`MyPrivilegesPage`, `board/selectors.ts`, `golive/selectors.ts`) for `shadowNow`.
- [x] **Step 4: Run.** Expected: PASS, and `pnpm check` green.
- [x] **Step 5: Commit** with `git commit -m "feat(settings): division settings, lapse policy and escalation chain"`.

### Task 6.2: New division and split (8a, composed)

**Files:**
- Modify:
  - `src/store/{settings,index}.ts`
  - `src/features/settings/DivisionSettingsPage.tsx`
- Create: `src/features/settings/NewDivisionModal.tsx`
- Tests:
  - `src/store/settings.test.ts`
  - `src/features/settings/selectors.test.ts`
  - `tests/e2e/settings.spec.ts`

**Interfaces (Produces):**
- **`applyCreateDivision(s, input: { name: string; ownerId: string; sponsorId: string; agentIds: string[] }, from: string | null, by, at): DemoState`**, applying R6:
  - **The new division:** id = slug of the name. It copies the parent's `lapsePolicy` and `graceDays` (Medications' when `from` is null) and gets `escalation { first: sponsorId, then: 'dana', afterHours: 4 }`.
  - **Its defaults:** `monitor { state: 'live', lastAt: now − 1 min }`, `exceptionsByDay` of zeros.
  - **Roles:** for owner and sponsor; for the moved agents' technical owners; and for the parent's frontline people.
  - **Moves:** agents (`divisionId`, `ownerId`), and their open items owned by the old owner (old owner copied).
- **Store:** `createDivision(input, from?: string): ActionResult`, with permission `manageDivisions`. Refused:
  - a name that is empty or already used ("Name the division" / "A division with that name exists")
  - no owner ("Choose an owner")
  - for a split, no agents ("Choose the agents to move")
- **Modal "Split Medications"** ("New division" when not splitting):
  - Fields: Name; Division owner; Clinical sponsor (default the parent's).
  - "Agents to move": checkboxes listing the parent's agents with their activity count, most first.
  - Live line: "Marcus keeps 14 activities · Elena takes 8" (counted).
  - Buttons: "Create division and move N agents" / "Create division", and Cancel.
  - Focus and keyboard follow `Modal`'s rules.
  - "Suggest a split" on 2a (Phase 5) lands on 8a. `?split=1` opens the modal.

- [x] **Step 1: Failing tests**
  - **`settings.test.ts`:**
    - **The split:** `applyCreateDivision({ name: 'Medications · surgical', ownerId: 'elena', sponsorId: 'priya', agentIds: [3 ids] }, 'medications')`:
      - makes 6 divisions
      - moves the 3 agents with owner `elena`
      - adds elena/owner and sam/techOwner roles there
      - `can(s, 'sam', 'revokeTool', { agentId: moved })` is true
    - **Refusals:** an empty agent list in split mode, and a duplicate name, are refused with state unchanged.
  - **Selector:** the modal's live line counts spans for the ticked agents.
  - **e2e:** as Dana on `/settings/divisions/medications?split=1`, name the division, choose Elena, tick two agents and create. `/operations` shows "All · 6", and the new division's tile lists 2 agents.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement.** Check that the board's tile grid and the wall display take a sixth division without breaking.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(settings): new division and split"`.

### Task 6.3: People and roles (8b); roles decide scope

**Files:**
- Modify:
  - `src/store/{permissions,settings,index}.ts`
  - `src/store/permissions.test.ts`
  - `src/data/seed/people.ts`
  - `src/app/router.tsx`
- Create:
  - `src/features/settings/PeoplePage.tsx`
  - `src/features/settings/InviteModal.tsx`
- Tests:
  - `src/store/permissions.test.ts`
  - `src/store/settings.test.ts`
  - `src/features/settings/selectors.test.ts`
  - `tests/e2e/settings.spec.ts`

**Interfaces (Produces):**
- **Permissions (R7):**
  - The `'ownAgents'` check becomes: the person holds `techOwner` in the agent's division (the assignment loop already matched it), **or** `agent.techOwnerId === personaId` with any `techOwner` assignment.
  - `pause` gains `techOwner: 'ownAgents'`.
  - The table-driven test is updated: Sam may pause Med Rec, not Prior Auth.
- **`src/store/settings.ts`:**
  - `applyAddRole(s, personId, { role, divisionId }, at)`: adds `{ personId, divisionId, role, since: at }`. Hospital-wide roles (`programLead`, `committee`, `readOnly`) always use `divisionId: 'all'`.
  - `applyRemoveRole(s, personId, { role, divisionId })`.
  - `applyInvite(s, { name, title, role, divisionId }, at)`: the id is the slug of the name; the initial is its first letter.
- **Store actions,** all with permission `manageDivisions`:
  - `addRole(personId, { role, divisionId })`, refused for a duplicate ("Sam already has that role in Discharge").
  - `removeRole(personId, { role, divisionId })`, refused for:
    - the last program lead ("Lakeshore needs a program lead")
    - a division's named owner or sponsor ("Marcus is Medications' division owner. Choose another owner in Division settings first.")
  - `invitePerson(input)`, refused without a name.
- **Selector `selectPeople(s, selectedId, adding?: { role; divisionId })`:**
  - **Header:** title "People and roles", sub "What you can do comes from your role in a division", action "Invite".
  - **Table** (PERSON, ROLE, DIVISION, CAN), rows in R8's order:
    - ROLE is the role label; several labels are joined with ", ".
    - DIVISION is the division names joined, or "All divisions" / "—".
    - CAN is the summary of the person's first role, verbatim from 8b:
      - Program lead: "Everything, including disable and retire"
      - Committee: "Committee decisions"
      - Read only: "Read only · opens incidents"
      - Sponsor: "Signs privileges · approves resume"
      - Owner: "Supervises · pauses · requests resume"
      - Technical owner: "Tools · hard stops · pauses"
      - Frontline: "Works in Epic · no console access"
    - Role labels: AI program lead, AI review board chair, Risk manager, Clinical sponsor, Agent owner, Technical owner, Pharmacist.
  - **Side panel:**
    - name and title
    - ROLES rows, e.g. "Technical owner · Medications" with "since Mar 2026", and a "Remove" link
    - "Add a role": role select, division select, "Add role" / "Cancel"
    - "AS TECHNICAL OWNER, SAM CAN": nine lines (R8), each with `ok: boolean`, computed by `can()` on a copy of the state with the chosen role added:
      - Grant and revoke tools (`configureTools`, `revokeTool`)
      - Write and test hard stops (`configureTools`)
      - Pause, return an activity to Shadow (`pause`, `returnToShadow`)
      - Sign privileges (`signPrivilege`)
      - Approve a resume (`resume`)
      - Disable or retire agents (`disable`, `retire`)
      - Edit job descriptions (`editJobDescription`)
      - Decide go-live in committee (`approveGoLive`)
      - Manage divisions and roles (`manageDivisions`)
  - **Read-only mode:** without `manageDivisions`, the form and the Remove links are absent, and "Invite" is locked.
  - `/settings/people?person=sam` selects a person (default the first row).
- **Invite modal:** Name, Title, Role, Division → "Send invite". The new person appears in the table.

- [x] **Step 1: Failing tests**
  - **`permissions.test.ts`:**
    - Sam can't `revokeTool` on `discharge-meds`.
    - After `applyAddRole(sam, techOwner, discharge)` he can, and still can't on `prior-auth`.
    - After `applyRemoveRole`, he can't again.
    - Sam can `pause` med-rec.
    - Lena, the technical owner of a Medications draft agent, can `configureTools` on it.
  - **`settings.test.ts`:**
    - `removeRole(dana, programLead, all)` is refused.
    - `removeRole(marcus, owner, medications)` is refused with the owner message.
    - A duplicate `addRole` is refused.
    - `invitePerson` adds a person and a role.
  - **Selector:**
    - The baseline table has 16 rows in R8's order (first 6: Dana, Dr. Lee, Jordan, Priya, Marcus, Sam).
    - Sam's panel with Technical owner · Discharge chosen ticks exactly the first three lines.
  - **e2e:**
    - As Dana, `/settings/people?person=sam` → Add a role → Technical owner, Discharge → Add role. The roles list shows "Technical owner · Discharge".
    - Then as Sam, `/operations/agents/discharge-meds` → Controls → "Revoke a tool…" is enabled.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 8b.
- [x] **Step 4: Run.** Expected: PASS. Earlier permission e2e (6a for Marcus, 6c for Sam) is still green.
- [x] **Step 5: Commit** with `git commit -m "feat(settings): people and roles decide what each person can do"`.

### Task 6.4: The Epic stand-in and a flag in one action (10a)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,actions}.ts`
  - `src/store/{index,permissions}.ts`
  - `src/features/inbox/{selectors.ts,ExceptionDetail.tsx}`
  - `src/app/router.tsx`
- Create:
  - `src/data/seed/feedback.ts`
  - `src/store/feedback.ts`
  - `src/features/epic/{EpicPage,EhrStandIn,AgentPanel,FlagForm}.tsx`
  - `src/features/epic/{selectors.ts,epic.module.css}`
- Tests:
  - `src/store/feedback.test.ts`
  - `src/features/epic/selectors.test.ts`
  - `src/data/seed/seed.test.ts`
  - `tests/e2e/epic.spec.ts`

**Interfaces (Produces):**
- **Types:**
  - `EpicDraft`:
    ```
    { id: string                       // 'DR-88412'
      agentId: string; build: string; draftedAt: string
      patient: { name: string; age: number; sex: 'F' | 'M'; mrn: string; unit: string; bed: string;
                 allergy: string; admittedAt: string }
      lines: { med: string; dose: string; route: string; frequency: string; lastTaken: string; source: string;
               edit?: { field: 'frequency' | 'dose'; from: string; to: string; by: string } }[]
      sources: string; did: string; actionId: string }
    ```
  - `FlagReason = 'frequency' | 'dose' | 'missed' | 'duplicate' | 'other'`.
  - `Flag`:
    ```
    { id: string; code: string         // 'fb-2291', 'FB-2291'
      draftId: string; agentId: string; byId?: string; byName: string; unit: string; at: string
      reason: FlagReason; title: string; note?: string
      edit?: { med: string; field: string; from: string; to: string }
      status: 'sent' | 'inProgress' | 'fixed' | 'notDefect'
      progress?: string; notDefect?: string; fixedIn?: string; fixedAt?: string
      reply?: { by: string; text: string; at: string }; seenFixAt?: string; exceptionId?: string }
    ```
  - `DemoState` gains `epicDrafts: EpicDraft[]` and `flags: Flag[]`.
- **Seed (`feedback.ts`), using R1's `fromMarch(-99)`:**
  - **DR-88412:**
    - patient: Harper, Lillian · 78 y · F · MRN 00412873 · 7 West · 712-B · "Allergy: penicillin"; admitted 08 Dec 06:40; drafted 09:32 by v1.3.0
    - the six lines of 10a, with dates shifted (outside fill 02 Mar → 23 Nov, 28 Feb → 21 Nov, Epic list 11 Jan → 04 Oct, 09 Feb → 02 Nov, last taken 16/17 Mar → 07/08 Dec)
    - line 1's edit: frequency "every 12 h + BID" → "BID", by Ana
    - sources: "Outside pharmacy fills · Epic home med list · admission interview note"
    - did: "Matched 6 medications, marked 1 possible duplicate, changed no doses (HS-04)"
    - `actionId` points to a new action (an unused ACT code below ACT-88213, e.g. ACT-88205) with read, match, duplicate and HS-04-passed steps.
  - **Flags:**
    - FB-2277: Ana, "Duplicate apixaban line", `notDefect` "Two fills from different pharmacies; the agent listed both and marked the duplicate for you.", 20 Nov
    - FB-2286: Ana, "Missed eye drops from an outside record", on DR-89802 (6 North, evening), `inProgress` "Adding Pyxis dispense history as a source", 03 Dec
    - five frequency-split flags by other pharmacists on 7 West and 8 East (FB-2283, FB-2284, FB-2287, FB-2289, FB-2290), each `inProgress` "Sam is changing how the frequency is read", 05–08 Dec
    - None of these has an open inbox item.
- **Permission:** `flagDraft: { frontline: 'own' }`. `lockReason('flagDraft')` is "Pharmacists flag drafts from Epic".
- **`src/store/feedback.ts`:**
  - `reasonFromEdit(edit): FlagReason`: frequency → `frequency`, dose → `dose`, else `other`.
  - `flagTitle(reason, med, note?)`.
  - `nextFlagCode(s)`.
  - `applyFlag(s, { draftId, reason, note? }, byId, at)` creates the flag:
    - its edit is the draft's edit by that person
    - the unit comes from the patient
    - it raises an inbox item `kind: 'flag'`, `status: 'review'`, type "Flag from Epic", `ruleTag` = the code
    - reason "Ana R. flagged DR-88412: Frequency wrong · Metoprolol tartrate 25 mg · every 12 h + BID → BID"
    - action "answer Ana's flag"; owner = the agent owner; copied none; route 'inbox'; the default deadline
  - `applyFlagAnswer(s, exceptionId, { kind: 'inProgress' | 'notDefect' | 'reply'; text }, by, at)`:
    - `inProgress` and `notDefect` set the flag status and resolve the item (outcome "Working on a fix" / "Not a defect").
    - `reply` sets `reply` and leaves the item open.
- **Store actions:**
  - `flagDraft(draftId, { reason, note? })`. Permission `flagDraft`. Refused: an unknown draft; "You already flagged this draft".
  - `answerFlag(exceptionId, input)`. Permission `resolveException`. Refused: an empty text ("Write a note for Ana" / "Say why it isn't a defect").
- **Selector `selectEpic(s, viewerId)`:**
  - the latest `EpicDraft` with `draftedAt <= now`
  - the EHR header and the table rows (edited cells show the struck value, the new value and "edited by you" when the viewer made the edit)
  - **Panel:**
    - "Med Rec Agent" with `build`, and "Draft for this admission · DR-88412 · 09:32"
    - Sources, "What it did", "Your edits": "1 · metoprolol frequency"
    - buttons "Flag a problem" (or "Flagged · FB-2291") and "View trace"
  - **The flag form:**
    - "Flag this draft to Marcus"
    - "YOUR EDIT IS ATTACHED" with "Metoprolol tartrate 25 mg · frequency" and "every 12 h + BID → BID"
    - "WHAT WENT WRONG" chips: Frequency wrong, Wrong dose, Missed medication, Duplicate, Other. The edit's reason is preselected, with "Picked from your edit. Change it if it's wrong."
    - "Add a note (optional)", "Send flag" / "Cancel"
    - "Sends the draft, your edit and the agent's trace to Marcus's inbox. You stay in Epic."
  - **After sending:** "Flag FB-2291 sent to Marcus. You'll see here when it leads to a fix." (R19).
  - **"Your flags · N":** the viewer's flags in the last 30 days, ordered fixed, in progress, sent, not a defect. Labels: "Fixed in v1.5.0", "In progress · Marcus" with the progress note, "Sent · Marcus", "Not a defect" with the reason.
  - **Read-only mode** for anyone but a frontline pharmacist: "Viewing Ana's Epic stand-in. Only pharmacists flag drafts here."
- **Inbox:** `ExceptionDetail` for `kind: 'flag'` shows:
  - the edit, the reason and the note
  - "Open trace" → `/operations/actions/<actionId>`
  - "Working on a fix…", "Not a defect…" and "Reply to Ana…" (each a short text form), plus Claim and Snooze

- [ ] **Step 1: Failing tests**
  - **`seed.test.ts`:**
    - No string anywhere in `createSeed()` or the catalogue matches `/\b\d{2} Mar\b|v1\.4\.2/`. The test walks every string field; this pins Review focus 5.
    - The flag codes are unique, and the highest is FB-2290.
  - **`feedback.test.ts`:**
    - **Flagging:** `applyFlag` as Ana on DR-88412 with `frequency` makes FB-2291, with the title "Frequency wrong · Metoprolol tartrate 25 mg". With a note, the title is the note.
    - **The inbox item:** Marcus gets a `flag` item.
    - **Refusals:** flagging again is refused; `flagDraft` as Marcus is refused.
    - **Answers:** `answerFlag` `notDefect` with empty text is refused. With text, the flag reads `notDefect` and the item is resolved.
  - **Selector:** the preselected reason is `frequency`, and "Your flags · 2" at baseline (FB-2286, FB-2277).
  - **e2e `epic.spec.ts`:**
    - Choosing Ana from the switcher lands on `/epic` with "Harper, Lillian" and no TopNav.
    - Flag a problem → Send flag → "Flag FB-2291 sent to Marcus".
    - As Marcus, the inbox shows "Flag from Epic" and Needs me · 5. Open it → Working on a fix with a note.
    - Back as Ana, FB-2291 reads "In progress · Marcus".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against 10a (neutral EHR, our panel).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(epic): flag a draft from Epic in one action"`.

### Task 6.5: New version held at the gateway (9a)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,catalogue}.ts`
  - `src/store/{index,permissions}.ts`
  - `src/data/scenarios/{index,clock}.ts`
  - `src/features/board/{AgentView.tsx,selectors.ts}`
  - `src/features/golive/ScorecardTab.tsx`
- Create:
  - `src/store/changes.ts`
  - `src/features/changes/{ChangesTab,RevalidatePanel}.tsx`
  - `src/features/changes/{selectors.ts,changes.module.css}`
- Tests:
  - `src/store/changes.test.ts`
  - `src/features/changes/selectors.test.ts`
  - `src/data/scenarios/scenarios.test.ts`
  - `tests/e2e/changes.spec.ts`

**Interfaces (Produces):**
- **Types:** `Change`:
  ```
  { id: string; agentId: string
    from: { build: string; builtAt: string; sop: string; sopAt: string }
    to: { build: string; builtAt: string; builtBy: string; sop: string }
    deployedAt: string; deployedBy: string; deadline: string           // deployedAt + 7 days
    items: { item: 'Agent build' | 'SOP' | 'Hard stop' | 'Systems'; live: string; liveSub: string;
             held: string; heldSub: string; needs: 'replay' | 'hardStop' | 'systems'; who: string }[]
    sopDiff: { section: string; title: string; removed?: string; added: string }[]
    hardStop?: { code: string; title: string; from: number; to: number; removed: string; added: string; blocked: string }
    systems?: { system: string; detail: string }
    replay: { cases: number; estimate: string; result?: { at: string; by: string; lines: string[] } }
    checks: Partial<Record<'replay' | 'hardStop' | 'systems', { at: string; by: string }>>
    releaseNote: { by: string; text: string }; fixes: string[]               // flag ids
    timeline: { at: string; title: string; sub: string }[]
    restarted: string[]                                                       // shadow activity ids
    status: 'held' | 'accepted' | 'withdrawn'; closedAt?: string; closedBy?: string }
  ```
  `DemoState` gains `changes: Change[]`. `Scorecard` gains `restartedOn?: { build: string; at: string }`.
- **Catalogue `V150`,** with R1 dates, R9 and R10:
  - builds: v1.3.0 "built 12 Oct" → v1.5.0 "built 14 Dec by Sam"; SOP v1.3.1 "signed 05 Nov" → SOP v1.5 "2 sections changed"
  - **SOP diff:**
    - §3.2 Frequency: removed "Read the frequency from the sig line as written.", added "Read the frequency from the structured frequency field. Since the Epic upgrade on 05 Dec it can be split across two lines; join them before comparing."
    - §5.1 Sources: kept "Use outside pharmacy fills and the Epic home medication list.", added "Also use Pyxis dispense history from the last 30 days."
  - **HS-04 v3:** "Applies to every Med Rec Agent activity. If a draft changes a dose or a frequency, the gateway keeps the original and flags the line for the pharmacist." Footer "Enforced at the gateway · owner Sam · approver Priya · would have blocked 0 of the last 2,104 cases".
  - **Systems:** Epic, detail "Encounter, home med list, allergies, structured sig".
  - **Replay:** 2,104 cases, "about 40 min". Result lines (invented): "Replayed 2,104 cases on v1.5.0", "Agreement 92.6 % (v1.3.0: 91.2 %)", "Frequency mismatches 0 (v1.3.0: 31)".
  - **Release note:** by Sam, "Fixes the frequency split pharmacists have flagged since the Epic upgrade."
  - **`fixesReason`:** `'frequency'`.
- **`src/store/changes.ts`:**
  - `applyDeploy(s, def, at, by)`:
    - creates the change with `fixes` = the agent's open (`sent` / `inProgress`) flags with that reason
    - writes the timeline: "v1.5.0 deployed" / "Build fingerprint differs from registered v1.3.0"; "Held at the gateway" / "Traffic stays on v1.3.0"; "Told Marcus, Priya, Dana" / `<EXC code>` (1 min later)
    - raises "Re-validation needed" for the owner (copied: sponsor and program lead) and "Review: HS-04 v3" for the sponsor, both with a link to `?tab=changes`
    - marks the shadow activities' scorecards `restartedOn`
  - `applyReplay`, `applyHardStopApproval`, `applySystemsSignOff`: each ticks its check (by, at). The replay also sets `replay.result`.
  - `applyAccept(s, changeId, by, at)`:
    - agent `version` and `sop` go to the held build
    - HS-04 goes to v3 with the new text and approval
    - the Epic grant's detail updates
    - the flags in `fixes` become `fixed` (`fixedIn: 'v1.5.0'`, `fixedAt`)
    - both items resolve; status `accepted`
  - `withdrawExpiredChanges(s)`: a `held` change past its deadline becomes `withdrawn`, and its items resolve. Idempotent; called by `advanceClock`.
- **Permission:** `revalidateChange: { owner: 'own' }` covers the replay, the systems sign-off and accepting. The HS-04 approval uses `approveTools` (sponsor).
- **Store actions:** `startReplay(changeId)`, `signOffSystems(changeId)`, `approveChangeHardStop(changeId)`, `acceptChange(changeId)`. Refused:
  - "Already done"
  - not held ("v1.5.0 is no longer held")
  - accept before all three checks ("Waiting for: Approve HS-04 v3 · Priya")
- **Selector `selectChanges(s, agentId)`:**
  - the 9a Notice: "**v1.5.0 is held at the gateway.** Sam deployed it at 09:12 today. Live traffic stays on v1.3.0 until you re-validate, so nothing from v1.5.0 reaches pharmacists before then."
  - "WHAT CHANGED · V1.3.0 → V1.5.0" (ITEM, V1.3.0 · LIVE, V1.5.0 · HELD, NEEDS)
  - "SOP V1.3.1 → V1.5", "2 sections"
  - HARD STOP with "Waiting for Priya" (teal) or "Approved · Priya"
  - **Side panel:**
    - "Re-validate v1.5.0": "Replay the last 30 days on v1.5.0 and compare every result with v1.3.0.", "Cases to replay 2,104", "Estimated time about 40 min"
    - three check rows: "Replay matches or beats v1.3.0 · Marcus", "Approve HS-04 v3 · Priya", "Sign off Epic sig read · Marcus". Each row's action is a button for its person; otherwise the name.
    - "Start replay" and "Accept v1.5.0" (locked with the waiting reason)
    - "**Withdrawn after 7 days.** If v1.5.0 isn't accepted by 22 Dec, it's removed and v1.3.0 keeps running."
  - **Effect on activities:** "Reconcile home medications at admission · Draft · stays on v1.3.0"; "Flag allergy conflicts · Shadow · scorecard restarts on v1.5.0".
  - **Sam's release note:** the text, then "FB-2291" and "and 5 more flags from 7 West and 8 East" (counted, with units from the flags).
  - **Timeline.**
  - **After acceptance** (R19): "v1.5.0 accepted by Marcus on <dd Mon HH:MM>. Every activity runs v1.5.0." with the comparison kept, read only.
- **Agent view (R11):**
  - `TABS` gains `changes` when `s.changes` has one for the agent: label "Changes · 4" while held, else "Changes". Unknown or absent → Overview.
  - **Header while held:** status "v1.5.0 held at the gateway", idLine "v1.3.0 live · AGT-0123", chip "Re-validation needed" (review), plus "Compare builds" (→ `?tab=changes`). Controls and "Open in Inventory" stay.
  - **Scorecard tab:** an activity with `restartedOn` shows a Notice "Restarted on v1.5.0 on 15 Dec. Results before it are from v1.3.0."
- **Scenario `change-detected-v150`:**
  1. baseline
  2. `applyFlag` (Ana, DR-88412, `frequency`, note "Frequency split into two lines") at 08 Dec 09:52
  3. `advanceClock` to 15 Dec 09:12
  4. `applyDeploy(V150, 09:12, 'sam')`
  5. `advanceClock` to 15 Dec 09:52
  
  Duplicate Rx is at Shadow (R4).

- [ ] **Step 1: Failing tests**
  - **`changes.test.ts`:**
    - **Deploy:** `applyDeploy` makes the change with 4 items and `fixes` holding FB-2291 and the five others. It raises the two items, and the allergy scorecard is `restartedOn`.
    - **Refusals:** accept before the checks is refused with "Waiting for: …". `approveChangeHardStop` as Marcus is refused; as Priya it passes.
    - **Accept** after all three checks:
      - Med Rec reads v1.5.0 · SOP v1.5
      - HS-04 is v3
      - the 6 flags are `fixed`
      - both items are resolved
    - **Expiry:** `advanceClock` to 22 Dec 09:13 withdraws a still-held change. After acceptance it leaves the change `accepted`.
  - **`scenarios.test.ts`:** `change-detected-v150` has now 15 Dec 09:52, PRV-0098 `lapsed`, one held change and Marcus's "Re-validation needed" item.
  - **Selector:** "and 5 more flags from 7 West and 8 East"; the effect lines read from the activities.
  - **e2e `changes.spec.ts`:**
    - As Marcus, `/operations/agents/med-rec?tab=changes&scenario=change-detected-v150` shows "v1.5.0 held at the gateway", "Changes · 4", and "Accept v1.5.0" `aria-disabled`.
    - Start replay, then Sign off.
    - As Priya, approve HS-04 v3.
    - As Marcus, Accept v1.5.0. The header idLine reads "v1.5.0 · SOP v1.5 · AGT-0123".
    - `/operations/agents/prior-auth?tab=changes` shows Overview.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against 9a.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(changes): new version held at the gateway"`.

### Task 6.6: Fixed in v1.5.0 (10b)

**Files:**
- Modify:
  - `src/data/seed/catalogue.ts`
  - `src/store/{feedback,index}.ts`
  - `src/data/scenarios/index.ts`
  - `src/features/epic/{EpicPage,AgentPanel}.tsx`
  - `src/features/epic/selectors.ts`
- Tests:
  - `src/store/feedback.test.ts`
  - `src/features/epic/selectors.test.ts`
  - `src/data/scenarios/scenarios.test.ts`
  - `tests/e2e/epic.spec.ts`

**Interfaces (Produces):**
- **Catalogue `DR_90455`:**
  - patient: Okafor, James · 66 y · M · MRN 00419920 · 8 East · 804-A · "Allergy: none known"; admitted 17 Dec 05:55; drafted 08:14 by v1.5.0
  - the five lines of 10b, shifted −99 days
  - no edits
- **`applyAddEpicDraft(s, draft)`.**
- **`applySeenFix(s, flagId, at)`;** store action `dismissFixNotice(flagId)`, permission `flagDraft`, the flag's own pharmacist only.
- **Scenario `epic-fixed-later`:**
  1. `change-detected-v150`
  2. `applyReplay` (Marcus, 15 Dec 10:20)
  3. `applySystemsSignOff` (Marcus, 10:25)
  4. `applyHardStopApproval` (Priya, 14:05)
  5. `applyAccept` (Marcus, 16 Dec 08:30)
  6. the reply on FB-2291 from Marcus: "Thanks. This caused the edit-rate jump on 7 West."
  7. `advanceClock` to 17 Dec 09:52
  8. `applyAddEpicDraft(DR_90455)`
- **`/epic?day=later`** loads `epic-fixed-later` (R15). Another `day` value is ignored, and the param is dropped either way.
- **Selector additions:**
  - **The fix card,** for the viewer's latest `fixed` flag without `seenFixAt`:
    - "Your flag led to a fix", "FB-2291 Frequency split into two lines"
    - "Fixed in v1.5.0, live since 16 Dec. 5 other pharmacists flagged the same thing." (counted from the change's `fixes`)
    - "Marcus: "Thanks. …"" when there's a reply
    - "What changed" (toggles the release note and the §3.2 line), "Dismiss"
  - **"This draft":** "Drafted by v1.5.0 · 5 medications · no edits yet" (counted).
  - **The EHR sub-line:** "Drafted by Med Rec Agent v1.5.0 at 08:14 · review each line before you verify".

- [ ] **Step 1: Failing tests**
  - **`scenarios.test.ts`:** `epic-fixed-later` has now 17 Dec 09:52, Med Rec at v1.5.0, FB-2291 `fixed` with the reply, and the change `accepted`.
  - **Selector:**
    - Ana's view shows the fix card with "5 other pharmacists" and "live since 16 Dec", and "Your flags · 3" in the order FB-2291, FB-2286, FB-2277.
    - After `applySeenFix` the card is gone and the list remains.
  - **e2e:**
    - As Ana, `/epic?day=later` shows "Okafor, James", "Your flag led to a fix" and "Fixed in v1.5.0". Dismiss hides the card.
    - `/epic?day=nope` shows today's state.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against 10b.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(epic): fixed in v1.5.0, nine days later"`.

### Task 6.7: Unregistered callers (9b)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,onboarding}.ts`
  - `src/store/{index,permissions,onboarding}.ts`
  - `src/app/{routes.ts,routes.test.ts,router.tsx}`
  - `src/features/inventory/InventoryPage.tsx`
- Create:
  - `src/data/seed/gateway.ts`
  - `src/features/gateway/{GatewayPage,GatewayRulesModal,DecisionModal}.tsx`
  - `src/features/gateway/{selectors.ts,gateway.module.css}`
- Tests:
  - `src/store/changes.test.ts` (callers)
  - `src/features/gateway/selectors.test.ts`
  - `tests/e2e/gateway.spec.ts`

**Interfaces (Produces):**
- **Types:** `GatewayCaller`:
  ```
  { id: string; name: string; credential: string; firstSeen: string; lastCall: string; calls7d: number
    reaches: string[]; likelyOwner: { name: string; sub: string } | null; does?: string
    patientData?: { flag: string; note: string }; registeredBy?: string; intakeId?: string
    group: 'unregistered' | 'lowVolume' | 'dismissed'
    decision?: { kind: 'blocked' | 'notAgent' | 'onboarding'; reason?: string; by: string; at: string; agentId?: string }
    messages: { by: string; text: string; at: string }[] }
  ```
  `DemoState` gains `callers: GatewayCaller[]`.
- **Seed (`gateway.ts`, `fromMarch(-106)`):**
  - **The three unregistered callers:**
    - **svc-dc-summary-bot:**
      - "Entra app · client 7f3a…c21", first seen 22 Nov, last call 2 min ago, 2,318 calls
      - reaches "Epic read · notes, 5 South" and "Teams write · 5 South channel"
      - likely owner K. Osei · Hospital Medicine; does "Reads discharge notes on 5 South and posts a summary to the 5 South team channel in Teams."
      - patient data "Notes leave Epic" / "Channel has 46 members"; registered by "K. Osei, Hospital Medicine, on 18 Nov"; `intakeId: 'req-0081'`
    - **ed-triage-helper:** "API key · issued to Emergency", 03 Dec, 412, "Epic read · ED tracking board", Unknown · "key owner left in Oct"
    - **rx-price-check:** "Entra app · client 22be…09d", 05 Dec, 96, "Pharmacy worklist read", R. Tan · "Pharmacy purchasing"
  - **Generated rows:** 7 low-volume and 12 dismissed (each dismissed row with a reason).
  - **REQ-0081 (R16):** "Discharge Huddle Summary Agent", Discharge, requested by Elena, sponsor Priya, approved 06 Nov.
  - **Dana's items:** one per unregistered caller: `kind: 'review'`, type "Unregistered caller", link to its page, deadline 10 Dec 17:00.
- **Permission:** `decideCaller: { programLead: 'all' }`.
- **Mutations:** `applyBlockCaller(s, id, reason, by, at)`, `applyDismissCaller(s, id, reason, by, at)`, `applyMessageOwner(s, id, text, by, at)`. Each logs to `logEvents`. Block and dismiss resolve Dana's item.
  - `applyStart` (Phase 5's `startOnboarding`) also marks any caller with that `intakeId` as `decision: onboarding` (with `agentId`) and resolves its item.
- **Store actions:** `blockCaller(id, reason)`, `dismissCaller(id, reason)`, `messageCallerOwner(id, text)`. Refused:
  - an empty reason ("Give a reason. Every choice is logged with a reason.")
  - an already-decided caller
  - no likely owner, for a message
- **Routes:**
  - Add `/inventory/unregistered` (frames 9b, phase 6), which selects the first unregistered caller.
  - The `:callerId` sample becomes `/inventory/unregistered/svc-dc-summary-bot`.
  - `routes.test.ts` `EXPECTED` is updated.
- **Selector `selectGateway(s, callerId?, tab: 'unregistered' | 'low' | 'dismissed')`:**
  - **Header:** "Inventory / Gateway", "Seen at the gateway, not registered", sub "Callers using hospital credentials to reach Epic, the pharmacy worklist, Pyxis or Teams without a registry record.", action "Gateway rules".
  - **Tabs:** "Unregistered · 3", "Low volume · 7", "Dismissed · 12" (counted; onboarding moves a caller out, a block keeps it with the chip "Blocked").
  - **The amber notice:** "**3 callers this week have no registry record.** Each could be an agent working with no owner, no review and no hard stops. Their calls are logged, not blocked, until you decide."
  - **Table:** CALLER, FIRST SEEN, CALLS · 7D, REACHES, LIKELY OWNER.
  - **Footnote:** "Found by matching gateway traffic against the registry every 15 minutes. Callers with fewer than 20 calls a week are grouped under Low volume."
  - **Detail:**
    - "Seen for 16 days · last call 2 min ago"
    - "What it does, from its traffic", "Patient data", "Registered by"
    - "Looks like": "Discharge Huddle Summary Agent · REQ-0081, intake approved 06 Nov, never onboarded"
    - "Start onboarding from REQ-0081" → `/inventory/agents/<agentId>/onboarding/intake`
    - "Message K. Osei", "Block at the gateway", the caution "**Talk to K. Osei first.** Blocking stops calls within a minute, and 5 South may rely on the summaries.", "Every choice is logged with a reason.", "Not an agent"
    - With no intake match (R19): "No intake matches this caller. Ask the owner to file one, or block it."
- **Inventory header action:** "Seen at the gateway · 3" → `/inventory/unregistered`.

- [ ] **Step 1: Failing tests**
  - **Store:**
    - `blockCaller` without a reason is refused.
    - With one, the caller is `blocked`, still listed, and Dana's item resolves.
    - `dismissCaller` moves it to Dismissed (13).
    - `startOnboarding('req-0081', …)` takes the bot off Unregistered (2).
    - As Marcus, `blockCaller` is refused.
  - **Selector:** tab counts 3 / 7 / 12; the "Looks like" line; "Seen for 16 days".
  - **e2e:**
    - As Dana, `/inventory` → "Seen at the gateway · 3" → the bot's detail → "Start onboarding from REQ-0081" lands on the intake step for "Discharge Huddle Summary Agent".
    - `/inventory/unregistered/nope` shows Not found.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual check against 9b.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(gateway): unregistered callers flagged to Dana"`.

### Task 6.8: Reviewer behaviour (11a) and drill into 6 North (11b)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,catalogue}.ts`
  - `src/store/{index,permissions}.ts`
  - `src/features/board/DivisionView.tsx`
  - `src/app/router.tsx`
- Create:
  - `src/store/reviewers.ts`
  - `src/features/board/DivisionTabs.tsx`
  - `src/features/reviewers/{ReviewersPage,UnitPage,ReadGrid,RespondCard}.tsx`
  - `src/features/reviewers/{selectors.ts,reviewers.module.css}`
- Tests:
  - `src/store/reviewers.test.ts`
  - `src/features/reviewers/selectors.test.ts`
  - `tests/e2e/reviewers.spec.ts`

**Interfaces (Produces):**
- **Catalogue `REVIEWER_STATS`** (Medications only; `fromMarch(-106)`). Per unit:
  ```
  { id, name, approved, medianSec, wasMedianSec, editRate, wasEditRate,
    misses: { found, sampled }, wasMissRate, weekly: { median: number[]; edit: number[]; missRate: number[] },
    shifts: { name, hours, approved, medianSec, editRate, misses: { found, sampled } }[],
    missList: { draft, agentId, approvedSec, shift, found, flagCode? }[], note? }
  ```
  - **6 North** is verbatim, with 12 weekly points ending 9 s / 1.3 % / 2.4 %:
    - weekly was 38 s / 5.9 % / 0.5 %
    - shifts: Days 07:00 to 15:00 (512, 22 s, 2.9 %, 0 of 52), Evenings 15:00 to 23:00 (418, 11 s, 1.1 %, 1 of 42), Nights 23:00 to 07:00 (284, 4 s, 0.4 %, 2 of 30)
    - misses: DR-90121 (Med Rec, 4 s, Night, "Kept a duplicate apixaban line from two pharmacies"), DR-89960 (Discharge Meds, 6 s, Night, "Stopped medication still on the discharge list"), DR-89802 (Med Rec, 9 s, Evening, "Missed eye drops from an outside record", FB-2286)
    - note: "**Night coverage changed on 15 Nov.** One pharmacist now covers 6 North, 6 South and ICU step-down. Approvals per night pharmacist rose from 31 to 74."
  - **7 West, 8 East, 5 South, ED observation:** 11a's row values, with invented `was` values that give the arrows, and invented shifts and one miss each.
  - **The independent check:** a random 10 % of approved lists.
- **Types:** `ReviewChange`:
  ```
  { id; unitId; option: 'sampling' | 'tighten' | 'minTime'; by; at;
    state: 'waiting' | 'signed' | 'declined'; decidedBy?; decidedAt?; reason?; until? }
  ```
  `DemoState` gains `reviewChanges: ReviewChange[]`.
- **`src/store/reviewers.ts`:**
  - `readUnit(u)`: edits falling or rising (±0.5 points), check worse or steady (`missRate` up by > 0.5 points):
    - falling + steady → "Agent improved"
    - falling + worse → "Reviewers checking less"
    - rising + steady → "Agent drifting, reviewers catching it"
    - rising + worse → "Both slipping"
    - flat → "Steady"
  - `applyProposeReviewChange(s, unitId, option, by, at)` raises "Review: sampling change · 6 North" (or "review level" / "minimum review time") for the division sponsor, with a link to the unit page.
  - `applySignReviewChange(s, id, by, at)` sets `signed`, `until` = +14 days for sampling, and resolves the item.
  - `applyDeclineReviewChange(s, id, reason, by, at)`.
  - `applyShareFinding(s, unitId, by, at)` raises an FYI (R18) "Reviewer behaviour: 6 North" for the sponsor, linking to 11a.
- **Permissions:** `proposeReviewChange: { owner: 'own', programLead: 'all' }` and `signReviewChange: { sponsor: 'own' }`.
- **Store actions:**
  - `proposeReviewChange(unitId, option)`, refused while one is waiting for that unit
  - `signReviewChange(id)`, refused unless waiting
  - `declineReviewChange(id, reason)`, refused without a reason
  - `shareReviewerFinding(unitId)`
- **Division tabs (R17):** `DivisionTabs` ("Board" → `/operations/divisions/:id`, "Reviewer behaviour" → `/operations/reviewers?division=:id`) on 4b, 11a and 11b.
- **Selector `selectReviewers(s, divisionId, weeks: 4 | 8)`:**
  - **Header:**
    - breadcrumb "Operations / Medications"
    - title "Reviewer behaviour"
    - sub "All agents in Medications · 20 Oct to 08 Dec" (4 weeks: "10 Nov to 08 Dec")
    - the scope label "All agents" and the "8 weeks" select
  - **The amber insight notice,** for the first unit reading "Reviewers checking less": 11a's text with the values from data, plus "Open 6 North" and "Raise sampling" (→ `/operations/reviewers/6-north?respond=sampling`). With no such unit: "No unit shows reviewers checking less."
  - **"6 NORTH · WEEKLY":** three cards with sparklines and start/end dates:
    - Median time to approve 9 s / was 38 s
    - Edit rate 1.3 % / was 5.9 %
    - Independent check · misses in approved lists 2.4 % / was 0.5 %, with "3 of 124 sampled · small numbers, so confirm first"
  - **"BY UNIT · LAST 4 WEEKS":** UNIT, APPROVED, TIME TO APPROVE, EDIT RATE, INDEPENDENT MISSES, READ. 6 North's READ is the amber "Checking less?". Rows link to their unit.
  - **"How to read it":** the 2×2 grid, with units placed by `readUnit`. The checking-less cell is outlined.
  - **"Independent check":**
    - "A second pharmacist re-checks a random 10 % of approved lists, blind to the first review."
    - "**By unit and shift, never by name.** This is about workload and habits, not blame."
    - "Open 6 North" and "Share with Priya"
    - a signed sampling change adds "6 North: 20 % until 22 Dec"
  - **Another division:** the empty state (R19). `?division=nope` → the persona's division.
- **Selector `selectUnit(s, unitId, viewerId)`:**
  - "Operations / Medications / Reviewer behaviour", title "6 North", sub "Approvals and the independent check · 11 Nov to 08 Dec", "All units"
  - the note; "BY SHIFT · LAST 4 WEEKS"
  - "MISSES FOUND BY THE INDEPENDENT CHECK · 3" with "All 3 corrected before discharge"
  - **Respond:**
    - the three radio cards verbatim (option 3 "Not recommended: timers get gamed and slow honest reviews")
    - "Send to Priya for sign-off"
    - "**No one is named.** The night charge pharmacist is told what changed and why."
    - `?respond=sampling` preselects the first card
  - **While waiting:** Priya sees "Sign" and "Decline…"; others see "Waiting for Priya".
  - **Signed:** "Signed by Priya · <time>. Sampling on 6 North is 20 % until 22 Dec."
- An unknown unit → NotFound.

- [ ] **Step 1: Failing tests**
  - **`reviewers.test.ts`:**
    - `readUnit` gives the five reads for the five units as 11a shows.
    - Proposing twice is refused.
    - Priya signing sets `until` 22 Dec and resolves her item.
    - Marcus signing is refused.
    - Priya proposing is refused.
  - **Selector:** the insight text reads "Median time to approve fell from 38 s to 9 s"; 4 weeks changes the sub to "10 Nov to 08 Dec".
  - **e2e `reviewers.spec.ts`:**
    - As Marcus, `/operations/divisions/medications` → Reviewer behaviour → Open 6 North → Send to Priya for sign-off.
    - As Priya, the inbox "Review: sampling change · 6 North" → Sign. The page reads "Sampling on 6 North is 20 % until 22 Dec".
    - `/operations/reviewers/nope` shows Not found.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, with the visual checks against 11a and 11b, and 4b with its new tab strip.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(reviewers): reviewer behaviour by unit and shift"`.

### Task 6.9: Journey test and checkpoint

- [ ] **Step 1: e2e journeys** (`tests/e2e/journeys.spec.ts`):
  - **"flag it where you work":**
    1. **Ana** at `/epic` sends a flag with the note "Frequency split into two lines".
    2. **Marcus** sees it in the inbox.
    3. The test loads `?scenario=change-detected-v150` (the time skip, as the Phase 8 story will).
    4. **Marcus:** Start replay, Sign off.
    5. **Priya:** Approve HS-04 v3.
    6. **Marcus:** Accept v1.5.0.
    7. **Ana** at `/epic` sees "Your flag led to a fix".
  - **"access follows accountability":**
    1. **Dana** gives Sam Technical owner · Discharge.
    2. **Sam** can revoke a Discharge Meds tool.
    3. **Dana** removes it, and Sam's control is locked again.
- [ ] **Step 2:** `pnpm check` and `pnpm e2e` green.
- [ ] **Step 3: Checkpoint** per the BUILD_PLAN protocol:
  - Push, then open the PR "Phase 6: Governance and fast follows" with `Closes #7`.
  - Run the fresh whole-branch review and apply its fixes test-first.
  - Visual QA of 8a, 8b, 9a, 9b, 10a, 10b, 11a and 11b against their scenarios; tick them in the frame tracker.
  - Write the handoff notes, then update Start here, the decision and session logs, and the PR body.
  - **STOP and ask Stefan to review.**
