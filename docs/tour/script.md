# Tour script · first draft

How to read this:
- One sentence per numbered line. Each line becomes one short recording.
- `[brackets]` are what happens on screen while you say that line. They aren't spoken.
- Each chapter starts with the screen, the date in the story, and whose view it is.
- Numbers, names and dates match what the screen shows. If you change one, tell me, and I'll check the screen agrees.
- Your notes on the draft go at the end.

---

## 0 · Cold open · about 0:25
*Hospital board → Medications → Med Rec Agent · Tue 08 Dec, 09:52 · as Marcus*

1. This is Attune's Agent Control Plane, where a hospital keeps an eye on its AI agents. `[outline: the divisions table]`
2. Lakeshore Health, our made-up hospital, runs 41 agents across five divisions.
3. Grey means fine, so almost everything here is grey.
4. Only two divisions have colour, and that's where a person is needed. `[click: Medications]`
5. Marcus looks after twenty agents here, and four need attention. `[click: Med Rec Agent]`
6. This one checks patients' home medications when they're admitted. `[outline: "3 drafts held by HS-04 v2"]`
7. This morning it tried to change three patients' home doses, and it was stopped every time.
8. To see how, let's go back ten weeks, to the day it was hired.

## 1 · Why this problem · about 0:30
*Interlude page*

1. First, why I picked this problem. `[show: line 1]`
2. Hospitals are moving from AI that suggests things to AI agents that actually do them.
3. The usual safety net is a person approving every action. `[show: line 2]`
4. But people tend to approve what's in front of them, and one study found they caught only about one bad agent action in five. `[card: research R1, R2]`
5. So more approvals isn't the answer.
6. Hospitals already know how to trust someone new: it's how they bring on a clinician. `[show: line 3]` `[card: research R3]`
7. A written job, named supervisors, and privileges that are earned on evidence and can be taken away.
8. I designed the whole product around that idea.

## 2 · How I worked · about 0:30
*Interlude page: nine tiles light up as you name them*

1. Here's how I got from that idea to this. `[tile: Research]`
2. I started with research: how hospitals govern AI today, and what goes wrong when people supervise automation.
3. That became a vision, a requirements doc and a roadmap, broken into user stories with a clear definition of done. `[tiles: Vision, PRD, Roadmap, Epics and stories]`
4. Then came a design brief, five visual directions, and fifty-five screens. `[tiles: Brief, Explorations, Frames]`
5. I built it with Claude Code in ten phases, and reviewed every phase before it went live. `[tile: Build]`
6. AI did a lot of the work, but I signed off on every step: the same rule the product enforces.

## 3 · Bring it on safely · about 1:00

*Onboarding, the approved request · Thu 01 Oct · as Dana*

1. October first: the hospital's AI committee approves a request for this agent. `[outline: "Carried over from REQ-0093"]`
2. Dana, who runs the AI program, starts onboarding from that approval, so nothing gets retyped.
3. No agent goes live without four named people responsible for it. `[outline: Owners]` `[click: Sam as technical owner]`

*Onboarding, tools and hard stops · Tue 06 Oct · as Sam*

4. Next, Marcus lists what this agent must never do, and Sam, the technical owner, turns each line into a hard stop. `[outline: the three hard stops]`
5. A hard stop sits outside the AI, between the agent and the hospital's systems, so the agent can't talk its way past it. `[card: "Hard stops run outside the model"]`
6. Tested on the last thirty days, the "never change a dose" rule would have caught seven of 1,204 drafts. `[card: the onboarding user story]`

*AI review board packet · Wed 14 Oct · as Dr. Lee*

7. Because it touches every admission, the hospital's AI review board decides. `[outline: the packet]`
8. Dr. Lee approves it with conditions: a pharmacist signs every draft, and patients on dialysis are left out. `[click: Approve with conditions]` `[type: the reason]` `[click: Record decision]`

## 4 · Earn the privilege · Decision 1 · about 1:00

*Shadow scorecard · Thu 05 Nov · as Priya*

1. For three weeks, the agent works in shadow: it does the job, but nothing it produces reaches a patient. `[outline: the targets]`
2. Each draft is compared with the pharmacist's own list, across 1,118 admissions.
3. Two targets are met, and one is just missed: 2.6 percent of lines are wrong, against a goal of 2.
4. This is my first key decision. `[card: Decision 1 of 3]`
5. I could have had a person approve every action, or trusted the agent as a whole.
6. Instead, each task earns its own privilege, one level at a time: shadow, then draft, then supervised, then autonomous.
7. And every privilege is signed by a named person, based on evidence.
8. It's more effort up front, and far less checking later.

*Signing the privilege · Fri 06 Nov · as Priya*

9. Priya is the clinical lead who answers for medications. `[outline: "Your signature"]`
10. With a target missed, Priya can still sign, but only with a written reason that stays on the record. `[type: the reason]` `[click: Sign]`
11. Now the agent moves up to draft: it prepares the list, and a pharmacist signs it.

## 5 · Keep it quiet · Decision 2 · about 1:05

*Interlude page: the design explorations*

