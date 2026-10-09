# Phase 7: Earned autonomy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RUAIH evidence, review levels, promotion and step-down (E12, E13, E14, E15). In this phase:
- Dana checks every agent against the seven RUAIH elements and exports a packet that lists its gaps.
- Priya sees how much of an activity's signed output is checked, and the rules that move that level.
- Marcus checks a random sample instead of everything; one defect moves the level back.
- Priya signs one branch from Draft to Supervised; because it is Tier 3, Dr. Lee's board decides.
- A threshold breach drops Med Rec from Draft to Shadow, and a new build drops Allergy Recon's promoted branch back to Draft. Nothing steps back up without a signature.

After this phase every one of the 55 frames exists.

**Architecture:**
- **Time model (ruling R1, as Phase 6).** E12–E15 are v2 frames drawn in March to June 2027. Each frame's "today" becomes the day it is shown, and its other dates move by the same number of days.

  | Frame | Drawn | Shown | Shift |
  |---|---|---|---|
  | 12a, 12b | 24 Mar | 08 Dec (baseline) | −106 (`E12_SHIFT`) |
  | 13a, 13b, 14a | 16 Mar | 08 Dec (baseline) | −98 (`E13_SHIFT`) |
  | 14b | 13 Apr | 09 Dec 15:10, the next board meeting (`promotion-at-board`) | dates from data |
  | 15a | 18 Mar | 09 Dec 09:52 (`step-down-threshold`) | −99 (`E15_SHIFT` = `E10_SHIFT`) |
  | 15b | 02 Jun | 14 Dec 14:52 (`step-down-version`) | dates from data |

  - 15a fits the Phase 6 timeline: Epic's upgrade (14 Mar → 05 Dec) made pharmacists split frequency fields, Ana flags it on 08 Dec (10a), 11a shows 7 West's edit rate at 17.9 % on 08 Dec (15a's day 2), and the trigger fires at 06:00 the next morning. `change-detected-v150` is another branch of the same morning: it doesn't contain the step-down.
  - 14b and 15b happen after Priya's signature on 08 Dec, so their dates come from what the scenario did: signed 08 Dec, board 09 Dec (`BOARD_MEETINGS`), v1.3.0 deployed 14 Dec 14:20.
  - **Builds:** Med Rec stays v1.3.0 · SOP v1.3.1 (15a's "v1.4.2 · SOP v1.4", as Phase 6). Allergy Recon's live build is the seed's v1.2.0 (13b's and 14a's "v1.2.4"); its new build is v1.3.0, as 15b names it.
- **One model for each rule, in `DemoState`.**
  - Review levels and their rules are per activity (`state.reviewLevels`).
  - Today's sample is `state.samplingDraws`; a recorded check moves the level by rule.
  - Promotions are per branch (`state.promotions`). Branch levels live on `Activity.branches[].level`.
  - Step-downs are records (`state.stepDowns`) written by the gateway's rules. Scenarios call those rules; no screen deploys a build or fires a trigger.
- **Static vs state** (as Phase 6). Content that never changes is catalogue data:
  - RUAIH elements, mapping rules, gaps and the frame's record chips: `src/data/seed/evidence.ts`
  - draw details, promotion content, step-down content and v1.3.0's replay snapshot: `src/data/seed/autonomy.ts`

  Everything a person can change is in `DemoState`.
- **Pure mutations, store actions, replayed scenarios** (as Phases 5 and 6).
  - New pure mutations live in `src/store/levels.ts` (E13), `src/store/promotions.ts` (E14) and `src/store/stepdowns.ts` (E15). Each has a store action on `runAction`.
  - `step-down-threshold`, `promotion-at-board` and `step-down-version` replay those mutations at the re-dated times.
- **Features:**
  - `src/features/evidence/`: 12a, 12b
  - `src/features/activity/`: the activity and branch pages (13a, 15b, and the composed Privilege, Evidence and History tabs)
  - `src/features/sampling/`: 13b
  - `src/features/promotion/`: 14a, 14b
  - `src/features/stepdown/`: 15a's overview (inside the agent view) and 15b's history
  - Each has a `selectors.ts`.

**Tech stack:** as Phase 6. No new dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.3 Priya's and Dr. Lee's stories, §5.5 routes, §6.1 "RUAIH coverage, review-level rules, sampling queue, promotions, step-down events", §6.3 `step-down-threshold`, §7 permissions, §8 frames 12a–15b).

**Design sources** (copy and values verbatim, except where a ruling says otherwise):
- `designs/E12 RUAIH Evidence.dc.html`: 12a, 12b.
- `designs/E13 Review Levels.dc.html`: 13a, 13b.
- `designs/E14 Promote to Supervised.dc.html`: 14a, 14b.
- `designs/E15 Step Down.dc.html`: 15a, 15b.
- Frames sit two per row at x = 48 and x = 1536, and are 1440 px wide. Set `document.documentElement.scrollLeft` (0 or 1488) and `scrollTop`, in a browser emulated at 1500 × 1400, to show one frame at a time. Measure each frame before building it.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- **Colour meanings in this phase:**
  - Teal is only "review waiting": "Review: your signature", "Review: your decision", "With the board", "Waiting for Priya", "Review: restore Supervised". 13a's "Watching" is ink, not teal.
  - Amber is only for warnings:
    - "Gap" chips and status on 12a and 12b
    - "Stepped down automatically", 15a's breach notice and the breach points on its chart
  - Indigo is the primary action, the selected row, and the ladder's "Proposed · needs signatures" segment (14a's legend).
- **Monitoring screens are 13 px** (12a, 12b's table, 13a's rules, 13b's list, 15a, 15b). **Forms are 16 px with 44 px fields** (14a's signature, 14b's decision, 13b's check, every modal).
- `SEED_VERSION` goes to **8** in Task 7.1. Later seed or `DemoState` changes in this phase stay on 8.
- **Every new store action is test-first and goes through `runAction`.** A refusal changes nothing; tests compare `dataOf` before and after.
- **Locked controls use `Button locked`** with the reason from `lockReason` or the gating message. Never use native `disabled` on a button.
- **Counts come from data.** Where that changes a frame's number, record a ruling.
- **Design-doc references aren't product copy.** "Set in E2" and "see the step-down in E15" are rewritten (R16).
- **No gendered pronouns** in product copy. 14a's caption "with the evidence in front of her" is annotation.
- **Times come from `state.now`.** Scenarios pin the re-dated times. **Moving the clock goes through `advanceClock`.**
- **Agent-less items** (`agentId: ''`) still exist; any new list that looks up an item's agent tolerates them.

## Phase-6 facts this plan relies on

- **Store:**
  - `runAction`, `can`, `lockReason` (any person id). `nextExceptionCode`, `raiseItem` (hand-offs with a link), `resolveItems`, `nextVersion`, `latestByCode`, `reviewDateFrom(at, tier)` (cycle + 1 days), `applySignPrivilege` (sign or renew; new versions are new records `prv-0142-v4`, older ones `closed`).
  - `buildExport(input)` writes an `ExportRecord`; permission `viewAudit`.
  - `openIncident(agentId, { title, actionIds })`.
  - FYIs are log events with `to` (R18).
  - `applyAccept` (9a) accepts a held build.
- **Permissions:** `approveGoLive` is the committee's and refuses Tier 1 agents; `signPrivilege` is the sponsor's; `requestGoLive` is the owner's.
- **Seed (v7, at baseline):**
  - 41 agents on the boards in 5 divisions (`onBoard`); 6 retired; draft agents in onboarding.
  - Allergy Recon Agent (AGT-0104, Medications, Tier 3, v1.2.0, judgment "Within scope · JD v3", 344 actions in 24 h). Its one activity `allergy-recon` "Reconcile allergy lists" is at Draft with one branch `outside-records` "Add an allergy from outside records". Its privilege is an auto code (PRV-0140) v1, granted 16 Oct, review 14 Jan.
  - Every activity's `reviewLevel` is `'normal'`.
  - PRV-0142 v3 (Med Rec admission) has the triggers "Edit rate above 15% for 3 days", "New version", "Incident".
  - The `step-down-threshold` scenario is a Phase 2 placeholder (sets PRV-0142 `steppedDown` by "MR-12 v1").
  - Exports: EXP-0001 (13 Nov, Med Rec packet), EXP-0002 (20 Nov, Prior Auth CSV), EXP-0003 (01 Dec, Med Rec and Discharge Meds packet).
  - Med Rec's committee decision was 14 Oct; HS-04 fired 3 times today.
  - `BOARD_MEETINGS` includes Wed 09 Dec 15:00.
