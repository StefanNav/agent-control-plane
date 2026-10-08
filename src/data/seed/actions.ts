import type { AgentAction } from '../types'

/** ACT-88213, start to finish (component sheet 09, E7 7b). */
export const actions: AgentAction[] = [
  {
    id: 'act-88213',
    code: 'ACT-88213',
    title: 'Draft med list · encounter 4417',
    agentId: 'med-rec',
    agentVersion: 'v1.3.0',
    sop: 'v1.3',
    actingFor: 'Ana R., PharmD · 7 West',
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
]
