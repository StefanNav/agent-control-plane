import type { AgentAction } from '../types'

/** A recent action shown in a list; only ACT-88213 has its full trace (E7 7b). */
function recent(code: string, at: string, agentId: string, title: string, actingFor: string, reviewerOutcome: string, blockedBy?: string): AgentAction {
  return {
    id: code.toLowerCase(),
    code,
    at,
    title,
    agentId,
    agentVersion: agentId === 'med-rec' ? 'v1.3.0' : 'v2.0.1',
    sop: agentId === 'med-rec' ? 'v1.3.1' : 'v2.0',
    actingFor,
    reviewerOutcome,
    ...(blockedBy ? { blockedBy } : {}),
    steps: [],
  }
}

/** Recent actions from the agent view (4c) and division panel (4b), newest first. */
export const actions: AgentAction[] = [
  recent('ACT-88240', '2026-12-08T09:46:00', 'med-rec', 'Draft med list · enc 4421', 'Ana R., PharmD · 7 West', 'Waiting for review'),
  {
    id: 'act-88213',
    code: 'ACT-88213',
    at: '2026-12-08T09:38:02',
    title: 'Draft med list · encounter 4417',
    agentId: 'med-rec',
    agentVersion: 'v1.3.0',
    sop: 'v1.3.1',
    sopHash: '7f3a·c210',
    actingFor: 'Ana R., PharmD · 7 West',
    blockedBy: 'HS-04 v2',
    reviewerOutcome: 'Edited 1 line, signed',
    steps: [
      { at: '2026-12-08T09:38:02.114', kind: 'input', title: 'Admission to 7 West · encounter 4417', detail: 'MRN ••4821 · triggered by ADT A01 · assigned pharmacist Ana R.' },
      { at: '2026-12-08T09:38:02.870', kind: 'tool', title: 'epic.read_home_meds(enc 4417)', detail: '9 medications · 212 ms' },
      { at: '2026-12-08T09:38:03.301', kind: 'tool', title: 'pyxis.read_dispense_history(MRN ••4821, 90 d)', detail: '14 dispense events · 388 ms' },
      { at: '2026-12-08T09:38:04.020', kind: 'policyPassed', title: 'Patient identity matches the encounter', ruleTag: 'HS-11 v1' },
      {
        at: '2026-12-08T09:38:04.512',
        kind: 'policyBlocked',
        title: 'Never change a dose',
        ruleTag: 'HS-04 v2',
        detail: 'The draft proposed metoprolol tartrate 25 mg → 50 mg twice daily. The gateway kept 25 mg and flagged the line for the pharmacist.',
        meta: 'decided in 0.4 ms · policy v2 · gw-east-2 · exception EXC-5530',
      },
      { at: '2026-12-08T09:38:04.530', kind: 'policyPassed', title: 'No allergy removed', ruleTag: 'HS-07 v1' },
      { at: '2026-12-08T09:38:05.104', kind: 'output', title: 'Draft med list · 9 lines, 1 flagged', detail: 'Pended to the 7 West pharmacist worklist' },
      { at: '2026-12-08T09:44:31.000', kind: 'reviewer', title: 'Edited 1 line, signed', detail: 'Ana R., PharmD · kept metoprolol at 25 mg · 6 min 26 s after output' },
    ],
  },
  recent('ACT-88207', '2026-12-08T09:31:00', 'med-rec', 'Draft med list · enc 4415', 'Jo K., PharmD · 8 East', 'Signed as is'),
  recent('ACT-88199', '2026-12-08T09:24:51', 'med-rec', 'Draft med list · enc 4412', 'Jo K., PharmD · 8 East', 'Edited 1 line, signed', 'HS-04 v2'),
  recent('ACT-88188', '2026-12-08T09:12:00', 'med-rec', 'Draft med list · enc 4409', 'Ana R., PharmD · 7 West', 'Signed as is'),
  // The first of today's three blocked admissions (7a).
  recent('ACT-88171', '2026-12-08T09:02:17', 'med-rec', 'Draft med list · enc 4403', 'Ana R., PharmD · 7 West', 'Edited 1 line, signed', 'HS-04 v2'),
  recent('ACT-88236', '2026-12-08T09:41:07', 'discharge-meds', 'Draft med list · enc 5120', 'Ana R., PharmD · 7 West', 'Signed as is'),
  recent('ACT-88231', '2026-12-08T09:36:52', 'discharge-meds', 'Draft med list · enc 5117', 'Ana R., PharmD · 7 West', 'Edited'),
]
