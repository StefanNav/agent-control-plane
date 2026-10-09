import type { Story } from './types'

/** Supervise by exception (spec §4.3): E4, E5, E6.1, E6.3, E11, E13.2. */
export const marcus: Story = {
  id: 'marcus',
  personaId: 'marcus',
  title: 'Supervise by exception',
  summary:
    'Owns 20 medication agents and supervises them by exception: finds the one that needs a human, pauses it and asks to resume.',
  scenarioId: 'baseline',
  steps: [
    {
      route: '/operations',
      title: 'Start at the hospital',
      target: 'board-divisions',
      body: 'Lakeshore Health runs 41 agents in 5 divisions. Divisions that are fine stay grey; only the two that need a human get colour, a mark and words. Medications is Marcus’s division.',
    },
    {
      route: '/operations/divisions/medications',
      title: 'Find the four that need a human',
      target: 'division-agents',
      body: 'Marcus owns 20 agents here. The four that need a human sort to the top: a review waiting, a rising edit rate, an overdue privilege review and a monitor with no data for 3 hours. Dashed means no data, never healthy.',
    },
    {
      route: '/operations/agents/med-rec',
      title: 'Open the agent',
      target: 'agent-summary',
      body: 'HS-04 v2 held 3 drafts that tried to change a dose. Hard stops run at the gateway, outside the model, so the agent can’t argue past them. The pharmacists kept the home doses.',
    },
    {
      route: '/operations/inbox',
      title: 'Work the inbox',
      target: 'inbox-list',
      body: 'Everything that needs Marcus, sorted by deadline. Each item names an action, an owner and a deadline, and anything not handled in time goes to Priya.',
    },
    {
      route: '/operations/inbox/exc-5512',
      title: 'Dismiss with a reason',
      target: 'inbox-dismiss',
      body: 'Renal Dosing’s edit rate is rising. If something explains it, such as a formulary update, Marcus can dismiss it, but never without a reason. The reason is logged and can tune the rule that raised it.',
    },
    {
      route: '/operations/agents/med-rec?control=pause-agent',
      title: 'Pause, with the impact in front of you',
      body: 'Stop easy: anyone accountable pauses in one action, and the preview says what happens first. 12 drafts in progress go back to pharmacists and nothing is lost. Pause the agent to carry on.',
    },
    {
      route: '/operations/agents/med-rec',
      title: 'Ask to resume',
      target: 'resume-panel',
      scenarioPatch: 'med-rec-paused',
      keep: (s) => s.agents.find((a) => a.id === 'med-rec')?.pause !== undefined,
      body: 'Resume deliberate: Marcus can ask, but the agent stays paused until Priya agrees too, each with a reason. Request the resume here; Priya’s story shows the other half.',
    },
    {
      route: '/operations/reviewers',
      title: 'Watch the reviewers too',
      target: 'reviewers-finding',
      body: 'On 6 North, approvals got faster and edits fell while the independent check found more misses. That points to reviewers checking less, not the agent getting better. It is shown by unit and shift, never by name.',
    },
    {
      route: '/operations/sampling',
      title: 'Check a sample, not everything',
      target: 'sampling-check',
      body: 'On Reduced review, a second check covers 1 in 50 signed outputs, drawn at random. Record whether this one was right as signed: one defect moves the activity back to Normal review.',
    },
  ],
}
