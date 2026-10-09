import type { Story } from './types'

/** Reconstruct what happened (spec §4.3): E7, E8.3. */
export const jordan: Story = {
  id: 'jordan',
  personaId: 'jordan',
  title: 'Reconstruct what happened',
  summary:
    'Risk manager, read only. Reconstructs any action: what the agent saw, which policies decided and who signed.',
  scenarioId: 'baseline',
  steps: [
    {
      route: '/operations/actions',
      title: 'Every action, read only',
      target: 'actions-table',
      body: 'Jordan sees the same screens as everyone else, with nothing that changes the record. Every agent action is listed with its version, who it acted for and each policy decision.',
    },
    {
      route: '/operations/actions/act-88213',
      title: 'Trace one action',
      target: 'trace-steps',
      body: 'ACT-88213, step by step: the admission, each tool call, and HS-04 v2 blocking a dose change in 0.4 ms. Ana kept the home dose. Opening an incident from here is the one thing Jordan can create.',
    },
    {
      route: '/operations/incidents/inc-0031',
      title: 'Read the incident',
      target: 'incident-corrections',
      scenarioPatch: 'resume-requested',
      body: 'By 11:58, INC-0031 has a commander, a root cause from Sam and corrections with owners. The timeline runs from the first block at 09:02 to Marcus’s request to resume.',
    },
    {
      route: '/reports/export?agent=med-rec',
      title: 'Export for a surveyor',
      target: 'export-contents',
      body: 'Jordan builds the export for an audit straight from the record, with patient details masked. Building it is logged as well.',
    },
  ],
}
