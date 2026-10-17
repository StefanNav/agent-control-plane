# Phase 12: Every hand-off reaches an inbox · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every hand-off between people raises an inbox item for the person who acts next, information goes to the log, and hand-offs stay off the agent boards.

**Architecture:**
- H1 sits in `src/store/onboarding.ts` beside the other onboarding hand-offs.
- H2–H4 and the FYI helper go in a new `src/store/handoffs.ts`, built on `raiseItem`/`resolveItems`.
- Store actions in `src/store/index.ts` call those helpers inside `runAction`'s `mutate`.
- The scenarios and the seed reproduce the same items.
- The board selectors ignore items with a `link`.

**Tech Stack:** TypeScript, Zustand store, Vitest, Playwright.

**Spec:** [`docs/specs/2026-10-17-handoff-coverage-design.md`](../specs/2026-10-17-handoff-coverage-design.md)

## Global Constraints

- Copy is the spec's, verbatim (§4). No gendered pronouns in product copy.
- Hand-off items: `status: 'review'`, `kind: 'review'`, `route: 'inbox'`, a `link`; never escalate; the actor is copied, never the owner; not raised when the owner is the actor.
- Information goes to the log (`LogEvent.to`), never to an inbox item.
- No `Date.now()`; times come from `draft.now` / scenario times.
- Bump `SEED_VERSION` to 9.
- `pnpm check` before every commit that touches code; `pnpm e2e` green before the PR.

## Review Focus

1. **A rewound October scenario shows no December items.** EXC-5468 (25 Nov) and EXC-5491 (03 Dec) are dropped by `rewindTo`. Pinned in Task 5.
2. **Disabling or retiring a paused agent with an open resume request leaves no dangling "Review: resume".** Pinned in Task 2.
3. **A hand-off never appears on the agent boards.** A seeded or raised item doesn't change 4a counts, 4f rows or the wall. Pinned in Task 1.
4. **Signing or returning PRM-0007 closes "Promotion to sign", and re-sending raises a new one.** There's at most one open at a time. Pinned in Task 4.
5. **Starting onboarding as the owner raises no item for yourself.** Pinned in Task 1.

## File map

| File | Change |
|---|---|
| `src/store/handoffs.ts` (new) | `endOfDayDeadline`, `tell`, resume/commander/promotion item raise and close helpers, type constants |
| `src/store/handoffs.test.ts` (new) | Unit tests for the helpers and their store paths |
| `src/store/onboarding.ts` | H1 in `applyStart`; close it in the systems edit; `JOB_ITEM` constant |
| `src/store/index.ts` | Wire H2–H6 into `requestResume`, `approveResume`, `declineResume`, `withdrawResume`, `clearPause`, `openIncident`, `closeIncident`, `flagCaseLine` (via `applyFlagLine`) |
| `src/store/promotions.ts` | H4: raise on resend, close on sign and return |
| `src/store/settings.ts` | H5: `applyReturnToShadow` tells the sponsor |
| `src/features/onboarding/selectors.ts` | 1a "What starting does" line 4 |
| `src/features/golive/CasePage.tsx` | H6 note copy |
| `src/features/board/selectors.ts` | Ignore `link` items |
| `src/data/scenarios/index.ts` | `resume-requested` raises H2 + H3 items |
| `src/data/seed/onboarding.ts`, `exceptions.ts`, `index.ts` | Culture draft re-dated; EXC-5468, EXC-5491; `SEED_VERSION` 9 |
| `tests/e2e/*.spec.ts` | Pins from spec §5 |
| `tests/capture/flow-map.spec.ts`, `docs/flow-map/onboarding/spec.md` | Flow map (spec §7) |
| `docs/BUILD_PLAN.md`, `docs/plans/phase-5-onboarding.md` | Tracking, R9 note, decision log |

---

### Task 1: Hand-off module, H1 (start → owner) and boards

**Files:** Create `src/store/handoffs.ts`, `src/store/handoffs.test.ts`. Modify `src/store/onboarding.ts`, `src/features/onboarding/selectors.ts`, `src/features/board/selectors.ts` (+ its test).

**Interfaces — Produces:**
- `endOfDayDeadline(at: string): string`: 17:00 on `at`'s day, or the next day's 17:00 when `at` is 15:00 or later.
- `tell(s: DemoState, e: { at: string; agentId?: string; text: string; sub: string; to: string[] }): void`: pushes a `LogEvent` with id `log-tell-{n}`.
- `JOB_ITEM = 'Job and systems to write'` (exported from `onboarding.ts`).

