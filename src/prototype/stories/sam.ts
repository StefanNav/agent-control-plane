import type { Story } from './types'

/** Enforce the limits (spec §4.3): E1.4, the E1.5 loop, E6.2, E9.1. */
export const sam: Story = {
  id: 'sam',
  personaId: 'sam',
  title: 'Enforce the limits',
  summary:
    'Technical owner. Turns what an agent must never do into hard stops at the gateway, and holds new builds until they re-validate.',
  scenarioId: 'onboarding-tools-tested',
  steps: [
    {
      route: '/inventory/agents/med-rec/onboarding/tools',
      title: 'Make the never list enforceable',
      target: 'tools-hardstops',
      body: '06 Oct. Marcus’s never list became three hard stops that run at the gateway, outside the model. Sam tested each one on the last 30 days: HS-04 would have blocked 7 of 1,204 drafts.',
    },
    {
      route: '/inventory/agents/med-rec/onboarding/tools',
      title: 'Send the set to Priya',
      target: 'tools-send',
      body: 'Every tool matches a verb granted in the systems step, and every hard stop is tested. The set can go to Priya: send it for approval.',
    },
    {
      route: '/inventory/agents/med-rec/onboarding/tools',
      title: 'Priya sends HS-11 back',
      target: 'returned-retest',
      scenarioPatch: 'onboarding-returned-hs11',
      body: '07 Oct. Priya wants HS-11 tested on September’s 8 East transfers, where a wrong-patient draft would happen, and only HS-11 reopens. Re-run it on those cases, then send the set again.',
    },
    {
      route: '/operations/agents/med-rec?control=shadow',
      title: 'Fix one thing',
      scenarioPatch: 'baseline',
      body: '08 Dec, and Med Rec is live at Draft. When one activity misbehaves, Sam can return just that activity to Shadow and leave the rest of the agent working. Going back to Draft needs Priya’s signature again.',
    },
    {
      route: '/operations/agents/med-rec?tab=changes',
      title: 'Hold the new build',
      target: 'changes-revalidate',
      scenarioPatch: 'change-detected-v150',
      body: '15 Dec. Sam deploys v1.5.0 to fix how frequencies are read, and the gateway holds it. Live traffic stays on v1.3.0 until Marcus replays the last 30 days and Priya approves HS-04 v3.',
    },
  ],
}
