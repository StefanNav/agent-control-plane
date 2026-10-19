# Ideas to revisit

Notes from walking through the prototype, started 2026-10-15. These aren't decisions. Each one is something to come back to and decide whether to build.

## From Stefan

### 1. Show the risk tier while granting systems and verbs

- **Where:** onboarding step 3, Systems and verbs (frame 1c).
- **Today:** the tier first appears later, on the Risk tier screen (2b), after Priya approves the set. Ticking Submit anywhere makes it suggest Tier 4, but Marcus can't see that while he ticks.
- **Idea:** show the suggested tier beside the grid, and how each tick moves it.
- **To weigh:**
  - Risk depends on *which* verbs, not how many. One Submit outweighs a dozen Reads, and Draft-only lowers it, so the display should say why the tier moved.
  - The tier is Dana's call on the finished set, and a live score could invite ticking to the score rather than to the job.

### 2. Make it clear when each person's part is done, and whose turn it is

> **Phase 12 (PR #28):** starting onboarding now asks Marcus in his inbox ("Job and systems to write"), so every hand-off in onboarding reaches an inbox. Still open: a "Waiting on {name}" line on the record, and a note when editing someone else's step.

- **Where:** the onboarding wizard (steps 1–5).
- **What happened:** as Dana, after filling everything in, it wasn't clear that the next move was to wait for Marcus.
- **Today:**
  - Each step names its owner, and the side panel lists what's left and whose it is ("Also needed before Priya · 1 hard stops · Sam").
  - Inventory → Drafts has a "Waiting on" column and a "Waiting on me" count.
  - Some screens say where the work goes next: step 3 says "When you finish, the list goes to Sam's inbox"; step 4's send button says it "Raises 'Review: final set' in Priya's inbox".
  - The other hand-offs reach the next person's inbox: Sam's "Tools: hard stops to test", Priya's "Review: final set" and "Review: your signature", Dana's "Review: risk tier", Dr. Lee's "Review: your decision".
  - **Starting onboarding sends Marcus nothing,** although step 1's "What starting does" says it "Asks Marcus for the job description, systems and verbs". He finds the draft only through Inventory → Drafts.
  - Once a step is done, its own page doesn't say "your part is done, it's with Sam now".
  - Dana, Priya and Sam can edit Marcus's steps (2 and 3) without being told whose step it is.
- **To brainstorm:**
  - a "Waiting on <name> · <step>" line in the record header;
  - when someone finishes their part, a confirmation naming who was told;
  - a hand-off item to Marcus when onboarding starts;
  - a note when editing a step that belongs to someone else.

## Raised during the walkthrough (keep or delete)

3. **"Committee" names two bodies.** On the intake step it's the intake approval ("What the committee approved"). Elsewhere it's Dr. Lee's board ("Committee packet", and the Drafts tab's "when the committee approves them"). Give them distinct names.
4. **An unregistered caller with no intake and no known owner has no way forward.** On 9b, ed-triage-helper's panel says "Ask the owner to file one, or block it", but the owner is Unknown and there's no Message button. That leaves Block or Not an agent. The panel is a composed screen (Phase 6 ruling R19). Options: ask the department that holds the key to claim it, or let Dana file the request herself.
5. **An activity that's ready for Draft isn't flagged to anyone.** *(Deferred in Phase 12 as D1: needs a deadline policy first.)* Allergy flags have been in shadow 54 days with all three targets met, and "Ask Priya to sign" waits on Marcus, but nothing in his inbox says so.
6. **The shadow scorecard's trend lines have no numbers.** The 21 DAYS column shows direction only; start and end values would show the size of the change.
7. **Seed data gaps:**
   - only encounter 4105 has a trace, so Open trace is hidden on the other 11 sample cases;
   - the allergy-flags scorecard borrows the medication-list criteria and has no sample cases.
8. **"Open incident" shows on shadow traces,** where nothing reached a patient.
9. **The "Blocked: N items left" count is misleading.** The onboarding side panel counts the sponsor's own approval, which can only happen after sending.
10. **Help Marcus choose grants.** Pre-fill the systems grid from what the agent's build says it calls, and after shadow, flag grants it never used.
11. **Disabling a single activity or a whole division isn't built** (story E6.4). Only whole-agent disable and retire exist.
12. **Dana's story jumps from 13 Oct to 08 Dec** between steps 3 and 4, with only "08 Dec." at the start of the narration to say so.
13. **Requesters get no guidance on what they can ask for.** This is upstream, in AIMS intake. Ideas: state the hard lines (never sign, order or change a dose; v1 agents only draft), show what already runs, and name the person to talk to first.
14. **Plural copy bugs on onboarding step 4:** "All 1 activities" and "Blocked: 1 items left".
15. **Tools are generated from the grants, not chosen.** The PRD says the technical owner "grants tools per agent from the gateway catalogue", but step 4 builds one tool per grant automatically, and Sam only confirms that they match step 3.

## From the Phase 12 review (deferred minors)

16. **Later-day scenarios show stale hand-offs.** In 9a, 10b and 15a, PRM-0007's "Promotion to sign" and the culture draft's "Job and systems to write" sit overdue, and H4's "the board decides on 09 Dec" is stale once that date passes.
17. **Flag for SOP tells the flagger.** When the technical owner flags a line, the log says "Shared with Sam … · Sam".
18. **Promotion edge cases.** There's no not-for-yourself guard when the sponsor is also the requester, and the board's re-review copies only the chair, not the requester.
19. **The case page looks up the technical owner's name inline** instead of through its selector.
20. **Marcus's story, step 4,** says "anything not handled in time goes to Priya", but hand-offs never escalate.
