# Flow map: onboarding to go-live (Med Rec Agent)

A brief for Claude Design: one canvas page in the Countersign project that shows, top down, how the Med Rec Agent goes from an approved request to its first signed privilege. A visitor should see who does each step, what each screen is for, where each click leads, and where the work passes from one person to the next.

Everything below comes from the running prototype (Attune · Agent Control Plane, repo `StefanNav/agent-control-plane`). Use this brief for the flow; don't work it out from the code. The screenshots in `screens/` are real captures of each step, at 1440 px wide, below the prototype bar.

---

## 1. Layout

Lay the page out like a Figma wireframe flow, read left to right in time.

1. **Header:** the title "Onboarding to go-live · Med Rec Agent", the line "From an approved request to the first signed privilege · 01 Oct to 06 Nov 2026 · Lakeshore Health (fictional)", and a legend for the arrow types (§3).
2. **Persona row:** five cards across the top, in the order they appear (§2).
3. **Phase bands:** four labelled bands running across the top of the lanes:
   - **Onboarding**, 01–07 Oct
   - **AIMS Review**, 13–14 Oct
   - **Shadow**, 15 Oct – 04 Nov
   - **Go-live**, 05–06 Nov
4. **Date ruler:** under the bands, one tick per day something happens: 01 Oct, 04 Oct, 05 Oct, 06 Oct, 07 Oct, 13 Oct, 14 Oct, 05 Nov, 06 Nov. Compress the gaps; the axis is a sequence, not a scale.
5. **Swimlanes:** one horizontal lane per persona, labelled at the left with their avatar and name: Dana, Marcus, Sam, Priya, Dr. Lee. Each screen card sits in its person's lane, under its date.
6. **Screen cards:** one per step in §4, in that order.
7. **Shadow block:** in Marcus's lane between 15 Oct and 04 Nov, a wide flat bar instead of a screen: "21 days in shadow · 1,118 admissions · each draft compared with the pharmacist's own list · nothing reaches a patient".

### Screen card anatomy

- Step number and screen name, e.g. "07 · Tools and hard stops"
- Frame ID and route in mono, e.g. `1d · /inventory/agents/med-rec/onboarding/tools`
- The screenshot thumbnail (file named in §4), cropped to the top of the screen
- One line on what the screen is for
- Two or three bullets on what's on it
- The actions, each as "Button → what happens", with the arrow leaving from that line

## 2. Personas

Five people take part. Show each as a card: a portrait, name, role, and one line on their part in this flow. The people are fictional. Either generate simple, consistent portraits, or use the product's own avatar (the initial in a circle) drawn larger; pick one style and use it for all five.

| Person | Role | Their part in this flow |
|---|---|---|
| **Dana** | AI program lead · all divisions | Starts onboarding from the approved request, names the people accountable, sets the risk tier |
| **Marcus** | Agent owner · pharmacy informatics manager, Medications | Writes the job description and decides which systems the agent may reach |
| **Sam** | Technical owner · integration analyst | Turns the never list into hard stops at the gateway and tests each one |
| **Priya** | Clinical sponsor · Director of Pharmacy | Approves the whole set, then signs the privilege that takes the agent live |
| **Dr. Lee** | Chair, AI review board | Decides at the board meeting whether the agent may start shadow, and on what conditions |

Under the row, a small note: "Two other people use the product but don't appear here: Ana, a pharmacist who works in Epic, and Jordan, the risk manager (read only)."

## 3. Arrows

| Arrow | Means | Label it with |
|---|---|---|
| Solid, within a lane | The same person clicks through to the next screen | The button, e.g. "Start onboarding" |
| Solid, crossing lanes | Hand-off: the next person is told in their inbox | The inbox item, e.g. "Inbox · Review: final set" |
| Curved, going back | Sent back for changes | "Request changes · HS-11" |

Use Countersign's own styling: IBM Plex Sans and Mono, the `--cs-*` tokens, hairline grey borders, indigo for the primary path, teal only for "waiting for review" marks. No gradients, emoji or coloured left-border cards. Arrows are neutral ink. Every hand-off in this flow reaches the next person's inbox, so every arrow between lanes is solid.

## 4. Steps

Each step names its screenshot in `screens/` (full-length versions are in `screens/full/`). "Next" is where the arrow goes.

### Onboarding · 01–07 Oct

**01 · Inventory → Intake** · Dana · 01 Oct · composed (8c tab) · `/inventory?tab=intake` · `01-dana-intake-list.png`
- For: the list of approved requests no one has started onboarding yet.
- On it: one row, REQ-0093 "Admission medication reconciliation", Medications, requested by Priya, approved 29 Sep.
- **Open → 02**

