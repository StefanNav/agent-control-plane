# Every hand-off reaches an inbox: design spec

- **Date:** 2026-10-17
- **Status:** Approved by Stefan on 2026-10-17 ("write this back and implement it"), after the hand-off audit in the same session
- **Phase:** 12 · branch `phase-12-handoffs` · plan [`docs/plans/phase-12-handoffs.md`](../plans/phase-12-handoffs.md)
- **Builds on:** E5 (one inbox of what needs me), ruling R9 in [`phase-5-onboarding.md`](../plans/phase-5-onboarding.md) ("Hand-offs reach the inbox"), the 6c frame

## 1. Why

While building the onboarding flow map in Claude Design, we found that **Start onboarding doesn't tell the agent owner**. The 1a panel promises "Asks Marcus for the job description, systems and verbs", but nothing reaches Marcus; he only finds the draft in Inventory → Drafts.

An audit of all 60 store actions and the clock rules found more of the same. Some hand-offs never reach the person who has to act next:

- requesting a resume, the second half of "stop easy, resume deliberate";
- opening an incident, which makes the agent's owner its commander without telling them;
- a promotion waiting for the sponsor.

The notification *model* is already designed (E5). What's missing is *coverage*. This phase makes R9 product-wide and closes the gaps. It adds no new screens and no new channels.

## 2. The rule

**A hand-off** is any moment when one person's action makes a *different named person* responsible for the next step.

Every hand-off raises an inbox item for that person (R9, now product-wide):

| Field | Value |
|---|---|
| Status, kind | `review`, `review`: the teal mark, "review waiting" |
| Type | Names the step, e.g. "Review: resume" |
| Reason, action | What happened, and what the person must do |
| Owner | The person who acts next |
| Copied | Whoever acted (never the owner) |
| Link | Opens the step; the inbox shows the link as the primary button |
| Deadline | Per hand-off (§4); hand-offs never escalate |
| Closes | When the step is done, with an outcome ("Approved", "Signed", …) |
| Route | Inbox, plus the 07:00 digest by E5's rule; never pages |
| Not raised | When the person who acts next is the person who acted |

Two companion rules:

- **Information is not a hand-off.** When someone should *know* but needn't *act*, it's a log event with a `to` list ("Priya told"), as ruling R18 already does for FYIs. It never becomes an inbox item. That's E5: "Information stays in the log."
- **Hand-offs stay off the agent boards.** The hospital board, division board, exceptions-first view and wall display (4a, 4b, 4f, 4e) show what agents are doing. A hand-off is a task for a person, not a signal about an agent, so items with a link don't count on the boards. Items about callers and units already work this way (Phase 6).

## 3. The hand-off registry

Every hand-off in the product after this phase. Items marked "new" are this phase's work.

| # | When | From → to | Inbox item | Closes when | |
|---|---|---|---|---|---|
| 1 | Onboarding starts | Program lead → **owner** | Job: description and systems to write | Systems and verbs are done | **new** |
| 2 | Systems and verbs done | Owner → technical owner | Tools: hard stops to test | The set is sent | existing |
| 3 | The set is sent | Technical owner → sponsor | Review: final set | Approved or sent back | existing |
| 4 | Sponsor sends it back | Sponsor → technical owner or owner | Returned: HS-xx / job and reach | Sent again | existing |
| 5 | Sponsor signs the set | Sponsor → program lead | Review: risk tier | Tier set | existing |
| 6 | Tier 2+ set | Program lead → board chair | Review: your decision | Decision recorded | existing |
| 7 | Board asks to re-review | Board → program lead | Re-review: questions from the board | Tier set again | existing |
| 8 | Owner asks to go live | Owner → sponsor | Review: your signature | Signed or sent back | existing |
| 9 | Sponsor sends go-live back | Sponsor → owner | Returned: go-live request | Asked again | existing |
| 10 | Sponsor asks for evidence | Sponsor → owner | Evidence for the PRV-xxxx review | Renewed | existing |
| 11 | A review date passes | Rule → sponsor | Review overdue | Renewed or lapsed | existing |
| 12 | **A resume is requested** | Requester → **the other approver** | Review: resume | Approved, declined, withdrawn, or the agent is disabled or retired | **new** |
| 13 | **An incident is opened** | Opener → **commander** | Commander: INC-xxxx | The incident closes | **new** |
| 14 | **A promotion waits for the sponsor** | Owner → **sponsor** | Promotion to sign · {agent} | Signed or sent back | **new** |
| 15 | Sponsor signs a Tier 3+ promotion | Sponsor → board chair | Review: promotion · {agent} | Board decides | existing |
| 16 | Sponsor returns a promotion | Sponsor → owner | Promotion returned · {agent} | Sent again | existing |
| 17 | A new build is held | Gateway → owner, sponsor | Re-validation needed; Review: HS-xx vN | Accepted; approved | existing |
| 18 | A threshold step-down fires | Rule → owner | Stepped down | Restored | existing |
| 19 | A replay meets every criterion | Rule → sponsor | Restore {level} | Signed | existing |
| 20 | A pharmacist flags a draft | Pharmacist → owner | Flag from Epic | Answered | existing |
| 21 | Owner proposes a review change | Owner → sponsor | (sampling or review-level change) | Signed or declined | existing |

