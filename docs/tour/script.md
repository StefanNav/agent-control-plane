# Tour script

The hybrid flow (Stefan, 2026-10-09) with eight edits. It opens on the live product for a short hook, gives an agenda, then follows a traditional order: the problem, who it's for, one uninterrupted walkthrough, the three decisions, how I got here, how I'd validate it, and a close.

How to read this:
- Only the numbered lines are spoken. One sentence per line, one recording per line.
- `[brackets]` are what happens on screen. Italic lines name the screen, the date in the story, and whose view it is. Neither is spoken.
- Each `##` heading is a chapter in the tour's chapter menu; its id is in `code`. Chapter titles aren't spoken, so the walkthrough runs as one continuous story across four chapters.
- Read each section aloud as a whole before recording it line by line.
- Target: about 7 minutes, roughly 1,050 words.

---

## 1 · Open on the product · `open` · about 0:45
*Hospital board → Medications → Med Rec Agent · Tue 08 Dec, 09:52 · as Marcus*

1. Hi, I'm Stefan. Imagine you're responsible for forty-one AI agents working across a hospital. `[outline: the divisions table]`
2. You can't watch them all, so this screen only asks for your attention where a person is actually needed. `[click: Medications]`
3. In Medications, that person is Marcus, who owns twenty agents, and right now four of them need Marcus. `[click: Med Rec Agent]`
4. This one drafts each patient's home medication list, and this morning it tried to change three patients' doses and was stopped every time. `[outline: "3 drafts held by HS-04 v2"]`
5. This is Agent Control Plane, my concept for how a hospital brings on and supervises its AI agents.
6. Over the next few minutes, I'll cover the problem, who it's for, the life of this one agent, the three decisions that shaped it, how I got here, and how I'd validate it.
7. You can pause anytime and click around, and everything you click really works.

## 2 · The problem · `problem` · about 0:40
*Interlude page: the problem*

1. I picked this problem because hospitals are starting to use AI agents that don't just suggest things; they actually do them. `[show: line 1]`
2. The usual safety net is a person approving every action. `[show: line 2]`
3. But that doesn't hold up well: in one recent study, people caught only about one in five bad agent actions. `[card: research R1, R2]`
4. And with dozens of agents, approving everything turns into rubber-stamping.
5. The thing is, hospitals already know how to trust someone new. `[show: line 3]` `[card: research R3]`
6. It's how they bring on a clinician: a defined scope, supervision, and privileges earned on evidence that can be taken away.
7. Residents earn independence one skill at a time, and self-driving cars only operate where they've proven they can.
8. So I built the whole product around that idea.

## 3 · Who it's for · `people` · about 0:30
*Landing page: the seven people*

1. Seven people use it, each with a different job. `[outline: the story cards]`
2. Marcus owns the agents and supervises them day to day. `[outline: Marcus]`
3. Priya is the clinical sponsor who signs for what each agent is allowed to do. `[outline: Priya]`
4. Dana runs the AI program, Sam handles the technical limits, and Dr. Lee chairs the review board. `[outline: Dana, Sam, Dr. Lee]`
5. Pharmacists like Ana never open the console at all; they work with the agent from inside the medical record. `[outline: Ana]`
6. And Jordan, in risk, can rebuild anything an agent did after the fact. `[outline: Jordan]`

## 4 · Bring it on · `onboarding` · about 0:45

1. So let's go back to how the agent you saw earlier got here.

*Onboarding, the approved request · Thu 01 Oct · as Dana*

2. It starts on October first, when the hospital's AI committee approves the request for it, and Dana starts onboarding from that approval. `[outline: "Carried over from REQ-0093"]`
3. No agent goes live without four named people who answer for it. `[outline: Owners]` `[click: Sam as technical owner]`

*Onboarding, tools and hard stops · Tue 06 Oct · as Sam*

4. Marcus writes down what it must never do, starting with never changing a dose. `[outline: the three hard stops]`
5. Sam turns each of those into a hard stop that sits outside the AI, so the agent can't argue its way past it. `[card: "Hard stops run outside the model"]`
6. And each one is tested against the last thirty days, so the board can see what it would actually have caught. `[outline: "would have blocked 7 of 1,204"]`

*AI review board packet · Wed 14 Oct · as Dr. Lee*

7. Dr. Lee's board approves it with conditions, like a pharmacist signing every draft. `[click: Approve with conditions]` `[type: the reason]` `[click: Record decision]`

## 5 · Earn trust · `earning-trust` · about 0:30

*Shadow scorecard · Thu 05 Nov · as Priya*

1. For three weeks it works in shadow, doing the job without anything reaching a patient. `[outline: the targets]`

*Signing the privilege · Fri 06 Nov · as Priya*

2. It meets two targets and just misses the third, so Priya can still move it up, but only with a written reason. `[type: the reason]` `[click: Sign]`
3. Now the agent drafts, a pharmacist signs, and Priya's name is on that privilege.

## 6 · Supervise · `supervising` · about 1:10

*The medical record (a stand-in for Epic) · Tue 08 Dec · as Ana*

1. Which brings us back to this morning, and the dose changes the hard stop held.
2. Ana reviews the agent's drafts right in the medical record, and when something looks off, flags it in one click. `[outline: the agent panel]` `[click: Flag]`

*Med Rec Agent → resume request · 09:52 to 11:58 · as Marcus, then Priya*

