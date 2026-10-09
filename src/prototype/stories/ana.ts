import type { Story } from './types'

/** Flag it where you work (spec §4.3): E10. */
export const ana: Story = {
  id: 'ana',
  personaId: 'ana',
  title: 'Flag it where you work',
  summary:
    'Pharmacist. Never opens the console: reviews agent drafts in Epic and flags a problem in one action.',
  scenarioId: 'baseline',
  steps: [
    {
      route: '/epic',
      title: 'Work in Epic, not the console',
      target: 'epic-medlist',
      body: 'Ana verifies admission medication lists in Epic. Med Rec Agent drafted this one, and Ana reviews each line before verifying. This screen is a neutral stand-in for Epic.',
    },
    {
      route: '/epic',
      title: 'See what the agent did',
      target: 'epic-agent-panel',
      body: 'The panel beside the list says what the agent did and didn’t do. It matched 6 medications, marked a possible duplicate and changed no doses, because HS-04 won’t let it.',
    },
    {
      route: '/epic',
      title: 'Flag it in one action',
      target: 'epic-flag',
      body: 'Metoprolol’s frequency came through split into two lines. Ana flags it without leaving Epic, and the flag reaches Marcus, the agent’s owner.',
    },
    {
      route: '/epic',
      title: 'Nine days later',
      target: 'epic-fix',
      scenarioPatch: 'epic-fixed-later',
      body: '17 Dec. Ana’s flag and five others led to v1.5.0, which re-validated before it served. The fix is reported where Ana works, with a note from Marcus.',
    },
  ],
}
