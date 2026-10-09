import type { Story } from './types'

/** Sign for the work (spec §4.3): E3, E6.3, E13.1, E14.1, E15. */
export const priya: Story = {
  id: 'priya',
  personaId: 'priya',
  title: 'Sign for the work',
  summary:
    'Clinical sponsor for Medications. Signs each privilege on the evidence, co-signs every resume and promotes one branch at a time.',
  scenarioId: 'shadow-day-21',
  steps: [
    {
      route: '/operations/agents/med-rec?tab=scorecard',
      title: 'Read the shadow evidence',
      target: 'scorecard-criteria',
      body: 'It’s 05 Nov. Med Rec ran in shadow for 21 days on 1,118 admissions, each draft compared with the pharmacist’s own list. Two targets are met; inaccurate lines are at 2.6 % against 2.0 %, mostly brand and generic names that don’t match.',
    },
    {
      route: '/inventory/privileges/prv-0142/sign',
      title: 'Sign with a written reason',
      target: 'sign-signature',
      scenarioPatch: 'awaiting-signature',
      body: 'Marcus has asked Priya to move admission med rec from Shadow to Draft. One target is missed, so signing needs a written reason that stays on the privilege. The signature makes Priya the named grantor until the review date.',
    },
    {
      route: '/portfolio/privileges',
      title: 'Everything Priya has signed',
      target: 'privileges-table',
      scenarioPatch: 'baseline',
      body: 'A month later, My privileges lists every delegation Priya has signed, soonest review first. Duplicate Rx’s review is 7 days overdue: renew it here, or the division’s lapse policy returns it to Shadow.',
    },
    {
      route: '/operations/agents/med-rec',
      title: 'Approve the resume',
      target: 'resume-panel',
      scenarioPatch: 'resume-requested',
      body: 'At 09:47 Marcus paused Med Rec. By 11:58 Sam has fixed the dose mapping, a replay of 23 cases is clean, and Marcus asks to resume. It stays paused until Priya approves too, with a reason of Priya’s own.',
    },
    {
      route: '/portfolio/activities/allergy-recon',
      title: 'Rules move the review level',
      target: 'review-rules',
      body: 'Allergy Recon reached Reduced review by rule: 30 clean days and 312 checks. Priya wrote the rules. Nobody loosens a level by hand, but anyone accountable can tighten it, with a reason.',
    },
    {
      route: '/inventory/promotions/prm-0007',
      title: 'Promote one branch',
      target: 'promotion-signature',
      body: 'Marcus asks to promote one branch, adding an allergy from outside records, from Draft to Supervised; every criterion is met. Updating or removing an allergy stays where it is. Allergy Recon is Tier 3, so once Priya signs, the AI review board decides.',
    },
    {
      route: '/operations/agents/med-rec',
      title: 'Autonomy steps down by itself',
      target: 'stepdown-notice',
      scenarioPatch: 'step-down-threshold',
      body: '09 Dec, 06:00: admission med rec’s edit rate has been above 15 % for 3 days, so the trigger on Priya’s privilege fired at the gateway. The activity dropped from Draft to Shadow and its drafts went to pharmacists. Nothing steps back up without a signature.',
    },
    {
      route: '/portfolio/activities/allergy-recon/branches/outside-records',
      title: 'A new build re-earns its level',
      target: 'branch-restore',
      scenarioPatch: 'step-down-version',
      body: 'The board approved the promotion on 09 Dec. On 14 Dec Sam deploys Allergy Recon v1.3.0, so the promoted branch drops back to Draft while the new build replays the last 30 days. Supervised returns only when the replay meets every criterion and Priya signs.',
    },
  ],
}
