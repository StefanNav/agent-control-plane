import type { Story } from './types'

/** Bring an agent on safely (spec §4.3): E1.1, E2.1–2.2, E9.2, E12, E7.2, E6.4. */
export const dana: Story = {
  id: 'dana',
  personaId: 'dana',
  title: 'Bring an agent on safely',
  summary:
    'AI program lead. Starts every agent from an approved intake, finds the ones nobody registered and keeps the survey evidence complete.',
  scenarioId: 'onboarding-intake',
  steps: [
    {
      route: '/inventory/agents/med-rec/onboarding/intake',
      title: 'Start from the approved intake',
      target: 'intake-carried',
      body: 'It’s 01 Oct, and the committee has approved REQ-0093 for a Med Rec Agent. Onboarding starts from the intake, so what was approved carries over, including a 21-day shadow before any Draft privilege.',
    },
    {
      route: '/inventory/agents/med-rec/onboarding/intake',
      title: 'Name the humans',
      target: 'intake-owners',
      body: 'No agent goes live without four named people. Dana picks the owner and the technical owner, and the span check warns that Marcus would supervise 22 activities against a guideline of 7. Choose Sam as technical owner and start onboarding.',
    },
    {
      route: '/inventory/agents/med-rec/risk-tier',
      title: 'Raise the risk tier, with a reason',
      target: 'risk-tier-choice',
      scenarioPatch: 'review-risk-tier',
      body: '13 Oct: the job description and systems grid suggest Tier 2. Dana knows med rec errors carry into every inpatient order, so the agent goes to Tier 3, the full board and a 21-day shadow. Changing the suggestion needs a reason, and both stay on the record.',
    },
    {
      route: '/inventory/unregistered/svc-dc-summary-bot',
      title: 'Find what nobody registered',
      target: 'caller-detail',
      scenarioPatch: 'baseline',
      body: '08 Dec. The gateway matches its traffic against the registry every 15 minutes, and svc-dc-summary-bot has no record: it posts discharge notes to a Teams channel with no owner, review or hard stops. It looks like an approved intake that was never onboarded.',
    },
    {
      route: '/reports/evidence',
      title: 'Map the evidence',
      target: 'evidence-coverage',
      body: 'The survey window opens 29 Dec. Every agent’s records are mapped to the seven RUAIH elements: 279 of 287 covered, and each of the 8 gaps has an owner and a due date.',
    },
    {
      route: '/reports/evidence/med-rec?export=1',
      title: 'Export a packet that shows its gaps',
      body: 'Dana exports Med Rec’s packet for the surveyor. The open gap, a patient-facing notice due 19 Dec, goes in the packet rather than being hidden. Everything comes from the record; nothing is collected by hand.',
    },
    {
      route: '/inventory?agent=iv-to-oral',
      title: 'Retire an agent',
      target: 'inventory-retire',
      body: 'IV-to-Oral’s shadow results didn’t justify go-live. Retiring revokes its tools, closes its privilege and archives the record, still searchable in audit. It can’t be undone, so it takes the agent’s exact name and a reason.',
    },
  ],
}
