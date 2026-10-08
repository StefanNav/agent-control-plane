import type { HardStop, Instruction, SystemGrant } from '../types'

/** Med Rec Agent's enforced rules (component sheet 06, onboarding step 4). */
export const hardStops: HardStop[] = [
  {
    id: 'hs-04',
    code: 'HS-04',
    version: 2,
    title: 'Never change a dose',
    text: 'Applies to every Med Rec Agent activity. If a draft changes a dose, the gateway keeps the original dose and flags the line for the pharmacist.',
    ownerId: 'sam',
    approvedBy: 'priya',
    approvedAt: '2026-09-22T10:00:00',
    agentId: 'med-rec',
    blocks30d: 7,
    actions30d: 8912,
  },
  {
    id: 'hs-07',
    code: 'HS-07',
    version: 1,
    title: 'Never remove an allergy',
    text: 'If a draft drops an allergy from the list, the gateway keeps it and flags the line for the pharmacist.',
    ownerId: 'sam',
    approvedBy: 'priya',
    approvedAt: '2026-09-22T10:00:00',
    agentId: 'med-rec',
    blocks30d: 2,
    actions30d: 8912,
  },
  {
    id: 'hs-11',
    code: 'HS-11',
    version: 1,
    title: 'Patient identity must match the encounter',
    text: 'The gateway checks the patient on every draft against the encounter before and after drafting.',
    ownerId: 'sam',
    approvedBy: 'priya',
    approvedAt: '2026-10-07T10:00:00',
    agentId: 'med-rec',
    blocks30d: 0,
    actions30d: 8912,
  },
]

/** Advisory instructions in the prompt (component sheet 06). */
export const instructions: Instruction[] = [
  {
    id: 'ins-generic-names',
    agentId: 'med-rec',
    text: 'When the home list uses a brand name, write the generic name and keep the brand in brackets.',
    ownerId: 'marcus',
    editedAt: '2026-10-01T15:22:00',
    sopVersion: 'v1.3',
  },
  {
    id: 'ins-ask-pharmacist',
    agentId: 'med-rec',
    text: 'Ask the pharmacist when the home list and fill history disagree.',
    ownerId: 'marcus',
    editedAt: '2026-10-01T15:22:00',
    sopVersion: 'v1.3',
  },
]

/** What Med Rec Agent can reach (component sheet 07). Sign and Order are locked by ORG-POL-02. */
export const grants: SystemGrant[] = [
  {
    agentId: 'med-rec',
    system: 'Epic',
    detail: 'Encounter, home med list, allergies',
    cells: { read: 'granted', draft: 'granted', write: 'none', submit: 'none', sign: 'locked', order: 'locked' },
  },
  {
    agentId: 'med-rec',
    system: 'Pharmacy worklist',
    detail: '7 West and 8 East queues',
    cells: { read: 'granted', draft: 'granted', write: 'changed', submit: 'none', sign: 'locked', order: 'locked' },
  },
  {
    agentId: 'med-rec',
    system: 'Pyxis',
    detail: 'Dispense history, 90 days',
    cells: { read: 'granted', draft: 'none', write: 'none', submit: 'none', sign: 'locked', order: 'locked' },
  },
  {
    agentId: 'med-rec',
    system: 'Teams',
    detail: 'Medications owners channel',
    cells: { read: 'none', draft: 'none', write: 'granted', submit: 'none', sign: 'locked', order: 'locked' },
  },
]