- **Components:**
  - `AutonomyLadder` has states `passed | current | proposed | available | locked` and compact sizes `row` (8 × 8) and `panel` (28 × 6).
  - `PrivilegeCard` renders a privilege with a compact ladder.
  - `TrendChart` (`features/inbox`) draws one series against a dashed target.
- **Routes** (placeholders today; `routes.test.ts` pins the list):
  - `/reports/evidence`, `/reports/evidence/:agentId` (sample `med-rec`)
  - `/portfolio/activities/:activityId` (sample `allergy-recon`), `/portfolio/activities/:activityId/branches/:branchId` (sample `allergy-recon/branches/outside-records`)
  - `/operations/sampling`
  - `/inventory/promotions/:promotionId`, `/portfolio/promotions/:promotionId` (sample `prm-0007`)
- **2c precedent (Phase 5 R14):** "Previous item" and "Next item" are left out; "Download PDF" goes to `/reports/export?agent=`.
- **Agent view:** the Overview tab is replaced while paused (6d) and keeps the Controls menu; Phase 6 R11 kept Controls on 9a.
- **e2e:** `viewAs(page, name)` is redefined per spec, so set the persona before `?scenario=`. Rows are found with `[data-row-id]`. Assert `aria-disabled`, not clicks, on locked controls.

## Rulings (record each in the BUILD_PLAN decision log when its task lands)

- **R1 Time model.** As in Architecture. `redate.ts` gains `E12_SHIFT = -106`, `E13_SHIFT = -98` and `E15_SHIFT = E10_SHIFT`. Re-dated values this plan pins:
  - E12: survey window 14 Apr → **29 Dec** ("21 days"); gaps due 31 Mar → 15 Dec, 04 Apr → 19 Dec, 07 Apr → 22 Dec, 10 Apr → 25 Dec, 11 Apr → 26 Dec; "on 22 Mar" → "on 06 Dec"; 03 Mar → 17 Nov; 01 Mar → 15 Nov; "PSO report · Mar" → "· Nov".
  - E13/E14: 16 Dec → **09 Sep** (PRV-0087 v1); rules written 04 Jan → **28 Sep**; 12 Jan → 06 Oct; 19 Jan → 13 Oct; 02 Mar → **24 Nov**; Marcus requested 03 Mar → **25 Nov**; "in January" → "in October".
  - E15a: 05 Mar → 26 Nov; Epic upgrade 14 Mar → **05 Dec**; 16/17/18 Mar → 07/08/09 Dec.
- **R2 Allergy Recon's privilege is PRV-0087** (13a, 14a, 15b), not the seed's auto code.
  - v1 (closed, Draft, granted by Priya 09 Sep 10:00).
  - v5 (active, Draft, granted 16 Oct 10:00, review 14 Jan, conditions C1 and C3 from 14b).
  
  v2–v4 were renewals at the same level and aren't kept; History shows level changes only. Later auto codes shift by one (nothing pins them). 3d is unchanged ("All · 17"): it skips closed versions.
