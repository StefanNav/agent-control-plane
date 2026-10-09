import type { Story } from './types'

const APPROVED = ['approve', 'approveWithConditions']

/** Approve what you can see (spec §4.3): E2.3, E14.2. */
export const drlee: Story = {
  id: 'drlee',
  personaId: 'drlee',
  title: 'Approve what you can see',
  summary:
    'Chairs the AI review board. Decides from a packet that shows the whole job, the tested limits and the conditions.',
  scenarioId: 'review-committee',
  steps: [
    {
      route: '/portfolio/reviews/med-rec',
      title: 'Read the whole job',
      target: 'packet-hardstops',
      body: '14 Oct, item 3 of 5. The packet shows what Med Rec does, what it must never do, and the hard stops Sam tested on the last 30 days. Dana’s reason for raising it to Tier 3 is here too.',
    },
    {
      route: '/portfolio/reviews/med-rec',
      title: 'Approve with conditions',
      target: 'packet-decision',
      body: 'Conditions bind every privilege this agent will hold: a pharmacist signs every draft, Priya gets weekly edit-rate reports, and dialysis patients are excluded. Record the decision with a reason.',
    },
    {
      route: '/inventory/agents/med-rec',
      title: 'The decision is on the record',
      target: 'record-decision',
      scenarioPatch: 'review-decided',
      keep: (s) =>
        APPROVED.includes(
          s.onboardings.find((r) => r.agentId === 'med-rec')?.review?.decision?.kind ?? '',
        ),
      body: 'The decision and its reason sit on Med Rec’s record, and the conditions sit on every privilege. The gateway enforces the ones it can, and shadow starts the next day.',
    },
    {
      route: '/portfolio/promotions/prm-0007',
      title: 'A Tier 3 promotion comes to the board',
      target: 'board-decision',
      scenarioPatch: 'promotion-at-board',
      body: '09 Dec. Priya signed the promotion of one Allergy Recon branch to Supervised, and Tier 3 means the board decides. The evidence and Priya’s reason are in front of Dr. Lee; C4 keeps review at Normal for 60 days.',
    },
  ],
}
