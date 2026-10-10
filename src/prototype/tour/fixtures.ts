import type { Chapter } from './types'

/** A two-chapter, three-step tour for engine tests: an interlude, then a product step, then a second chapter. */
export const FIXTURE_CHAPTERS: Chapter[] = [
  {
    id: 'problem',
    title: 'Why this problem',
    steps: [
      {
        id: 'problem-intro',
        route: '/tour/problem',
        beats: [
          {
            id: 'problem-intro-1',
            text: 'Hospitals are adopting agents faster than they can govern them.',
          },
          { id: 'problem-intro-2', text: 'Nobody can say who owns one.', reveal: 'gap-owner' },
          { id: 'problem-intro-3', text: 'So I started there.' },
        ],
      },
      {
        id: 'problem-screen',
        route: '/operations/agents/med-rec',
        scenario: 'med-rec-paused',
        persona: 'marcus',
        beats: [
          {
            id: 'problem-screen-1',
            text: 'This agent was paused at 09:41.',
            actions: [{ kind: 'outline', target: 'agent-summary' }],
          },
          { id: 'problem-screen-2', text: 'A named person has to decide what happens next.' },
        ],
      },
    ],
  },
  {
    id: 'decisions',
    title: 'Decision 1',
    decision: 1,
    steps: [
      {
        id: 'decisions-screen',
        route: '/operations',
        scenario: 'baseline',
        persona: 'priya',
        beats: [
          {
            id: 'decisions-screen-1',
            text: 'Privileges are staged, never granted all at once.',
            actions: [
              { kind: 'card', card: 'decision-1', side: 'left' },
              { kind: 'wait', ms: 500 },
            ],
          },
          {
            id: 'decisions-screen-2',
            text: 'Each stage is a decision a person signs.',
            actions: [{ kind: 'clearCard' }],
          },
        ],
      },
    ],
  },
]