- **R3 Counts from data:**
  - 12a: "Agents in scope **41** · 5 divisions", "Elements covered **279 of 287** · 7 elements × 41 agents", "**33** more agents"; "Last export **01 Dec** · Mock survey" (EXP-0003 gains `note: 'Mock survey'`); "Exports · 2" counts packet exports.
  - 12b: "PRV-0142 v3" (15a's "v4"), "Board minutes 14 Oct", "Risk tier 3", "HS-04 fired × 3" from the hard stop. Records that refer to later events appear only once they exist (R5).
  - 13a: "About **7** checks a day of ~**340** outputs" (Allergy Recon's 344 actions, 1 in 50).
  - 14a: "90 days at Draft" and "Days at Reduced review · 14" from the privilege and level history; "2 of 412" from checks (R11).
  - 15a: "A trigger on PRV-0142 **v3** fired"; the exception takes the next code (15a's "EXC-6120").
- **R4 RUAIH coverage is catalogue plus live records.**
  - Elements, mapping rules, featured rows and gaps are catalogue.
  - Each cell's count = a catalogue base (the frame's number, the mapping as of `RUAIH_MAPPED_AT` = 08 Dec 09:52) + the records the state made since:
    - flags (Safety event reporting)
    - step-downs and accepted re-validations (Quality monitoring)
  - So 12a at baseline reads the frame's numbers exactly, and Ana's live flag or a step-down adds one.
  - **Rows:** the frame's eight featured agents, in its order; 15a's "Patient Messages Agent · Patient access · Shadow" is the seed's **Message Triage Agent · Patient messages · Shadow**. All other on-board agents fold into "33 more agents · All 7 elements covered"; clicking it lists them (composed). Their counts are a fixed default.
  - **The three hidden gaps** are invented: Discharge Summary · 2 · Privacy (Dana, 27 Dec); Message Triage · 2 · Privacy (Grace, 28 Dec); Message Triage · 3 · Data security (Grace, 28 Dec). So "5 owners" holds (Sam, Dana, Marcus, Priya, Grace).
- **R5 12b's records follow the state.**
  - Governance: "JD v3", the privilege's live code and version, "Board minutes <committee decision date>".
  - Quality monitoring: "Weekly scorecard", then "Step-down <date>" per step-down and "Re-validation <build>" per accepted change.
  - Safety event reporting: "<latest flag code> + <n − 1> flags", "HS-04 fired × <today's fires>" (left out at 0), "Blinded PSO report · Nov".
  - So at baseline Med Rec reads "FB-2290 + 6 flags" (its seven seeded flags), and only `epic-fixed-later` shows "Re-validation v1.5.0".
  - The gap line reads "No patient-facing notice yet · Dana · due 19 Dec".
- **R6 Tabs.**
  - 12a: Coverage, "Gaps · 8" (composed: every gap, by due date) and "Exports · 2" (composed: packet exports, newest first).
  - 12b: Coverage and "Exports · 2". **Records is left out**: it would need every record named (as Phase 6 left out 11a's Exceptions and Scorecards).
  - Activity page (13a, 15b): Privilege, Review level, Evidence, History.
    - On `/portfolio/activities/:id` the default tab is **Review level** (13a).
    - On `/branches/:branchId` the default tab is **History** (15b).
    - Privilege, Evidence and History on the activity page are composed (R18).
  - 13b: "Today · 6", "Checked this week · 31" and "Rules" (both composed).
- **R7 The export packet modal (12b)** serves both pages ("Export packet" on 12a opens it at "All agents").
  - **Scope:** the agent, its division ("Medications division · 20 agents"), all agents ("41 agents · 5 divisions").
  - **Period:** Last 3 months, Last 12 months (default), Since go-live.
  - **Include:** four boxes. "Open gaps with owner and due date" is always ticked (Checkbox `disabled`), because 12b's point is that gaps are listed, not hidden.
  - **Footer:** "About N min · P pages", with an invented formula: pages = agents × round(40 + 14.5 × months), so Med Rec over 12 months reads 214; minutes = max(1, round(pages / 100)).
  - **Export packet** calls `buildExport` with `format: 'packet'`, `masked: true` and `note: 'RUAIH evidence packet'`, then shows a confirmation notice: "EXP-0004 · RUAIH evidence packet · 214 pages. Logged."
  - **"Mapping rules"** opens a read-only list of which records count for each element (composed).
- **R8 Review levels.**
  - Each activity has a level: Tightened (every signed output checked), Normal (1 in 10) or Reduced (1 in 50).
  - Its four rules are numbers written by the sponsor. The rules table and "Edit rules" both render from those numbers:
    - `reduce`: 30 days, 300 checks, edit rate under 5 %
    - `restore`: edit rate above 5 % for 2 days; any defect; a new version
    - `tighten`: 2 defects in 5 batches
    - `relax`: 5 clean batches
  - **When the rules act:**
    - Only `restore` (a defect, or a new version) and `tighten` (defects within the last `batches` days) act live.
    - `reduce` and `relax` need days to pass, so they only show their counts. The demo clock doesn't run.
    - A batch is one day's draw.
  - **Activities without a record** show Normal with the template rules, written by their sponsor when the privilege was first granted.
  - **Seeded records** (others are invented):
    - Allergy Recon (13a verbatim, R1 dates)
    - Duplicate Rx: Reduced since 17 Nov, 126 checks
    - Vaccine History: Reduced since 03 Nov, 62 checks
  - **"Tighten now…"** takes a reason. Owner, sponsor or program lead may use it (the stoppers). Nobody can loosen by hand; there is no action for it.
  - **"Edit rules"** (composed modal, sponsor only, reason required) changes the numbers and is logged.
  - **The board's C4** ("no move to Reduced before …") is stored as `noReducedBefore`, and the `reduce` row reads "Held until <date> (C4)".
- **R9 The sampling queue.**
  - Today's six draws are state, verbatim from 13b (drawn 06:00). The detail lines of ACT-90412 are verbatim; the other five draws have invented lines in the same voice.
  - The group titles use the seed's activity names ("Flag duplicate therapy", "Reconcile vaccine history"), as 3d already does. 13b says "Flag duplicate prescriptions" and "Import vaccine history".
  - **"Record check"** stores the result:
    - **Right:** counts a check.
    - **Defect:** counts a check and a defect, and moves Reduced → Normal by rule. A second defect within 5 batches moves Normal → Tightened. Priya and Marcus are told (FYI).
    - **Can't tell:** counts as neither, and logs "Asked <reviewer> about <ACT>".
  - **"Skip"** selects the next unchecked draw; nothing is stored.
  - **"Checked this week · 31"** = 29 earlier this week (catalogue) + today's checked draws.
  - Only the agent owner records checks (`recordCheck: { owner: 'own' }`).
  - **The Rules tab** lists each Reduced activity with a link to its 13a, and any signed unit sampling change from 11b ("6 North: 20 % until 22 Dec"). The unit check (E11) runs separately from Marcus's queue.
  - **The division tab strip** gains "Sampling" → `/operations/sampling`.
- **R10 Branches.**
  - Allergy Recon's activity gets 14a's three branches:
    - `outside-records` "Add an allergy from outside records" (favourable, sub "Only adds caution; nothing is removed")
    - `update-reaction` "Update a reaction or severity" (sub "Can make an allergy look milder")
    - `remove-allergy` "Remove an allergy" (sub "Never, at any level", `lockedBy: 'HS-07 v1'`)
  - A branch's level defaults to its activity's. The promotion sets `outside-records` to Supervised; a step-down sets it back. The activity's own level (and the board row) stays Draft.
- **R11 Promotions.**
  - PRM-0007 (id `prm-0007`) asks Supervised for `outside-records`. Marcus requested it 25 Nov.
  - **The evidence:**
    - "Signed as is ≥ 98.0 % · 99.1 %" and "Rejected by the pharmacist ≤ 0.5 % · 0.1 %" are catalogue.
    - "Defects in independent checks ≤ 0.5 %" = catalogue base 2 of 411 + today's checked draws for the activity (so "0.49 % · 2 of 412" at baseline).
    - "Days at Reduced review ≥ 14" = days since the level became Reduced (0 if it isn't).
    - "90 days at Draft" = days since the branch first reached Draft. "4,212 adds" is catalogue.
    - The evidence is **frozen when the sponsor signs**, so 14b shows what Priya signed.
  - **A missed criterion locks signing** ("Every criterion must be met"). At Supervised no pharmacist signs each add, so it is stricter than 3c's below-target signature.
  - **Tier 3 and above:** "Sign and send to the board" records the signature and books the next meeting (09 Dec 15:00, "Item 2 of 4" from the frame). Dr. Lee gets "Review: promotion · Allergy Recon Agent" with a link, due at the meeting.
  - **Tier 2 and below:** "Sign and promote" takes effect at once (composed text: "Tier 2: your signature is enough. It takes effect at the gateway when you sign.").
  - **"Request changes"** goes back to Marcus with a note. Marcus gets "Promotion returned" (link) and, on 14a, "Send to Priya again" (composed).
  - The accountability line reads "until <meeting + 91 days>" ("10 Mar 2027").
  - **The board decides on 14b** (`approveGoLive`). The four outcomes as 2c:
    - **Approve, or approve with conditions:**
      - Writes PRV-0087 v6: Draft, with the branch at Supervised, conditions C1, C3 plus the new ones, review = decision + 91 days.
      - Sets the branch to Supervised and arms the branch's four step-down triggers.
      - Resets the review level to Normal by rule ("Promoted to Supervised · PRV-0087 v6").
      - Applies C4's hold.
      - Tells Priya and Marcus.
    - **Re-review** goes back to Priya with the board's reason; she can sign again.
    - **Deny** closes it ("Stays at Draft").
  - C4 is prefilled as a proposed condition: "Normal review for the first 60 days; no move to Reduced before <decision + 60 days>". It is removable, like 2c's, and "Add condition" adds free text.
  - "Approve with conditions" is preselected.
  - **Without a seeded inbox item.** Priya's 08 Dec inbox (5d) stays as drawn. She reaches 14a from the activity page's Privilege tab ("Marcus asked to promote … · Review the promotion") or a story step.
- **R12 Step-downs are one level at a time, by rule, at the gateway.**
  - **Threshold (15a):** the trigger on the privilege in force fires. The activity drops one level, and a new privilege version records it (`steppedDown`, `movedBy: 'PRV-0142 v3'`, `trigger`). Then:
    - the drafts in progress go to pharmacists (catalogue: 18)
    - the agent's judgment becomes "Stepped down automatically" (warn)
    - Marcus gets an exception (copied Priya and Dana) with the edit-rate trend
  - **Version (15b):** a build deployed **without a hold** steps every branch or activity **above Draft** down one level. A new privilege version records it, and a re-validation replay starts (catalogue snapshot: 1,412 of 2,104, about 40 min left). Activities on Reduced review go to Normal (R8).
    - A build **held** for re-validation (9a) steps nothing down: accepting it is the re-validation (Phase 6 R10).
    - Draft and Shadow aren't stepped down by a version change: a pharmacist already signs every output there.
    - The sponsor gets "Review: restore Supervised" (link), and the owner an FYI.
  - **Nothing steps up by itself.**
    - 15a ends when the sponsor signs a new version through 3c (`applySignPrivilege` closes the open step-down).
    - 15b ends with "Sign to restore Supervised" (`restoreLevel`, sponsor). It is locked until the replay has finished and meets every criterion: "Returning to a level already approved needs your signature, not the board (BR-07)." In `step-down-version` the replay is still running, so it stays locked; a unit test signs after the clock passes `doneAt`.
  - Running a rule twice doesn't drop two levels.
- **R13 15a sits in the agent view.**
  - While an activity of the agent has an open threshold step-down, the Overview tab shows 15a in place of 4c, as 6d does while paused.
  - The header reads "<activity> · Shadow since 06:00" with the chip "Stepped down automatically". The activity name is shortened as 3a does ("Reconcile home medications").
  - **The Controls menu stays** (15a omits it, as 9a did), so a stop is one click away.
  - "Open the exception" goes to the item. "Start an incident" opens one through `openIncident` and goes to it, or reads "Open INC-…" when one is already open.
  - "3 people told" names the viewer as "You" ("You, Priya and Dana"), and the exception line says "in your inbox" only to its owner ("in Marcus’s inbox" to others).
- **R14 14b's controls.** "Previous item" and "Next item" are left out; "Download PDF" goes to `/reports/export?agent=allergy-recon` (Phase 5 R14). Dr. Lee may decide before the meeting starts, as on 2c.
- **R15 The ladder grows.**
  - `AutonomyLadder` gains the state `held` ("Held until a step-down": white with a 1.5 px dashed ink border).
  - It also gains the compact size `wide`, measured from 14a. `labels` puts level names under the segments: current and proposed in bold, locked with a lock.
  - In `wide`, "proposed" is an indigo fill and "locked" is 14a's hatch, as 14a's legend draws them. `row` and `panel` keep the component sheet's outline and solid lock.
  - `LadderLegend` renders 14a's six swatches.
- **R16 Design-doc references.**
  - 14a's "Set in E2." reads "Set with the risk tier in AIMS Review."
  - 11a's "7 West and 8 East: see the step-down in E15" appears only while Med Rec has an open step-down. It reads "7 West and 8 East: see the step-down" and links to Med Rec's view.
- **R17 Scenarios:**
  - **`step-down-threshold`** (rewritten):
    1. Advance to 09 Dec 06:00 and `settleBefore` 09 Dec.
    2. Apply the threshold step-down at 06:00 (told 06:01).
    3. Advance to 09:52.
  - **`promotion-at-board`** (new):
    1. Priya signs PRM-0007 at 08 Dec 10:20 with 14a's reason.
    2. Advance to 09 Dec 15:10 and `settleBefore` 09 Dec.
  - **`step-down-version`** (new):
    1. From `promotion-at-board`, Dr. Lee approves with C4 at 15:20 with 14b's reason.
    2. Advance to 14 Dec 14:20 and `settleBefore`.
    3. Sam deploys Allergy Recon v1.3.0 at 14:20.
    4. Advance to 14:52.
  - October rewinds drop later promotions, draws and step-downs, and roll review levels back to their state on that day.
- **R18 Composed screens:**
  - 12a's Gaps and Exports tabs, the "33 more agents" list, and Mapping rules
  - 12b's Exports tab and the export confirmation
  - the activity page's Privilege tab (privilege card, branches table, promotion link), Evidence tab (the latest promotion's criteria, else the privilege's evidence line) and History tab (level changes of the activity's privilege)
  - "Edit rules" and "Tighten now…"
  - 13b's Checked this week and Rules tabs
  - 14a after signing, after "Request changes" and for Tier 2
  - 14b's "Waiting for Priya's signature" and "Decision logged" states

## Review focus

The failure modes most likely to bite a visitor that no screen test naturally covers. Each has a pinned test in the task named.

1. **Gates bypassed by calling the action directly.** Each is refused with a reason, and nothing changes:
   - Marcus signing a promotion, or Priya signing it twice
   - signing with a criterion missed, or without the accountability tick
   - Dr. Lee deciding before Priya signs, or deciding twice
   - restoring Supervised before the replay finishes
   - recording a check twice, Priya recording one, or "tighten" when already Tightened
   - Marcus editing the rules
   - Jordan doing any of it

   Pinned in Tasks 7.3 to 7.7.
2. **Rules apply once, one level at a time.**
   - A defect at Reduced moves to Normal once; a second defect that day moves to Tightened; a third does nothing more.
   - C4 holds Reduced off.
   - A new version moves Reduced to Normal and Supervised to Draft, but never Draft to Shadow.
   - Firing the same step-down twice, or chaining `promotion-at-board` → `step-down-version`, doesn't drop two levels.
   - Nothing returns to a higher level without a signature.

   Pinned in Tasks 7.3, 7.4, 7.6 and 7.7.
3. **Unknown ids and wrong-state URLs.**
   - These show NotFound:
     - `/reports/evidence/nope`
     - `/portfolio/activities/nope`
     - `/portfolio/activities/allergy-recon/branches/nope`
     - `/inventory/promotions/nope`
     - `/portfolio/promotions/nope`
   - These fall back calmly:
     - `/portfolio/activities/med-rec-admission` (no rules record) shows Normal with the template rules.
     - `?tab=nope` shows the default tab.
     - 14b for a promotion still waiting for Priya says so, with no decision form.
     - `/operations/sampling` as someone with no owned division shows Medications read-only.

   Pinned in Tasks 7.1, 7.3, 7.4 and 7.5.
4. **Counts stay consistent as the state moves.**
   - 12a's totals equal the sum of its rows.
   - An export adds to "Exports".
   - A step-down adds a Quality monitoring record.
   - "4 to check" falls and "Checked this week" rises as checks are recorded.
   - 14a's defects and Reduced days follow 13b.

   Pinned in Tasks 7.1, 7.4 and 7.5.
5. **Baseline drift and future leaks.**
   - No seed or catalogue string shows a 2027 date from the frames (Mar–Jul), "v1.2.4" or "v1.4.2".
   - At baseline these are unchanged:
     - 4a, 4b and Allergy Recon's board row ("Draft", "Within scope")
     - Marcus's 5a counts and Priya's 5d counts
     - 3d's "All · 17"

   Pinned in Task 7.1 (seed scan) and each task's e2e.

---

### Task 7.1: RUAIH coverage (12a) and the export packet (12b) (seed v8)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,inventory,redate}.ts`
  - `src/store/{index,mutations}.ts`
  - `src/app/router.tsx`
- Create:
  - `src/data/seed/evidence.ts`
  - `src/features/evidence/{EvidencePage,AgentEvidencePage,ExportPacketModal,MappingRulesModal}.tsx`
  - `src/features/evidence/{selectors.ts,evidence.module.css}`
- Tests:
  - `src/data/seed/seed.test.ts`
  - `src/features/evidence/selectors.test.ts`
  - `src/store/store.test.ts`
  - `tests/e2e/evidence.spec.ts`

**Interfaces (Produces):**
- **`redate.ts`:** `E12_SHIFT = -106`, `E13_SHIFT = -98`, `E15_SHIFT = E10_SHIFT`.
- **Types:**
  - `ExportRecord.note?: string`
  - `RuaihElement = 1 | 2 | 3 | 4 | 5 | 6 | 7`
  - `RuaihGap { agentId; element: RuaihElement; text; ownerId; due }`
- **`src/data/seed/evidence.ts`:**
  - `RUAIH_ELEMENTS: { n: RuaihElement; name: string }[]` (Governance; Privacy and transparency; Data security; Quality monitoring; Safety event reporting; Risk and bias; Education and training)
  - `RUAIH_FEATURED: string[]`: `['med-rec','discharge-meds','allergy-recon','renal-dosing','formulary-swap','discharge-summary','prior-auth','message-triage']`
  - `RUAIH_BASE: Record<string, Record<RuaihElement, number>>` for the featured agents. `RUAIH_DEFAULT = {1:4, 2:2, 3:4, 4:12, 5:2, 6:2, 7:2}`.
  - `RUAIH_GAPS: RuaihGap[]`: the 8 gaps (R4, R1 dates)
  - `RUAIH_CHIPS: Record<string, Partial<Record<RuaihElement, string[]>>>`: static chips (Med Rec verbatim, R1/R5)
  - `MAPPING_RULES: { element; records: string }[]`
  - `SURVEY_OPENS = fromMarch('2027-04-14T00:00:00', E12_SHIFT)`; `RUAIH_MAPPED_AT = DEMO_NOW`
- **Seed:** `SEED_VERSION = 8`; EXP-0003 `note: 'Mock survey'`.
- **`buildExport(input)`** accepts `note?: string` and stores it.
- **Selectors (`src/features/evidence/selectors.ts`):**
  - `ruaihCell(s, agentId, element): { count: number } | { gap: RuaihGap }`: base + live records (R4).
  - `selectCoverage(s, viewerId)`:
    - **Header:** breadcrumb "Reports / RUAIH evidence", title "RUAIH evidence", status "Survey window opens 29 Dec · 21 days", sub "Each agent’s records mapped to the seven elements of the Joint Commission and CHAI guidance on the Responsible Use of AI in Healthcare."
    - **Stats:**
      - "Agents in scope" 41 / "5 divisions"
      - "Elements covered" "279 of 287" / "7 elements × 41 agents"
      - "Open gaps" 8 / "5 owners, all dated"
      - "Last export" "01 Dec" / "Mock survey"
    - **Rows:** the featured rows, each `{ agentId, name, sub: '<division>' | '<division> · Shadow', cells }`, then `more: { count: 33, rows }`.
    - **Gaps,** by due date, each `{ element: '4 · Quality monitoring', due: '15 Dec', agent, text, owner: 'Owner Sam' }`.
    - The foot note, ending "Dana owns them."
    - The tab counts.
  - `selectAgentEvidence(s, agentId)`:
    - breadcrumb "Reports / RUAIH evidence / Med Rec Agent", title, status "6 of 7 elements covered", idLine "AGT-0123 · Medications"
    - seven rows `{ n, name, chips: string[], gapLine?: string, status: 'covered' | 'gap' }`
    - "Exports · 2"
    - `null` for an unknown or retired agent
  - `packetEstimate(agents: number, months: number) → { pages, minutes }`
- **Pages:** `EvidencePage` (12a; `?tab=gaps|exports`), `AgentEvidencePage` (12b; `?tab=exports`, `?export=1` opens the modal), `ExportPacketModal`, `MappingRulesModal`.

- [x] **Step 1: Failing tests**
  - **Seed:**
    - `SEED_VERSION` is 8; EXP-0003's note is "Mock survey".
    - **No future leaks:** the Phase 6 scan (`seed.test.ts`, "no seed or catalogue string shows a March date") also covers every export of `evidence.ts` (and, from Task 7.3, `autonomy.ts`). It rejects `/\b\d{2} (Mar|Apr|May|Jun|Jul)\b/` and "v1.2.4", as well as "v1.4.2" (the Claim Scrubber exemption stands).
  - **Selectors:**
    - Baseline stats read "41", "5 divisions", "279 of 287", "8", "5 owners, all dated", "01 Dec", "Mock survey".
    - The first row is Med Rec with cells 6, gap, 4, 22, 7, 3, 2. Message Triage reads "Patient messages · Shadow".
    - The covered cells across all rows plus the folded rows sum to 279.
    - After Ana flags DR-88412 (`applyFlag`), Med Rec's Safety cell reads 8 and its chip "FB-2291 + 7 flags".
    - Gaps are sorted 15 Dec, 19 Dec, 22 Dec, 25 Dec, 26 Dec, 27 Dec, 28 Dec, 28 Dec.
    - 12b for Med Rec reads "6 of 7 elements covered":
      - Governance chips `['JD v3', 'PRV-0142 v3', 'Board minutes 14 Oct']`
      - gap line "No patient-facing notice yet · Dana · due 19 Dec"
    - `packetEstimate(1, 12)` → 214 pages, 2 minutes.
    - `selectAgentEvidence(s, 'nope')` is null.
  - **Store:** `buildExport({ …, note: 'RUAIH evidence packet' })` as Dana stores the note; "Exports" on 12a then reads 3.
  - **e2e `evidence.spec.ts`:**
    - As Dana, `/reports/evidence` shows "279 of 287" and "Show 3 more" lists the 8th gap.
    - Open Med Rec → "Export packet" → "Export packet" shows "EXP-0004" and "Exports · 3".
    - `/reports/evidence/nope` shows Not found.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with visual checks against 12a and 12b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(evidence): RUAIH coverage and export packet (seed v8)"`.

### Task 7.2: Autonomy ladder: held state, wide size and legend

**Files:**
- Modify:
  - `src/components/AutonomyLadder/{AutonomyLadder.tsx,AutonomyLadder.module.css}`
  - `src/components/index.ts`
  - `src/prototype/ComponentGallery/{ProductSection.tsx,fixtures.tsx}`
- Test: `src/components/AutonomyLadder/AutonomyLadder.test.tsx`

**Interfaces (Produces):**
- `LadderState` adds `'held'`.
- `AutonomyLadderProps.size` adds `'wide'`; new `labels?: boolean` (wide only).
- `LadderLegend()` renders 14a's six rows verbatim:
  - Granted · current level in bold
  - Granted before
  - Held until a step-down
  - Proposed · needs signatures
  - Allowed, not requested
  - Locked by policy
- The compact aria label includes held: "Shadow current, Draft held".

- [x] **Step 1: Failing tests**
  - A `held` segment has `data-state="held"`.
  - `wide` with `labels` renders the four level names, with the current and proposed names bold and a lock icon beside a locked name.
  - The aria label for `[current, held, available, locked]` reads "Shadow current, Draft held".
  - `LadderLegend` renders the six lines.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement.**
  - Measure 14a's segments and labels (segment width, gap, height, label size).
  - Build the hatch from existing tokens; add none unless a colour is missing.
  - Add a wide ladder and the legend to the gallery's ladder section.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(components): ladder held state, wide size and legend"`.

### Task 7.3: The activity page and its review level (13a)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,activities,privileges}.ts`
  - `src/store/{index,permissions}.ts`
  - `src/data/scenarios/rewind.ts`
  - `src/app/router.tsx`
- Create:
  - `src/data/seed/autonomy.ts`
  - `src/store/levels.ts`
  - `src/features/activity/{ActivityPage,ReviewLevelTab,PrivilegeTab,EvidenceTab,HistoryTab,RulesModal,TightenModal}.tsx`
  - `src/features/activity/{selectors.ts,activity.module.css}`
- Tests:
  - `src/store/levels.test.ts`
  - `src/features/activity/selectors.test.ts`
  - `src/data/scenarios/rewind.test.ts`
  - `tests/e2e/levels.spec.ts`

**Interfaces (Produces):**
- **Types:**
  - `ReviewLevel = 'tightened' | 'normal' | 'reduced'` (`Activity.reviewLevel` uses it)
  - `ReviewRules { reduce: { days; checks; editRate }; restore: { editRate; days }; tighten: { defects; batches }; relax: { batches } }`
  - `LevelChange { at; from: ReviewLevel; to: ReviewLevel; by: 'rule' | string; why: string; sub?: string }`
  - `ReviewLevelRecord { activityId; rules; writtenBy; writtenAt; changes: LevelChange[]; checks; defects; defectDays: string[]; fired?: { checks; defects }; noReducedBefore? }`
  - `Activity.branches[]` gains `sub?: string`, `level?: Level`, `lockedBy?: string`
  - `DemoState.reviewLevels: ReviewLevelRecord[]`
- **Seed (`autonomy.ts`, R1/R2/R8/R10):**
  - `TEMPLATE_RULES = { reduce: {days: 30, checks: 300, editRate: 5}, restore: {editRate: 5, days: 2}, tighten: {defects: 2, batches: 5}, relax: {batches: 5} }`
  - **Allergy Recon's record:**
    - written by Priya 28 Sep
    - changes:
      - 06 Oct Normal → Tightened "2 duplicate allergies with different spellings · fixed in SOP v1.2.1"
      - 13 Oct Tightened → Normal "5 clean batches"
      - 24 Nov Normal → Reduced "Rule fired · 312 checks, 0 defects"
    - `checks: 84`, `defects: 0`, `fired: {checks: 312, defects: 0}`
    - its level starts Normal on 09 Sep
  - Duplicate Rx and Vaccine History records (R8).
  - Those three activities' `reviewLevel` is `'reduced'`.
  - Allergy Recon's three branches (R10).
  - PRV-0087 v1 (closed) and v5 (R2).
- **`src/store/levels.ts`:**
  - `levelOf(s, activityId): ReviewLevelRecord`: the record, or the template default.
  - `RATE: Record<ReviewLevel, { label: string; every: number }>`: Tightened "Every signed output checked" / 1, Normal "1 in 10 checked" / 10, Reduced "1 in 50 checked" / 50.
  - `ruleRows(s, activityId, now)`: four `{ move: 'Normal → Reduced', text, now: 'fired' | 'watching' | 'held' | 'off', at?, counts? }`. Text from the numbers, e.g. "30 days in a row with no defects, at least 300 checks, and an edit rate under 5 %".
  - `applyLevelChange(s, activityId, to, by, why, at, sub?)`: records the change, resets the counters, sets `activity.reviewLevel`, and tells the sponsor and owner (FYI).
  - `applyTighten(s, activityId, reason, by, at)`
  - `applyRules(s, activityId, input: { rules; reason }, by, at)`
  - `applyNewVersionLevels(s, agentId, at)`: Reduced → Normal "New agent or SOP version". Phase 6's `applyAccept` calls it.
- **Permissions:** `tightenReview: STOPPERS` ("Owner, sponsor or program lead") and `editReviewRules: { sponsor: 'own' }` ("Clinical sponsor only").
- **Store actions:**
  - `tightenReviewLevel(activityId, reason)`: refused without a reason, or when already Tightened ("Already at Tightened")
  - `updateReviewRules(activityId, rules, reason)`: refused without a reason or with a non-positive number
- **Selector `selectActivityPage(s, activityId, branchId | null, viewerId)`:**
  - **Header (13a):**
    - breadcrumb "Medications / Allergy Recon Agent / Privileges / PRV-0087"
    - title "Reconcile allergy lists"
    - status "Draft · review level Reduced"
    - idLine "PRV-0087 v5 · Allergy Recon Agent v1.2.0"
  - The tabs (R6) and `null` for an unknown activity or branch.
- **Selector `selectReviewLevel(s, activityId)`:**
  - **The three level cards,** current outlined; Reduced reads "since 24 Nov".
  - **Help line:** "Pharmacists still sign every output at Draft. The review level sets how many signed outputs a second pharmacist checks independently, to catch what the agent got wrong and the reviewer missed."
  - **Rules head:** "Rules that move the level · written by Priya, 28 Sep", "Edit rules".
  - **Rule rows:**
    - "Fired 24 Nov" with "312 checks · 0 defects"
    - "Watching" with "84 checks · 0 defects"
    - "Not in use" twice
  - **Lock notice:** "**Loosening happens only by rule.** You can tighten by hand at any time, with a reason; the rules then bring it back." and "Tighten now…"
  - **"Last 90 days":** segments Normal 09 Sep, Tightened 06 Oct, Normal 13 Oct, Reduced 24 Nov, each with its share of the window.
  - **"At Reduced":** "About 7 checks a day of ~340 outputs"; Checked by "Marcus · sampling queue"; Drawn "at random, 06:00 daily"; Since 24 Nov "84 checks · 0 defects"; Back to Normal "on 1 defect"; "**A defect** is a signed output that’s wrong: the agent erred and the reviewer didn’t catch it."
  - **"Level changes":** "Priya and Marcus are told each time", newest first.

- [x] **Step 1: Failing tests**
  - **`levels.test.ts`:**
    - `ruleRows` for Allergy Recon gives fired / watching / off / off with the frame's text.
    - Marcus tightening Allergy Recon with a reason sets Tightened, records "Reduced → Tightened" by Marcus with the reason, and tells Priya and Marcus.
    - Tightening again is refused.
    - Jordan tightening is refused.
    - Marcus editing the rules is refused. Priya editing `reduce.checks` to 400 changes the row text to "at least 400 checks".
    - `applyNewVersionLevels` moves Reduced → Normal once.
  - **Selector:**
    - 13a's header and side values as above.
    - `/portfolio/activities/med-rec-admission` gets Normal with the template rules "written by Priya, 06 Nov" (its privilege's first grant).
  - **Rewind:** at the 07 Oct rewind, Allergy Recon is Tightened and has no 24 Nov change.
  - **e2e `levels.spec.ts`:**
    - As Priya, `/portfolio/activities/allergy-recon` shows "Watching" and "84 checks · 0 defects".
    - "Tighten now…" with a reason shows "Tightened" outlined and the change at the top of Level changes.
    - `/portfolio/activities/nope` shows Not found.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 13a.
  - The composed Privilege tab: `PrivilegeCard` for the latest version and the branches table from 14a (wide ladders, `labels`).
  - The Evidence tab: the privilege's evidence line until a promotion exists (Task 7.5 adds its criteria).
  - The History tab: level changes from the privilege versions (Task 7.7 extends it for branches).
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(activity): review level and its rules (13a)"`.

### Task 7.4: The sampling queue (13b)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,autonomy}.ts`
  - `src/store/{index,permissions,levels}.ts`
  - `src/data/scenarios/rewind.ts`
  - `src/features/board/DivisionTabs.tsx`
  - `src/app/router.tsx`
- Create:
  - `src/features/sampling/{SamplingPage.tsx,selectors.ts,sampling.module.css}`
- Tests:
  - `src/store/levels.test.ts`
  - `src/features/sampling/selectors.test.ts`
  - `tests/e2e/sampling.spec.ts`

**Interfaces (Produces):**
- **Types:**
  ```
  SamplingDraw { id; actionCode: 'ACT-90412'; activityId; encounter: '7731'; unit: '8 East'; list: 'allergy list';
    signedBy: 'Lee T., PharmD'; signedAt; drawnAt; build: string;
    lines: { output: string; outputSub: string; source: string; chart: string }[];
    result?: 'right' | 'defect' | 'cantTell'; note?: string; checkedBy?: string; checkedAt? }
  ```
  `DemoState.samplingDraws`.
- **Seed:** the six draws, verbatim times and signers.
  - ACT-90330 and ACT-90351 are already `right` (checked by Marcus at 08:40 and 08:52, invented).
  - `CHECKED_EARLIER_THIS_WEEK = 29`.
- **`src/store/levels.ts`:** `applyCheck(s, drawId, { result, note }, by, at)` follows R9. A defect calls `applyLevelChange` with "1 defect in a check · ACT-90412". `cantTell` logs "Asked Lee T. about ACT-90412".
- **Permission:** `recordCheck: { owner: 'own' }` ("Agent owner only").
- **Store action** `recordCheck(drawId, { result, note? })`: refused once recorded ("Already checked").
- **Selector `selectSampling(s, viewerId, tab, drawId | null)`:**
  - **Header:** breadcrumb "Operations / Sampling queue", title "Sampling queue", status "Marcus · 3 activities on Reduced review".
  - **Tabs:** "Today · 6", "Checked this week · 31", "Rules".
  - **List head:** "6 drawn · 4 to check", "drawn 06:00".
  - **Groups:** "Reconcile allergy lists" / "Allergy Recon Agent · Reduced · 1 in 50", each with rows `{ id, title: 'ACT-90412 · enc 7731', sub: 'signed by Lee T., PharmD', time: '08:14', checked }`.
  - **The selected draw** (default: the first unchecked):
    - meta "ACT-90412 · Allergy Recon Agent v1.2.0 · signed as is 08:14"
    - title "Encounter 7731 · 8 East · allergy list"
    - lines, and "Your check, independent of Lee T."
    - the three radio cards verbatim
    - the notice "**One defect moves reconcile allergy lists back to Normal review.** Your result counts toward its rules as soon as you record it."
    - "Drawn at random · 1 in 50 · not chosen by anyone"
  - A viewer who isn't the owner sees the result read-only and "Record check" locked.
- **`DivisionTabs`** adds `{ id: 'sampling', label: 'Sampling', to: '/operations/sampling' }`.

- [x] **Step 1: Failing tests**
  - **`levels.test.ts`:**
    - Marcus records "Defect" on ACT-90412: Allergy Recon becomes Normal, the change reads "Reduced → Normal" by rule, Priya and Marcus are told.
    - "Defect" on ACT-90377 the same day → Tightened.
    - A third → still Tightened (no change).
    - Recording ACT-90412 twice is refused.
    - Priya recording is refused.
    - "Right" adds 1 to `checks`.
  - **Selector:**
    - Baseline reads "6 drawn · 4 to check" and "Checked this week · 31".
    - After one check: "3 to check" and "32".
    - After the defect the status reads "2 activities on Reduced review".
  - **e2e `sampling.spec.ts`:**
    - As Marcus, `/operations/divisions/medications` → Sampling → choose "Defect" → Record check. The next draw (ACT-90377) is selected.
    - As Priya, `/portfolio/activities/allergy-recon` shows Normal.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 13b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(sampling): sampling queue moves the review level (13b)"`.

### Task 7.5: Sponsor signs the promotion (14a); the board decides (14b)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,autonomy}.ts`
  - `src/store/index.ts`
  - `src/data/scenarios/{index,rewind}.ts`
  - `src/features/activity/{PrivilegeTab,EvidenceTab}.tsx`
  - `src/app/router.tsx`
- Create:
  - `src/store/promotions.ts`
  - `src/features/promotion/{PromotionPage,BoardDecisionPage,WhoDecides}.tsx`
  - `src/features/promotion/{selectors.ts,promotion.module.css}`
- Tests:
  - `src/store/promotions.test.ts`
  - `src/features/promotion/selectors.test.ts`
  - `src/data/scenarios/scenarios.test.ts`
  - `tests/e2e/promotion.spec.ts`

**Interfaces (Produces):**
- **Types:**
  ```
  PromotionCriterion { label; target; result; met: boolean }
  Promotion { id; activityId; branchId; privilegeCode; from: Level; to: Level; requestedBy; requestedAt;
    state: 'sponsor' | 'board' | 'returned' | 'approved' | 'denied';
    evidence?: { days: number; outputs: string; criteria: PromotionCriterion[] }  // frozen at signing
    sponsor?: { by; at; reason }; board?: { meeting: string; item: number; of: number };
    returned?: { by; at; note }; decision?: ReviewDecision }
  ```
  `DemoState.promotions`.
- **Catalogue (`autonomy.ts`) `PROMOTION_CONTENT['prm-0007']`:**
  - `summary`: "At Supervised, this branch writes to the chart without a pharmacist signing each add. Adds are checked by sample, and every step-down trigger stays armed."
  - `stats`: signed 99.1 / 98.0, rejected 0.1 / 0.5, defects base `{ defects: 2, checks: 411 }`, outputs "4,212 adds"
  - `note`: "The 2 defects were duplicate allergies spelled differently, in October. SOP v1.2.1 fixed them; none since."
  - `atLevel`:
    - In the chart: "Adds appear as “added by Allergy Recon Agent, checked by sample”"
    - Pharmacists: "Stop signing each add; still sign updates to reaction or severity"
    - Review level: "Resets to Normal: 1 in 10 adds checked"
    - Steps down to Draft on: "Any defect in a check · a new agent or SOP version · any linked incident"
  - `triggers`: the four 15b lines
  - `staysTheSame`: 14b's three lines
  - `agenda: { item: 2, of: 4 }`
- **`src/store/promotions.ts`:**
  - `criteria(s, id): PromotionCriterion[]` (R11)
  - `applySignPromotion(s, id, reason, by, at)`
  - `applyReturnPromotion(s, id, note, by, at)`
  - `applyResendPromotion(s, id, by, at)`
  - `applyDecidePromotion(s, id, { kind, conditions, reason }, by, at)`
  - `c4(at): Condition`: "Normal review for the first 60 days; no move to Reduced before <at + 60 days>"
- **Store actions:**
  - `signPromotion(id, { reason, accepted })` (`signPrivilege`): refused unless `state === 'sponsor'`, every criterion met, a reason, and `accepted`
  - `returnPromotion(id, note)` (`signPrivilege`)
  - `resendPromotion(id)` (`requestGoLive`)
  - `decidePromotion(id, { kind, conditions, reason })` (`approveGoLive`, agent context): refused unless `state === 'board'`, or without a reason
- **Selector `selectPromotion(s, id, viewerId)` (14a):**
  - **Header:**
    - breadcrumb "Medications / Allergy Recon Agent / Privileges / PRV-0087"
    - title "Promote “add an allergy from outside records” to Supervised"
    - idLine "PRV-0087 v6 draft"
    - chip "Review: your signature" for the sponsor while waiting ("Waiting for Priya" for others); "With the board" after signing
    - sub = `summary`
  - **Branches:** "Reconcile allergy lists · 3 branches", the rows with wide ladders, notes "This promotion" / "Stays at Draft" / "HS-07 v1".
  - **Evidence:** "Evidence · 90 days at Draft · 4,212 adds", "Open sampled cases" (→ `/operations/sampling?tab=week`), criteria rows, the note.
  - **"What changes at Supervised"** rows.
  - **"Who decides":** "Marcus requested · 25 Nov"; "You sign as sponsor · now"; "AI review board decides · 09 Dec · Tier 3"; "Takes effect at the gateway · on approval"; "**Tier 2 and below:** the sponsor’s signature is enough. Set with the risk tier in AIMS Review."
  - **Signature:**
    - notice "**Tier 3: this goes to the AI review board after you sign.** Nothing changes until the board approves. Dr. Lee sees your reason and this evidence."
    - "Reason" / "Required for a promotion"
    - "I accept accountability for this branch at Supervised until 10 Mar 2027, or until it steps down."
    - "Sign and send to the board", "Request changes", "Cancel"
- **Selector `selectBoardDecision(s, id, viewerId)` (14b):**
  - **Header:**
    - breadcrumb "Portfolio / AI review board / 09 Dec 2026 / Item 2 of 4"
    - title "Promotion · Allergy Recon Agent"
    - status "Tier 3 · signed by Priya 08 Dec"
    - idLine "PRV-0087 v6"
    - chip "Review: your decision"
    - "Download PDF"
  - **Paper:**
    - "Add an allergy from outside records · Draft to Supervised"
    - "Reconcile allergy lists · Medications · owner Marcus · sponsor Priya"
    - the ladder
    - "Evidence · 90 days · 4,212 adds" with four stats (Signed as is 99.1 % "target ≥ 98 %", Rejected 0.1 % "target ≤ 0.5 %", Check defects "2 of 412" "target ≤ 0.5 %", At Reduced "14 days" "target ≥ 14")
    - "Priya’s reason · 08 Dec" quoted, "Stays the same", "Steps down to Draft on"
  - **Decision panel:**
    - "Your decision" / "Logged with your reason. Conditions carry onto PRV-0087."
    - four radio cards, "Approve with conditions" preselected
    - "Conditions" with C4, "Add condition", "Reason", "Record decision", "Cancel", "Logged as Dr. Lee · AI review board chair"
  - **Other states:** "Waiting for Priya’s signature" while `sponsor`; "Decision logged" after.
- **Activity Privilege tab:** while a promotion of a branch waits, "Marcus asked to promote “add an allergy from outside records” to Supervised on 25 Nov." with "Review the promotion". **Evidence tab:** the latest promotion's criteria.
- **Scenario `promotion-at-board`** (R17) and its id in `ScenarioId`.

- [x] **Step 1: Failing tests**
  - **`promotions.test.ts`:**
    - Priya signing with the reason and `accepted` sets `board` with meeting 09 Dec 15:00 and item 2 of 4, freezes the evidence, and raises Dr. Lee's "Review: promotion · Allergy Recon Agent" due 09 Dec 15:00.
    - Priya signing twice is refused. Marcus signing is refused. Signing without `accepted` is refused.
    - After Marcus records a defect on ACT-90412, signing is refused with "Every criterion must be met".
    - Dr. Lee deciding while `sponsor` is refused.
    - Dr. Lee approving with C4 on 09 Dec 15:20:
      - writes PRV-0087 v6 (v5 closed, branch Supervised, conditions C1, C3, C4, review 10 Mar 2027)
      - sets the branch to Supervised and the level to Normal ("Promoted to Supervised · PRV-0087 v6")
      - sets `noReducedBefore` 07 Feb 2027
      - resolves Dr. Lee's item
    - Deciding twice is refused.
    - Re-review returns it to `sponsor` with the reason shown.
    - A Tier 2 promotion takes effect when the sponsor signs.
  - **Selectors:** 14a's accountability line ends "until 10 Mar 2027, or until it steps down."; 14b's breadcrumb, status and "2 of 412".
  - **Scenario:** `promotion-at-board` at 09 Dec 15:10 has the promotion at `board` and Dr. Lee's item open.
  - **e2e `promotion.spec.ts`:**
    - As Priya, `/portfolio/activities/allergy-recon?tab=privilege` → Review the promotion → type the reason, tick, "Sign and send to the board" → "With the board".
    - As Dr. Lee, the inbox item → 14b → "Record decision" → "Decision logged".
    - As Priya, the Privilege tab shows the branch at Supervised.
    - `/portfolio/promotions/nope` shows Not found.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual checks against 14a and 14b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(promotion): sponsor signs one branch; the board decides Tier 3 (14a, 14b)"`.

### Task 7.6: Step down on a threshold breach (15a)

**Files:**
- Modify:
  - `src/data/types.ts`
  - `src/data/seed/{index,autonomy}.ts`
  - `src/store/{index,onboarding}.ts`
  - `src/data/scenarios/{index,rewind}.ts`
  - `src/features/board/{AgentView.tsx,selectors.ts}`
  - `src/features/inbox/TrendChart.tsx`
  - `src/features/reviewers/{ReviewersPage.tsx,selectors.ts}`
- Create:
  - `src/store/stepdowns.ts`
  - `src/features/stepdown/{StepDownOverview.tsx,selectors.ts,stepdown.module.css}`
- Tests:
  - `src/store/stepdowns.test.ts`
  - `src/features/stepdown/selectors.test.ts`
  - `src/data/scenarios/scenarios.test.ts`
  - `tests/e2e/stepdown.spec.ts`

**Interfaces (Produces):**
- **Types:**
  ```
  StepDown { id; agentId; activityId; branchId?; cause: 'threshold' | 'version' | 'incident';
    from: Level; to: Level; at: string; fired: string /* 'PRV-0142 v3' */; written: string /* 'PRV-0142 v4' */;
    trigger: string; routed: number; told: string[]; exceptionId?: string;
    build?: { from: string; to: string; by: string };
    revalidation?: { cases: number; replayed: number; left: string; same: number; better: number; worse: number; worseCount: number; doneAt: string; meets: boolean };
    restoredAt?: string; restoredBy?: string }
  ```
  `DemoState.stepDowns`.
- **Catalogue `STEP_DOWN_MED_REC`** (R1 dates):
  - `series`: 14 daily edit rates ending 16.8, 17.9, 18.4
  - `days`: 26 Nov … 09 Dec
  - `threshold: 15`, `routed: 18`, `units: '7 West and 8 East worklists, within a minute'`
  - `cause`: "Pharmacists are splitting frequency fields since the Epic upgrade on 05 Dec"
  - `timeline`:
    - 07 Dec "Edit rate 16.8 %" / "Day 1 above 15 %"
    - 08 Dec "Edit rate 17.9 %" / "Day 2 · Marcus warned"
    - 09 Dec "Edit rate 18.4 %" / "Day 3 · trigger fired"
- **`src/store/stepdowns.ts`:**
  - `LOWER: Record<Level, Level | null>` (one level at a time)
  - `applyThresholdStepDown(s, activityId, input: { trigger; routed }, at)` (R12), refused when the activity has an open step-down
  - `openStepDown(s, activityId, branchId?)`
  - `closeStepDowns(s, activityId, by, at)`, called by `applySignPrivilege` when a new version is signed for the activity
- **Selector `selectStepDown(s, agentId, viewerId)` → null or 15a's view:**
  - `levelLine` "Reconcile home medications · Shadow since 06:00", chip "Stepped down automatically"
  - **notice:** "**Reconcile home medications stepped down from Draft to Shadow at 06:00.** A trigger on PRV-0142 v3 fired: edit rate above 15 % for 3 days in a row. It was 16.8 %, 17.9 % and 18.4 %." with "Open the exception" and "Start an incident"
  - **"Edit rate · 14 days":** the chart with the dashed threshold and the last three points in amber; axis "26 Nov", "Dashed line · step-down threshold 15 %", "Today"
  - **"What happened at 06:00":**
    - 18 "drafts in progress went to pharmacists" / "7 West and 8 East worklists, within a minute"
    - 0 "drafts reach pharmacists from now on" / "The agent keeps running in shadow and is compared with pharmacists’ lists"
    - 3 "people told" / "You, Priya and Dana · exception EXC-#### in your inbox"
  - **"Back to Draft":**
    - 1 "Find and fix the cause" (cause) "Marcus, Sam"
    - 2 "Shadow scorecard meets the same targets" / "At least 7 days on the fixed version" "Evidence"
    - 3 "Priya signs again" / "A new version of PRV-0142" "Priya"
  - "Nothing steps back up automatically. Moving up always needs a signature."
  - **Side:**
    - "Reconcile home medications" / "Autonomy level", with a wide labelled ladder (current Shadow, held Draft, available Supervised, locked Autonomous)
    - "**Dashed:** the level it held until 06:00."
  - **Timeline:**
    - the three days
    - "06:00 Stepped down to Shadow / At the gateway, by rule"
    - "06:01 Told Marcus, Priya, Dana / EXC-####"
- **`TrendChart`** gains `highlight?: number`: the last n points in the accent colour.
- **`AgentView`:** while `selectStepDown` is non-null, the Overview tab renders `StepDownOverview`, and the header uses its level line and chip (R13).
- **11a:** "By unit · last 4 weeks" adds "7 West and 8 East: see the step-down" (→ `/operations/agents/med-rec`) while Med Rec has an open threshold step-down (R16).
- **Scenario `step-down-threshold`** rewritten (R17).

- [x] **Step 1: Failing tests**
  - **`stepdowns.test.ts`:**
    - Applying the threshold step-down at 09 Dec 06:00:
      - moves `med-rec-admission` Draft → Shadow
      - writes PRV-0142 v4 (`steppedDown`, `movedBy: 'PRV-0142 v3'`) and closes v3
      - sets Med Rec's judgment to warn "Stepped down automatically"
      - raises Marcus's exception (copied Priya and Dana) with the trend
    - Applying it twice changes nothing more.
    - `LOWER.shadow` is null.
    - Signing PRV-0142 back to Draft through `applySignPrivilege` sets `restoredAt`.
  - **Selector:**
    - the notice text above
    - "You, Priya and Dana" for Marcus and "Marcus, Priya and Dana" for Jordan
    - the exception line matches `/exception EXC-\d{4} in your inbox/` for Marcus and "in Marcus’s inbox" for Jordan
  - **Scenario:** `step-down-threshold` is at 09 Dec 09:52; 4b lists Med Rec at Shadow with "Stepped down automatically"; nothing from 08 Dec is overdue.
  - **e2e `stepdown.spec.ts` (threshold):**
    - As Marcus with `?scenario=step-down-threshold`, the Med Rec view shows "stepped down from Draft to Shadow at 06:00" and the Controls menu.
    - "Open the exception" opens the inbox item.
    - 11a shows "7 West and 8 East: see the step-down".
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 15a.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(stepdown): threshold breach drops Draft to Shadow (15a)"`.

### Task 7.7: Step down on a version change (15b)

**Files:**
- Modify:
  - `src/data/seed/autonomy.ts`
  - `src/store/{index,stepdowns,changes}.ts`
  - `src/data/scenarios/index.ts`
  - `src/features/activity/{ActivityPage,HistoryTab}.tsx`
  - `src/features/stepdown/selectors.ts`
- Create: `src/features/stepdown/BranchHistory.tsx`
- Tests:
  - `src/store/stepdowns.test.ts`
  - `src/features/stepdown/selectors.test.ts`
  - `src/data/scenarios/scenarios.test.ts`
  - `tests/e2e/stepdown.spec.ts`

**Interfaces (Produces):**
- **Catalogue `ALLERGY_V130`:** build "v1.3.0", by Sam; revalidation `{ cases: 2104, replayed: 1412, left: 'about 40 min left', same: 99.6, better: 0.3, worse: 0.1, worseCount: 2, minutes: 40, meets: true }`.
- **`src/store/stepdowns.ts`:**
  - `applyVersionDeploy(s, agentId, { build, by }, at)` (R12):
    - sets `agent.version`
    - for each branch or activity above Draft: one level down, a new privilege version, a `StepDown` with `cause: 'version'` and the revalidation (`doneAt = at + 72 min`)
    - `applyNewVersionLevels`
    - the sponsor's "Review: restore Supervised" item (link to the branch page) and the owner's FYI
    - deploying the same build twice does nothing
  - `applyRestore(s, stepDownId, by, at)`: refused until `now >= doneAt` and `meets`. Writes the next privilege version at the old level and sets `restoredAt`.
- **Store action** `restoreLevel(stepDownId)` (`signPrivilege`): refused while the replay runs with "Opens when the replay finishes".
- **Selector `selectBranchHistory(s, activityId, branchId, viewerId)` (15b):**
  - **header:** title "Add an allergy from outside records", status "Draft since 14 Dec 14:20 · was Supervised", idLine "PRV-0087 v7 · Allergy Recon Agent v1.3.0"
  - **notice:** "**Stepped down to Draft when Allergy Recon Agent v1.3.0 was deployed.** Any new agent or SOP version re-earns Supervised. Until then pharmacists sign each add again; nothing was lost."
  - **"Re-validation · replay of the last 30 days on v1.3.0":** "1,412 of 2,104 adds replayed", "about 40 min left", "Same result as v1.2.0" 99.6 %, "Different, and better" 0.3 %, "Different, and worse" "0.1 % · 2 adds"
  - **"History"** rows, newest first, each with a wide ladder (the first selected, with labels):
    - 14 Dec 14:20 "Stepped down to Draft" / "New agent version v1.3.0, deployed by Sam"
    - 09 Dec "Promoted to Supervised" / "Board approved with C4 · Dr. Lee"
    - 08 Dec "Priya signed the promotion" / "Sent to the board"
    - 09 Sep "Draft" / "Priya signed PRV-0087 v1"
  - **Restore:** "Sign to restore Supervised" (locked) with "**Opens when the replay finishes** and meets every criterion. Returning to a level already approved needs your signature, not the board (BR-07)."
  - **Side:** "Step-down triggers on this branch" / "Armed at every level above Shadow"
    - "Any new agent or SOP version · fired 14 Dec · to Draft"
    - "Any defect in an independent check · to Draft"
    - "Any linked incident · to Draft"
    - "Rejections above 0.5 % for 3 days · to Draft"
    - "**One level at a time.** Supervised drops to Draft, Draft to Shadow. Nothing steps up by itself."
- **Scenario `step-down-version`** (R17) and its id.

- [x] **Step 1: Failing tests**
  - **`stepdowns.test.ts`:**
    - After the board approves, deploying v1.3.0 at 14 Dec 14:20:
      - moves `outside-records` Supervised → Draft
      - writes PRV-0087 v7 (v6 closed)
      - leaves the activity at Draft (never Shadow)
      - keeps the review level Normal
      - raises Priya's "Review: restore Supervised"
    - Deploying again does nothing.
    - Deploying a build to Med Rec (all Draft and Shadow) steps nothing down.
    - `restoreLevel` at 14:52 is refused; after `advanceClock` to 15:40 it writes v8 with the branch at Supervised.
    - Marcus restoring is refused.
  - **Selector:** 15b's header, notice, re-validation line and the four history rows above.
  - **Scenario:** `step-down-version` is at 14 Dec 14:52; the branch is Draft; Med Rec is untouched.
  - **e2e `stepdown.spec.ts` (version):**
    - As Priya with `?scenario=step-down-version`, `/portfolio/activities/allergy-recon/branches/outside-records` shows "History" selected, "1,412 of 2,104 adds replayed", and "Sign to restore Supervised" with `aria-disabled="true"`.
    - `/portfolio/activities/allergy-recon/branches/nope` shows Not found.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement**, with the visual check against 15b.
- [x] **Step 4: Run.** Expected: PASS.
- [x] **Step 5: Commit** with `git commit -m "feat(stepdown): version change drops Supervised to Draft (15b)"`.

### Task 7.8: Journeys, frame audit and checkpoint

- [x] **Step 1: e2e journeys** (`tests/e2e/journeys.spec.ts`):
  - **"autonomy is earned":**
    1. **Marcus** at `/operations/sampling` records "Right as signed" on ACT-90412.
    2. **Priya** signs PRM-0007 from the activity page.
    3. **Dr. Lee** approves with conditions from the inbox.
    4. **Priya** sees the branch at Supervised and the review level Normal, held until 06 Feb (C4 from a decision on 08 Dec).
  - **"autonomy never outlives its evidence":**
    1. Load `?scenario=step-down-threshold` as **Marcus**: Med Rec shows 15a.
    2. Load `?scenario=step-down-version` as **Priya**: 15b with restore locked.
- [x] **Step 2:** `pnpm check` and `pnpm e2e` green.
- [x] **Step 3: Frame audit.**
  - Every row in the BUILD_PLAN frame tracker is built (☑ Built) and visually checked against its frame.
  - The route table has no placeholder left for phases ≤ 7; `Placeholder` remains only for Phase 8 routes (`/`, `/about`).
- [x] **Step 4: Checkpoint** per the BUILD_PLAN protocol:
  - Push, then open the PR "Phase 7: Earned autonomy" with `Closes #8`.
  - Run the fresh whole-branch review and apply its fixes test-first.
  - Visual QA of 12a, 12b, 13a, 13b, 14a, 14b, 15a and 15b against their scenarios; tick them in the frame tracker.
  - Write the handoff notes, then update Start here, the decision and session logs, and the PR body.
  - **STOP and ask Stefan to review.**
