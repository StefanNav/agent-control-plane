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
]