1. My second decision was about keeping the screen quiet. `[card: Decision 2 of 3]`
2. In control rooms, people spot problems far earlier on calm, grey screens. `[card: research R5, R6]`
3. I explored five visual directions. `[show: the five overviews]`
4. The first followed my brief to the letter, and it broke: with one accent colour, the row you'd selected looked like one more problem. `[show: the Ledger conflict]`
5. So I put every direction onto the same two real, crowded screens. `[show: the stress test]`
6. A favourite emerged, then lost when I rebuilt a long form in all five. `[show: the onboarding comparison]`
7. Every time, my decisions changed on a real, crowded screen, never on a tidy specimen sheet.
8. The winner, Countersign, keeps healthy things grey, and adds colour, a shape and a word only when a person is needed. `[show: the final division view, then the four board layouts]`

*The medical record (a stand-in for Epic) · Tue 08 Dec · as Ana*

9. Pharmacists like Ana never open this console; they review the agent's work inside the medical record they already use. `[outline: the agent panel]`
10. When a dose frequency comes through split across two lines, Ana flags it in one click, and it goes straight to Marcus. `[click: Flag]`

## 6 · Stop easy, resume deliberate · Decision 3 · about 1:05

*Med Rec Agent · Tue 08 Dec, 09:52 · as Marcus*

1. Back to this morning: Marcus decides to pause the agent. `[click: Controls]` `[click: Pause agent]`
2. My third decision: stopping should be easy, and starting again should be deliberate. `[card: Decision 3 of 3]`
3. Anyone responsible can pause in one action, and the screen shows what happens first. `[outline: what pausing does]`
4. Twelve drafts in progress go back to the pharmacists, and nothing is lost. `[click: Pause]`

*Resume request · 11:58 · as Priya*

5. By noon, Sam has fixed the problem, and a replay of 23 recent cases comes back clean. `[outline: the resume panel]`
6. Marcus asks to resume, but the agent stays paused until Priya agrees too, with a reason of Priya's own, and nobody can approve their own request. `[type: the reason]` `[click: Approve]`
7. Two people is slower, on purpose: restarting is the riskier moment.

*Action trace · as Jordan*

8. And Jordan, in risk management, can rebuild any action step by step, like this rule blocking that dose change in under a millisecond. `[outline: the trace]` `[card: research R4]`

## 7 · Trust can go back down · about 0:20

*Med Rec Agent · Wed 09 Dec · as Priya*

1. Trust can go down on its own, too. `[outline: the step-down notice]`
2. By the ninth, pharmacists had been editing more than fifteen percent of its drafts for three days running, so the agent dropped back to shadow by itself.
3. Nothing climbs back up without someone signing for it.

## 8 · How I'd validate it · about 0:40
*Interlude page*

1. So how would I know this works? `[show: what I checked]`
2. I haven't been able to test it with hospital staff, so here's what I checked, and what I'd do next.
3. Every screen traces back to a user story, and building it as a working model exposed contradictions in my own designs, which I fixed.
4. A squint test at wall distance changed how missing data looks, and every screen passes an accessibility check.
5. On a real team, I'd put it in front of pharmacists, agent owners and engineers early, before anything gets built. `[show: who I'd bring in]`
6. I'd want to learn who really watches an agent day to day, whether "job description" is the language staff use, and which actions must always stay with a person.
7. And I'd measure how fast a problem reaches a named person, and whether reviewers are still really reviewing. `[show: what I'd measure]`

## 9 · Your turn · about 0:15
*Landing page · back to 08 Dec · as Marcus*

1. That's the story of one agent.
2. Each of the seven people in it has their own walkthrough on this page.
3. Or explore on your own: everything you click really works, and Reset puts it all back.
4. Thanks for watching.

---

## Notes for Stefan

**Changes from the spec's running order** (all easy to undo):
- Chapter 5 no longer goes back to the hospital board. The cold open already shows it, so the time goes to the explorations instead.
- The audit-trail statistic (research R4) moved from chapter 4 to chapter 6, beside Jordan's trace, where it makes more sense.
- Chapter 5 is called "Keep it quiet" instead of "Supervise by exception": plainer, and it says what the decision is.

**Already cut to fit** (easy to put back; the cards still show each one):
- Chapter 3: the warning that Marcus would be stretched too thin.
- Chapter 5: why the table beat the other board layouts ("it works with five divisions or fifty").
- Chapter 6: the other ways to resume that I weighed, and the audit-trail statistic.

**If it still runs long, cut these next:**
- Chapter 2, line 2 (what the research covered)
- Chapter 8, line 4 (the squint test and accessibility check)

**An ordering option to consider:** "How I worked" (chapter 2) could move to just before "How I'd validate it", so the reviewer sees the product sooner and hears about the process once they're invested. The tour supports either order.

**Saying the numbers:** "1,204" reads well as "twelve hundred and four"; "1,118" as "eleven hundred and eighteen"; "2.6 percent".

**Facts tied to the screens** (change the screen or the line, never just one):
- 41 agents, 5 divisions, 2 need a person
- 20 agents in Medications, 4 need Marcus
- 3 patients, the dose rule
- REQ-0093, four named people
- 7 of 1,204 drafts; 1,118 admissions; 2.6 % against 2.0 %
- the conditions: a pharmacist signs every draft; dialysis patients excluded
- 12 drafts go back; 23 cases replayed; 11:58
- step-down: above 15 % for 3 days, on 09 Dec
