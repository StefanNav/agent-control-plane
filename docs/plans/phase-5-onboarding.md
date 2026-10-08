# Phase 5: Onboarding and go-live

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent goes from an approved intake to a signed privilege (E1, E2, E3). Dana starts onboarding and names the humans. Marcus writes the job description and the systems grid. Sam tests the hard stops. Priya approves the set, or sends one row back. Dana sets the risk tier. Dr. Lee decides from one page. Marcus judges the shadow. Priya signs the move to Draft and keeps every signed delegation in view.

**Architecture:**
- **One record per agent.** `state.onboardings` holds an `Onboarding` record per agent: the job description, the systems grid, the hard-stop limits and their tests, the sponsor review, the AIMS Review (tier, packet, decision) and a history. Step marks, item counts ("6 of 13"), "waiting on" and "first missing field" are pure functions of the record (`src/features/onboarding/progress.ts`), so the wizard rail, the side panel, the Drafts tab and the inbox all agree.
- **Store actions over pure mutations.** Every onboarding change is a pure mutation in `src/store/onboarding.ts` (like `mutations.ts`), wrapped by a store action on `runAction`. Scenarios replay Med Rec's onboarding through the same mutations at the frames' times, so each frame's state is exactly what the UI would produce.
- **Time model (ruling R1).** The E1–E3 frames happen between 29 Sep and 06 Nov 2026. The demo clock is 08 Dec, and Med Rec has been at Draft since 06 Nov. So:
  - The baseline keeps Med Rec's **completed** record. Its pages show what happened, read only where it's finished.
  - The onboarding scenarios call `rewindTo(s, at)`, which turns the hospital back to how it stood at `at`. Anything dated later disappears: exceptions, actions, incidents, events, exports, pauses and intakes. Boards go calm. Then the scenario replays Med Rec's timeline up to the frame.
  - The baseline also has one live draft, **Culture Follow-up Agent** (REQ-0099, invented), so free explore at 08 Dec has an onboarding to finish and the Drafts tab (1i) has a row.
- **Catalogue vs state.** Static reference data (job templates per intake, gateway tools, the hard-stop library, tier rules) lives in `src/data/seed/catalogue.ts` and never changes. Everything a person can change lives in `DemoState`.
- **Features:**
  - `src/features/onboarding/`: wizard shell, steps 1a–1h, Drafts helpers
  - `src/features/review/`: agent record 2d, risk tier 2b, committee packet 2c
  - `src/features/golive/`: scorecard 3a, sample case 3b, sign 3c, My privileges 3d
  - Each feature has a `selectors.ts`.

**Tech stack:** as Phase 4. No new dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.3 stories that skip time, §5.5 routes, §6.1 JobDescription, IntakeRequest, ReviewPacket and ReviewDecision, §6.3 onboarding scenarios, §7 permissions, §8 frames 1a–1i, 2a–2d, 3a–3d).

