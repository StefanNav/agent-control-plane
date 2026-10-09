import type { Chapter } from './types'

/** A two-chapter, three-step tour for engine tests: an interlude, then a product step, then a second chapter. */
export const FIXTURE_CHAPTERS: Chapter[] = [
  {
    id: 'why',
    title: 'Why this problem',
    steps: [
      {
        id: 'why-intro',
        route: '/tour/why',
        beats: [
          {
            id: 'why-intro-1',
            text: 'Hospitals are adopting agents faster than they can govern them.',
          },
          { id: 'why-intro-2', text: 'Nobody can say who owns one.', reveal: 'gap-owner' },
          { id: 'why-intro-3', text: 'So I started there.' },
        ],
      },
      {
        id: 'why-screen',
        route: '/operations/agents/med-rec',
        scenario: 'med-rec-paused',
        persona: 'marcus',
        beats: [
          {
            id: 'why-screen-1',
            text: 'This agent was paused at 09:41.',
            actions: [{ kind: 'outline', target: 'agent-summary' }],
          },
          { id: 'why-screen-2', text: 'A named person has to decide what happens next.' },
        ],
      },
    ],
  },
  {
    id: 'decision-1',
    title: 'Decision 1',
    decision: 1,
    steps: [
      {
        id: 'decision-1-screen',
        route: '/operations',
        scenario: 'baseline',
        persona: 'priya',
        beats: [
          {
            id: 'decision-1-screen-1',
            text: 'Privileges are staged, never granted all at once.',
            actions: [
              { kind: 'card', card: 'decision-1', side: 'left' },
              { kind: 'wait', ms: 500 },
            ],
          },
          {
            id: 'decision-1-screen-2',
            text: 'Each stage is a decision a person signs.',
            actions: [{ kind: 'clearCard' }],
          },
        ],
      },
    ],
  },
]