**FYIs (log, not inbox):**

- A resume is declined → the requester ("Marcus told"). **New.**
- An activity is returned to Shadow → the sponsor, because their privilege closed. **New.**
- "Flag for SOP" on a sample case → the technical owner. **Existing log line, now addressed to them.**
- "Share with Priya", a signed review change, and pauses: existing.

**Not hand-offs:**

- Shadow starting: nothing to do until it ends.
- Today's sampling draws: the sampling queue is its own worklist.
- A pause: anyone authorised stops it, and nobody else must act.

## 4. The changes

### H1 · Onboarding starts → owner

- **Item:** "Job: description and systems to write"
  - reason: `{agent} from {REQ}: write the job description, then systems and verbs`
  - action: "write the job description"
  - actionSub: `Then systems and verbs. {tech} tests the hard stops after.`
  - copied: the person who started
  - link: "Open the job description" → `/inventory/agents/:id/onboarding/job`
- **Deadline:** 17:00 seven days after the start. Writing a job description is days of work, not a same-day task.
- **Closes:** when systems and verbs are complete (outcome "Job and systems done"), the same moment Sam's item is raised.
- **Not raised:** when the owner started the onboarding themselves.
- **1a copy:** "What starting does", line 4, becomes "Asks {tech} for tools and hard stops once systems are done". That's what happens, and it has to: Sam's tools must match the grants.

### H2 · A resume is requested → the other approver

- **Item:** "Review: resume", owned by whichever of the agent's owner and sponsor hasn't approved yet.
  - reason: `{requester} asks to resume {agent}. Paused by {who} at {hh:mm}.`
  - action: "approve or decline the resume"
  - actionSub: "It stays paused until you agree"
  - copied: the requester
  - link: "Open the resume request" → `/operations/agents/:id`
- **Deadline:** 17:00 the same day, or the next day if requested at 15:00 or later. The agent's work is going to people while it's paused, so nothing is unsafe, but a paused agent shouldn't wait days.
- **Closes:** when it's approved ("Approved"), declined ("Declined"), withdrawn ("Withdrawn"), or the agent is disabled or retired, which clears the request ("Agent disabled" / "Agent retired").
- **Decline FYI:** log `{decliner} declined resuming {agent}`, sub `{reason} · {requester} told`, `to: [requester]`.
- **Scenario `resume-requested`:** Priya's item, raised 11:58, is open.

### H3 · An incident is opened → commander

- **Item:** "Commander: {INC code}"
  - reason: `{opener} opened {code}: {title}`
  - action: "run the incident"
  - actionSub: "Root cause and corrections, each with an owner"
  - copied: the opener
  - link: `Open {code}` → `/operations/incidents/:id`
- **Deadline:** the same-day rule as H2.
- **Closes:** when the incident closes ("Incident closed").
- **Not raised:** when the opener is the commander. INC-0029 was opened by Tom, its commander, so it gets none.
- **Scenario `resume-requested`:** Marcus's item for INC-0031, raised 10:05 by Jordan's opening, is open.

### H4 · A promotion waits for the sponsor → sponsor

- **Item:** "Promotion to sign · {agent}"
  - reason: `{requester} asks to promote {branch} to {level}`
  - action: "sign or send back"
  - actionSub: Tier 3 and above, `Tier {n}: after you sign, the board decides on {meeting date}`; otherwise "Takes effect when you sign"
  - copied: the requester
  - link: "Open the promotion" → `/inventory/promotions/:id`
