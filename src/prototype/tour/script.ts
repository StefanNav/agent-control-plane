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
]
