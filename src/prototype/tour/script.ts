import type { Chapter } from './types'

/**
 * The tour, in running order; `pnpm tour:audio` makes a clip for each beat. The text is
 * `docs/tour/script.md` verbatim, one beat per numbered line; its brackets are the actions.
 */
export const CHAPTERS: Chapter[] = [
  {
    id: 'open',
    title: 'Open on the product',
    steps: [
      {
        // One step across three screens: its own clicks, each at the end of its line (Ruling 17),
        // go board → Medications → Med Rec Agent.
        id: 'open-product',
        route: '/operations',
        scenario: 'baseline',
        persona: 'marcus',
        beats: [
          {
            id: 'open-1',
            text: "Hi, I'm Stefan. Imagine you're responsible for forty-one AI agents working across a hospital.",
            actions: [{ kind: 'outline', target: 'board-divisions' }],
          },
          {
            id: 'open-2',
            text: "You can't watch them all, so this screen only asks for your attention where a person is actually needed.",
            actions: [{ kind: 'outline', target: 'board-medications' }],
            after: [
              { kind: 'click', target: 'board-medications' },
              { kind: 'click', target: 'board-open-division' },
            ],
          },
          {
            id: 'open-3',
            text: 'In Medications, that person is Marcus, who owns twenty agents, and right now four of them need Marcus.',
            actions: [{ kind: 'outline', target: 'division-agents' }],
            after: [
              { kind: 'click', target: 'division-med-rec' },
              { kind: 'click', target: 'division-open-agent' },
            ],
          },
          {
            id: 'open-4',
            text: "This one drafts each patient's home medication list, and this morning it tried to change three patients' doses and was stopped every time.",
            actions: [{ kind: 'outline', target: 'agent-summary' }],
          },
          {
            id: 'open-5',
            text: 'This is Agent Control Plane, my concept for how a hospital brings on and supervises its AI agents.',
          },
          {
            id: 'open-6',
            text: "Over the next few minutes, I'll cover the problem, who it's for, the life of this one agent, the three decisions that shaped it, how I got here, and how I'd validate it.",
          },
          {
            id: 'open-7',
            text: 'You can pause anytime and click around, and everything you click really works.',
          },
        ],
      },
    ],
  },
  {
    id: 'onboarding',
    title: 'Bring it on',
    steps: [
      {
        id: 'onboarding-intake',
        route: '/inventory/agents/med-rec/onboarding/intake',
        scenario: 'onboarding-intake',
        persona: 'dana',
        beats: [
          {
            id: 'onboarding-1',
            text: "So let's go back to how the agent you saw earlier got here.",
          },
          {
            id: 'onboarding-2',
            text: "It starts on October first, when the hospital's AI committee approves the request for it, and Dana starts onboarding from that approval.",
            actions: [{ kind: 'outline', target: 'intake-carried' }],
          },
          {
            id: 'onboarding-3',
            text: 'No agent goes live without four named people who answer for it.',
            // The technical owner is a native select: one press, and Sam is chosen.
            actions: [
              { kind: 'outline', target: 'intake-owners' },
              { kind: 'choose', target: 'intake-tech-owner', value: 'sam' },
            ],
          },
        ],
      },
      {
        id: 'onboarding-tools',
        route: '/inventory/agents/med-rec/onboarding/tools',
        scenario: 'onboarding-tools-tested',
        persona: 'sam',
        beats: [
          {
            id: 'onboarding-4',
            text: 'Marcus writes down what it must never do, starting with never changing a dose.',
            actions: [{ kind: 'outline', target: 'tools-hardstops' }],
          },
          {
            id: 'onboarding-5',
            text: "Sam turns each of those into a hard stop that sits outside the AI, so the agent can't argue its way past it.",
            actions: [{ kind: 'card', card: 'hard-stops-outside' }],
          },
          {
            id: 'onboarding-6',
            text: 'And each one is tested against the last thirty days, so the board can see what it would actually have caught.',
            actions: [{ kind: 'clearCard' }, { kind: 'outline', target: 'tools-hardstop-test' }],
          },
        ],
      },
      {
        id: 'onboarding-packet',
        route: '/portfolio/reviews/med-rec',
        scenario: 'review-committee',
        persona: 'drlee',
        beats: [
          {
            id: 'onboarding-7',
            text: "Dr. Lee's board approves it with conditions, like a pharmacist signing every draft.",
            actions: [
              { kind: 'outline', target: 'packet-decision' },
              { kind: 'click', target: 'packet-approve-conditions' },
              {
                kind: 'type',
                target: 'packet-reason',
                text: 'Hard stops tested well. Conditions: a pharmacist signs every draft, weekly edit-rate reports to Priya, no dialysis patients yet.',
              },
            ],
            // Hold on the recorded decision before the next chapter loads (Ruling 22).
            after: [
              { kind: 'click', target: 'packet-record' },
              { kind: 'wait', ms: 1500 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'earning-trust',
    title: 'Earn trust',
    steps: [
      {
        id: 'earning-trust-scorecard',
        route: '/operations/agents/med-rec?tab=scorecard',
        scenario: 'shadow-day-21',
        persona: 'priya',
        beats: [
          {
            id: 'earning-trust-1',
            text: 'For three weeks it works in shadow, doing the job without anything reaching a patient.',
            actions: [{ kind: 'outline', target: 'scorecard-criteria' }],
          },
        ],
      },
      {
        // Signing takes the reason and the accountability box; the signature then names Priya.
        id: 'earning-trust-sign',
        route: '/inventory/privileges/prv-0142/sign',
        scenario: 'awaiting-signature',
        persona: 'priya',
        beats: [
          {
            id: 'earning-trust-2',
            text: 'It meets two targets and just misses the third, so Priya can still move it up, but only with a written reason.',
            actions: [
              { kind: 'outline', target: 'sign-signature' },
              {
                kind: 'type',
                target: 'sign-reason',
                text: 'Inaccurate lines are mostly brand and generic name mismatches. SOP v1.3.1 adds 186 brand names, and a pharmacist still signs every draft.',
              },
              { kind: 'click', target: 'sign-accept' },
            ],
            after: [{ kind: 'click', target: 'sign-submit' }],
          },
          {
            id: 'earning-trust-3',
            text: "Now the agent drafts, a pharmacist signs, and Priya's name is on that privilege.",
          },
        ],
      },
    ],
  },
  {
    id: 'supervising',
    title: 'Supervise',
    steps: [
      {
        id: 'supervising-epic',
        route: '/epic',
        scenario: 'baseline',
        persona: 'ana',
        beats: [
          {
            id: 'supervising-1',
            text: 'Which brings us back to this morning, and the dose changes the hard stop held.',
          },
          {
            id: 'supervising-2',
            text: "Ana reviews the agent's drafts right in the medical record, and when something looks off, flags it in one click.",
            actions: [{ kind: 'outline', target: 'epic-agent-panel' }],
            // Flag opens the form with the reason picked from Ana's edit; Send flag confirms it.
            after: [
              { kind: 'click', target: 'epic-flag' },
              { kind: 'click', target: 'epic-flag-submit' },
              { kind: 'wait', ms: 1500 },
            ],
          },
        ],
      },
      {
        id: 'supervising-pause',
        route: '/operations/agents/med-rec',
        scenario: 'baseline',
        persona: 'marcus',
        beats: [
          {
            id: 'supervising-3',
            text: 'Marcus pauses it in one action.',
            actions: [
              { kind: 'click', target: 'controls-trigger' },
              { kind: 'click', target: 'controls-pause' },
            ],
          },
          {
            id: 'supervising-4',
            text: 'Before confirming, the screen shows exactly what happens: drafts go back to pharmacists, and nothing is lost.',
            actions: [{ kind: 'outline', target: 'pause-impact' }],
            after: [
              { kind: 'click', target: 'pause-confirm' },
              { kind: 'wait', ms: 1500 },
            ],
          },
        ],
      },
      {
        // 11:58: Marcus has asked to resume; Priya decides.
        id: 'supervising-resume',
        route: '/operations/agents/med-rec',
        scenario: 'resume-requested',
        persona: 'priya',
        beats: [
          {
            id: 'supervising-5',
            text: "By noon there's a fix, and Marcus asks to resume, but it stays paused until Priya agrees too.",
            actions: [
              {
                kind: 'type',
                target: 'resume-reason',
                text: "Sam's dose mapping fix is in, and the replay of 23 cases came back clean. Agreed to resume.",
              },
            ],
            // The header's status shows the change (Paused → Draft); its outline brings it into view.
            after: [
              { kind: 'click', target: 'resume-approve' },
              { kind: 'outline', target: 'agent-status' },
              { kind: 'wait', ms: 1500 },
            ],
          },
        ],
      },
      {
        id: 'supervising-reviewers',
        route: '/operations/reviewers',
        scenario: 'baseline',
        persona: 'marcus',
        beats: [
          {
            id: 'supervising-6',
            text: "There's also a quieter risk: people trusting the agent too much.",
            actions: [{ kind: 'outline', target: 'reviewers-finding' }],
          },
          {
            id: 'supervising-7',
            text: "On this unit, approvals got faster and edits dropped, but a random second check found more misses, so it's reviewers checking less, not the agent getting better.",
            actions: [{ kind: 'outline', target: 'reviewers-check' }],
          },
          {
            id: 'supervising-8',
            text: "It's shown by unit and shift, never by name.",
            actions: [{ kind: 'outline', target: 'reviewers-by-unit' }],
          },
        ],
      },
    ],
  },
  {
    id: 'step-down',
    title: 'Trust drops',
    steps: [
      {
        // The next morning: admission med rec dropped from Draft to Shadow at 06:00.
        id: 'step-down-notice',
        route: '/operations/agents/med-rec',
        scenario: 'step-down-threshold',
        persona: 'priya',
        beats: [
          {
            id: 'step-down-1',
            text: 'And trust can go down on its own: when pharmacists kept editing more than fifteen percent of its drafts for three days, the agent dropped back to shadow by rule.',
            actions: [{ kind: 'outline', target: 'stepdown-notice' }],
          },
          {
            id: 'step-down-2',
            text: 'Nothing climbs back up without someone signing for it.',
          },
        ],
      },
    ],
  },
]