**02 · Start onboarding (name the humans)** · Dana · 01 Oct · 1a + 2a · `/inventory/agents/med-rec/onboarding/intake` · `02-dana-start-onboarding.png`
- For: creating the agent's record from the request, and naming who answers for it.
- On it:
  - "Carried over from REQ-0093": name, division, requester, purpose, rollout domain (7 West, 8 East · adults 18+ · all hours), and the committee's condition "21-day shadow before any Draft privilege".
  - Owners: "No agent goes live without four named people." Dana picks the agent owner and the technical owner; the division and sponsor come from the request.
  - Span check: "Marcus would directly supervise 22 agent activities. The guideline is 7", with "Suggest a split" or "Choose another owner".
  - "What starting does": creates AGT-0123 as a draft, fills it from REQ-0093, asks Marcus and Sam for their parts, and tells Priya when steps 2–4 are done. "Owners can work in any order once you start."
- **Start onboarding → creates AGT-0123 v0.1 → raises "Job and systems to write" in Marcus's inbox → hand-off to 03**

**03 · Marcus's inbox** · Marcus · 01 Oct · 5a pattern · `/operations/inbox` · `03-marcus-inbox.png`
- For: Marcus learning that the job description and systems grid are now Marcus's to write.
- On it: "Job and systems to write" · "Med Rec Agent from REQ-0093: write the job description, then systems and verbs", due 08 Oct.
- **Open the job description → 05** (the same day, or any time before it's due)

**04 · Inventory → Drafts (coming back)** · Marcus · 04 Oct · 1i · `/inventory?tab=drafts` · `04-marcus-drafts.png`
- For: Marcus coming back on 04 Oct to a draft left at 5 of 7. The inbox gave the first notice; Drafts is the way back to work in progress.
- On it: "Waiting on me · 1". Med Rec Agent, open step "2 · Job description", missing "Escalation triggers, inaccuracy target", waiting on "Marcus · you", 6 of 13.
- **Continue → opens the first missing field → 05**

**05 · Job description** · Marcus · 04 Oct · 1b · `/inventory/agents/med-rec/onboarding/job` · `05-marcus-job-description.png`
- For: what the agent is for and what it must never do. "The committee and every pharmacist will read this."
- On it:
  - "Welcome back, Marcus": the draft was left at 5 of 7, and it opens at the first missing field.
  - Seven fields: purpose, activities, never list, acting for, escalation triggers, success criteria, rollout domain.
  - Two activities, each earning its own privilege: reconcile home medications at admission; flag allergy conflicts.
  - Never list: change a dose → HS-04, remove an allergy → HS-07, draft for anyone but the encounter's patient → HS-11. The line "Sign, release or order anything" is already locked by ORG-POL-02.
  - Targets for shadow: agreement ≥ 90 %, omitted ≤ 3 %, inaccurate ≤ 2 %.
- **All 7 done → 06**

**06 · Systems and verbs** · Marcus · 05 Oct · 1c · `/inventory/agents/med-rec/onboarding/systems` · `06-marcus-systems.png`
- For: exactly what the agent may reach. "Everything starts read only. Grant only what an activity needs."
- On it:
  - A grid of four systems (Epic, Pharmacy worklist, Pyxis, Microsoft Teams) against six verbs (read, draft, write, submit, sign, order). Sign and order are always locked by ORG-POL-02.
  - "Why each grant": every tick names the activity it serves.
  - "Reach in one line": "Reads Epic, the worklist and Pyxis. Drafts in Epic. Writes to the worklist and Teams. Submits, signs and orders nowhere. This is the line Priya and the committee read."
- **Last grant gets its activity → "the list goes to Sam's inbox" → hand-off to 07**

**07 · Sam's inbox** · Sam · 06 Oct · 5a pattern · `/operations/inbox` · `07-sam-inbox.png`
- For: Sam learning that the hard stops are ready to test.
- On it: "Tools: hard stops to test" · "3 hard stops from Marcus's never list to test on the last 30 days".
- **Open tools and hard stops → 08**

**08 · Tools and hard stops** · Sam · 06 Oct · 1d · `/inventory/agents/med-rec/onboarding/tools` · `08-sam-tools.png`
- For: making the never list enforceable, outside the model.
- On it:
  - Tools: 5 from the gateway catalogue (e.g. `epic.medrec.draft`), each "Matches step 3".
  - Hard stops: three dark cards headed "HARD STOP · ENFORCED AT THE GATEWAY", each tested on the last 30 days of real cases:
    - HS-04 "Never change a dose": would have blocked 7 of 1,204 drafts, e.g. metoprolol 25 mg → 51 mg.
    - HS-07: 2 of 1,204.
    - HS-11: 0 of 1,204.
- **Run test** (once per hard stop) → result and examples.
- **Send to Priya for approval → raises "Review: final set" in Priya's inbox → hand-off to 09**

**09 · Priya's inbox** · Priya · 07 Oct · 5a pattern · `/operations/inbox` · `09-priya-inbox.png`
- On it: "Review: final set" · "Med Rec Agent: job, reach and limits, as the committee will read them".
- **Open the final set → 10**

**10 · Sponsor approval** · Priya · 07 Oct · 1e · `/inventory/agents/med-rec/onboarding/approval` · `10-priya-approval.png`
- For: the whole set on one page, "as the committee will read them".
- On it:
  - The job (Marcus · 04 Oct), the reach (Marcus · 05 Oct), the limits with their test results (Sam · 06 Oct), and the tools.
  - "Who did what", and the line: "If anyone edits the record after you approve, your approval resets and you're asked again."
- **Request changes → 11** (the loop)
- **Approve and sign → 13** (after the loop, on the second review)

**11 · Request changes on HS-11** · Priya · 07 Oct · 1f · same route · `11-priya-request-changes.png`
- For: sending back only the part in doubt.
- On it:
  - Send back to Sam (limits) or Marcus (job and reach), about the row selected (HS-11 v1).
  - The note: "HS-11 shows 0 blocks. Before I sign, please test it on September's 8 East transfers."
  - "Step 4 reopens for Sam; steps 2 and 3 stay done."
- **Send back to Sam → curved arrow back to Sam → 12**

**12 · Returned to Sam** · Sam · 07 Oct · 1g · `/inventory/agents/med-rec/onboarding/tools` · `12-sam-returned.png`
- For: re-testing only what Priya asked about.
- On it:
  - "Priya sent this step back. Only HS-11 is open; everything else stays as Priya reviewed it."
  - A case picker (01–30 Sep · 8 East · transfers in, 212 encounters).
- **Run test** → would have blocked 0 of 212.
- **Send to Priya again → back to 10 → Approve and sign → 13**

**13 · Ready for review (frozen)** · Priya / anyone · 07 Oct · 1h · `/inventory/agents/med-rec/onboarding/review` · `13-ready-for-review.png`
- For: the end of onboarding. "The record is frozen at v1.0 and sits with AIMS Review."
- On it:
  - The sponsor's signature (07 Oct 16:02), which notes the one round of changes on HS-11.
  - "What happens next": risk tier, then the committee packet for the 14 Oct meeting. A change now needs a new version and Priya's approval again.
- **Priya's signature → raises "Review: risk tier" in Dana's inbox → hand-off to 14**

### AIMS Review · 13–14 Oct

**14 · Dana's inbox** · Dana · raised 07 Oct, due 13 Oct · 5a pattern · `/operations/inbox` · `14-dana-inbox.png`
- On it: "Review: risk tier" · "Med Rec Agent is frozen at v1.0. Set the risk tier to build the committee packet." Due Tuesday (13 Oct).
- **Open risk tier → 15**

**15 · Risk tier** · Dana · 13 Oct · 2b · `/inventory/agents/med-rec/risk-tier` · `15-dana-risk-tier.png`
- For: how much scrutiny the agent gets for the rest of its life.
- On it:
  - The factors behind the suggestion: patient impact raises it, the adverse branches are held down by hard stops, draft-only and limited reach lower it. Suggested Tier 2.
  - A choice of Tier 1–4.
  - "What the tier sets": shadow minimum, who decides, how often the privilege is reviewed, who decides promotions.
  - Changing the suggestion needs a reason.
- **Tier 3 + reason ("Med rec errors carry into every inpatient order…") → Set Tier 3 and build the packet → raises "Review: your decision" in Dr. Lee's inbox → hand-off to 16**

**16 · Dr. Lee's inbox** · Dr. Lee · 14 Oct · 5a pattern · `/operations/inbox` · `16-drlee-inbox.png`
- On it: "Review: your decision" · "Med Rec Agent · Tier 3 · High. The packet is ready for the board."
- **Open the packet → 17**

**17 · Committee packet** · Dr. Lee · 14 Oct · 2c · `/portfolio/reviews/med-rec` · `17-drlee-packet.png`
- For: the board decides from one page. AI review board, 14 Oct 2026, item 3 of 5.
- On it:
  - The job description, the never list and its hard stops, the systems grid, the tested hard stops (including HS-11 re-tested on 212 transfers), the success criteria, the rollout domain, and Dana's tier with Dana's reason.
  - The decision: Approve · Approve with conditions · Re-review · Deny.
  - Conditions C1 (a pharmacist signs every draft), C2 (weekly edit-rate report to Priya for the first 4 weeks), C3 (exclude patients on dialysis). A reason is required.
- **Approve with conditions + reason → Record decision → 18**

**18 · Decision logged** · Dana / anyone · 14 Oct · 2d · `/inventory/agents/med-rec` · `18-decision-logged.png`
- For: the decision and its conditions on the agent's record.
- On it:
  - "Approved with conditions" with Dr. Lee's reason.
  - The conditions, each with who checks it ("Gateway · enforced").
  - Both activities: "Shadow from 15 Oct".
- **→ the Shadow block (15 Oct – 04 Nov)**

### Shadow · 15 Oct – 04 Nov

Draw the shadow block described in §1.

### Go-live · 05–06 Nov

**19 · Shadow scorecard** · Marcus · 05 Nov · 3a · `/operations/agents/med-rec?tab=scorecard` · `19-marcus-scorecard.png`
- For: deciding on evidence whether the agent leaves shadow.
- On it:
  - "21 days · 1,118 admissions · each draft compared with the admitting pharmacist's final list."
  - The results: agreement 91.2 % (met), omitted 2.1 % (met), inaccurate 2.6 % (below the 2.0 % target).
  - The 29 inaccurate lines by cause; 21 are brand and generic name mismatches.
  - 12 sample cases.
  - A go-live box: "HS-04 would have fired 9 times."
- **Open (a sample case) → 20**
- **Ask Priya to sign → raises "Review: your signature" in Priya's inbox → hand-off to 21**
- Also offered: **Extend shadow by 7 days** (not taken).

**20 · Sample case, side by side** · Marcus · 05 Nov · 3b · `/operations/agents/med-rec/cases/enc-4105` · `20-marcus-sample-case.png`
- For: checking that the numbers mean what they say.
- On it:
  - Encounter 4105, the agent's draft beside Ana R.'s final list, line by line: 5 agree, Lasix against furosemide (inaccurate · name), Vitamin D3 omitted.
  - A note on why each line differs, plus Open trace and Flag for SOP.
- **Back → 19**

**21 · Priya's inbox** · Priya · 06 Nov · 5a pattern · `/operations/inbox` · `21-priya-inbox.png`
- On it: "Review: your signature" · "Med Rec Agent: Reconcile home medications at admission, Shadow → Draft".
- **Open the signature → 22**

**22 · Sign the privilege** · Priya · 06 Nov · 3c · `/inventory/privileges/prv-0142/sign` · `22-priya-sign.png`
- For: Priya taking accountability for moving one activity from Shadow to Draft.
- On it:
  - The ladder: Shadow (current) → Draft (proposed); Supervised and Autonomous locked.
  - The activity, the agent build, the domain (excluding dialysis), the hard stops, the review date (05 Feb 2027, in 91 days) and the step-down triggers.
  - The shadow evidence.
  - "1 of 3 criteria is below target. A written reason is required and stays on the privilege record."
  - "I accept accountability for this delegation until 05 Feb 2027."
  - "What changes when you sign": about 140 drafts a day start reaching pharmacists' worklists.
- **Reason + accept → Sign and move to Draft → 23**
- Also offered: **Request changes**, **Cancel**.

**23 · Signed: at Draft** · Priya · 06 Nov · 3c after signing · same route · `23-priya-signed.png`
- On it: the ladder now shows Draft as current. PRV-0142 v3 is in force with Priya as the named grantor.
- **→ 24**

**24 · My privileges** · Priya · 06 Nov · 3d · `/portfolio/privileges` · `24-priya-my-privileges.png`
- For: every delegation Priya has signed, soonest review first.
- On it: 17 privileges. Med Rec's new one is near the bottom, with its review in 91 days (`screens/full/` shows it).
- End of the flow.

## 5. Paths not drawn

Put these as small notes beside the step they leave from:

- **02:** a different owner, or splitting the division, if the span check matters.
- **10 / 11:** Priya can send the job and reach back to Marcus instead of Sam.
- **15:** Tier 1 skips the board and goes straight to shadow.
- **17:** Re-review (back to Dana with questions, next meeting) or Deny (the request closes and the record is archived).
- **19:** Extend shadow by 7 days.
- **22:** Request changes (back to Marcus).

## 6. Files

- `screens/NN-name.png`: the first screen of each step (1440 px wide, product area only).
- `screens/full/NN-name.png`: the whole page.
- To regenerate after the prototype changes:

  ```bash
  pnpm exec playwright test -c playwright.capture.config.ts tests/capture/flow-map.spec.ts
  ```