- [x] **Step 1: Failing tests** (`handoffs.test.ts`, using the store harness from `store.test.ts`)
  - `endOfDayDeadline('2026-12-08T11:58:00')` → `'2026-12-08T17:00:00'`; `endOfDayDeadline('2026-12-08T15:00:00')` → `'2026-12-09T17:00:00'`.
  - At `onboarding-intake`, as Dana, `startOnboarding('req-0093', { ownerId: 'marcus', techOwnerId: 'sam' })` raises one open item:
    - type `JOB_ITEM`, owner `marcus`, copied `['dana']`;
    - link `{ label: 'Open the job description', to: '/inventory/agents/med-rec/onboarding/job' }`;
    - deadline 7 days later at 17:00 (`'2026-10-08T17:00:00'`);
    - reason `'Med Rec Agent from REQ-0093: write the job description, then systems and verbs'`;
    - actionSub `'Then systems and verbs. Sam tests the hard stops after.'`.
  - Finishing systems and verbs (the `onboarding-systems` replay, plus the Teams activity) resolves it with outcome `'Job and systems done'`, in the same mutation that raises "Tools: hard stops to test".
  - As Marcus, starting with `ownerId: 'marcus'` raises no `JOB_ITEM`.
  - Board: with an extra open `link` item for `allergy-recon`, `selectDivisionSummaries` and `selectOpenExceptions` are equal to the seed's.
