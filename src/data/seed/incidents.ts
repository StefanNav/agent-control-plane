import type { Incident } from '../types'

/**
 * Baseline incidents. INC-0029 is the Prior Auth incident the board links to (composed from
 * EXC-5501; no frame shows its record). INC-0030 is an older, closed one, so the next incident
 * opened is INC-0031, as in 6d and 7c.
 */
export const incidents: Incident[] = [
  {
    id: 'inc-0029',
    code: 'INC-0029',
    title: 'Appeal drafted for the wrong encounter',
    agentId: 'prior-auth',
    state: 'open',
    openedAt: '2026-12-08T08:05:00',
    openedBy: 'tom',
    commanderId: 'tom',
    harm: 'None reached a patient',
    summary:
      'Prior Auth Agent v2 drafted an appeal for the wrong encounter at 08:04. HS-11 didn’t fire because the encounter was merged. Tom paused the agent at 08:12; 9 drafts went to the auth team.',
    linkedActionIds: [],
    corrections: [
      { id: 'c1', text: 'Check merged encounters before drafting', sub: 'HS-11 reads the surviving encounter', ownerId: 'omar', done: false, status: 'In progress' },
    ],
    timeline: [
      { at: '2026-12-08T08:04:00', title: 'Wrong-patient appeal drafted', sub: 'EXC-5501 · critical' },
      { at: '2026-12-08T08:05:00', title: 'Tom paged', sub: 'Acknowledged 08:06' },
      { at: '2026-12-08T08:12:00', title: 'Tom paused the agent', sub: '9 drafts to the auth team' },
    ],
  },
  {
    id: 'inc-0030',
    code: 'INC-0030',
    title: 'Allergy list cut short on long discharges',
    agentId: 'discharge-meds',
    state: 'closed',
    openedAt: '2026-11-27T14:20:00',
    openedBy: 'elena',
    commanderId: 'marcus',
    harm: 'None reached a patient',
    summary: 'Discharge Meds Agent dropped allergies past the 20th line on 2 long discharge lists. HS-07 v1 blocked both; pharmacists kept the full list.',
    linkedActionIds: [],
    rootCause: { text: 'The list reader stopped at a page break in the allergy section.', by: 'sam' },
    corrections: [{ id: 'c1', text: 'Read allergies across page breaks', ownerId: 'sam', done: true, status: 'Deployed 01 Dec' }],
    timeline: [
      { at: '2026-11-27T14:20:00', title: 'Elena opened this incident', sub: 'Linked 2 actions' },
      { at: '2026-12-02T16:00:00', title: 'Incident closed', sub: 'Marcus' },
    ],
    closedAt: '2026-12-02T16:00:00',
  },
]