- **Deadline:** Tier 3 and above, 17:00 the day before the next board meeting, the same rule as the tier hand-off. Otherwise 17:00 two days after.
- **Raised:** when a promotion reaches the sponsor. That's PRM-0007 in the seed (requested 25 Nov 11:00, item EXC-5468, due 08 Dec 17:00), and again whenever a returned promotion is sent again.
- **Closes:** when it's signed ("Signed") or sent back ("Sent back").

### H5 · Return to Shadow → sponsor FYI

- **Log:** `{by} returned {activity} to Shadow`, sub `{code} v{n} closed · {sponsor} told`, `to: [sponsor]`. Skipped when the sponsor did it.
- **No inbox item.** The 6c frame says "The scorecard restarts against the same targets. Back to Draft needs Priya's signature again." Priya is asked to sign through the existing go-live request (#8), once the restarted scorecard shows evidence.

### H6 · Flag for SOP → technical owner FYI

- **Log:** the existing log line gets `to: [tech]`, and its sub becomes `Shared with {tech} to check the SOP mapping · {by}`.
- **The case page note** becomes "Logged and shared with {tech}." The old note, "the technical owner is asked…", promised an ask that never happened.
- A flagged line is a suggestion against a past shadow case. No step waits on it, so it's information, not a hand-off.

### Boards

Board and wall selectors ignore exceptions with a `link`.

### Seed (`SEED_VERSION` 9)

- **Culture Follow-up draft:** re-dated to start **03 Dec 10:00** (was 30 Nov; it's invented and in no frame). Marcus's H1 item is EXC-5491, raised 03 Dec 10:00, due 10 Dec 17:00. Started on 30 Nov, it would sit six days overdue at the top of Marcus's inbox on 08 Dec.
- **PRM-0007:** Priya's H4 item is EXC-5468.

## 5. Frame departures (flag at the checkpoint)

| Frame | Change | Why |
|---|---|---|
| 5a (Marcus's inbox) | Needs me 4 → **5** (Culture Follow-up job item, due 10 Dec). Waiting on others 2 → **3** (PRM-0007, Marcus copied) | Hand-offs reach the inbox |
| 5c (07:00 digest) | One more item each for Marcus's culture job and Priya's promotion | Reviews land in the digest (E5) |
| 5d (escalated to Priya, 12:00) | Needs me 3 → **4** (PRM-0007, due 17:00) | Same |

The boards (4a–4f, the wall) are unchanged, by the "hand-offs stay off the boards" rule.

## 6. Deferred

- **D1 · Shadow minimum met → owner.** A rule, not a person, hands this one off, and the decision it asks for (ask the sponsor, extend, or retire) has no natural deadline. Seeded honestly, it would put a month-overdue item (Allergy flags, ready since 05 Nov) at the top of Marcus's inbox on the main demo screen. It needs a deadline policy first. It stays on the revisit list.
- **D2 · Delivery channels, preferences, a notification settings screen.** There are no frames for them, and adding them would work against "protect people's attention".
- **D3 · Escalating hand-offs.** They keep R9's rule and never escalate. The resume and incident items get same-day deadlines instead.

## 7. Flow map

The onboarding flow map (`docs/flow-map/onboarding/`) is updated as the Claude Design brief asks:

- A new step, **Marcus's inbox on 01 Oct**, reached from Start onboarding by an inbox hand-off.
- **"Inventory → Drafts"** recast as Marcus coming back on 04 Oct to a draft he left at 5 of 7.
- **§5 "Mark this gap"** removed; the 02 → 03 arrow becomes a solid hand-off.
- Steps and screenshot files renumbered, and the captures re-run.

## 8. Verification

- Unit tests (store, test-first) for each of H1–H6:
  - raised with the right owner, copied people, link and deadline;
  - not raised when the actor is the next person;
  - closed by every path listed.
- Unit tests for the scenarios (`resume-requested`, the October onboarding replays) and the seed (EXC-5468 and EXC-5491 match what the store would raise).
- A board selector test: a hand-off item doesn't change a division's counts or the exceptions-first list.
- The e2e pins updated for §5. `pnpm check` and `pnpm e2e` green.
- The flow-map captures re-run and checked by eye.

**Interview line:** "Every hand-off reaches a named person's inbox. I audited all of them, closed the gaps, and kept information in the log."