**Design sources** (copy and values verbatim, except where a ruling says otherwise):
- `designs/E1 Onboarding Countersign.dc.html`: 1a, 1b, 1c, 1d (top row pairs), then 1e, 1f, 1g, 1h and 1i.
- `designs/E2 Humans and Review.dc.html`: 2a, 2b, 2c, 2d.
- `designs/E3 Shadow and Go Live.dc.html`: 3a, 3b, 3c, 3d. `SignPrivilege.dc.html` is the older 3c, superseded by E3's.
- Frames sit two per row at x = 48 and x = 1536, and are 1440 px wide. A browser emulated at 1500 × 1400 with `window.scrollTo` shows one frame at a time. Measure each frame before building it, as Phases 3 and 4 did.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- **Forms are comfortable:** 16 px body, 44 px fields (E1's header note). Monitoring screens stay 13 px.
- **Colour meanings in this phase:**
  - Indigo is only the primary action and the current step.
  - Teal is only "review waiting": the "Review: final set", "Review: risk tier", "Review: your decision", "Review: your signature" and "Review: AIMS committee" chips.
  - Amber is only the span warning and "Below target".
- **Times come from `state.now`.** A live action stamps now. Scenarios pin the frames' times.
- `SEED_VERSION` goes to **6** in Task 5.1. Later seed or `DemoState` changes in this phase stay on 6.
- **Every new store action is test-first and goes through `runAction`.** A refusal changes nothing; tests compare `dataOf` before and after.
- **Locked controls use `Button locked`,** with the reason from `lockReason` or the gating message. Never use native `disabled`.
- **Counts come from data,** for example Marcus's span, "technical owner on N agents", "All · N" in 3d and "Drafts · N". Where that changes a frame's number, record a ruling.
- **No gendered pronouns.** 1f's "when he sends it again" becomes "when Sam sends it again". 1c's "in his inbox" becomes "in Sam's inbox". 2a's "if he owns" becomes "if Marcus owns".
- Buttons whose flow lives elsewhere stay alive and link to it. Downloads link to `/reports/export?agent=<id>` (R15).
- **Every list of agents goes through `onBoard()`,** which now also excludes `onboarding` and `inReview` agents. Pages that need drafts read `state.onboardings`.

## Phase-4 facts this plan relies on

- **Inventory** (`src/features/inventory/`):
  - `selectInventory` has `drafts` from `state.onboardingDrafts`; this plan replaces them with rows derived from records.
  - `selectRecord` is the 8c record panel. Its "Open record" links to `/inventory/agents/:id`.
  - The Intake tab is composed.
- **Store:**
  - `runAction`, `can`, `lockReason`, and the pure mutations in `src/store/mutations.ts`
  - the `nextCode(codes, prefix, width)` helper there
  - `returnToShadow` drafts a v+1 privilege with id `${id}-v${n}`
- **Scenarios:** `advanceClock(s, to)` keeps live heartbeats live. `?scenario=<id>` on any URL loads a scenario once. `awaiting-signature` (Phase 2) keeps the 08 Dec clock; Task 5.11 moves it to 06 Nov.
- **Agent view:** `?tab=scorecard` renders the Phase-3 placeholder `ScorecardTab`. Header actions hide while paused or retired.
- **Inbox:** `selectInbox` and `selectExceptionDetail`. `ExceptionDetail` picks its buttons by kind. EXC-5497 is Duplicate Rx's overdue review, owned by Priya with Marcus copied.
- **Design system:**
  - `WizardSteps` (marks `done | todo | locked | review | none`)
  - `RadioCardGroup`, `Segmented`, `Select`, `Checkbox`, `Textarea`, `Input`, `Field`, `Table`, `Modal`, `Notice`, `ProgressBar`, `Sparkline`, `RuleTag`, `LogRow`, `DefinitionList`, `Button locked`, `LinkButton`
  - `PageHeader` with `steps`, `people`, `chips`, `idLine`
- **Components:** `HardStopCard`, `SystemsVerbsGrid`, `AutonomyLadder`, `PrivilegeCard`, `StatusChip`.
- **e2e:** the `viewAs(name)` pattern from `journeys.spec.ts`. Playwright won't click `aria-disabled`; assert the attribute instead.

## Rulings (record each in the BUILD_PLAN decision log when its task lands)

- **R1 Time model.** As in Architecture. `rewindTo` is the only way a scenario goes back in time.
- **R2 Drafts are real records.** 1i's other rows conflict with agents that are live at 08 Dec: Discharge Summary Agent, Referral Triage Agent, and Prior Auth (now v2.3.0). So Drafts lists real onboarding records only, and `OnboardingDraft` and `state.onboardingDrafts` are removed. In the October scenarios Drafts shows Med Rec; at baseline it shows Culture Follow-up.
- **R3 One intake screen.** 1a and 2a are one screen:
  - 1a's "Carried over from REQ-0093" table
  - then 2a's "Name the humans" fields: Division and Clinical sponsor locked from the intake, the Agent owner select with the span warning, and the Technical owner select
  - then Start onboarding, or the blocked line
  - The side panel shows 1a's "What starting does". 2a's span card is added above it when the chosen owner is over the guideline.
  - Titles come from the seed, so Marcus is "pharmacy informatics manager", as in 2a; 1a's "pharmacy operations lead" is a frame inconsistency.
- **R4 Span from data.** Marcus owns all of Medications in the seed, so the warning reads from data: "Marcus would directly supervise 22 agent activities". The card lists the six agents with the most activities, then "and N more agents · M activities". The guideline is 7.
- **R5 Technical owners.** Lena (integration analyst) is added and becomes technical owner of the 8 Discharge agents. Omar's title becomes "Clinical informatics analyst". The candidate lines count agents from data.
- **R6 Tier labels and Tier 4.**
  - Labels: Tier 1 Low, Tier 2 Moderate, Tier 3 High, Tier 4 Critical (2b). 8c's invented "Medium" is fixed. `riskTier` gains 4.
  - Tier 1 and Tier 4 effects are invented:
    - Tier 1: Shadow 7 days; no board, the sponsor's approval starts shadow; review 365 days; promotion by the Sponsor
    - Tier 4: Shadow 28 days; Full board; review 30 days; promotion by the Board
- **R7 Tier-aware committee.**
  - `approveGoLive` needs `riskTier >= 2`.
  - Tier 2 is decided by the Chair, Tier 3 and above by the full board.
  - For Tier 1 the risk-tier button reads "Set Tier 1 and start shadow", and shadow starts without a committee.
- **R8 Versions and freezing.**
  - Each saved edit (`updateJob`, `updateSystems`) bumps the record's minor version (`v0.N`). Tests and replies don't.
  - Scenarios pin the frames' versions where the replay doesn't land on them.
  - The sponsor's signature makes it v1.0 and freezes it. After that, edits are refused ("Frozen at v1.0 · with AIMS Review"). 1h's "any edit creates v1.1" isn't built.
- **R9 Hand-offs reach the inbox.** Each hand-off raises one inbox item: `kind 'review'`, `status 'review'`, with a `link` to the step:
  - "Review: final set" to the sponsor
  - "Returned: HS-11" to the person it was sent back to
  - "Review: risk tier" to Dana
  - "Review: your decision" to Dr. Lee, due on the meeting day
  - "Review: your signature" to the sponsor
  
  Doing the step resolves its item. Codes continue from the highest existing code, with a floor of EXC-5400 so a rewound October doesn't restart at EXC-0001.
- **R10 Hard stops: library or plain language.**
  - A never-list item that matches the hard-stop library takes the library's code and rule:
    - "Change a dose" → HS-04, DOSE-CHANGE-01
    - "Remove an allergy" → HS-07, ALLERGY-KEEP-02
    - "Draft for anyone but the encounter's patient" → HS-11, PT-MATCH-01
  - Anything else becomes a plain-language hard stop with the next free code (HS-12, …). It shows "Plain language · Sam confirms the wording" in place of the library rule.
  - The ORG-POL-02 line ("Sign, release or order anything") is always present and locked; it never becomes a hard stop.
  - Test results:
    - Library rules on Med Rec use the frames: 7, 2 and 0 of 1,204, and 0 of 212 on the re-test.
    - Others are derived deterministically from the text and the template's `testSample`, between 0 and 4 blocks.
- **R11 Privilege versions.**
  - The sponsor's approval drafts v1 of a privilege per activity: Shadow, `awaiting` the committee.
  - The committee decision makes v2 `active` at Shadow. It carries the conditions, and the domain gains "excluding dialysis (C3)".
  - Marcus's request drafts v3: proposed Draft, `awaiting` the sponsor. This lands on 3c's "PRV-0142 · v3" without pinning.
  - Each version is its own `Privilege`, with id `${code lowercased}-v${version}`; the seed's current ids are kept. Routes use the code (`prv-0142`) and resolve to the latest version.
  - The seed's auto-numbered privilege codes count down from PRV-0141 (skipping 0127 and 0131), so the next code in October is PRV-0142 and Med Rec's allergy one is PRV-0143.
- **R12 Review dates.** A signed privilege's review date is the signing date plus (cycle + 1) days: 06 Nov + 91 = 05 Feb, as 3c and 3d show. The cycle is the tier's privilege review.
- **R13 My privileges** lists every privilege the sponsor granted, counted from data, soonest review first, then "Showing N of N".
- **R14 One packet per meeting.** 2c's "Previous item" and "Next item" are left out; the breadcrumb "Item 3 of 5" stays.
- **R15 Downloads** ("Download PDF", "Download v1.0 as PDF", "Export scorecard", 3d "Export") link to `/reports/export?agent=<id>`, as 7d does.
- **R16 Sam's scope.** Sam's "technical only" exception scope stays "own agents": exceptions carry no technical or clinical flag. The permission matrix is unchanged.
- **R17 `awaiting-signature` at 06 Nov 09:52.** It's built by rewind and replay, which replaces Phase 2's 08 Dec compromise.
- **R18 Seed corrections:**
  - RET-06 is re-dated to 18 Sep, so no retirement falls inside the onboarding window.
  - PRV-0142 is granted 06 Nov 09:52 (3c's signing line), with evidence "21-day shadow · 1,118 cases · 2 of 3 targets met".
  - Medications grant dates come from 3d where shown (Duplicate Rx 01 Sep, Med Shortage 23 Sep, Controlled Drug 10 Oct, Allergy Recon 16 Oct, Renal Dosing 30 Oct, Discharge Meds 14 Nov), otherwise the review date minus 91 days.
  - Hard stops HS-04, HS-07 and HS-11 are approved by Priya at 07 Oct 16:02.
  - EXC-5497 copies Dana (3d: "Marcus and Dana are copied").
- **R19 The agent view of a draft.** `/operations/agents/:id` for an `onboarding` or `inReview` agent shows a composed page: the header, a Notice ("Onboarding · draft. It can't act until AIMS Review approves it and a privilege is signed.") and "Open onboarding". It isn't a NotFound.

## Review focus

The failure modes most likely to bite a visitor that no screen test naturally covers. Each has a pinned test in the task named.

1. **Edits after hand-off don't reset the review.** Marcus edits the job while Priya's "Review: final set" is waiting: her review must reset, her inbox item must close, and the rail must say "reset, opens when you send". Editing a frozen v1.0 record must be refused. Pinned in Task 5.6.
2. **Gates bypassed by calling the action directly.** Each of these is refused with a reason, and nothing changes:
   - sending to Priya with items open
   - approving an incomplete set
   - setting a non-suggested tier without a reason
   - a decision without a reason, or "Approve with conditions" with none
   - signing below target without a reason, or without ticking the accountability box
   - starting onboarding without a technical owner
   
   Pinned in Tasks 5.2, 5.5, 5.6, 5.8, 5.9 and 5.11.
3. **The wrong person, or the wrong tier.** Each of these is refused:
   - Sam edits the job
   - Marcus approves the set
   - Priya sets the tier
   - Dr. Lee decides a Tier 1 agent
   - Marcus signs a privilege
   - Jordan does anything
   
   Pinned in Tasks 5.2, 5.6, 5.8, 5.9 and 5.11, and in the permissions table test.
4. **Unknown or out-of-order URLs.** Each shows NotFound:
   - `/inventory/agents/nope/onboarding/job`
   - `/inventory/agents/med-rec/onboarding/nope`
   - `/portfolio/reviews/nope`
   - `/inventory/privileges/nope/sign`
   - `/operations/agents/med-rec/cases/nope`
   
   Opening a later step before onboarding starts shows that step locked with "Starts when Dana starts onboarding", never a crash. Opening the packet before it's built says "The packet is built when Dana sets the risk tier." Pinned in Tasks 5.2, 5.9, 5.10 and 5.11.
5. **Rewind leaks.** In an October scenario:
   - nothing dated after `now` shows anywhere: no December exceptions, actions, incidents, exports or pauses
   - the boards are calm, and Med Rec is off every board
   - Inventory says "Agents · 40"
   - the inbox holds only onboarding items
   
   Pinned in Task 5.1 (`rewindTo` tests) and Task 5.2 (e2e on the board in `onboarding-intake`).

---

### Task 5.1: Data model, catalogue, progress and rewind (seed v6)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,agents,people,privileges,policies,exceptions,inventory,actions}.ts`
  - `src/features/board/selectors.ts` (`onBoard`)
  - `src/features/inventory/{selectors,InventoryPage}.tsx?` (drafts from records)
- Create:
  - `src/data/seed/catalogue.ts`
  - `src/data/seed/onboarding.ts` (Med Rec's completed record, the Culture Follow-up draft, intakes)
  - `src/data/seed/scorecards.ts` (Task 5.10 fills it; create the empty export here)
  - `src/features/onboarding/progress.ts`
  - `src/data/scenarios/rewind.ts`
- Tests:
  - `src/data/seed/seed.test.ts`
  - `src/features/onboarding/progress.test.ts`
  - `src/data/scenarios/rewind.test.ts`
  - `src/features/inventory/selectors.test.ts`

**Interfaces (Produces):**
- **Types:**
  - `Tier = 1 | 2 | 3 | 4`; `Agent.riskTier: Tier`.
  - `IntakeRequest` gains:
    - `agentId` and `agentCode` (reserved at approval, e.g. 'med-rec', 'AGT-0123')
    - `agentName`, `purpose`, `domain: Domain`, `condition?: { text, at }`
    - `patientImpact` and `volume` (2b findings)
    - `startedAt?`
  - `Domain = { units: string[]; patients: string; hours: string }`.
  - `JobDraft`:
    ```
    { purpose: string,
      activities: { id: string; name: string; branch: string }[],
      never: string[],
      actingFor: string | null,
      escalation: string[],
      targets: Record<string, number | null>,
      domain: Domain }
    ```
  - `OnboardingGrant`:
    ```
    { system: string; verb: Verb; activity: string | null; why: string; added: string }
    ```
    `activity: null` means it still needs one (1c "choose activity").
  - `Limit`:
    ```
    { code: string; version: number; title: string; text: string; from: string;
      library?: string; ownerId: string;
      test?: { at: string; by: string; blocked: number; of: number; cases?: string;
               examples: { date: string; unit: string; text: string; trace: string }[] };
      reopened?: { by: string; at: string } }
    ```
  - `SponsorReview`:
    ```
    { state: 'notSent' | 'waiting' | 'returned' | 'signed'; round: number;
      sentAt?: string; sentBy?: string;
      returned?: { to: string; about?: string; note: string; at: string;
                   reply?: { text: string; at: string } };
      signedAt?: string; earlier: string[] }
    ```
    `earlier` holds notes from past rounds, for 1h's "Signed after one round of changes…".
  - `Condition`:
    ```
    { id: string; text: string; appliesTo: string; activityIds: string[];
      checkedBy: string; domainNote?: string }
    ```
  - `ReviewDecision`:
    ```
    { kind: 'approve' | 'approveWithConditions' | 'reReview' | 'deny';
      conditions: Condition[]; reason: string; by: string; at: string; present?: string }
    ```
  - `AimsReview`:
    ```
    { suggestedTier: Tier; tier?: Tier; tierReason?: string; tierAt?: string; tierBy?: string;
      packetAt?: string; meeting: string; agendaItem?: { item: number; of: number };
      proposedConditions: Condition[]; decision?: ReviewDecision;
      shadowFrom?: string; shadowDays: number }
    ```
  - `Onboarding`:
    ```
    { agentId, intakeId, startedAt, startedBy, version: number, savedAt, frozenAt?,
      job: JobDraft, grants: OnboardingGrant[], limits: Limit[], sponsor: SponsorReview,
      review?: AimsReview,
      done: Partial<Record<'intake' | 'job' | 'systems' | 'tools', { at: string; by: string }>>,
      history: { at: string; by: string; text: string; sub?: string }[] }
    ```
  - `AgentException` gains `link?: { label: string; to: string }`.
  - `Privilege.conditions` holds condition ids ('C1'); the cards format "C1–C3 · Dr. Lee".
  - `DemoState` drops `onboardingDrafts` and gains `onboardings: Onboarding[]`, `scorecards: Scorecard[]` and `sampleCases: SampleCase[]` (types in Task 5.10; empty arrays here).
- **Catalogue** (`catalogue.ts`):
  - `JOB_TEMPLATES: Record<intakeId, JobTemplate>`:
    ```
    { actingForOptions: string[]; actingForNote?: string; escalationSuggestions: string[];
      criteria: { id: string; label: string; direction: 'atLeast' | 'atMost' }[];
      systems: { system: string; detail: string }[];
      testSample: number; reachExtras?: string[] }
    ```
    - Med Rec's template is verbatim from 1b and 1c:
      - criteria `agreement ≥`, `omitted ≤`, `inaccurate ≤`, with 1b's labels
      - systems Epic, Pharmacy worklist, Pyxis and Microsoft Teams, with 1c's details
      - `testSample: 1204`
    - Culture Follow-up's template is invented, in the same shape.
  - `GATEWAY_TOOLS`: system × verb → tool name, from 1d:
    - `Epic·read` → `epic.medlist.read`
    - `Epic·draft` → `epic.medrec.draft`
    - `Pharmacy worklist·write` → `worklist.item.add`
    - `Pyxis·read` → `pyxis.dispense.read`
    - `Microsoft Teams·write` → `teams.message.send`
    - Worklist read has no tool of its own, so 5 tools for 6 grants, as in 1d.
  - `HARD_STOP_LIBRARY` holds the three entries of R10. Each has its 1d/1e title and text, and its Med Rec results and examples (HS-04's three TR rows verbatim).
  - `TIER_RULES: Record<Tier, { label; sub; shadowDays; board: 'None' | 'Chair' | 'Full board'; reviewDays; promotion: 'Sponsor' | 'Board' }>` holds 2b's table plus R6.
  - `ORG_POL_02 = 'ORG-POL-02'`.
  - `BOARD_MEETINGS`: Tuesdays at 15:00, namely 14 Oct, 11 Nov, 09 Dec and 13 Jan.
- **Codes** (in `src/store/mutations.ts`): `nextPrivilegeCode(s)`, the highest PRV code + 1. It's PRV-0144 at baseline, and PRV-0142 in October once Med Rec's privileges are gone (R11).
- **Progress** (`progress.ts`, pure, no store):
  - `jobFields(job, template): { id: 'purpose' | 'activities' | 'never' | 'actingFor' | 'escalation' | 'criteria' | 'domain'; label: string; done: boolean; note?: string }[]`.
    - Labels: "Activities · 2", "Never list · 4" (counting the ORG-POL-02 line) and "Success criteria · 2 of 3 targets".
  - `systemsProgress(record): { rows: { system; done: boolean; summary: string }[]; done: number; total: number }`.
    - A row is done when every granted verb has an activity. Summaries: "read, draft", "choose activity".
  - `recordItems(record, intake): { done: number; total: 13 }`. The 13 items are:
    - intake: 1
    - the 7 job fields
    - systems: 1, when every row is done
    - one per limit tested and not reopened: 3
    - sponsor signed: 1
  - `stepStates(record | null, intake, now): { id: StepId; label; sub; mark: StepMark; owner: string }[]`, for the six E1 steps.
    - Subs are verbatim per state: "Dana · ready to start", "Marcus · after start", "Marcus · 5 of 7", "Marcus · not started", "Marcus · 3 of 4", "Sam · 0 of 3", "Sam · 3 of 3 tested", "Sam · returned 07 Oct", "Priya · opens when 2–4 are done", "Priya · opens when you send", "Priya · waiting since 06 Oct", "Priya · reset, opens when you send", "Priya · signed 07 Oct", "AIMS Review · since 07 Oct" and "done 04 Oct".
    - Marks: done ✓, todo box, locked (Sponsor approval until 2–4 are done), review ring (Sponsor approval while waiting), none (not started).
  - `openStep(record, intake)` returns the first incomplete step, with `missing: string[]` ("Escalation triggers", "inaccuracy target") and `waitingOn: personId`.
  - `firstMissingField(record)` returns a field id, or null.
- **`rewindTo(s, at): DemoState`** (mutates and returns the draft):
  - `now = at`.
  - It drops `exceptions` (`raisedAt > at`), `actions` (`at`), `logEvents`, `changeEvents`, `incidents` (`openedAt`), `exports` (`at`), `resumeRequests` (`requestedAt`), `audit` (`at`), `intakeRequests` (`approvedAt`), and `privileges` granted after `at`. It also drops `onboardings` started after `at`, together with their agents.
  - Agents:
    - pauses after `at` are cleared and lifecycle goes back to `live`
    - every on-board judgment goes calm: Shadow agents `{ shadow, 'Shadow' }`, the rest `{ normal, 'Within scope' }`
    - heartbeats are `at − 1 min`
  - Divisions: the monitor is live at `at − 1 min`; `page`, `incidentId`, `note` and `resumeNeeds` are deleted; `exceptionsByDay` is all zeros.
  - A privilege in state `due` whose review date is after `at` becomes `active`.
  - `stats24h.lastHour` is zeros.
- **`onBoard(a)`** is false for `retired`, `onboarding` and `inReview`.
- **`selectInventory`** builds drafts from the `state.onboardings` that aren't frozen:
  ```
  { id, agentId, name, division, request, step: '2 · Job description',
    stepSub: 'Escalation triggers, inaccuracy target', waitingOn: 'Marcus · you' | 'Sam',
    waitingOnId, progress: '6 of 13', lastChange: '03 Oct 16:42', mine: boolean }
  ```
  `counts.drafts` counts them.

**Seed facts:**
- **REQ-0093:**
  - approved 2026-09-29T11:00, requested by Priya
  - purpose and domain from 1a
  - condition "21-day shadow before any Draft privilege" at 29 Sep
  - `patientImpact` and `volume` from 2b
  - `startedAt` 2026-10-01T09:12
  - reserved med-rec / AGT-0123
- **Med Rec's completed record** (`onboardings[0]`):
  - Job: the values every frame shows (1b and 1e).
  - Grants and reasons from 1c.
  - Limits HS-04, HS-07 and HS-11 v1, with tests from 1d. HS-11 has the re-test "0 of 212", cases "01–30 Sep · 8 East · transfers in".
  - Sponsor: signed 2026-10-07T16:02, round 2, with `earlier` holding Priya's 1f note.
  - `done` dates: intake 01 Oct, job 04 Oct, systems 05 Oct, tools 07 Oct.
  - version 10, frozen 07 Oct 16:02.
  - Review:
    - suggested 2, tier 3 with 2b's reason, at 13 Oct, by Dana
    - packet built 13 Oct; meeting 2026-10-14T15:00; item 3 of 5
    - C1–C3 verbatim from 2c and 2d
    - decision `approveWithConditions` with 2c's reason, at 2026-10-14T16:20, "5 of 7 board members present"
    - shadowFrom 2026-10-15, shadowDays 21
  - History: the rows of 2d's decision log and 1e's "Who did what".
- **Culture Follow-up Agent:**
  - REQ-0099, approved 26 Nov, requested by Priya
  - reserved `culture-followup` / AGT-0184
  - started 30 Nov 10:00 by Dana; owner Marcus, technical owner Sam
  - job at 3 of 7: purpose, 1 activity ("Follow up positive cultures after discharge", adverse branch none) and domain done
  - saved 2026-12-07T15:30 at v0.3
  - an Agent with lifecycle `onboarding`
- **Intakes:** REQ-0106 and REQ-0108 stay, and gain reserved ids, codes (AGT-0185 and AGT-0186), purpose, domain and template.
- **Privileges:**
  - PRV-0142 v3 (active Draft), granted 06 Nov 09:52, conditions `['C1','C2','C3']`, domain "7 West, 8 East · adults 18+ · excluding dialysis (C3)"
  - PRV-0143 v2 (active Shadow, allergy), conditions `['C1','C3']`
  - auto codes count down from 0141
  - grant dates per R18
- People Lena (R5) and Omar's title. Discharge agents' `techOwnerId` becomes `lena`. Lena gets the discharge `techOwner` role, and Omar loses it.
- Tiers: `riskTier` unchanged except where 8c says otherwise. `TIER` labels come from `TIER_RULES`.

- [x] **Step 1: Failing tests**
  - **Seed:**
    - `SEED_VERSION` is 6.
    - Every intake reserves a unique agent id and code. No reserved code collides with an existing agent's code, except a started intake's own agent.
    - Med Rec's record is frozen at version 10, and `recordItems` is 13 of 13.
    - Culture Follow-up's record is 4 of 13, waiting on Marcus, open step 2 with missing "Never list, Acting for, Escalation triggers, Success criteria".
    - Next privilege code is PRV-0144. In `rewindTo(seed, 01 Oct)` with Med Rec's privileges removed, it's PRV-0142.
    - No retirement is after 2026-09-29.
    - EXC-5497 copies `['marcus', 'dana']`.
  - **Progress:** build Med Rec's record at 1b's content (job without escalation, inaccuracy null) and check:
    - `jobFields` done count is 5; "Success criteria · 2 of 3 targets"
    - `recordItems` is 6 of 13
    - `stepStates` subs are `['Dana · done 01 Oct', 'Marcus · 5 of 7', 'Marcus · not started', 'Sam · 0 of 3', 'Priya · opens when 2–4 are done', 'AIMS Review']`
    - `firstMissingField` is 'escalation'
  - **Rewind (Review focus 5):** `rewindTo(seed, '2026-10-04T08:41:00')` gives:
    - no exceptions, actions, incidents or exports
    - Controlled Drug and Prior Auth live and calm
    - Formulary Swap heartbeat at 08:40
    - Medications `exceptionsByDay` all zeros
    - the intakes from December gone
    - Duplicate Rx's privilege `active`
  - **Board:** `onBoard` is false for an `onboarding` agent. Baseline `selectDivisionSummaries` still totals 41 agents, with Culture Follow-up excluded.
  - **Inventory:** baseline drafts is one row: Culture Follow-up, "2 · Job description", waiting on "Marcus", "4 of 13". `counts.drafts` is 1.
- [x] **Step 2: Run** `pnpm test`. Expected: FAIL.
- [x] **Step 3: Implement.**
  - Update every Phase 2–4 test that pinned the seed facts changed here (Medium → Moderate, the drafts count, Omar's discharge role), and ledger each.
  - The Drafts tab renders the new rows. Its visual check is in Task 5.3.
- [x] **Step 4: Run** `pnpm check`. Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(data): onboarding records, catalogue, rewind and seed v6"`.

### Task 5.2: Wizard shell, start from intake and name the humans (1a, 2a)

**Files:**
- Create:
  - `src/store/onboarding.ts` (pure mutations)
  - `src/features/onboarding/{OnboardingPage.tsx,Rail.tsx,IntakeStep.tsx,SidePanel.tsx,selectors.ts,onboarding.module.css}`
  - `src/data/scenarios/onboarding.ts` (Med Rec's timeline and the stage builders)
- Modify:
  - `src/store/{index,permissions}.ts`
  - `src/data/scenarios/index.ts`
  - `src/app/router.tsx`
  - `src/features/board/AgentView.tsx` (R19)
  - `src/features/inventory/InventoryPage.tsx` (Intake rows link to their intake page)
- Tests:
  - `src/store/store.test.ts`
  - `src/features/onboarding/selectors.test.ts`
  - `src/data/scenarios/scenarios.test.ts`
  - `tests/e2e/onboarding.spec.ts`

**Interfaces:**
- **Route `/inventory/agents/:agentId/onboarding/:step`.** The steps are `intake | job | systems | tools | approval | review`.
  - The page resolves the agent, or the not-yet-started intake that reserves `agentId`. Anything else is NotFound, and so is an unknown step (Review focus 4).
  - Before onboarding starts, steps 2–6 render their panel locked with "Starts when Dana starts onboarding" (the program lead's name).
- **Shell (1b's header):**
  - Breadcrumb: "Inventory / Agents / <name>", or "Inventory / Intake / REQ-0093" before start.
  - Title.
  - Status:
    - "Onboarding · draft", "Onboarding · waiting for sponsor", "Onboarding · returned", "In review"
    - "Intake approved · not started" before start
  - ID line: "AGT-0123 · v0.4 · from REQ-0093", or "REQ-0093 · approved 29 Sep" before start.
  - The review chip when one is waiting.
  - People: Program lead, Owner, Technical owner, Sponsor and Division. Before start: Requested by, Program lead and Division.
  - Right side: "Autosaved 16:42" and a "History" button (a Modal of `record.history` as LogRows).
  - `WizardSteps` from `stepStates`. Selecting a step navigates to it.
- **Body:**
  - A numbered main card: "01 Start onboarding" with a sub and a right meta ("Dana" or "Marcus · 5 of 7").
  - The side panel, about 340 px.
- **Store action `startOnboarding(intakeId, { ownerId, techOwnerId }): ActionResult`.**
  - Permission `startOnboarding` with ctx `{ divisionId }`.
  - Refusals:
    - 'Choose a technical owner' when `techOwnerId` is missing
    - 'Choose an agent owner' when `ownerId` is missing
    - 'Already started'
  - Mutation `applyStart(s, intakeId, people, by, at)`:
    - creates the Agent from the intake: reserved id and code, lifecycle `onboarding`, level `shadow`, judgment `{ shadow, 'Onboarding' }`, metrics null, platform 'Epic', version 'v1.3.0', sop 'v1.3', gateway 'gw-east-2', tier 1 until set
    - creates the record at v0.1 with the job prefilled from the intake (purpose and domain), `done.intake`, `sponsor.state 'notSent'`, and history "Dana · intake"
    - sets `intake.startedAt`
  - Audit `'Started onboarding'` on the agent code.
- **Selectors:**
  - `selectIntakeStep(s, agentId)` returns:
    - the "Carried over" rows: Name, Division, Requested by ("Priya · clinical sponsor"), Purpose, Rollout domain ("7 West, 8 East · adults 18+ · all hours"), Committee condition with its date
    - the owner options: people with an owner role in the division, plus the division owner
    - the technical owner options (R5), Medications first, each with sub "<Division> · technical owner on N agents"
    - the five "What starting does" lines from 1a, with names from the selection
  - `selectSpan(s, ownerId, newActivities)` returns `{ total, guideline: 7, over: boolean, rows: { name; activities }[], more?: { agents; activities } }`. New activities count as 2 for Med Rec (the job template's expected activities) and 1 otherwise.
- **The page:**
  - Owners default to the division owner (Marcus). The technical owner starts empty (2a).
  - The blocked line reads "Blocked: technical owner not set."
  - The span warning sits under the owner select, with "Suggest a split" (a link to `/settings/divisions/<id>`) and "Choose another owner" (focuses the select).
  - "Start onboarding" has the meta "Creates AGT-0123 · v0.1 draft". After starting, the page goes to the job step.
  - After start, the intake step is a read-only summary of who started it and when.
- **Scenario `onboarding-intake`:**
  - `rewindTo(seed, '2026-10-01T09:12:00')`
  - remove Med Rec everywhere: the agent, activities, privileges, grants, hard stops, instructions, record and scorecards
  - add REQ-0093 without `startedAt`
  - `SCENARIO_IDS` gains it.
- **Timeline module.** `MED_REC_TIMELINE` is the dated list of Med Rec's onboarding steps, each a call into `src/store/onboarding.ts` with the frame's actor and time. `medRecAt(stage)` replays the timeline up to `stage` on a rewound seed. Later tasks append their steps and stages.

- [x] **Step 1: Failing tests**
  - **Store:**
    - In `onboarding-intake`, Dana with Marcus and Sam creates AGT-0123 `onboarding`. The record is v0.1, and `recordItems` is 3 of 13 (intake, purpose, domain).
    - Without Sam it's refused 'Choose a technical owner', and nothing changes.
    - Jordan is refused. Dr. Lee is refused (committee can't start onboarding).
    - A second start is refused.
  - **Selectors:**
    - `selectSpan(scenario, 'marcus', 2)` gives total 22, over, 6 rows plus more.
    - The technical owner options are `Sam`, then `Lena`, then `Omar`, with "Medications · technical owner on 19 agents".
  - **Scenario:** `onboarding-intake` has now 01 Oct 09:12, no `med-rec` agent, REQ-0093 not started, and "Agents · 40" in Inventory.
  - **e2e:**
    - `/inventory/agents/med-rec/onboarding/intake?scenario=onboarding-intake` as Dana shows "Intake approved · not started". Start onboarding is locked with "Blocked: technical owner not set." and the span warning shows.
    - Choose Sam, then Start onboarding. The URL ends `/onboarding/job`, and the rail shows "Dana · done 01 Oct".
    - `/inventory/agents/nope/onboarding/job` and `/inventory/agents/med-rec/onboarding/nope` are NotFound.
    - In `onboarding-intake`, `/inventory/agents/med-rec/onboarding/job` shows the step locked with "Starts when Dana starts onboarding" (Review focus 4).
    - The board in this scenario lists no Med Rec Agent and no paused agents (Review focus 5).
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 1a and 2a: rail cell widths and marks, the carried-over table, the field heights (44), and the side card.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(onboarding): wizard shell and start from intake"`.

### Task 5.3: Job description (1b) and the Drafts tab (1i)

**Files:**
- Create `src/features/onboarding/JobStep.tsx`.
- Modify `src/store/{index,onboarding}.ts`, `src/data/scenarios/onboarding.ts` and `src/features/inventory/InventoryPage.tsx`.
- Tests: store, progress, scenarios and `onboarding.spec.ts`.

**Interfaces:**
- **Store action `updateJob(agentId, patch: Partial<JobDraft>): ActionResult`.**
  - Permission `editJobDescription` on the agent.
  - It refuses 'Frozen at v1.0 · with AIMS Review' when frozen, and 'Not onboarding' for an agent without a record.
  - Mutation `applyJobEdit(s, agentId, patch, by, at)`:
    - merges the patch; trims and de-duplicates the lists
    - bumps the version and sets `savedAt`
    - sets `done.job` the first time all 7 fields are done, and clears it if a field becomes undone
    - resets a waiting sponsor review (Task 5.6 pins this)
  - Audit `'Edited job description'`, with the changed field labels as the reason.
- **Page (1b):**
  - "02 Job description" with its sub.
  - Each field block has a label, a help line, and "✓ Done" or "☐ Missing".
    - Purpose: a Textarea, saved on blur, with a "from REQ-0093" tag.
    - Activities: rows of name, branch and "Starts in Shadow", plus "+ Add activity" (inline Input and Add).
    - Never: rows "becomes HS-04" (from R10's library match, else "becomes a plain-language hard stop"), the locked "Sign, release or order anything · already locked by ORG-POL-02", and a composed "+ Add a never item".
    - Acting for: a Select from the template, with the help "Today that's Ana R. and 4 other pharmacists on 7 West and 8 East."
    - Escalation triggers: an Input ("e.g. Home list and fill history disagree on a medication"), Enter adds it, the template's suggestion chips, and remove buttons on the added rows.
    - Success criteria: a table of Criterion, "at least"/"at most" and a numeric Input with "%". A null target shows "☐ Needs a number".
    - Rollout domain: Units chips with "+ Add unit" (a Select of 6 North, 7 West, 8 East, 5 South), and Patients and Hours chips.
  - **Welcome back.** When the viewer is `waitingOn`, the record's `savedAt` is on an earlier day than now, and the job isn't done, show:
    - "Welcome back, Marcus"
    - "You left this draft on 03 Oct at 16:42 with 5 of 7 fields done. It's open at the first missing one, Escalation triggers."
    - "Autosaved 16:42 · v0.4"
  - **`?field=<id>`** scrolls to that field and focuses it; the side checklist row is highlighted. Without `?field`, the first missing field is focused when the welcome notice shows.
  - **Side panel (1b):**
    - "Job description · 5 of 7"
    - "6 of 13 items done across the record", with a ProgressBar
    - the checklist rows from `jobFields`; each is a link that sets `?field`
    - "ALSO NEEDED BEFORE PRIYA": "Systems and verbs · Marcus" and "3 hard stops · Sam" (from the limits count)
    - "Send to Priya for approval" locked
    - "Blocked: 7 items left. Next for you: Escalation triggers, inaccuracy target." The two are links to the fields.
  - Read-only viewers (Sam, Dr. Lee, Jordan) see the same page with the inputs read only and no add buttons.
- **Drafts tab (1i):**
  - Header actions: "Approved intake · N" (a link to `?tab=intake`).
  - The tab sub: "Agents being onboarded · everything autosaves · reopening lands on the first missing item".
  - A Segmented control "Waiting on me · N | All · N".
  - Table columns: AGENT (name and division), FROM, OPEN STEP (step and missing items), WAITING ON ("Marcus · you"), PROGRESS, LAST CHANGE, and the action. The action is "Continue" (primary) when it's waiting on the viewer, which goes to `…/onboarding/<step>?field=<first missing>`; otherwise "Open".
  - Footnote: "Drafts can't act. They leave this list when the committee approves them, or when Dana withdraws the intake."
  - The Intake tab rows gain "Open" to the intake page.
- **Scenario `onboarding-at-5-of-7`** (`medRecAt('job-5-of-7')`):
  - start at 01 Oct 09:12
  - `applyJobEdit` 02 Oct 10:30 (activities)
  - 02 Oct 15:05 (never)
  - 03 Oct 16:42 (acting for, targets 90 and 3), which is v0.4
  - now 2026-10-04T08:41, persona unchanged

- [x] **Step 1: Failing tests**
  - **Store:**
    - In `onboarding-at-5-of-7`, Marcus adds three escalation triggers and sets inaccuracy 2. The job is done on 04 Oct, the version is v0.5, and the audit entry is written.
    - Sam's `updateJob` is refused (Review focus 3). Jordan's is refused.
    - In baseline, `updateJob('med-rec', …)` is refused 'Frozen at v1.0 · with AIMS Review'.
  - **Progress:** after Marcus's edits, `stepStates[1].sub` is 'Marcus · done 04 Oct' and `recordItems` is 8 of 13.
  - **e2e:**
    - As Marcus in `onboarding-at-5-of-7`, `/inventory?tab=drafts` shows "Waiting on me · 1" and the Med Rec row "Escalation triggers, inaccuracy target". Continue lands on `/onboarding/job?field=escalation`, with "Welcome back, Marcus" and the escalation input focused.
    - Add "Patient on dialysis" from the chips, then type 2 in Inaccurate lines. The side panel shows "Job description · 7 of 7".
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 1b (field blocks, chips, criteria table, side checklist) and 1i (with the at-5-of-7 scenario; compare the Med Rec row).
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(onboarding): job description and drafts"`.

### Task 5.4: Systems and verbs (1c)

**Files:**
- Create `src/features/onboarding/SystemsStep.tsx`.
- Modify `src/store/{index,onboarding}.ts` and `src/data/scenarios/onboarding.ts`.
- Tests: store, progress and `onboarding.spec.ts`.

**Interfaces:**
- **Store action `updateSystems(agentId, change)`**, where `change` is:
  ```
  { kind: 'grant'; system: string; verb: Verb; on: boolean }
  | { kind: 'reason'; system: string; verb: Verb; activity: string; why?: string }
  ```
  - Permission `editJobDescription`.
  - It refuses `sign` and `order` with 'Locked for every agent by ORG-POL-02', a frozen record, and a reason for an ungranted cell.
  - Mutation `applySystemsEdit`:
    - Granting adds `{ activity: null, why: '' }` with `added = now`.
    - Un-granting removes it.
    - A reason sets `activity` and `why`. `why` defaults to the option's text.
    - It bumps the version, and sets or clears `done.systems` by `systemsProgress`.
  - Audit `'Edited systems and verbs'`.
- **Grid (1c):**
  - Columns SYSTEM, READ, DRAFT, WRITE, SUBMIT, 🔒 SIGN, 🔒 ORDER, with Checkbox cells.
  - Sign and Order are shaded and locked, with the footnote "Sign and order are locked for every agent by ORG-POL-02".
  - A granted cell without an activity has 1c's dark changed ring. Its row is the selected (indigo) row.
  - Rows come from the template's systems; nothing is granted until Marcus ticks it. The sub "Everything starts read only." is kept as the frame's copy.
- **WHY EACH GRANT:**
  - Rows are "Epic · read" with its text, in grid order.
  - An unexplained grant shows "new" and a Select. Its options are the job's activities, "Both activities" (or "All N activities") and "Escalation: tell the pharmacist why the case was handed over". The placeholder is "Choose the activity it serves".
- **REACH IN ONE LINE,** built by `reachLine(grants)`:
  - "Reads Epic, the worklist and Pyxis. Drafts in Epic. Writes to the worklist and Teams."
  - "Submits, signs and orders nowhere. This is the line Priya and the committee read."
- **Side panel:**
  - "Systems and verbs · 3 of 4", "8 of 13 items done across the record", the rows with their summaries, and "ALSO NEEDED BEFORE PRIYA · 3 hard stops · Sam".
  - Blocked line: "Blocked: 5 items left. Next for you: Teams · write needs its activity. When you finish, Sam gets the list in Sam's inbox." (R: no pronoun)
  - When the systems are done, send Sam an inbox item "Tools: hard stops to test" (R9). It resolves when Sam sends to the sponsor.
- **Scenario `onboarding-systems`:**
  - `medRecAt('systems-3-of-4')`
  - job done at 04 Oct 09:05 (v0.5)
  - grants with reasons for Epic r/d, worklist r/w and Pyxis r, plus Teams w without a reason, at 05 Oct 11:08 (v0.6)
  - now 2026-10-05T11:09

- [x] **Step 1: Failing tests**
  - **Store:**
    - Granting `Epic·sign` is refused with the ORG-POL-02 reason, and nothing changes.
    - In `onboarding-systems`, setting the Teams reason makes systems done on 05 Oct; the version is v0.7; Sam has the "Tools: hard stops to test" item.
    - A reason on an ungranted cell is refused.
  - **Progress:** `reachLine` on Med Rec's grants is exactly 1c's two lines.
  - **e2e:** as Marcus in `onboarding-systems`, the Teams row shows "new". Choosing the Escalation reason turns the side panel to "Systems and verbs · done", and the rail to "Marcus · done 05 Oct".
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 1c.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(onboarding): systems and verbs"`.

### Task 5.5: Tools and hard stops (1d), send to the sponsor

**Files:**
- Create `src/features/onboarding/ToolsStep.tsx`.
- Modify `src/store/{index,onboarding}.ts`, `src/store/mutations.ts` (`nextExceptionCode`, `nextHardStopCode`), `src/data/scenarios/onboarding.ts`, and `src/features/inbox/ExceptionDetail.tsx` (`link`).
- Tests: store, selectors and `onboarding.spec.ts`.

**Interfaces:**
- **Limits follow the never list.**
  - Each never item (not the ORG-POL-02 line) has one limit. Library matches take the library code and rule; others get `nextHardStopCode`. All are version 1, owned by the technical owner.
  - `applyJobEdit` keeps limits in sync: a new item adds an untested limit; a removed item removes its limit.
- **Store action `testHardStop(agentId, code, cases?: { range: string; only: string })`:**
  - Permission `configureTools` (the technical owner).
  - It refuses a frozen record and an unknown code.
  - Mutation:
    - sets `test` from R10: the library result for Med Rec, or the derived result otherwise
    - with `cases`, the re-test result "0 of 212"
    - clears `reopened`
  - Audit `'Tested hard stop'`, reason "HS-04 · would have blocked 7 of 1,204".
  - Tests don't bump the version (R8).
- **Store action `sendToSponsor(agentId)`:**
  - Permitted to anyone with `editJobDescription` or `configureTools` on the agent. This is the store's own check, as the incident actions do, and is recorded.
  - It refuses 'N items left' unless `recordItems` is 12 of 13. It refuses 'Already with the sponsor'.
  - Mutation:
    - `sponsor.state 'waiting'`, `sentAt`, `sentBy`
    - `done.tools` (first time)
    - history "Sam · sent to Priya"
    - resolves the "Tools: hard stops to test" item
    - raises "Review: final set" for the sponsor: link "Open the final set" → `…/onboarding/approval`; deadline sentAt + 2 days at 17:00; action "approve the set or send it back"
  - Audit `'Sent to sponsor'`.
- `ExceptionDetail`: when an item has a `link`, its primary button is that LinkButton; claim, snooze and dismiss stay as they are.
- **Page (1d):**
  - "04 Tools and hard stops" with its sub and meta "Sam · 3 of 3".
  - TOOLS · N FROM THE GATEWAY CATALOGUE: TOOL (mono), GRANTS, FOR, and "✓ Matches step 3". A tool whose grant was removed shows "No matching grant" (warn).
  - HARD STOPS · N FROM MARCUS'S NEVER LIST:
    - The first tested limit (or the selected one) is an expanded `HardStopCard`: the "Library rule" and "Owner" lines, then "TESTED ON THE LAST 30 DAYS · 06 OCT 14:20", "Would have blocked 7 of 1,204 drafts", the example rows and the footnote.
    - Every other limit is a compact row: lock, code, title, "From "…" · library X", the result and the test date ("tested just now" when the test is within 5 minutes of now).
    - Untested rows show "Run test" (for the technical owner) or "Not tested yet".
    - Plain-language limits show "Plain language · Sam confirms the wording".
  - Side panel:
    - "Tools and hard stops · done", "12 of 13 items done · only Priya's approval left"
    - rows "Tools · 5 match step 3", "HS-04 · tested 7 blocks", …
    - "Send to Priya for approval" (primary when allowed)
    - the line "Raises "Review: final set" in Priya's inbox. Any edit after you send resets her review."
- **Scenario `onboarding-tools-tested`:**
  - `medRecAt('tools-tested')`
  - the systems reason at 05 Oct 11:12 (v0.7)
  - tests of HS-04 and HS-07 at 06 Oct 14:20, HS-11 at 14:21
  - the version pinned to 9 (R8)
  - now 2026-10-06T14:21

- [x] **Step 1: Failing tests (Review focus 2)**
  - **Store:**
    - In `onboarding-systems`, `sendToSponsor` as Sam is refused '4 items left'.
    - In `onboarding-tools-tested`, Sam sends. The sponsor state is waiting, Priya has the "Review: final set" item with a link to the approval step, and Sam's tools item is resolved.
    - A second send is refused.
    - `testHardStop` as Marcus is refused.
    - Testing an unknown code is refused.
  - **Limits:** adding the never item "Discharge a patient" to Culture Follow-up adds an HS-12 plain-language limit; removing it removes the limit.
  - **e2e:** as Sam in `onboarding-tools-tested`, "Send to Priya for approval" leads to the rail showing "Priya · waiting since 06 Oct". Switching to Priya, the inbox has "Review: final set", and its button opens the approval step.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 1d.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(onboarding): tools, hard stops and send to sponsor"`.

### Task 5.6: Sponsor approval, request changes and the return loop (1e, 1f, 1g)

**Files:**
- Create `src/features/onboarding/{ApprovalStep.tsx,ReturnedPanel.tsx}`.
- Modify `src/store/{index,onboarding}.ts` and `src/data/scenarios/onboarding.ts`.
- Tests: store, progress and `onboarding.spec.ts`.

**Interfaces:**
- **`requestSponsorChanges(agentId, { to: string; about?: string; note: string })`:**
  - Permission `approveTools` (the sponsor).
  - It refuses an empty note ('A note is required'), and 'Not waiting for you' unless the state is waiting.
  - Mutation:
    - `sponsor.state 'returned'`, with `returned`
    - when `about` is a limit code: that limit is `reopened` and its `test` stays as the "last result"
    - when `to` is the owner and `about` is absent: `done.job` and `done.systems` are cleared
    - resolves the sponsor's item
    - raises "Returned: HS-11" (or "Returned: job and reach") for `to`, linking to the tools (or job) step
    - history "Priya · requested changes", sub "HS-11 re-test on 8 East transfers"
  - Audit `'Requested changes'`.
- **`replyToSponsor(agentId, text)`:** for the person it was returned to. It sets `returned.reply`.
- **`approveAsSponsor(agentId)`:**
  - Permission `approveTools`.
  - It refuses 'Not waiting for you', and 'N items left' if the record isn't 12 of 13.
  - Mutation:
    - `sponsor.state 'signed'`, `signedAt`, version 10, `frozenAt`
    - agent lifecycle `inReview`
    - creates `state.activities` (Shadow) from the job
    - creates v1 privileges per activity: Shadow, `awaiting`, no proposed level, codes from `nextPrivilegeCode` (R11)
    - starts `review` with `suggestedTier` from `riskFactors` (Task 5.8), `meeting` = the next board meeting (the seed constant `BOARD_MEETINGS`, Tuesdays at 15:00: 14 Oct, 11 Nov, 09 Dec, 13 Jan), and `proposedConditions` = the template's conditions (C1–C3 for Med Rec)
    - resolves the sponsor's item and raises "Review: risk tier" for Dana
    - history "Priya · signed as sponsor"
  - Audit `'Approved as sponsor'`.
- **Edits reset the review (Review focus 1).** `applyJobEdit` and `applySystemsEdit`, while the sponsor state is waiting:
  - set the state to `notSent`, with `earlier` noting "Review reset by an edit"
  - resolve the sponsor's item, with outcome "Reset: record edited"
- **Approval page (1e):**
  - "05 Sponsor approval", with "Sent by Sam · 06 Oct 15:10".
  - JOB · MARCUS · 04 OCT: a DefinitionList (Purpose, Does with "Shadow", Hands off when, Acts for, Goes live if, Works on). It reads the job in the third person ("Prepares…", "Reconciles…"); the record keeps Marcus's wording, and the selector maps the leading verb.
  - REACH · MARCUS · 05 OCT: a row per system, plus "Nowhere · Submit, sign or order ORG-POL-02".
  - LIMITS · SAM · 06 OCT: the limit rows (selectable) and "Tools · 5 gateway tools, each matching a grant above".
  - "Approve as clinical sponsor" with its line, "Request changes" and "Approve and sign" (primary).
  - Side panel:
    - "Review: final set" (chip), "Waiting for you since 06 Oct 15:10"
    - WHO DID WHAT: Dana · intake 01 Oct, Marcus · job description 04 Oct, …
    - The round note. Round 1: "First review. Nothing has been approved or sent back before. If anyone edits the record after you approve, your approval resets and you're asked again." Round 2 (composed): "Second review. You sent HS-11 back on 07 Oct; Sam re-tested it: 0 of 212."
- **Request changes (1f):**
  - "Request changes" swaps the side panel to the form:
    - "Request changes · Goes back with your note. Nothing is approved."
    - "Send back to": radio cards Sam ("Limits: tools and hard stops") and Marcus ("Job and reach")
    - "About HS-11 v1 · the row you selected" (when a limit row is selected)
    - "Note for Sam" (Textarea)
    - the consequence line, with "when Sam sends it again"
    - "Send back to Sam" and "Cancel"
  - Selecting a limit row preselects Sam.
- **Returned (1g), on the tools step:**
  - The sub reads "Priya sent this step back. Only HS-11 is open; everything else stays as she reviewed it."
  - A quote card "Priya sent this back 07 Oct 09:14 · about HS-11 v1" with "Reply to Priya" (an inline Textarea and Send).
  - HS-11 v1 · RE-TEST: "Last result: would have blocked 0 of 1,204 · last 30 days · 06 Oct", a Cases Select ("01–30 Sep · 8 East", "Last 30 days · all units"), an Only Select ("Transfers in, 212 encounters", "All encounters"), "Run test", and "about 2 min · results replace the last test".
  - The other limits show "As Priya reviewed it".
  - Side panel: "Tools and hard stops · returned", "11 of 13 items done", the rows ("unchanged" / "Priya asked"), "Send to Priya again", and "Blocked: re-run HS-11 on the cases Priya named. Replying is optional."
- **Scenarios:**
  - `onboarding-sponsor-review`: Sam sent at 06 Oct 15:10; now 2026-10-07T09:05.
  - `onboarding-returned-hs11`: Priya requested changes at 07 Oct 09:14 with 1f's note; savedAt pinned to 09:31; now 2026-10-07T09:31.

- [x] **Step 1: Failing tests (Review focus 1, 2, 3)**
  - **Store:**
    - In `onboarding-sponsor-review`, Priya requests changes on HS-11 to Sam. HS-11 is reopened, `recordItems` is 11 of 13, Sam has "Returned: HS-11", and Priya's item is resolved.
    - Sam re-tests with the 8 East cases ("0 of 212") and sends again. Priya approves: the record is v1.0 and frozen, the lifecycle `inReview`, PRV-0142 v1 Shadow awaiting, and Dana has "Review: risk tier".
    - In `onboarding-sponsor-review`, Marcus edits the purpose: the sponsor state is `notSent`, Priya's item is resolved "Reset: record edited", and the rail shows "Priya · reset, opens when you send".
    - `approveAsSponsor` as Marcus is refused.
    - Request changes with an empty note is refused.
    - Approving in `onboarding-returned-hs11` is refused 'Not waiting for you'.
  - **e2e:** as Priya in `onboarding-sponsor-review`:
    - select the HS-11 row → Request changes → the form shows "About HS-11 v1"
    - type the note → Send back to Sam
    - as Sam: "Priya sent this back", Run test, then "Would have blocked 0 of 212" → Send to Priya again
    - as Priya: Approve and sign; the URL goes to `/onboarding/review`
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 1e, 1f and 1g.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(onboarding): sponsor approval and the return loop"`.

### Task 5.7: Ready for review (1h)

**Files:**
- Create `src/features/onboarding/ReviewStep.tsx`.
- Modify `src/data/scenarios/onboarding.ts`.
- Tests: selectors and `onboarding.spec.ts`.

**Interfaces:**
- **The page (1h):**
  - The header status is "In review" and the ID line "AGT-0123 · v1.0 · frozen", with the chip "Review: AIMS committee" while no decision is recorded.
  - "06 Ready for review" with its sub and "AIMS Review".
  - SPONSOR SIGNATURE:
    - Signed by "Priya · clinical sponsor"
    - When "07 Oct 2026 · 16:02"
    - Version "AGT-0123 v1.0"
    - Covers "Job, reach, 5 tools, 3 hard stops" (counted)
    - The rounds note from `sponsor.earlier`: "Signed after one round of changes: Priya asked for HS-11 to be re-tested on September's 8 East transfers. Sam re-ran it: 0 of 212 would have been blocked. Both notes stay on the record." When there were no rounds: "Signed on the first review."
  - WHAT HAPPENS NEXT: four rows verbatim. The meeting date comes from `review.meeting`, and the committee chair from the seed.
  - "Open committee packet preview" → `/portfolio/reviews/<agentId>`. "Download v1.0 as PDF" → R15.
  - Side panel: "Onboarding · 13 of 13", "Complete · 01 Oct to 07 Oct", the five rows with their people, the chip, and "Waiting on AIMS Review. Nothing is needed from Dana, Marcus, Sam or Priya until the committee meets."
  - Before the sponsor signs, the review step shows its panel locked: "Opens when Priya approves the set."
  - Once the review moves on (a tier is set, a decision is made), the chip follows the AIMS Review step. The page itself stays the onboarding record.
- **Scenario `onboarding-ready`:** HS-11 re-tested at 07 Oct 10:40, resent at 10:45, Priya approves at 16:02; now 2026-10-07T16:05.

- [x] **Step 1: Failing tests**
  - **Selector:** `selectReviewStep(onboarding-ready)` has covers "Job, reach, 5 tools, 3 hard stops" and the rounds note text.
  - **e2e:** in `onboarding-ready` as Priya, `/onboarding/review` shows "Ready for review", "AGT-0123 v1.0" and "Onboarding · 13 of 13". Editing inputs aren't present on `/onboarding/job` (read only).
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 1h.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(onboarding): ready for review"`.

### Task 5.8: Agent record and risk tier (2b; 2d's shell)

**Files:**
- Create `src/features/review/{RecordPage.tsx,RiskTierPage.tsx,ReviewRail.tsx,selectors.ts,review.module.css}`.
- Modify `src/store/{index,onboarding,permissions}.ts`, `src/data/scenarios/onboarding.ts`, `router.tsx` and `src/features/inventory/selectors.ts` (Committee line and tier labels).
- Tests: store, selectors and `tests/e2e/review.spec.ts`.

**Interfaces:**
- **AIMS Review rail** (`ReviewRail`, `WizardSteps`). The steps:
  - "1 · Onboarding": "done 07 Oct"
  - "2 · Risk tier": "Dana · now", or "Dana · 13 Oct"
  - "3 · Committee packet": "Dana · after tier", or "Dana · 13 Oct"
  - "4 · Committee decision": "Dr. Lee · 14 Oct", from the meeting date, or "Dr. Lee · 14 Oct" when decided
  - "5 · Shadow": "after approval", "Marcus · from 15 Oct", or "Marcus · 15 Oct to 04 Nov" once shadow is over
  
  The steps link to `…/onboarding/review`, `…/risk-tier`, `/portfolio/reviews/:id`, `/inventory/agents/:id` and `/operations/agents/:id?tab=scorecard`.
- **`riskFactors(s, agentId)`** returns 2b's five rows:
  - FACTOR, FINDING, FROM and EFFECT, where EFFECT is Raises, Held down, Lowers or Neutral.
  - Patient impact and Volume come from the intake.
  - Adverse branches come from the job's activity branches and the limits that hold them down.
  - Facing is "Clinician-facing. A pharmacist signs every draft before the chart" when no verb above draft writes to the chart. It reads from the grid.
  - Reach comes from `reachLine`'s short form: "Reads 3 systems, drafts in Epic. Submits, signs and orders nowhere".
  - The suggested tier is 1 with no patient data, 4 when any grant submits, signs or orders, and otherwise 2 + (raises > lowers ? 1 : 0). Med Rec's suggestion is 2.
- **`setRiskTier(agentId, { tier: Tier; reason?: string })`:**
  - Permission `prepareGoLive`.
  - It refuses 'Not ready for a tier' unless the record is frozen and has no tier yet, and 'A reason is required' when the tier isn't the suggested one.
  - Mutation:
    - sets the tier, `tierReason`, `tierAt` and `tierBy`, and `agent.riskTier`
    - Tier ≥ 2: `packetAt = now`; resolves Dana's item; raises "Review: your decision" for the committee chair, due on the meeting day at 17:00, linking to `/portfolio/reviews/:id`
    - Tier 1: starts shadow at once with no committee, through `applyShadowStart`. It's written in this task, as Task 5.9 specifies it.
    - history "Dana · set Tier 3", sub "Suggested Tier 2 · reason recorded"
  - Audit `'Set risk tier'`.
- **Permissions:** `can(…, 'approveGoLive', { agentId })` is false when the agent's tier is below 2 (R7). The matrix gains `requestGoLive: { owner: 'own' }`, used in Task 5.10. Both go into the permissions table test.
- **Risk tier page (2b), `/inventory/agents/:id/risk-tier`:**
  - Breadcrumb "Inventory / Agents / Med Rec Agent / AIMS Review", status "In review", ID line "AGT-0123 · v1.0", chip "Review: risk tier".
  - "02 Risk tier" with its sub.
  - SUGGESTED · TIER 2 table.
  - TIER radio cards: "Tier 1 · Low · Admin, no patient data", "Tier 2 · Moderate · Suggested", "Tier 3 · High · Your choice", "Tier 4 · Critical · Acts without review". The sub "Your choice" follows the selection.
  - "Reason for changing the suggested tier · Required · goes in the packet". It shows only when the choice differs from the suggestion.
  - The button "Set Tier 3 and build the packet" (R7 wording for Tier 1), with the meta "Logged as Dana · suggested tier stays on record".
  - Side card "What the tier sets · Tier 2 against your Tier 3", a two-column table from `TIER_RULES` with the changed values in 600. The note line comes from data: when the intake condition already sets the shadow length, say so ("The intake already asked for a 21-day shadow, so Tier 3 changes the board and the review cycle, not the shadow length.").
  - After setting, the page is read only with the logged tier, and links to the packet.
- **Record page, `/inventory/agents/:id`:**
  - For an agent with a review: the AIMS Review rail and the current step's panel. Before a decision, that's the tier step's summary or "Waiting on the committee · 14 Oct"; after, it's 2d (Task 5.9).
  - For an `onboarding` agent: a redirect to its open onboarding step.
  - For an agent without a record (the other 40): a composed page with the header (status from lifecycle and level), the 8c "AIMS inventory" facts (`selectRecord`), the privileges table (activity, level, domain, conditions) and "Open operations view".
  - An unknown id is NotFound.
  - 8c's Committee line comes from the record's decision ("Approved with C1–C3 · 14 Oct"), "—" otherwise.
- **Scenario `review-risk-tier`:** `medRecAt('risk-tier')`, now 2026-10-13T10:15.

- [x] **Step 1: Failing tests (Review focus 2, 3)**
  - **Selectors:** in `review-risk-tier`, `riskFactors` gives effects `['Raises', 'Held down', 'Lowers', 'Lowers', 'Neutral']` and suggested 2.
  - **Store:**
    - Dana sets Tier 3 with 2b's reason. `agent.riskTier` is 3, `packetAt` is set, and Dr. Lee has "Review: your decision" due 14 Oct 17:00.
    - Tier 3 without a reason is refused.
    - Tier 2 without a reason is allowed.
    - Priya setting the tier is refused.
    - Setting it again is refused.
  - **Permissions:** Dr. Lee `approveGoLive` on a Tier 1 agent is false, and on Med Rec (Tier 3) is true. Marcus `requestGoLive` on med-rec is true; Priya's is false.
  - **e2e:**
    - As Dana in `review-risk-tier`, choose Tier 3. The reason field appears, and the button reads "Set Tier 3 and build the packet". Fill it and set: the rail shows "Dana · 13 Oct" twice.
    - `/inventory/agents/claim-scrubber` shows the composed record.
    - `/inventory/agents/nope` is NotFound.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 2b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(review): agent record and risk tier"`.

### Task 5.9: Committee packet and decision logged (2c, 2d)

**Files:**
- Create `src/features/review/{PacketPage.tsx,DecisionPanel.tsx,DecisionLogged.tsx}`.
- Modify `src/store/{index,onboarding}.ts`, `src/data/scenarios/onboarding.ts` and `router.tsx`.
- Tests: store, selectors and `review.spec.ts`.

**Interfaces:**
- **`recordDecision(agentId, { kind, conditions: Condition[], reason })`:**
  - Permission `approveGoLive` (tier-aware).
  - Refusals:
    - 'No packet yet' unless `packetAt` is set and there's no decision
    - 'A reason is required'
    - 'Add at least one condition' for `approveWithConditions` with none
  - Mutation:
    - **approve / approveWithConditions:** `applyShadowStart(s, agentId, at)`:
      - `shadowFrom` = the next day 00:00
      - agent lifecycle `live`, level `shadow`, judgment `{ shadow, 'Shadow' }`, monitor live, metrics `{ day: 0, … null }`
      - v2 privileges per activity: `active` Shadow, `grantedBy` the decider, `grantedAt` now, the conditions that apply to the activity, and the domain plus each condition's `domainNote`; v1 closed
      - `state.grants` from the record's grants; `state.hardStops` from the limits (approvedBy the sponsor, `approvedAt` = `sponsor.signedAt`); an empty scorecard per activity (Task 5.10)
    - **reReview:** `review.packetAt` cleared, the tier kept, a "Re-review: questions from the board" item for Dana, and `meeting` moved to the next one.
    - **deny:** the agent is retired (`retirement.code` = `nextArchiveCode`, reason "Denied by the AI review board: <reason>"), the intake closed, and the record kept.
    - Every kind resolves Dr. Lee's item, adds history, and adds the audit entry `'Recorded committee decision'` with the kind and reason.
- **Packet page (2c), `/portfolio/reviews/:agentId`:**
  - Breadcrumb "Portfolio / AI review board / 14 Oct 2026 / Item 3 of 5" and title "Med Rec Agent · review packet". Status "Tier 3 · High", ID line "AGT-0123 v1.0 · REQ-0093", chip "Review: your decision" while undecided.
  - Header action "Download PDF" (R15). There's no Previous or Next (R14).
  - People row: Division, Sponsor, Owner, Technical owner.
  - JOB DESCRIPTION · MARCUS: Purpose; Does with "Shadow first"; Never, each with its code tag (ORG-POL-02 for the last); Hands off when (joined with " · "); Acts for.
  - SYSTEMS · MARCUS: a read-only grid (✓, "—", 🔒). Use `SystemsVerbsGrid` if it renders this; otherwise use a read-only Table and note why.
  - HARD STOPS · TESTED ON THE LAST 30 DAYS · SAM: the re-test line for HS-11 ("Re-tested on 212 transfers to 8 East, as Priya asked · Would have blocked 0 of 212").
  - SUCCESS CRITERIA ("≥ 90.0 %") and ROLLOUT DOMAIN.
  - RISK TIER · DANA: "Tier 3 · High. Suggested Tier 2. Dana raised it: "<reason first two sentences>"".
  - Decision side panel, for the committee:
    - radio cards Approve, Approve with conditions, Re-review, Deny, with 2c's subs
    - Conditions: the proposed ones, each removable, plus "Add condition" (an inline Input; added ones apply to every activity, checked by the sponsor)
    - Reason, prefilled for Med Rec only when the scenario pins it
    - "Record decision" and "Cancel"; "Logged as Dr. Lee · AI review board chair"
  - Other personas see the panel read only ("Dr. Lee decides at the 14 Oct meeting").
  - Before the packet is built: "The packet is built when Dana sets the risk tier." After a decision: a read-only summary and a link to the decision logged.
- **Decision logged (2d), on `/inventory/agents/:id` once decided:**
  - Header status "Approved with conditions" (or the kind's label), ID line "AGT-0123 · v1.0".
  - "04 Committee decision" with its sub and meta "Dr. Lee · 14 Oct 16:20".
  - The decision card: kind and quoted reason.
  - CONDITIONS ON THE PRIVILEGE RECORD: Condition, Applies to, Checked by.
  - PRIVILEGES: Activity, Level ("Shadow from 15 Oct", or "Draft since 06 Nov" at baseline), Domain and Conditions (RuleTags).
  - Side "Decision log · Every decision and its reason, newest first", from history plus privilege events. At baseline it includes "06 Nov · Priya · signed PRV-0142 v3 · Shadow → Draft" and "05 Nov · Marcus · asked Priya to sign".
  - The "Next:" line while shadow hasn't started: "Next: shadow starts 15 Oct on 7 West and 8 East. Marcus sees the scorecard from day one."
- **Scenarios:**
  - `review-committee`: Dana set Tier 3 at 13 Oct 10:20; now 2026-10-14T16:12.
  - `review-decided`: Dr. Lee decided at 16:20 with C1–C3 and 2c's reason ("5 of 7 board members present"); now 2026-10-14T16:25.

- [x] **Step 1: Failing tests (Review focus 2, 3, 4)**
  - **Store:**
    - In `review-committee`, Dr. Lee approves with C1–C3. Med Rec is `live` at Shadow from 15 Oct, PRV-0142 v2 is active with `['C1','C2','C3']` and its domain ends "excluding dialysis (C3)", PRV-0143 v2 has `['C1','C3']`, grants and hard stops exist, and the item is resolved.
    - With conditions [] and kind `approveWithConditions`, it's refused.
    - Without a reason, it's refused.
    - Marcus is refused.
    - Deny retires the agent with RET-07.
  - **Board:** after approval, Med Rec is on the Medications board as Shadow, and the division has 20 agents.
  - **e2e:**
    - As Dr. Lee in `review-committee`, `/portfolio/reviews/med-rec` shows "Review: your decision". Choose "Approve with conditions" and type the reason, then Record decision. The record page shows "Approved with conditions" and "Shadow from 15 Oct".
    - `/portfolio/reviews/nope` is NotFound.
    - At baseline, Dr. Lee's landing shows the decided packet, read only.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 2c and 2d.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(review): committee packet and decision"`.

### Task 5.10: Shadow scorecard and sample case (3a, 3b)

**Files:**
- Create `src/features/golive/{ScorecardTab.tsx,CasePage.tsx,selectors.ts,golive.module.css}`.
- Modify `src/data/types.ts`, `src/data/seed/{scorecards,actions}.ts`, `src/store/{index,onboarding}.ts`, `src/data/scenarios/onboarding.ts`, `src/features/board/AgentView.tsx` (header status for shadow agents, and the tab) and `router.tsx`.
- Tests: seed, store, selectors and `tests/e2e/golive.spec.ts`.

**Interfaces:**
- **Types:**
  - `Scorecard`:
    ```
    { activityId; from; to; cases: number;
      results: Record<string, { value: number; trend: number[] }>;
      causes: { label: string; count: number; example: string }[];
      hardStopNote?: string; sampleCaseIds: string[]; extendedDays?: number }
    ```
  - `SampleCase`:
    ```
    { id: 'enc-4105'; encounter: '4105'; activityId; unit; admittedAt; mrn: '••3307'; age: 81;
      draftAt; finalBy: 'Ana R.'; finalAt; traceId?: 'act-61840';
      lines: { agent: string | null; pharmacist: string | null;
               result: 'agrees' | 'inaccurate' | 'omitted'; note?: 'name'; source: string }[];
      notes: { line: number; title: string; text: string }[] }
    ```
- **Seed:**
  - The admission scorecard: 15 Oct to 04 Nov, 1,118 cases, results 91.2, 2.1 and 2.6, 21-point trends ending at those values, 3a's three causes, "HS-04 would have fired 9 times", 12 cases.
  - The cases: the frame's 4022, 4105, 4231 and 4310 in that order, then 8 invented (7 West and 8 East, 5 to 16 home meds, agreement from lines).
    - 4105's lines and two notes are verbatim from 3b.
    - The other cases' lines are generated in the seed from a fixed medication pool, with their counts and differences.
  - The allergy scorecard (invented, running): from 15 Oct, to 07 Dec, 2,214 cases, all three met (94.6, 1.2, 1.1), no causes, "HS-07 would have fired 2 times", no sample cases.
  - Action ACT-61840: 28 Oct 14:13, enc 4105, Shadow, a short trace, reviewer "Shadow · compared with Ana R.'s list".
- **Selectors:**
  - `selectScorecard(s, agentId, activityId)`:
    - the header line "21 days · 1,118 admissions · 15 Oct to 04 Nov · each draft compared with the admitting pharmacist's final list"
    - criteria rows with target ("≥ 90.0 %"), result, trend and status ("Met" / "Below target")
    - the causes, with bars scaled to the largest
    - the sample-case rows (Encounter, Unit, Home meds, Agreement, Differences)
    - the go-live panel: rows "Agreement · met", "Inaccurate lines · 2.6 % · target 2.0 %", "Conditions · C1, C2, C3", "Hard stops in shadow · HS-04 would have fired 9 times"; state `ask | requested | signed`, with names and dates; and the summary line "2 of 3 targets met. Priya can still sign, with a written reason that stays on the privilege. Or extend shadow and fix the name mapping first." (the second sentence only when a cause exists)
  - `shadowDay(s, activityId)` gives "day 21 of 21", or "day 55 · 21-day minimum met" after the minimum.
  - With no scorecard data yet (just approved): "Shadow starts 15 Oct. Results appear after the first full day."
- **Agent view:**
  - A shadow agent's header status is "Shadow · day 21 of 21", with ID line "v1.3.0 · SOP v1.3" and chip Shadow.
  - The Scorecard tab shows a Segmented control of the agent's activities. `?activity=` selects one; the default is the first activity with a scorecard.
  - The header action "Export scorecard" (R15) shows on the scorecard tab.
- **Store actions:**
  - `requestGoLive(activityId)`:
    - Permission `requestGoLive`.
    - It refuses 'Shadow isn't finished' before the minimum days, 'Already requested', and 'Not in Shadow'.
    - Mutation:
      - drafts the next version of the activity's privilege: `awaiting`, `level` shadow, `proposedLevel` draft, `movedBy` the owner
      - reviewDate = R12 from the proposed signing day (recomputed at signing)
      - raises "Review: your signature" for the sponsor, linking to `/inventory/privileges/<code>/sign`
      - history "Marcus · asked Priya to sign"
    - Audit `'Requested go-live'`.
  - `extendShadow(activityId, days = 7)`:
    - Permission `requestGoLive`.
    - It refuses 'A go-live request is open'.
    - It adds `extendedDays`, logs, and adds the audit entry `'Extended shadow'`.
  - `flagCaseLine(caseId, line)`:
    - Permission `editJobDescription`.
    - It adds a log event "Flagged for SOP: line 4 · Lasix → furosemide", sub "Sam is asked to check the SOP mapping".
    - Audit `'Flagged for SOP'`.
- **Case page (3b), `/operations/agents/:agentId/cases/:caseId`:**
  - Breadcrumb "Operations / Medications / Med Rec Agent / Scorecard / Case 2 of 12".
  - Title "Encounter 4105 · 7 West", status "Admitted 28 Oct 14:12", ID line "MRN ••3307 · 81 y", chip "1 inaccurate · 1 omitted".
  - "Previous case" and "Next case" (locked at the ends).
  - The source line, then the side-by-side table (#, Agent draft, Pharmacist's final list, Result, Source the agent used), with differing lines highlighted.
  - The totals line.
  - The note cards ("Line 4 · why it differs", "Line 5 · omitted"), "Open trace ACT-61840" and "Flag for SOP".
  - An unknown case id, or a case of another agent, is NotFound.
- **Scenario `shadow-day-21`:** `medRecAt('shadow-day-21')`:
  - after the decision
  - the scorecard data from the seed, with `to` = 04 Nov
  - Med Rec's metrics `{ day: 53 }` with the shadow sparkline
  - ACT-61840 kept
  - now 2026-11-05T09:30

- [x] **Step 1: Failing tests**
  - **Selectors:** in `shadow-day-21`, `selectScorecard` gives the statuses `['Met', 'Met', 'Below target']`, the causes total 29 ("Inaccurate lines by cause · 29 lines"), `shadowDay` "day 21 of 21", and case 4105's agreement "71 %".
  - **Store:**
    - Marcus `requestGoLive('med-rec-admission')` drafts PRV-0142 v3 (proposed Draft), and Priya has "Review: your signature".
    - A second request is refused.
    - Priya's request is refused.
    - In `review-decided` (day 0), it's refused 'Shadow isn't finished'.
    - `extendShadow` after a request is refused.
  - **e2e:**
    - As Marcus in `shadow-day-21`, the Scorecard tab shows "Below target" and "Ask Priya to sign". Open case 4105: "Inaccurate · name" and "Open trace ACT-61840" opens the trace.
    - Back on the scorecard, "Ask Priya to sign" turns the panel to "Requested · waiting for Priya".
    - `/operations/agents/med-rec/cases/nope` is NotFound.
    - At baseline, the allergy activity shows "day 55 · 21-day minimum met" and Ask Priya to sign.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 3a and 3b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(golive): shadow scorecard and sample case"`.

### Task 5.11: Sign the privilege (3c) and My privileges (3d)

**Files:**
- Create `src/features/golive/{SignPage.tsx,MyPrivilegesPage.tsx}`.
- Modify `src/store/{index,onboarding,mutations}.ts`, `src/data/scenarios/{index,onboarding}.ts`, `router.tsx` and `src/features/inbox/` (link buttons, if any are still missing).
- Tests: store, selectors, scenarios and `golive.spec.ts`.

**Interfaces:**
- **`signPrivilege(code, { reason?: string; accepted: boolean })`:**
  - Permission `signPrivilege` on the agent (the sponsor).
  - Refusals:
    - 'Nothing to sign' unless the latest version is `awaiting` with a proposed level
    - 'Tick the accountability statement' when not accepted
    - 'A written reason is required' when any criterion of the scorecard is below target and the reason is empty
  - Mutation:
    - the level goes to the proposed level, state `active`, `grantedBy` and `grantedAt` now, `reviewDate` per R12 (the tier's cycle)
    - the evidence string "21-day shadow · 1,118 cases · 2 of 3 targets met"
    - the activity and agent `level` follow; the agent judgment becomes `{ normal, 'Within scope' }` when it was Shadow
    - the earlier versions are closed
    - resolves "Review: your signature"
    - history "Priya · signed PRV-0142 v3", sub "Shadow → Draft"
  - Audit `'Signed privilege'`, with the reason.
  - **Renewal** (a `due` or `active` privilege past its review date, opened by "Review now"):
    - `signPrivilege(code, { accepted, reason? })` re-signs it at the same level, as a new version with a new review date
    - resolves the agent's overdue-review exception (EXC-5497 for PRV-0098)
    - Audit `'Renewed privilege'`
- **`returnPrivilegeRequest(code, note)`:**
  - The sponsor sends a go-live request back.
  - The awaiting version is closed and the previous one restored.
  - Marcus gets a "Returned: go-live request" item.
  - It refuses an empty note.
- **`askForEvidence(code)`:**
  - The sponsor raises a review item for the owner: "Evidence for the PRV-0098 review", linking to the agent's privileges tab, copying the sponsor.
  - It refuses 'Already asked' while one is open.
- **`raiseOverdueReviews(s)`** (pure, in `mutations.ts`):
  - For every active privilege whose review date has passed and which has no open overdue-review exception, raise one:
    - kind review, status warn, type "Review overdue", reason "Privilege review date passed on 01 Dec", owner the sponsor
    - copied: owner and Dana
    - deadline = review date + 14 days at 17:00 (the Medications lapse window)
  - It's idempotent. Scenarios that move the clock forward call it. The seed already holds EXC-5497.
- **Sign page (3c), `/inventory/privileges/:code/sign`:**
  - Breadcrumb "Medications / Med Rec Agent / Privileges", title "Move admission med rec to Draft", ID line "PRV-0142 · v3 draft", chip "Review: your signature".
  - The sub "You're signing as clinical sponsor for Medications. At Draft, every med list the agent prepares is signed by a pharmacist before it reaches the chart."
  - The `AutonomyLadder`: "Current · since 15 Oct · Shadow", "Proposed · your signature · Draft", "Locked · v2 · Supervised", "Locked · admin tasks only · Autonomous".
  - The DefinitionList: Activity, Agent ("Med Rec Agent · v1.3.0 · SOP v1.3.1"), Domain, Hard stops, Review date ("05 Feb 2027 · in 91 days · a lapse sends the activity back to Shadow") and Step-down triggers.
  - "Shadow evidence · 21 days · 1,118 cases", "Open scorecard", and the criteria table.
  - **Your signature:**
    - the below-target notice, when one applies
    - "Reason for signing below target" (Textarea, required then)
    - Checkbox "I accept accountability for this delegation until 05 Feb 2027, or until a step-down trigger fires."
    - the records line "Records: Priya · Director of Pharmacy · 2026-11-06 09:52 · PRV-0142 v3 · under ORG-SIGN-01"
    - "Sign and move to Draft" (locked until accepted, and until there's a reason when one is required), "Request changes" (an inline note and "Send back to Marcus") and "Cancel" (back to the scorecard)
  - Side: "What changes when you sign" (4 lines verbatim) and "Conditions · Dr. Lee · 14 Oct" (C1–C3).
  - **Modes:**
    - awaiting → sign
    - active and not due → read-only record: "Signed by Priya · 06 Nov 2026 09:52", the reason quoted, and no form
    - due or overdue → renewal: title "Renew <activity> at Draft", evidence from the privilege's evidence string, no criteria table, button "Renew for 90 days"
    - closed or stepped down → read only, "Closed"
  - The code resolves to the latest version. An unknown code is NotFound.
  - Read-only for anyone but the sponsor (locked buttons).
- **My privileges (3d), `/portfolio/privileges`:**
  - Breadcrumb "Portfolio / My privileges", title "My privileges", ID line "Priya · clinical sponsor · Medications", and the sub verbatim, with the lapse days from the division's policy. Header action "Export" (R15).
  - Tabs from `?tab=` (`all | overdue | due`): "All · 17", "Overdue · 1", "Due in 30 days · 1".
  - Columns AGENT, ACTIVITY, LEVEL, DOMAIN, SIGNED, REVIEW DUE and STATUS, plus the action.
    - Status: "Review overdue · 7 days" (warn), "Due in 14 days", "In 31 days · paused", "In 59 days".
    - The action is "Review" (primary, to renewal) or "Open" (the sign page, read only).
  - Rows sorted soonest review first; "Showing N of N, soonest review first."
  - Below the table: the overdue notice (warn) "Duplicate Rx Agent passed its review date on 01 Dec. If you don't review it by 15 Dec, flag duplicate prescriptions returns to Shadow and its flags stop reaching pharmacists. Marcus and Dana are copied.", with "Review now" and "Ask Marcus for evidence".
  - For a persona who has signed nothing (Marcus, Sam, Jordan): the same table, filtered to privileges in their divisions, titled "Privileges in Medications" (composed).
- **Scenario `awaiting-signature`** (R17):
  - `medRecAt('awaiting-signature')`, after `shadow-day-21`
  - SOP v1.3.1 deployed 05 Nov 16:00 (the agent's `sop` and a log event)
  - Marcus requested at 05 Nov 11:00
  - now 2026-11-06T09:52
  - Update the Phase 2 scenario test and ledger it.

- [x] **Step 1: Failing tests (Review focus 2, 3, 4)**
  - **Store:**
    - In `awaiting-signature`, Priya signs PRV-0142 with a reason and acceptance. It's active at Draft, with review date 2027-02-05, "Review: your signature" resolved, and Med Rec's level Draft.
    - Without a reason, it's refused.
    - Without acceptance, it's refused.
    - Marcus is refused.
    - Signing again is refused 'Nothing to sign'.
    - At baseline, Priya renews PRV-0098: a new version, review date = 08 Dec + 91 days, and EXC-5497 resolved.
    - `returnPrivilegeRequest` with an empty note is refused.
  - **Mutations:** `raiseOverdueReviews(seed)` adds nothing. After `advanceClock` to 2026-12-23, it raises one for Med Shortage (review 22 Dec). A second call adds nothing.
  - **Selectors:** at baseline, My privileges for Priya: All 17, Overdue 1, Due in 30 days 1, first row Duplicate Rx "Review overdue · 7 days", Controlled Drug "In 31 days · paused", Med Rec "In 59 days".
  - **e2e:**
    - As Priya in `awaiting-signature`, `/inventory/privileges/prv-0142/sign` shows "in 91 days". Sign is locked; add the reason and tick, then Sign and move to Draft. The page shows "Signed by Priya".
    - `/inventory/privileges/nope/sign` is NotFound.
    - At baseline as Priya, `/portfolio/privileges` → "Review now" → "Renew for 90 days" → the overdue notice is gone.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 3c and 3d.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(golive): sign the privilege and my privileges"`.

### Task 5.12: Journey test and checkpoint

- [x] **Step 1: e2e journey** (`tests/e2e/journeys.spec.ts`), "intake to signed privilege":
  1. **Dana**, `?scenario=onboarding-intake`: choose Sam → Start onboarding.
  2. **Marcus**, filling the job description:
     - two activities
     - three never items: Change a dose, Remove an allergy, Draft for anyone but the encounter's patient
     - acting for, one escalation trigger, three targets
     
     Then the systems (Epic read and draft, worklist read and write, Pyxis read, Teams write), each with a reason.
  3. **Sam:** test HS-04, HS-07 and HS-11 → Send to Priya.
  4. **Priya:** inbox "Review: final set" → Approve and sign.
  5. **Dana:** risk tier 3 with a reason.
  6. **Dr. Lee:** Approve with conditions with a reason. The record shows "Shadow from" the next day.
  7. **The time skip:** shadow takes 21 days, so the test loads `?scenario=shadow-day-21`, as the Phase 8 story will.
  8. **Marcus:** Ask Priya to sign.
  9. **Priya:** sign with a reason. My privileges shows Med Rec Agent at Draft, "In 91 days".
- [x] **Step 2:** `pnpm check` and `pnpm e2e` green.
- [x] **Step 3: Checkpoint** per the BUILD_PLAN protocol:
  - Push, then open the PR "Phase 5: Onboarding and go-live" with `Closes #6`.
  - Run the fresh whole-branch review and apply its fixes test-first.
  - Visual QA of 1a–1i, 2a–2d and 3a–3d against their scenarios; tick them in the frame tracker.
  - Write the handoff notes, then update Start here, the decision and session logs, issue #6 and the PR body.
  - **STOP and ask Stefan to review.**
