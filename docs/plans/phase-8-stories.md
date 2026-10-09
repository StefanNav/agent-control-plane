# Phase 8: Stories and portfolio layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visitor can follow any persona's story across the real screens, or explore freely (spec §4). In this phase:
- a story engine: `?story=&step=` on any route, a narration panel, an outline on the step's target, and the scenario each step needs;
- seven stories, one per persona, written against the screens as they exist;
- the landing page `/`, the About page `/about`, and a "Best viewed on a desktop" page below 1024 px.

**Architecture:**
- **Stories are data.** `src/prototype/stories/<persona>.ts` each export one `Story`; `src/prototype/stories/index.ts` lists them in persona order (Marcus first, as `PERSONAS`). A step names its route, title, 2–3 sentences of narration, an optional `data-story-target` and an optional scenario it needs.
- **The engine is pure** (`src/prototype/stories/engine.ts`): clamp a step, the scenario a step needs, its href, what to load when it opens, and what to do about the URL. Everything that can go wrong for a visitor (bad links, stale progress, wandering off) is decided here and unit-tested.
- **Progress lives in its own small persisted store** (`src/prototype/stories/progress.ts`, key `acp-story`), apart from the hospital's `DemoState`. A refresh reads it, so it never reloads a scenario over the visitor's own changes. Reset demo clears it.
- **Glue** (`src/prototype/stories/apply.ts`, `useStory.ts`): opening a step loads its scenario if needed (`loadScenario`), switches to the story's persona (`setPersona`) and records progress. Next/Back/Start do this before navigating; the URL sync does it for deep links, refreshes and browser history.
- **One layer in the shell.** `StoryLayer` (URL sync, `StoryPanel`, page spacer) renders in the `app` and `prototype` shells (Ana's story runs on `/epic`), not on `/wall`.
- **The desktop gate wraps the router** in `main.tsx`, so below 1024 px nothing of the app renders: no scenario loads, no dialog opens.

**Tech stack:** as Phase 7. No new dependencies.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md` (§4.1 prototype bar, §4.2 landing, §4.3 guided stories, §4.4 persona switcher, §4.5 reset, §4.6 About, §4.7 viewport policy, §6.3 scenarios). Source docs for About: `reference/source-docs/Vision.docx` and `PRD.docx` (local only; read them, never quote the company name).

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- **The real company name never appears.** The source docs name it; the brand is **Signal**. Run the forbidden-terms check before every push.
- **No frames exist for this phase's screens.** Landing, About, the panel and the gate are composed from existing primitives and tokens (`Card`, `Button`, `LinkButton`, `Notice`, type classes). Calm, not marketing-styled: no hero images, no gradients, no large display type.
- **Colour:** indigo only for the primary action ("Next", "Explore freely"); the outline on a story target is ink (`--cs-ink`), the same language as focus. No teal, amber or red in the prototype layer.
- **Copy rules:**
  - Story narration is 2–3 sentences per step, present tense, and names people (no he/she/his/her). A unit test checks both.
  - Numbers, names and dates in narration match what the screen shows in that step's scenario.
  - Product screens are not changed by this phase, except for `data-story-target` attributes.
- **No `Date.now()`** in product code; the prototype layer doesn't need the clock.
- **`SEED_VERSION` stays 8.** Nothing in the seed or `DemoState` changes. The story store has its own version (1).
- **Locked controls** keep using `Button locked`. The panel's own buttons are never locked; "Back" is left out on step 1.

## Phase-7 facts this plan relies on

- **Store** (`src/store/index.ts`): `useDemo` with `setPersona(id)`, `reset()` (seed, clock, Marcus) and `loadScenario(id)` (keeps `personaId`); `dataOf(store)`; `createDemoStore(storage)` for tests; `safeStorage` / `createMemoryStorage()` in `src/store/storage.ts`.
- **Scenarios** (`src/data/scenarios/index.ts`): `ScenarioId`, `SCENARIO_IDS`, `buildScenario(id)`. This phase uses `baseline`, `med-rec-paused`, `shadow-day-21`, `awaiting-signature`, `resume-requested`, `step-down-threshold`, `step-down-version`, `onboarding-intake`, `review-risk-tier`, `onboarding-tools-tested`, `onboarding-returned-hs11`, `change-detected-v150`, `review-committee`, `review-decided`, `promotion-at-board`, `epic-fixed-later`.
- **Shell** (`src/app/AppShell.tsx`): `prototype` shell = PrototypeBar + `<main>` (routes `/`, `/about`, `/about/components`, `/epic`); `app` shell adds TopNav; `kiosk` (`/wall`) renders the page alone. `?scenario=` is handled by `useScenarioParam`.
- **Routes:** `/` and `/about` are Phase 8 placeholders (`routeTable` phase 8). `tests/e2e/routes.spec.ts` asserts no placeholder for `phase <= 7`.
- **Prototype layer:** `PERSONAS` (`src/prototype/personas.ts`: id, name, initial, roleLabel, landing); `PersonaSwitcher`; `PrototypeBar` with a muted "Stories" label and "Reset demo" (resets, then goes to Marcus's landing).
- **Primitives:** `Menu` (groups of `{ id, label, sub, onSelect, selected, locked }`), `Modal` (portal to `body`, z-index 50, traps focus), `Button` (spreads extra props, so `data-story-target` passes through), `LinkButton` (does not spread props), `Card`/`Paper` (spread props).
- **Query params that open things:** `?control=pause-agent|shadow` on the agent view, `?export=1` on 12b, `?agent=` on `/inventory` (selects a row) and on `/reports/export` (preselects an agent), `?tab=` everywhere.
- **e2e:** `collectErrors(page)` from `tests/e2e/console.ts`; persona menu is `button /^Viewing as/` → `menuitem`.

## Rulings (record each in the BUILD_PLAN decision log when its task lands)

- **R1 Story ids are persona ids** (`marcus`, `priya`, `dana`, `sam`, `drlee`, `ana`, `jordan`); steps are 1-based: `?story=marcus&step=3`.
- **R2 What state a step shows.**
  - A step's scenario is the latest `scenarioPatch` at or before it, else the story's `scenarioId`. A patch is a time skip; it holds for the steps after it.
  - Starting a story always loads its scenario. Opening a step whose scenario differs from the one loaded loads it, forward or back. Steps that share a scenario keep the visitor's changes.
  - `keep(state)` on the step that declares a patch accepts the visitor's own equivalent action instead of loading: Marcus's pause (step 7) and Dr. Lee's approval (step 3).
  - Opening a step always switches to the story's persona.
- **R3 The URL mirrors progress.**
  - A product link drops `?story=&step=`; the sync adds them back (replace), so the address bar is always shareable.
  - A known story with a different step than the saved one (a shared link, browser back) opens that step where the visitor is, without navigating; the panel offers "Return to this step".
  - An unknown story is ignored and its params removed (Review focus 4). A missing, non-numeric or out-of-range step is clamped and the param rewritten.
- **R4 Progress is its own store** (`acp-story`, version 1). Saved progress that names an unknown story, a step out of range or an unknown scenario is dropped. Reset demo and Exit clear it.
- **R5 The narration panel.**
  - Fixed bottom-right (24 px from each edge), 360 px wide, `--cs-raised`, 1 px `--cs-line-strong`, radius 6, `--cs-shadow-modal`, z-index 60: above dialogs, so a step's narration stays readable while its dialog is open.
  - Shows the story title, "Step 3 of 9", the step title and body; Back (not on step 1), Next ("Finish" on the last step), Exit, and Hide/Show.
  - "You’ve left this step. Return to it" when the path differs from the step's route.
  - The last step adds: "End of {name}’s story. Keep exploring as {name}, or pick another from Stories."
  - Finish = Exit: progress cleared, params removed, data kept, visitor stays on the screen.
  - While the panel is open the shell adds 280 px of space under `<main>`, so nothing is stuck under it.
- **R6 The outline.** The current step's `target` gets `outline: 2px solid var(--cs-ink); outline-offset: 2px` from one `<style>` rule the panel renders (`[data-story-target="…"]`), so it applies whenever that element renders. On a step change it is scrolled into view (`block: 'center'`) if it isn't fully visible. Steps whose route opens a dialog have no target: the dialog is the focus.
- **R7 Story-specific choices.**
  - Priya's "My privileges (overdue review)" runs at baseline (08 Dec), where Duplicate Rx is 7 days overdue; 06 Nov has none.
  - Sam's story starts at `onboarding-tools-tested` (1d as drawn).
  - Jordan's incident is INC-0031 at `resume-requested` (7c as drawn).
  - Dana retires IV-to-Oral Agent (6f as drawn).
  - Ana's "nine days later" loads `epic-fixed-later` by patch, not `?day=later`.
- **R8 Rewind fix.** `rewindTo` rolled a later signing back by the agent's tier cycle (366 days for Tier 1) while seeded review dates are 91 days after signing, so in October and November scenarios five privileges read "Review overdue · 269 days". A privilege now rolls back by its own interval (`reviewDate − grantedAt`); the tier cycle is used only when it has no review date.
- **R9 Landing, About and gate copy is ours** (no frames), written from the Vision and PRD with Signal as the brand; it says Signal, Lakeshore Health and its people are fictional. Persona cards read in `PERSONAS` order.
- **R10 "Explore freely"** exits any story, switches to Marcus and goes to Marcus's landing; the data is kept (Reset demo is the way back to the seed).
- **R11 The desktop gate** uses `matchMedia('(min-width: 1024px)')` through `useSyncExternalStore`; without `matchMedia` (tests, old browsers) it renders the app.
- **R12 Execution order.** Tasks run 8.1, 8.3, 8.4, 8.2, 8.5, 8.6, 8.7: the landing cards read the stories.

## Review Focus

Failure modes most likely to bite a visitor that no screen-level test covers. Each has its test in the owning task.

1. **A shared or bookmarked story link opened in a fresh browser** (`/inventory/agents/med-rec/onboarding/intake?story=dana&step=1`) → the step opens with its scenario, its persona and its target visible; never a blank or wrong screen. *(8.7: deep link to every step of every story.)*
2. **Refreshing mid-story** → same step, the visitor's own changes kept (no scenario reload). *(8.1 unit: `openStep` with matching progress loads nothing; 8.7 e2e: dismiss at Marcus step 5, reload, still dismissed.)*
3. **Unknown story or bad step in the URL** (`?story=nope`, `?story=marcus&step=99`, `step=abc`) → ignored and stripped, or clamped and rewritten (BUILD_PLAN Review focus 4). *(8.1 unit: `urlAction`; 8.7 e2e.)*
4. **Saved story progress from an older build** (a story or scenario that no longer exists, a step past the end) → dropped, no crash. *(8.1 unit: progress store.)*
5. **Wandering off mid-story** (a product link, the persona switcher, Exit, Reset) → the panel stays and the URL keeps the story; Next returns to the path as the story's persona; Exit keeps the data; Reset clears data and story. *(8.1 unit: `urlAction` append; 8.7 e2e.)*

Also pinned: below 1024 px nothing of the app renders, even from a link that would open a dialog *(8.6)*.

---

## Story scripts

Copy below is final for this phase. "Patch" = `scenarioPatch`. Curly apostrophes (’) in copy, as in the product.

### Marcus · "Supervise by exception" (`marcus`, scenario `baseline`)

Summary: "Owns 20 medication agents and supervises them by exception: finds the one that needs a human, pauses it and asks to resume."

| # | Route | Title | Target | Patch / keep | Body |
|---|---|---|---|---|---|
| 1 | `/operations` | Start at the hospital | `board-divisions` | | Lakeshore Health runs 41 agents in 5 divisions. Divisions that are fine stay grey; only the two that need a human get colour, a mark and words. Medications is Marcus’s division. |
| 2 | `/operations/divisions/medications` | Find the four that need a human | `division-agents` | | Marcus owns 20 agents here. The four that need a human sort to the top: a review waiting, a rising edit rate, an overdue privilege review and a monitor with no data for 3 hours. Dashed means no data, never healthy. |
| 3 | `/operations/agents/med-rec` | Open the agent | `agent-summary` | | HS-04 v2 held 3 drafts that tried to change a dose. Hard stops run at the gateway, outside the model, so the agent can’t argue past them. The pharmacists kept the home doses. |
| 4 | `/operations/inbox` | Work the inbox | `inbox-list` | | Everything that needs Marcus, sorted by deadline. Each item names an action, an owner and a deadline, and anything not handled in time goes to Priya. |
| 5 | `/operations/inbox/exc-5512` | Dismiss with a reason | `inbox-dismiss` | | Renal Dosing’s edit rate is rising. If something explains it, such as a formulary update, Marcus can dismiss it, but never without a reason. The reason is logged and can tune the rule that raised it. |
| 6 | `/operations/agents/med-rec?control=pause-agent` | Pause, with the impact in front of you | – | | Stop easy: anyone accountable pauses in one action, and the preview says what happens first. 12 drafts in progress go back to pharmacists and nothing is lost. Pause the agent to carry on. |
| 7 | `/operations/agents/med-rec` | Ask to resume | `resume-panel` | `med-rec-paused`; keep if Med Rec has a pause | Resume deliberate: Marcus can ask, but the agent stays paused until Priya agrees too, each with a reason. Request the resume here; Priya’s story shows the other half. |
| 8 | `/operations/reviewers` | Watch the reviewers too | `reviewers-finding` | | On 6 North, approvals got faster and edits fell while the independent check found more misses. That points to reviewers checking less, not the agent getting better. It is shown by unit and shift, never by name. |
| 9 | `/operations/sampling` | Check a sample, not everything | `sampling-check` | | On Reduced review, a second check covers 1 in 50 signed outputs, drawn at random. Record whether this one was right as signed: one defect moves the activity back to Normal review. |

### Priya · "Sign for the work" (`priya`, scenario `shadow-day-21`)

Summary: "Clinical sponsor for Medications. Signs each privilege on the evidence, co-signs every resume and promotes one branch at a time."

| # | Route | Title | Target | Patch | Body |
|---|---|---|---|---|---|
| 1 | `/operations/agents/med-rec?tab=scorecard` | Read the shadow evidence | `scorecard-criteria` | | It’s 05 Nov. Med Rec ran in shadow for 21 days on 1,118 admissions, each draft compared with the pharmacist’s own list. Two targets are met; inaccurate lines are at 2.6 % against 2.0 %, mostly brand and generic names that don’t match. |
| 2 | `/inventory/privileges/prv-0142/sign` | Sign with a written reason | `sign-signature` | `awaiting-signature` | Marcus has asked Priya to move admission med rec from Shadow to Draft. One target is missed, so signing needs a written reason that stays on the privilege. The signature makes Priya the named grantor until the review date. |
| 3 | `/portfolio/privileges` | Everything Priya has signed | `privileges-table` | `baseline` | A month later, My privileges lists every delegation Priya has signed, soonest review first. Duplicate Rx’s review is 7 days overdue: renew it here, or the division’s lapse policy returns it to Shadow. |
| 4 | `/operations/agents/med-rec` | Approve the resume | `resume-panel` | `resume-requested` | At 09:47 Marcus paused Med Rec. By 11:58 Sam has fixed the dose mapping, a replay of 23 cases is clean, and Marcus asks to resume. It stays paused until Priya approves too, with a reason of Priya’s own. |
| 5 | `/portfolio/activities/allergy-recon` | Rules move the review level | `review-rules` | | Allergy Recon reached Reduced review by rule: 30 clean days and 312 checks. Priya wrote the rules. Nobody loosens a level by hand, but anyone accountable can tighten it, with a reason. |
| 6 | `/inventory/promotions/prm-0007` | Promote one branch | `promotion-signature` | | Marcus asks to promote one branch, adding an allergy from outside records, from Draft to Supervised; every criterion is met. Updating or removing an allergy stays where it is. Allergy Recon is Tier 3, so once Priya signs, the AI review board decides. |
| 7 | `/operations/agents/med-rec` | Autonomy steps down by itself | `stepdown-notice` | `step-down-threshold` | 09 Dec, 06:00: admission med rec’s edit rate has been above 15 % for 3 days, so the trigger on Priya’s privilege fired at the gateway. The activity dropped from Draft to Shadow and its drafts went to pharmacists. Nothing steps back up without a signature. |
| 8 | `/portfolio/activities/allergy-recon/branches/outside-records` | A new build re-earns its level | `branch-restore` | `step-down-version` | The board approved the promotion on 09 Dec. On 14 Dec Sam deploys Allergy Recon v1.3.0, so the promoted branch drops back to Draft while the new build replays the last 30 days. Supervised returns only when the replay meets every criterion and Priya signs. |

### Dana · "Bring an agent on safely" (`dana`, scenario `onboarding-intake`)

Summary: "AI program lead. Starts every agent from an approved intake, finds the ones nobody registered and keeps the survey evidence complete."

| # | Route | Title | Target | Patch | Body |
|---|---|---|---|---|---|
| 1 | `/inventory/agents/med-rec/onboarding/intake` | Start from the approved intake | `intake-carried` | | It’s 01 Oct, and the committee has approved REQ-0093 for a Med Rec Agent. Onboarding starts from the intake, so what was approved carries over, including a 21-day shadow before any Draft privilege. |
| 2 | `/inventory/agents/med-rec/onboarding/intake` | Name the humans | `intake-owners` | | No agent goes live without four named people. Dana picks the owner and the technical owner, and the span check warns that Marcus would supervise 22 activities against a guideline of 7. Choose Sam as technical owner and start onboarding. |
| 3 | `/inventory/agents/med-rec/risk-tier` | Raise the risk tier, with a reason | `risk-tier-choice` | `review-risk-tier` | 13 Oct: the job description and systems grid suggest Tier 2. Dana knows med rec errors carry into every inpatient order, so the agent goes to Tier 3, the full board and a 21-day shadow. Changing the suggestion needs a reason, and both stay on the record. |
| 4 | `/inventory/unregistered/svc-dc-summary-bot` | Find what nobody registered | `caller-detail` | `baseline` | 08 Dec. The gateway matches its traffic against the registry every 15 minutes, and svc-dc-summary-bot has no record: it posts discharge notes to a Teams channel with no owner, review or hard stops. It looks like an approved intake that was never onboarded. |
| 5 | `/reports/evidence` | Map the evidence | `evidence-coverage` | | The survey window opens 29 Dec. Every agent’s records are mapped to the seven RUAIH elements: 279 of 287 covered, and each of the 8 gaps has an owner and a due date. |
| 6 | `/reports/evidence/med-rec?export=1` | Export a packet that shows its gaps | – | | Dana exports Med Rec’s packet for the surveyor. The open gap, a patient-facing notice due 19 Dec, goes in the packet rather than being hidden. Everything comes from the record; nothing is collected by hand. |
| 7 | `/inventory?agent=iv-to-oral` | Retire an agent | `inventory-retire` | | IV-to-Oral’s shadow results didn’t justify go-live. Retiring revokes its tools, closes its privilege and archives the record, still searchable in audit. It can’t be undone, so it takes the agent’s exact name and a reason. |

### Sam · "Enforce the limits" (`sam`, scenario `onboarding-tools-tested`)

Summary: "Technical owner. Turns what an agent must never do into hard stops at the gateway, and holds new builds until they re-validate."

| # | Route | Title | Target | Patch | Body |
|---|---|---|---|---|---|
| 1 | `/inventory/agents/med-rec/onboarding/tools` | Make the never list enforceable | `tools-hardstops` | | 06 Oct. Marcus’s never list became three hard stops that run at the gateway, outside the model. Sam tested each one on the last 30 days: HS-04 would have blocked 7 of 1,204 drafts. |
| 2 | `/inventory/agents/med-rec/onboarding/tools` | Send the set to Priya | `tools-send` | | Every tool matches a verb granted in the systems step, and every hard stop is tested. The set can go to Priya: send it for approval. |
| 3 | `/inventory/agents/med-rec/onboarding/tools` | Priya sends HS-11 back | `returned-retest` | `onboarding-returned-hs11` | 07 Oct. Priya wants HS-11 tested on September’s 8 East transfers, where a wrong-patient draft would happen, and only HS-11 reopens. Re-run it on those cases, then send the set again. |
| 4 | `/operations/agents/med-rec?control=shadow` | Fix one thing | – | `baseline` | 08 Dec, and Med Rec is live at Draft. When one activity misbehaves, Sam can return just that activity to Shadow and leave the rest of the agent working. Going back to Draft needs Priya’s signature again. |
| 5 | `/operations/agents/med-rec?tab=changes` | Hold the new build | `changes-revalidate` | `change-detected-v150` | 15 Dec. Sam deploys v1.5.0 to fix how frequencies are read, and the gateway holds it. Live traffic stays on v1.3.0 until Marcus replays the last 30 days and Priya approves HS-04 v3. |

### Dr. Lee · "Approve what you can see" (`drlee`, scenario `review-committee`)

Summary: "Chairs the AI review board. Decides from a packet that shows the whole job, the tested limits and the conditions."

| # | Route | Title | Target | Patch / keep | Body |
|---|---|---|---|---|---|
| 1 | `/portfolio/reviews/med-rec` | Read the whole job | `packet-hardstops` | | 14 Oct, item 3 of 5. The packet shows what Med Rec does, what it must never do, and the hard stops Sam tested on the last 30 days. Dana’s reason for raising it to Tier 3 is here too. |
| 2 | `/portfolio/reviews/med-rec` | Approve with conditions | `packet-decision` | | Conditions bind every privilege this agent will hold: a pharmacist signs every draft, Priya gets weekly edit-rate reports, and dialysis patients are excluded. Record the decision with a reason. |
| 3 | `/inventory/agents/med-rec` | The decision is on the record | `record-decision` | `review-decided`; keep if Med Rec's decision is approve or approve with conditions | The decision and its reason sit on Med Rec’s record, and the conditions sit on every privilege. The gateway enforces the ones it can, and shadow starts the next day. |
| 4 | `/portfolio/promotions/prm-0007` | A Tier 3 promotion comes to the board | `board-decision` | `promotion-at-board` | 09 Dec. Priya signed the promotion of one Allergy Recon branch to Supervised, and Tier 3 means the board decides. The evidence and Priya’s reason are in front of Dr. Lee; C4 keeps review at Normal for 60 days. |

### Ana · "Flag it where you work" (`ana`, scenario `baseline`)

Summary: "Pharmacist. Never opens the console: reviews agent drafts in Epic and flags a problem in one action."

| # | Route | Title | Target | Patch | Body |
|---|---|---|---|---|---|
| 1 | `/epic` | Work in Epic, not the console | `epic-medlist` | | Ana verifies admission medication lists in Epic. Med Rec Agent drafted this one, and Ana reviews each line before verifying. This screen is a neutral stand-in for Epic. |
| 2 | `/epic` | See what the agent did | `epic-agent-panel` | | The panel beside the list says what the agent did and didn’t do. It matched 6 medications, marked a possible duplicate and changed no doses, because HS-04 won’t let it. |
| 3 | `/epic` | Flag it in one action | `epic-flag` | | Metoprolol’s frequency came through split into two lines. Ana flags it without leaving Epic, and the flag reaches Marcus, the agent’s owner. |
| 4 | `/epic` | Nine days later | `epic-fix` | `epic-fixed-later` | 17 Dec. Ana’s flag and five others led to v1.5.0, which re-validated before it served. The fix is reported where Ana works, with a note from Marcus. |

### Jordan · "Reconstruct what happened" (`jordan`, scenario `baseline`)

Summary: "Risk manager, read only. Reconstructs any action: what the agent saw, which policies decided and who signed."

| # | Route | Title | Target | Patch | Body |
|---|---|---|---|---|---|
| 1 | `/operations/actions` | Every action, read only | `actions-table` | | Jordan sees the same screens as everyone else, with nothing that changes the record. Every agent action is listed with its version, who it acted for and each policy decision. |
| 2 | `/operations/actions/act-88213` | Trace one action | `trace-steps` | | ACT-88213, step by step: the admission, each tool call, and HS-04 v2 blocking a dose change in 0.4 ms. Ana kept the home dose. Opening an incident from here is the one thing Jordan can create. |
| 3 | `/operations/incidents/inc-0031` | Read the incident | `incident-corrections` | `resume-requested` | By 11:58, INC-0031 has a commander, a root cause from Sam and corrections with owners. The timeline runs from the first block at 09:02 to Marcus’s request to resume. |
| 4 | `/reports/export?agent=med-rec` | Export for a surveyor | `export-contents` | | Jordan builds the export for an audit straight from the record, with patient details masked. Building it is logged as well. |

### Where each target goes

`data-story-target="<value>"` on the element named. Use the element a feature already renders (`Card`, `Paper`, `section`, `aside`, `Button` pass it through); where only a primitive without pass-through renders it, wrap it in a `div`.

| Target | File (`src/features/…`) | Element |
|---|---|---|
| `board-divisions` | `board/HospitalBoard.tsx` | the card holding the "Divisions" table |
| `division-agents` | `board/DivisionView.tsx` | the card holding the agent table |
| `agent-summary` | `board/agent-tabs/Overview.tsx` | the judgment notice ("3 drafts held by HS-04 v2 …") |
| `inbox-list` | `inbox/InboxPage.tsx` | the list column (NEEDS ME …) |
| `inbox-dismiss` | `inbox/ExceptionDetail.tsx` | the "Dismiss…" button |
| `resume-panel` | `controls/ResumePanel.tsx` | the `section aria-label="Resume"` |
| `reviewers-finding` | `reviewers/ReviewersPage.tsx` | the finding notice ("Approvals on 6 North …") |
| `sampling-check` | `sampling/SamplingPage.tsx` | the check form ("Was this right as signed?") |
| `scorecard-criteria` | `golive/ScorecardTab.tsx` | the criteria table card |
| `sign-signature` | `golive/SignPage.tsx` | the "Your signature" block |
| `privileges-table` | `golive/MyPrivilegesPage.tsx` | the privileges table card |
| `review-rules` | `activity/ReviewLevelTab.tsx` | the rules card ("Rules that move the level") |
| `promotion-signature` | `promotion/PromotionPage.tsx` | the "Your signature" block |
| `stepdown-notice` | `stepdown/StepDownOverview.tsx` | the notice ("… stepped down from Draft to Shadow …") |
| `branch-restore` | `stepdown/BranchHistory.tsx` | the restore block ("Sign to restore Supervised") |
| `intake-carried` | `onboarding/IntakeStep.tsx` | "Carried over from REQ-0093" |
| `intake-owners` | `onboarding/IntakeStep.tsx` | "Owners" |
| `risk-tier-choice` | `review/RiskTierPage.tsx` | the tier radio cards |
| `caller-detail` | `gateway/GatewayPage.tsx` | the selected caller's detail panel |
| `evidence-coverage` | `evidence/EvidencePage.tsx` | the coverage table card |
| `inventory-retire` | `inventory/InventoryPage.tsx` | the "Disable or retire…" button |
| `tools-hardstops` | `onboarding/ToolsStep.tsx` | "Hard stops · 3 from Marcus’s never list" |
| `tools-send` | `onboarding/SendToSponsor.tsx` | the send block (button and its gating line) |
| `returned-retest` | `onboarding/ReturnedPanel.tsx` | the HS-11 re-test card |
| `changes-revalidate` | `changes/ChangesTab.tsx` | the "Re-validate v1.5.0" block |
| `packet-hardstops` | `review/PacketPage.tsx` | "Hard stops · tested on the last 30 days" |
| `packet-decision` | `review/PacketPage.tsx` | "Your decision" |
| `record-decision` | `review/DecisionLogged.tsx` | the committee decision block |
| `board-decision` | `promotion/BoardDecisionPage.tsx` | "Your decision" |
| `epic-medlist` | `epic/EpicPage.tsx` | the "Home medications" table |
| `epic-agent-panel` | `epic/AgentPanel.tsx` | the `aside` "Med Rec Agent panel" |
| `epic-flag` | `epic/AgentPanel.tsx` | the "Flag a problem" button |
| `epic-fix` | `epic/AgentPanel.tsx` | the "Your flag led to a fix" region |
| `actions-table` | `audit/ActionsPage.tsx` | the actions table card |
| `trace-steps` | `audit/ActionTracePage.tsx` | the trace steps |
| `incident-corrections` | `audit/IncidentPage.tsx` | "Corrections" |
| `export-contents` | `audit/ExportPage.tsx` | the "What to export" panel |

---

## Task 8.0: Plan

- [x] Write this file from the BUILD_PLAN task list, the spec and Phase 7's handoff notes; read every story screen in its scenario.
- [x] Commit: `docs: Phase 8 plan`

## Task 8.1: Story engine, progress, panel and the bar's Stories menu

**Files:**
- Create: `src/prototype/stories/types.ts`, `engine.ts`, `engine.test.ts`, `progress.ts`, `progress.test.ts`, `apply.ts`, `apply.test.ts`, `useStory.ts`, `index.ts`
- Create: `src/prototype/StoryPanel/StoryPanel.tsx`, `StoryPanel.module.css`, `StoryPanel.test.tsx`, `StoryLayer.tsx`
- Modify: `src/app/AppShell.tsx` (render `StoryLayer` in `app` and `prototype` shells), `src/app/AppShell.module.css` (`.storySpace { height: 280px }`)
- Modify: `src/prototype/PrototypeBar/PrototypeBar.tsx` (Stories menu; Reset clears the story)

**Interfaces:**
- Consumes: `useDemo`, `dataOf`, `createDemoStore`, `DemoStore` (`src/store`); `ScenarioId`, `SCENARIO_IDS` (`src/data/scenarios`); `PERSONAS`, `personaById`; `safeStorage`, `createMemoryStorage`.
- Produces:
  - `types.ts`: `type StoryId = PersonaId`; `interface Step { route: string; title: string; body: string; target?: string; scenarioPatch?: ScenarioId; keep?: (s: DemoState) => boolean }`; `interface Story { id: StoryId; personaId: PersonaId; title: string; summary: string; scenarioId: ScenarioId; steps: Step[] }`; `interface StoryProgress { storyId: StoryId; step: number; loaded: ScenarioId }`.
  - `engine.ts`:
    - `clampStep(story: Story, step: number): number`: non-finite or < 1 → 1; > length → length; fractions floor.
    - `scenarioAt(story: Story, step: number): ScenarioId`
    - `stepHref(story: Story, step: number): string`: the route with `story` and `step` set (keeps the route's own query).
    - `onStepRoute(step: Step, pathname: string): boolean`: the route's pathname equals `pathname`.
    - `openStep(progress: StoryProgress | null, story: Story, step: number, state: DemoState): { progress: StoryProgress; load: ScenarioId | null }` (R2).
    - `type UrlAction = { kind: 'none' } | { kind: 'strip' } | { kind: 'append'; storyId: StoryId; step: number } | { kind: 'rewrite'; storyId: StoryId; step: number } | { kind: 'open'; storyId: StoryId; step: number; rewrite: boolean }`
    - `urlAction(params: URLSearchParams, progress: StoryProgress | null, stories: readonly Story[]): UrlAction` (R3).
    - `validProgress(value: unknown, stories: readonly Story[]): StoryProgress | null` (R4).
  - `index.ts`: `STORIES: readonly Story[]` (empty until 8.3), `storyById(id: string | null): Story | undefined`.
  - `progress.ts`: `interface StoryStore { progress: StoryProgress | null; setProgress: (p: StoryProgress | null) => void }`; `createStoryStore(storage: StateStorage = safeStorage, stories: readonly Story[] = STORIES)`; `useStory` (persisted, `acp-story`, version 1, `merge` through `validProgress`).
  - `apply.ts`: `applyStep(demo: { getState(): DemoStore }, stories: { getState(): StoryStore }, story: Story, step: number, fresh: boolean): StoryProgress`: runs `openStep`, loads the scenario if any, sets the story's persona, saves progress.
  - `useStory.ts` (each takes `stories: readonly Story[] = STORIES`, so tests can pass a fixture):
    - `useStoryActions(stories?): { start(id: StoryId): void; go(step: number): void; exit(): void }`: start = fresh step 1, then navigate; go = that step of the active story, then navigate to `stepHref`; exit = clear progress, remove the `story`/`step` params, stay.
    - `useStoryUrlSync(stories?): void`: runs `urlAction` when the `story`/`step` params change, reading progress at run time with `useEffectEvent`.
    - `useActiveStory(stories?): { story: Story; progress: StoryProgress } | null`.
  - `StoryPanel({ stories = STORIES })`; `StoryLayer` (no props): `useStoryUrlSync()`, `<StoryPanel />`, and the spacer while a story is active and shown.

- [x] **Step 1: Write the failing engine tests** (`engine.test.ts`), on a fixture story (`id: 'marcus'`, scenario `baseline`, three steps; step 2 route `/operations/agents/med-rec?tab=scorecard`; step 3 `scenarioPatch: 'med-rec-paused'`, `keep: (s) => s.agents.find((a) => a.id === 'med-rec')!.pause !== undefined`):
  - `clampStep`: `0 → 1`, `-4 → 1`, `NaN → 1`, `2.7 → 2`, `99 → 3`.
  - `scenarioAt`: steps 1 and 2 → `baseline`; 3 → `med-rec-paused`.
  - `stepHref`: step 1 → `/operations?story=marcus&step=1`; step 2 → `/operations/agents/med-rec?tab=scorecard&story=marcus&step=2`.
  - `onStepRoute(step2, '/operations/agents/med-rec')` true; `'/operations'` false.
  - `openStep(null, story, 2, seed)` → `{ progress: { storyId: 'marcus', step: 2, loaded: 'baseline' }, load: 'baseline' }`.
  - Same story, loaded `baseline`, step 1 → 2: `load: null`. Step 2 → 3 on the seed: `load: 'med-rec-paused'`. Step 2 → 3 on `buildScenario('med-rec-paused')`: `load: null`, `loaded: 'med-rec-paused'` (kept). Back 3 → 2 with loaded `med-rec-paused`: `load: 'baseline'`.
  - Progress for another story → treated as fresh (`load` = that step's scenario).
  - `urlAction`: no params, no progress → none; no params with progress at step 2 → `append` step 2; `?story=nope` → strip; `?story=marcus&step=99`, no progress → `open` step 3, `rewrite: true`; `?story=marcus&step=abc` → `open` step 1, `rewrite: true`; `?story=marcus&step=2` with progress at 2 → none; `?story=marcus&step=02` with progress at 2 → `rewrite`.
  - `validProgress`: a good value round-trips; unknown story, step 0 or past the end, unknown scenario, `null`, a string → `null`.
- [x] **Step 2: Run** `pnpm vitest run src/prototype/stories/engine.test.ts`. Expected: FAIL (module not found).
- [x] **Step 3: Implement** `types.ts`, `engine.ts`, and `index.ts` with `STORIES = []` (the engine takes the list as a parameter, so tests don't depend on it).
- [x] **Step 4: Run** the engine tests. Expected: PASS.
- [x] **Step 5: Write the failing progress and apply tests.**
  - `progress.test.ts`, on `createMemoryStorage()` and the fixture passed to a `createStoryStore(storage, stories)` test seam: a saved valid progress rehydrates; saved `{ storyId: 'nope' }`, a step past the end, a removed scenario and a non-JSON value each rehydrate as `null` (Review Focus 4); `setProgress(null)` persists `null`.
  - `apply.test.ts`, on `createDemoStore(createMemoryStorage())` and a test story store: `applyStep(…, step 1, fresh)` loads the story's scenario (the clock reads that scenario's `now`), sets the persona to the story's and saves progress; a second `applyStep` to a step in the same segment changes no data (`dataOf` before = after).
- [x] **Step 6: Run** them. Expected: FAIL.
- [x] **Step 7: Implement** `progress.ts` (`createStoryStore(storage = safeStorage, stories = STORIES)`) and `apply.ts`.
- [x] **Step 8: Run** them. Expected: PASS.
- [x] **Step 9: Write the failing panel test** (`StoryPanel.test.tsx`, `MemoryRouter` at the step's route, a fixture story injected through `useStory.setState` and a `stories` prop on `StoryPanel` defaulting to `STORIES`):
  - region `complementary` named "Story"; story title; "Step 2 of 3"; the step's title (heading) and body.
  - step 1 has no "Back"; the last step shows "Finish" and "End of Marcus’s story. Keep exploring as Marcus, or pick another from Stories."
  - at another path: "You’ve left this step." with a "Return to it" button.
  - "Hide" leaves "Step 2 of 3" and a "Show" button; the body is gone.
  - a `<style>` rule containing `[data-story-target="agent-summary"]` and `outline: 2px solid var(--cs-ink)` when the step has that target; none when it has no target.
  - "Exit" clears progress.
- [x] **Step 10: Run** it. Expected: FAIL.
- [x] **Step 11: Implement** `useStory.ts`, `StoryPanel` (R5, R6: scroll into view on step change, retrying each animation frame for up to 1 s until the target exists; `behavior: 'smooth'` unless `prefers-reduced-motion`), `StoryLayer`, the AppShell wiring and the spacer. Target values are checked against `/^[a-z0-9-]+$/` before going into the style rule.
- [x] **Step 12: Run** it. Expected: PASS.
- [x] **Step 13: Stories menu and Reset.** In `PrototypeBar`, replace the muted "Stories" with a `Menu` (trigger "Stories ▾", same look as the bar's other controls; width 300; align right): one group "Follow a story" with an item per story (label = title, sub = "{name} · {role} · {n} steps", selected = active) → `start(id)`; while a story is active, a second group with "Exit story" → `exit()`. "Reset demo" clears the story progress, resets, and goes to Marcus's landing. Extend the existing persona e2e to assert Reset leaves no story panel (in 8.7).
- [x] **Step 14: Run** `pnpm check`. Expected: PASS.
- [x] **Step 15: Commit** `feat: story engine, progress, narration panel and Stories menu`, and log R1–R6 in the decision log.

## Task 8.3: Stories for Marcus, Priya and Dana (and the rewind fix)

**Files:**
- Create: `src/prototype/stories/marcus.ts`, `priya.ts`, `dana.ts`, `src/prototype/stories/stories.test.ts`
- Modify: `src/prototype/stories/index.ts` (add them in persona order)
- Modify: the feature files in "Where each target goes" for these three stories' targets
- Modify: `src/data/scenarios/rewind.ts`, `src/data/scenarios/rewind.test.ts` (R8)

**Interfaces:**
- Consumes: `Story`, `Step` (8.1); `buildScenario` and the scenario ids above.
- Produces: `marcus`, `priya`, `dana: Story`; `STORIES` with three entries; `stories.test.ts`, which later tasks extend by adding stories (it iterates `STORIES`).

- [x] **Step 1: Write the failing rewind test** in `rewind.test.ts`: in `buildScenario('awaiting-signature')` (06 Nov 09:52), every privilege with a review date has the same `dayGap(grantedAt, reviewDate)` as in the seed, and no live privilege has a review date before 06 Nov except those the seed already has overdue at that date; TPN Draft Agent's privilege reads granted 12 Aug, review 11 Nov.
- [x] **Step 2: Run** `pnpm vitest run src/data/scenarios/rewind.test.ts`. Expected: FAIL (the review date is 10 Feb 2026).
- [x] **Step 3: Implement** R8 in `rewindTo`: the cycle is `dayGap(grantedAt, reviewDate)` when both exist, else the tier's `reviewDays + 1`.
- [x] **Step 4: Run** all unit tests (`pnpm test`). Expected: PASS (fix any test that pinned the old roll-back only if it pinned the bug; say so in the commit).
- [x] **Step 5: Commit** `fix: rewind rolls a privilege back by its own review interval`, and log R8.
- [x] **Step 6: Write the failing story structure tests** (`stories.test.ts`, over `STORIES`):
  - ids are unique, each `id === personaId`, and the order follows `PERSONAS`.
  - every step's route pathname matches a `routeTable` path (`matchPath`).
  - every `target` matches `/^[a-z0-9-]+$/`.
  - every body has 2 or 3 sentences (split on `[.!?]` followed by a space or the end, after removing "Dr."), and no title, body or summary contains `\b(he|she|him|her|his|hers|himself|herself)\b` (case-insensitive).
  - each story has 3 to 10 steps.
  - Marcus: 9 steps; step 7 keeps the visitor's pause (`keep(buildScenario('med-rec-paused'))` true, on the seed false). Priya: 8 steps; `scenarioAt` for steps 1–8 is `shadow-day-21, awaiting-signature, baseline, resume-requested, resume-requested, resume-requested, step-down-threshold, step-down-version`. Dana: 7 steps, starting at `onboarding-intake`.
- [x] **Step 7: Run** them. Expected: FAIL.
- [x] **Step 8: Implement** the three stories from "Story scripts", and add their targets to the feature files.
- [x] **Step 9: Run** `pnpm check`. Expected: PASS.
- [x] **Step 10: Check by hand** in the dev server: start each story from `?story=<id>&step=1`, step through with Next, and confirm each target is outlined and each body matches its screen. Fix copy that doesn't.
- [x] **Step 11: Commit** `feat: Marcus, Priya and Dana stories`, and log R7.

## Task 8.4: Stories for Sam, Dr. Lee, Ana and Jordan

**Files:**
- Create: `src/prototype/stories/sam.ts`, `drlee.ts`, `ana.ts`, `jordan.ts`
- Modify: `src/prototype/stories/index.ts`, `stories.test.ts`, and the feature files for their targets

**Interfaces:**
- Consumes: as 8.3.
- Produces: `STORIES` with all seven, in persona order.

- [x] **Step 1: Extend the failing structure tests:** seven stories; Sam 5 steps (`scenarioAt`: `onboarding-tools-tested` ×2, `onboarding-returned-hs11`, `baseline`, `change-detected-v150`); Dr. Lee 4 steps, step 3 keeps an approval (`keep(buildScenario('review-decided'))` true, `keep(buildScenario('review-committee'))` false); Ana 4 steps, step 4 patch `epic-fixed-later`; Jordan 4 steps, step 3 patch `resume-requested`.
- [x] **Step 2: Run** them. Expected: FAIL.
- [x] **Step 3: Implement** the four stories and their targets.
- [x] **Step 4: Run** `pnpm check`. Expected: PASS.
- [x] **Step 5: Check by hand** as in 8.3 Step 10.
- [x] **Step 6: Commit** `feat: Sam, Dr. Lee, Ana and Jordan stories`.

## Task 8.2: Landing page `/`

**Files:**
- Create: `src/prototype/Landing/Landing.tsx`, `Landing.module.css`, `Landing.test.tsx`
- Modify: `src/app/router.tsx` (`'/': <Landing />`)

**Interfaces:**
- Consumes: `STORIES`, `PERSONAS`, `personaById`, `useStoryActions().start`, `useStory`, `useDemo.setPersona`.
- Produces: `Landing` (no props).

Layout (prototype shell, no TopNav): one column, max-width 1120, centred, padding 48 px 24 px 64 px.
- Label (mono, uppercase): "Prototype · mock data"
- `h1` (page title, 24/32): "Agent Control Plane"
- Lead (16/24, max 720): "A hospital should bring on an AI agent the way it brings on a clinician: a written job, named people accountable, privileges earned on evidence, and supervision that spends human attention only where it matters."
- Paragraph (14/20, `--cs-text2`, max 720): "Agent Control Plane is the operations console of Signal’s AI management system (AIMS). This clickable prototype runs on mock data for Lakeshore Health, a fictional hospital with 41 agents in 5 divisions. The clock is frozen at Tue 08 Dec 2026, 09:52."
- Actions: `Button variant="primary"` "Explore freely" (R10) with a meta line "Starts as Marcus, the agent owner"; `LinkButton` "About this prototype" → `/about`.
- Section label "Follow one person’s story", sub "Each story walks through the real screens in a few steps. Click around on the way; Next brings you back."
- Grid of seven `Card`s, 4 columns (gap 16): name (16/24 600), role (meta), story title (14/20 600), summary (13/18 `--cs-text2`), "{n} steps" (mono), and a ghost `Button` "Follow {name}’s story →" → `start(id)`.

- [x] **Step 1: Write the failing test** (`Landing.test.tsx`, `MemoryRouter` with routes `/` and `*`): an `h1` "Agent Control Plane"; seven "Follow … story →" buttons in persona order, including "Follow Dr. Lee’s story →"; clicking "Follow Priya’s story →" sets progress `{ storyId: 'priya', step: 1, loaded: 'shadow-day-21' }`, persona `priya`, and the location becomes `stepHref(priya, 1)`; "Explore freely" clears progress, sets persona `marcus` and goes to `/operations/divisions/medications`.
- [x] **Step 2: Run** it. Expected: FAIL.
- [x] **Step 3: Implement** `Landing` and the route.
- [x] **Step 4: Run** it, then `pnpm check`. Expected: PASS.
- [x] **Step 5: Commit** `feat: landing page`, and log R9, R10.

## Task 8.5: About page `/about`

**Files:**
- Create: `src/prototype/About/About.tsx`, `About.module.css`, `About.test.tsx`
- Modify: `src/app/router.tsx` (`'/about': <About />`)

Layout: one column, max-width 760, padding 48 px 24 px 64 px; `h1` page title; each section an `h2` (section title 18/24) and 14/20 text; lists as plain `ul`. Copy:

- **h1** "About this prototype"; under it (mono meta) "Signal · Agent Control Plane"
- **What it is:** "A front-end prototype of Agent Control Plane, the operations side of Signal’s AI management system (AIMS) for hospitals. Named people bring AI agents on, grant them staged privileges, supervise them live, stop them and produce the audit evidence. Signal, Lakeshore Health and everyone in it are fictional, and nothing you do leaves your browser."
- **The problem:** "Hospitals buy agents to hand off work, not to watch them. Today that hand-off is stuck at “a person signs everything”, which turns into rubber-stamping as agents multiply. Nobody has a safe, evidence-based way to decide when an agent has earned more responsibility, or who answers for it when it acts." Then: "Agent Control Plane treats it as delegation: an agent gets a written job, limits it can’t talk its way past, a named person for every privilege, and more autonomy one activity at a time, only on evidence."
- **Principles** (list):
  - Human attention is the scarce resource. Spend it where it matters instead of adding approvals.
  - Scrutinize the job, not every click. The heaviest review happens at onboarding and when a privilege changes.
  - Hard stops live outside the model. Enforced rules and advisory instructions look different, and an agent can’t argue past a rule.
  - Adverse actions stay human. Changing a dose, ordering and signing are locked to people at every level.
  - Autonomy is earned per activity and within a domain, never for an agent as a whole and never without evidence.
  - Review moves by written rules: it loosens as evidence builds and tightens on change or harm.
  - Every privilege has a named grantor, recorded and signed.
  - Stop easy, resume deliberate. One action pauses; resuming takes the owner and the sponsor.
  - Quiet by default. Normal is grey; only “a human is needed” gets colour, with an action, an owner and a deadline.
  - Meet clinicians where they work. Pharmacists review and flag in Epic; the console is for the people accountable.
- **Countersign, the design system:** "Every screen is built from Countersign: IBM Plex Sans and Mono, a grey base, and colour only where a person must act. Indigo is the primary action and what’s selected, teal is a review waiting, amber and red are warnings. Every status pairs colour with a shape and a word, so it reads in greyscale, and dashed means no data, never healthy." Link "See the components" → `/about/components`.
- **How to use it** (list):
  - Pick a story on the start page or from Stories in the bar. Each one switches to its person and loads the moment it starts from.
  - Or explore freely. “Viewing as” switches person, and what each person can do changes with them; a locked control says who can use it.
  - Actions really change the mock data, and your browser keeps it. Reset demo puts everything back.
  - It is built for desktop screens, 1280 px and wider.
- **How it’s built:** "Vite, React 19, TypeScript, React Router, Zustand and CSS Modules, with no UI library. 55 designed frames across 15 epics, built in reviewed phases." Link "Source on GitHub" → `https://github.com/StefanNav/agent-control-plane`.

- [x] **Step 1: Write the failing test:** `h1` "About this prototype"; `h2`s "What it is", "The problem", "Principles", "Countersign, the design system", "How to use it", "How it’s built"; a link to `/about/components`; the GitHub link; the page text has no gendered pronouns.
- [x] **Step 2: Run** it. Expected: FAIL.
- [x] **Step 3: Implement** `About` and the route.
- [x] **Step 4: Run** it, then `pnpm check`. Expected: PASS.
- [x] **Step 5: Commit** `feat: About page`.

## Task 8.6: Desktop gate below 1024 px

**Files:**
- Create: `src/prototype/DesktopGate/DesktopGate.tsx`, `DesktopGate.module.css`, `DesktopGate.test.tsx`
- Modify: `src/main.tsx` (`<DesktopGate><RouterProvider router={router} /></DesktopGate>`)

**Interfaces:**
- Produces: `DesktopGate({ children }: { children: ReactNode })`; `useWideEnough(): boolean` (R11).

The gate (tokens only; `--cs-bg` page, one column max 560, padding 32 px 16 px): mono label "Signal · Agent Control Plane · Prototype"; `h1` "Best viewed on a desktop"; "This prototype is designed for screens 1024 px and wider. Open it on a laptop or desktop to click through it."; the landing's lead sentence; "Seven people use it:" and a list of "{name} · {role}" with each story's summary under it; a link "Source on GitHub" → the repo.

- [x] **Step 1: Write the failing test:** with `window.matchMedia` stubbed to `matches: false`, `<DesktopGate><p>app</p></DesktopGate>` shows the `h1` "Best viewed on a desktop", seven people and the GitHub link, and not "app"; stubbed `matches: true` shows "app" only; with no `matchMedia`, shows "app"; a `change` event from the stub flips it.
- [x] **Step 2: Run** it. Expected: FAIL.
- [x] **Step 3: Implement** `DesktopGate` and wire it in `main.tsx`.
- [x] **Step 4: Run** it, then `pnpm check`. Expected: PASS.
- [x] **Step 5: Commit** `feat: desktop gate below 1024 px`, and log R11.

## Task 8.7: E2E, checkpoint

**Files:**
- Create: `tests/e2e/stories.spec.ts`, `tests/e2e/landing.spec.ts`
- Modify: `tests/e2e/routes.spec.ts` (no placeholder for `phase <= 8`), `tests/e2e/persona.spec.ts` (Reset leaves no story)
- Modify: `docs/BUILD_PLAN.md`

- [x] **Step 1: Write the e2e specs.**
  - `stories.spec.ts`, imports `STORIES`, `stepHref` from `src/prototype/stories`:
    - **For each story, "runs from step 1 to the end":** from `/`, click "Follow {name}’s story →"; for each step `i`: the Story panel shows "Step i of N" and the step's title; if the step has a target, `[data-story-target="…"]` is visible; click Next (Finish on the last). After Finish the panel is gone and the URL has no `story` param. No console errors.
    - **For each story, "a shared link opens any step":** in a fresh context, for each step `goto(stepHref(story, i))` (cleared storage first): the panel shows the step's title, the "Viewing as" button names the story's persona, and the target (if any) is visible.
    - **Review focus 4:** `/operations?story=nope` → no Story panel and the URL loses `story`; `/operations?story=marcus&step=99` → "Step 9 of 9" and the URL reads `step=9`.
    - **The visitor's own changes are kept:** Marcus's story to step 5, dismiss EXC-5512 with a reason, Next; at step 6 pause with a reason; Next → step 7 shows "Paused by Marcus at 09:52." (kept, not the scenario's 09:47); reload → still step 7 and still 09:52.
    - **Wandering off:** in Marcus's story at step 3, click the TopNav "Inventory" link → the panel stays and the URL keeps `story=marcus&step=3`, with "You’ve left this step."; switch persona to Jordan; Next → step 4's route as Marcus. Exit → panel gone, Med Rec still as left.
  - `landing.spec.ts`: `/` shows the `h1` and seven cards; "Explore freely" lands on Marcus's division view; `/about` has its sections and the components link works; at a 800 × 900 viewport `/operations/agents/med-rec?control=pause-agent` shows "Best viewed on a desktop" and no dialog or Main navigation.
  - `persona.spec.ts`: after starting a story, Reset demo leaves no Story panel.
- [x] **Step 2: Run** `pnpm e2e`. Expected: PASS. Fix what fails (product or test), test-first where it's logic.
- [x] **Step 3: Visual check** at 1440 px: screenshot the landing, About, the gate at 800 px, and the panel over three screens (a table page, a page with a right panel, a dialog step). Compare with the Countersign look (tokens, type scale, spacing of existing screens) and fix drift.
- [x] **Step 4: Fresh review.** Dispatch a reviewer on the whole branch (superpowers:requesting-code-review). Fix Critical and Important findings test-first; re-grade minors that would bite a visitor; list the rest as deferred.
- [x] **Step 5: Update `docs/BUILD_PLAN.md`:** tick 8.0–8.7; handoff notes (what exists, review fixes, deferred minors, gotchas, what Phase 9 needs); decision log rows R1–R12 as landed; Start here (⏸ at checkpoint, PR link, preview URL); session log row.
- [ ] **Step 6: Checkpoint.** `pnpm check` and `pnpm e2e` green; forbidden-terms check prints nothing; push `phase-8-stories`; open the PR ("Phase 8: Stories and portfolio layer", body: task checklist, preview URL, screenshots, `Closes #9`); tick the issue's checklist.
- [ ] **Step 7: STOP.** Ask Stefan to review the preview URL. Merge only after approval.
