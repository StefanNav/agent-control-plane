import type { Story } from '../prototype/stories/types'

/** A three-step story for engine tests: step 3 skips to the paused scenario, unless the visitor already paused. */
export const FIXTURE_STORY: Story = {
  id: 'marcus',
  personaId: 'marcus',
  title: 'Fixture story',
  summary: 'A fixture story.',
  scenarioId: 'baseline',
  steps: [
    { route: '/operations', title: 'One', body: 'First. Second.' },
    { route: '/operations/agents/med-rec?tab=scorecard', title: 'Two', body: 'First. Second.', target: 'agent-summary' },
    {
      route: '/operations/agents/med-rec',
      title: 'Three',
      body: 'First. Second.',
      scenarioPatch: 'med-rec-paused',
      keep: (s) => s.agents.find((a) => a.id === 'med-rec')!.pause !== undefined,
    },
  ],
}