- [x] **Step 2:** Run `pnpm vitest run src/store/handoffs.test.ts src/features/board`. Expect failures.
- [x] **Step 3: Implement.**
  - `handoffs.ts` with `endOfDayDeadline` and `tell`.
  - In `applyStart`, raise `JOB_ITEM` when `people.ownerId !== by`, with deadline `` `${addDays(at, 7).slice(0, 10)}T17:00:00` ``.
  - In the systems edit, inside `if (!record.done.systems)`, `resolveItems(…, JOB_ITEM, by, at, 'Job and systems done')`.
  - The 1a `starting()` line 4 becomes `` `Asks ${tech} for tools and hard stops once systems are done` ``.
  - Board selectors: add `!e.link` to the open-exception filters (division summary, `attentionException`, `selectOpenExceptions`, the wall's attention list).
- [x] **Step 4:** The same tests pass, then `pnpm check`.
- [x] **Step 5: Commit** `feat: starting onboarding asks the owner in their inbox; hand-offs stay off the boards`.

### Task 2: H2 (resume request → the other approver) and the decline FYI

**Files:** Modify `src/store/handoffs.ts`, `src/store/index.ts`, `src/data/scenarios/index.ts`. Test `src/store/handoffs.test.ts`, `src/data/scenarios/scenarios.test.ts`.

**Interfaces — Produces:**
- `RESUME_ITEM = 'Review: resume'`
- `raiseResumeItem(s: DemoState, agentId: string, requestedBy: string, at: string): void`
- `closeResumeItem(s: DemoState, agentId: string, by: string, at: string, outcome: string): void`

- [x] **Step 1: Failing tests**
  - At `med-rec-paused` as Marcus, `requestResume` raises:
    - an open `RESUME_ITEM`, owner `priya`, copied `['marcus']`;
    - link `{ label: 'Open the resume request', to: '/operations/agents/med-rec' }`;
    - deadline `'2026-12-08T17:00:00'`;
    - action `'approve or decline the resume'`, actionSub `'It stays paused until you agree'`;
    - reason `'Marcus asks to resume Med Rec Agent. Paused by Marcus at 09:47.'`.
  - Priya `approveResume` → outcome `'Approved'`.
  - Priya `declineResume` → outcome `'Declined'`, plus a log event `to: ['marcus']`, text `'Priya declined resuming Med Rec Agent'`, sub `` `${reason} · Marcus told` ``.
  - Marcus `withdrawResume` → `'Withdrawn'`.
  - Dana `disableAgent` → `'Agent disabled'`. Dana `retireAgent` closes it (state resolved).
  - Scenario `resume-requested`: exactly one open `RESUME_ITEM` for `priya`, raised `'2026-12-08T11:58:00'`.
- [x] **Step 2:** The tests fail.
- [x] **Step 3: Implement.**
  - The owner of the item is whichever of `[agent.ownerId, agent.sponsorId]` isn't the requester.
  - Call `raiseResumeItem` in `requestResume`.
  - Call `closeResumeItem` in approve (only when `complete`), decline (with `tell`), withdraw, and `clearPause(draft, agentId, outcome?)`. Disable passes `'Agent disabled'`. Retire's existing sweep closes it.
  - In the scenario, call `raiseResumeItem(s, 'med-rec', 'marcus', s.now)` after pushing the request.
- [x] **Step 4:** Pass, then `pnpm check`.
- [x] **Step 5: Commit** `feat: a resume request reaches the other approver's inbox`.

### Task 3: H3 (incident opened → commander)

**Files:** Modify `src/store/handoffs.ts`, `src/store/index.ts`, `src/data/scenarios/index.ts`. Tests as Task 2.

**Interfaces — Produces:**
- `commanderItem(code: string): string` → `` `Commander: ${code}` ``
- `raiseCommanderItem(s: DemoState, incident: Incident, openedBy: string, at: string): void`

- [x] **Step 1: Failing tests**
  - At baseline as Jordan, `openIncident('med-rec', { title: 'Dose changes proposed', actionIds: ['act-88213'] })` raises:
    - type `'Commander: INC-0031'`, owner `marcus`, copied `['jordan']`;
    - link `{ label: 'Open INC-0031', to: '/operations/incidents/inc-0031' }`;
    - deadline `'2026-12-08T17:00:00'`;
    - reason `'Jordan opened INC-0031: Dose changes proposed'`;
    - action `'run the incident'`, actionSub `'Root cause and corrections, each with an owner'`.
  - As Marcus, opening one raises nothing.
  - Closing the incident (all corrections done) resolves it with `'Incident closed'`.
  - Scenario `resume-requested`: an open `'Commander: INC-0031'` for `marcus`, raised `'2026-12-08T10:05:00'`.
- [x] **Steps 2–4:** As Task 2. Raise in `openIncident`'s mutate, after the push. Resolve in `closeIncident`. Raise in the scenario after `s.incidents.push(INC_0031)`.
- [x] **Step 5: Commit** `feat: opening an incident tells its commander`.

### Task 4: H4 (promotion → sponsor)

**Files:** Modify `src/store/handoffs.ts` or `src/store/promotions.ts` (keep the helpers next to `boardItem`), and `src/data/seed/exceptions.ts`. Test `src/store/promotions.test.ts`.

**Interfaces — Produces:**
- `promotionToSign(agentName: string): string` → `` `Promotion to sign · ${agentName}` ``
- `raisePromotionItem(s: DemoState, promotionId: string, at: string): void`

The deadline uses the tier rule: Tier ≥ 3 → 17:00 the day before the first `BOARD_MEETINGS` entry after `at`; otherwise two days later at 17:00.

- [x] **Step 1: Failing tests**
  - Seed: `exc-5468` is open:
    - type `'Promotion to sign · Allergy Recon Agent'`, owner `priya`, copied `['marcus']`;
    - raised `'2026-11-25T11:00:00'`, deadline `'2026-12-08T17:00:00'`;
    - link `{ label: 'Open the promotion', to: '/inventory/promotions/prm-0007' }`;
    - action `'sign or send back'`, actionSub `'Tier 3: after you sign, the board decides on 09 Dec'`.
  - The seed item deep-equals what `raisePromotionItem` produces on a seed without it (same code aside).
  - `signPromotion` resolves it with `'Signed'`. `returnPromotion` resolves it with `'Sent back'`. After `resendPromotion`, exactly one is open again.
- [x] **Steps 2–4:** Implement. Add the literal seed item. Resolve in `applySignPromotion` and `applyReturnPromotion`; raise in `applyResendPromotion`.
- [x] **Step 5: Commit** `feat: a promotion waiting for the sponsor reaches their inbox`.

### Task 5: Seed (Culture Follow-up) and SEED_VERSION 9

**Files:** Modify `src/data/seed/onboarding.ts`, `src/data/seed/exceptions.ts`, `src/data/seed/index.ts`. Test `src/data/seed/seed.test.ts`, `src/data/scenarios/rewind.test.ts`.

- [x] **Step 1: Failing tests**
  - The culture record starts `'2026-12-03T10:00:00'`, and its draft agent and history agree.
  - `exc-5491` is an open `JOB_ITEM`: owner `marcus`, copied `['dana']`, raised `'2026-12-03T10:00:00'`, deadline `'2026-12-10T17:00:00'`, linking to the culture job step.
  - `SEED_VERSION === 9`.
  - `rewindTo(seed, '2026-10-01T09:05:00')` has neither `exc-5468` nor `exc-5491`.
- [x] **Steps 2–4:** Implement, then `pnpm check`.
- [x] **Step 5: Commit** `feat(seed): the culture draft's hand-off and PRM-0007's item; seed v9`.

### Task 6: FYIs (H5 return to Shadow, H6 flag for SOP)

**Files:** Modify `src/store/settings.ts`, `src/store/onboarding.ts` (`applyFlagLine`), `src/features/golive/CasePage.tsx`. Test `handoffs.test.ts`.

- [x] **Step 1: Failing tests**
  - Sam's `returnToShadow('med-rec-admission', reason)` logs:
    - text `'Sam returned Reconcile home medications at admission to Shadow'`;
    - sub `'PRV-0142 v3 closed · Priya told'`;
    - `to: ['priya']`;
    - no new open inbox item.
  - The same return done by Priya logs no "told" event.
  - `flagCaseLine('enc-4105', 4)` as Marcus logs sub `'Shared with Sam to check the SOP mapping · Marcus'`, `to: ['sam']`.
- [x] **Steps 2–4:** Implement with `tell`. CasePage note: `` `Logged and shared with ${tech}.` ``.
- [x] **Step 5: Commit** `feat: returning to Shadow and SOP flags tell the right person in the log`.

### Task 7: End-to-end pins and the full suite

**Files:** `tests/e2e/inbox.spec.ts`, `journeys.spec.ts`, `epic.spec.ts` and any other spec the run names. Add one e2e test in `tests/e2e/handoffs.spec.ts`.

- [x] **Step 1:** Add `handoffs.spec.ts`. As Dana at `onboarding-intake`, start onboarding with Sam. Switch to Marcus. Inbox shows "Job and systems to write". "Open the job description" lands on `/onboarding/job`.
- [x] **Step 2:** Update the pins to spec §5:
  - Marcus baseline: Needs me · 5, Waiting on others · 3, and the waiting list count 3.
  - The nav reads "Inbox · 5".
  - After Ana's flag: 6.
  - Priya at `stale-escalated`: 4, then 3 after assigning.
  - Snooze, dismiss and answer flows: each pinned count is one higher than before.
- [x] **Step 3:** `pnpm check && pnpm e2e` is green.
- [x] **Step 4: Commit** `test: e2e pins for hand-off coverage`.

### Task 8: Flow map

**Files:** `tests/capture/flow-map.spec.ts`, `docs/flow-map/onboarding/spec.md`, `docs/flow-map/onboarding/screens/**`.

- [x] **Step 1: Capture changes:**
  - Insert `03-marcus-inbox` (01 Oct). As Dana at `onboarding-intake`, choose Sam and press Start onboarding. Then `viewAs('marcus')`, go to `/operations/inbox` and open the item named `/Job and systems to write/`. The store persists across the persona switch, so the item is there.
  - Renumber the later files (04–24).
- [x] **Step 2:** Remove the old PNGs. Run the capture. Check the new screen by eye.
- [x] **Step 3: Brief changes:**
  - Add the new step after 02 (reached by "Inbox · Job and systems to write").
  - Recast "Inventory → Drafts" as Marcus coming back on 04 Oct.
  - Remove §5.
  - The 02 → 03 arrow becomes solid.
  - Renumber.
- [x] **Step 4: Commit** `docs(flow-map): Marcus's hand-off is in the inbox`.

### Task 9: Docs, review and PR

- [x] **Step 1: Docs.**
  - `docs/plans/phase-5-onboarding.md` R9: add "Extended product-wide in Phase 12 (see the hand-off registry in the Phase 12 spec)".
  - `docs/BUILD_PLAN.md`: the Phase 12 row and section with handoff notes, Start here, decision log rows (the rule, FYIs, boards, the culture re-date, the D1–D3 deferrals, the §5 departures), and a session log row.
- [x] **Step 2:** A whole-branch review by a fresh reviewer on the most capable model. Fix Critical and Important findings test-first.
- [x] **Step 3:**
  - Run the forbidden-terms check (must print nothing).
  - Push `phase-12-handoffs`.
  - Open the PR: it closes the Phase 12 issue, lists the §5 departures, and links the preview.
- [ ] **Step 4:** Stop for Stefan's review of the preview. Never merge without Stefan's approval.