3. Marcus pauses it in one action. `[click: Controls]` `[click: Pause agent]`
4. Before confirming, the screen shows exactly what happens: drafts go back to pharmacists, and nothing is lost. `[outline: what pausing does]` `[click: Pause]`
5. By noon there's a fix, and Marcus asks to resume, but it stays paused until Priya agrees too. `[type: the reason]` `[click: Approve]`

*Reviewer behaviour · Tue 08 Dec · as Marcus*

6. There's also a quieter risk: people trusting the agent too much. `[outline: the 6 North finding]`
7. On this unit, approvals got faster and edits dropped, but a random second check found more misses, so it's reviewers checking less, not the agent getting better. `[outline: independent check]`
8. It's shown by unit and shift, never by name.

## 7 · Trust drops · `step-down` · about 0:20

*Med Rec Agent · Wed 09 Dec · as Priya*

1. And trust can go down on its own: when pharmacists kept editing more than fifteen percent of its drafts for three days, the agent dropped back to shadow by rule. `[outline: the step-down notice]`
2. Nothing climbs back up without someone signing for it.

## 8 · Three key decisions · `decisions` · about 1:00
*Interlude page: the decisions (each card shows a small screenshot of the screen it played out on)*

1. Three decisions shaped all of this.

*Decision 1 of 3*

2. First, how an agent earns trust. `[card: Decision 1 of 3]`
3. I could have kept a person approving every action, or trusted the agent as a whole once it looked good.
4. Instead, each task earns its own privilege, one step at a time, signed by a named person; more work up front, and a lot less checking after.

*Decision 2 of 3 · the design explorations*

5. Second, how to protect people's attention. `[card: Decision 2 of 3]`
6. I explored five visual directions, and the first one, which followed my own brief exactly, broke: the row you'd selected looked like one more problem. `[show: the five overviews, then the Ledger conflict]`
7. So I judged every direction on real, crowded screens, and the winner keeps everything healthy grey, with colour, a shape and a word only where a person is needed. `[show: the stress test, then the final division view]`

*Decision 3 of 3*

8. Third, how to stop and restart. `[card: Decision 3 of 3]`
9. One person could resume, or the agent could resume on its own after a fix.
10. Instead, stopping takes one person and starting again takes two, because restarting is the riskier moment.

## 9 · How I got here · `process` · about 0:30
*Interlude page: tiles light up as you name them*

1. A quick word on how I got here. `[tile: Research]`
2. I spent most of my time on research and defining the problem before designing a single screen.
3. That shaped the vision, requirements and roadmap, then epics and user stories, and only then the screens. `[tiles: Vision, PRD, Roadmap, Epics and stories]`
4. I explored the design system first, then built it in code with Claude Code, phase by phase. `[tiles: Brief, Explorations, Frames, Build]`
5. AI sped up every step, but I made the calls and signed off on each one, the same rule the product enforces.

## 10 · How I'd validate it · `validate` · about 0:35
*Interlude page*

1. So how would I know it works? `[show: what I checked]`
2. I couldn't test it with hospital staff, so I checked what I could.
3. Every screen traces back to a user story, and building it for real exposed contradictions in my own designs, which I fixed.
4. On a real team, I'd put it in front of pharmacists, agent owners and engineers before anything gets built. `[show: who I'd bring in]`
5. I'd want to learn who actually watches an agent day to day, and which actions must always stay with a person.
6. And I'd measure how fast a problem reaches a named person, and whether reviewers are still really reviewing. `[show: what I'd measure]`

## 11 · Close · `close` · about 0:15
*Landing page · back to 08 Dec · as Marcus*

1. That's the life of one agent.
2. Each of the seven people has their own walkthrough here, or you can explore on your own, and Reset puts everything back.
3. Thanks for watching.

---

## Notes

**The eight edits applied to the hybrid**
1. "Who it's for" now names all seven people (Jordan added).
2. A short "How I got here" chapter sits before validation, with the Claude Code line moved there from the close. The opening agenda mentions it too.
3. "Over the next few minutes" instead of "six minutes".
4. The problem opens by answering "why this example".
5. The pause line is split in two, so the impact preview is on screen while it's described.
6. Reviewer behaviour keeps "shown by unit and shift, never by name".
7. "Approves the request for it", so the intake committee isn't confused with Dr. Lee's board.
8. "Was stopped every time"; the problem section ends "So I built the whole product around that idea."

**If it runs long, cut in this order**
1. Problem, line 7 (residents and self-driving)
2. Who it's for, line 4 (Dana, Sam, Dr. Lee)
3. Validate, line 3 (traceability and contradictions)

**Facts tied to the screens** (change the screen or the line, never just one)
- 41 agents; Marcus owns 20, 4 need a person; 3 dose changes held this morning
- REQ-0093 approved; 4 named people; Sam as technical owner
- Hard stops from Marcus's never list; tested on the last 30 days ("would have blocked 7 of 1,204")
- Board conditions include a pharmacist signing every draft
- Shadow: 3 weeks, two targets met, one just missed; signing with a missed target needs a written reason
- Ana's flag reaches Marcus; pause sends drafts back to pharmacists; fix by noon (11:58); resume needs Marcus and Priya
- 6 North: faster approvals, fewer edits, more misses in the independent check; by unit and shift, never by name
- Step-down: edits above 15 % for 3 days, back to Shadow by rule
