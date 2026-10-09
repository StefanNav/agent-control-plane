import { createSeed } from '../data/seed'
import type { PersonaId } from '../data/types'
import { can, lockReason, type PermAction } from './permissions'
import { applyAddRole, applyRemoveRole } from './settings'

const s = createSeed()
const ctx = { divisionId: 'medications' }
const CONSOLE: PersonaId[] = ['dana', 'priya', 'marcus', 'sam', 'drlee', 'jordan']

/** Spec §7, Medications context. Columns: Dana, Priya, Marcus, Sam, Dr. Lee, Jordan. */
const MATRIX: Array<[PermAction, [boolean, boolean, boolean, boolean, boolean, boolean]]> = [
  ['viewBoard', [true, true, true, true, true, true]],
  ['startOnboarding', [true, true, true, true, false, false]],
  ['editJobDescription', [true, true, true, true, false, false]],
  ['configureTools', [false, false, false, true, false, false]],
  ['approveTools', [false, true, false, false, false, false]],
  ['prepareGoLive', [true, false, false, false, false, false]],
  ['signPrivilege', [false, true, false, false, false, false]],
  ['approveGoLive', [false, false, false, false, true, false]],
  // 8b: the technical owner "pauses" (Tools · hard stops · pauses); frames beat the PRD matrix (R7).
  ['pause', [true, true, true, true, false, false]],
  // 6c and the "Enforce the limits" story: the technical owner returns an activity to Shadow.
  ['returnToShadow', [true, true, true, true, false, false]],
  ['revokeTool', [true, true, true, true, false, false]],
  ['resume', [false, true, true, false, false, false]],
  ['disable', [true, true, false, false, false, false]],
  ['retire', [true, true, false, false, false, false]],
  ['resolveException', [true, true, true, true, false, false]],
  ['viewAudit', [true, true, true, true, true, true]],
  // 7a: opening an incident is the one thing read-only Jordan can create.
  ['openIncident', [true, true, true, true, true, true]],
  ['manageDivisions', [true, false, false, false, false, false]],
  // Phase 5: the owner asks the sponsor to sign the move out of Shadow (3a).
  ['requestGoLive', [false, false, true, false, false, false]],
]

test.each(MATRIX)('%s follows the permission matrix', (action, expected) => {
  expect(CONSOLE.map((p) => can(s, p, action, ctx))).toEqual(expected)
})

test('own-division roles do not reach other divisions', () => {
  expect(can(s, 'marcus', 'pause', { divisionId: 'revenue-cycle' })).toBe(false)
  expect(can(s, 'priya', 'signPrivilege', { divisionId: 'revenue-cycle' })).toBe(false)
  expect(can(s, 'dana', 'pause', { divisionId: 'revenue-cycle' })).toBe(true)
})

test('the technical owner acts on their own agents', () => {
  expect(can(s, 'sam', 'revokeTool', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'sam', 'pause', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'sam', 'pause', { agentId: 'prior-auth' })).toBe(false)
  expect(can(s, 'sam', 'configureTools', { agentId: 'med-rec' })).toBe(true)
})

test('agent context resolves the agent’s division', () => {
  expect(can(s, 'marcus', 'pause', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'marcus', 'pause', { agentId: 'prior-auth' })).toBe(false)
})

test('without context, a role held anywhere counts', () => {
  expect(can(s, 'dana', 'retire')).toBe(true)
  expect(can(s, 'priya', 'manageDivisions')).toBe(false)
})

test('read-only and frontline people never mutate', () => {
  expect(can(s, 'jordan', 'viewAudit')).toBe(true)
  expect(can(s, 'jordan', 'resolveException', ctx)).toBe(false)
  expect(can(s, 'ana', 'viewBoard')).toBe(false)
  expect(can(s, 'ana', 'pause', ctx)).toBe(false)
})

test('lock reasons name who can act', () => {
  expect(lockReason('manageDivisions')).toBe('Program lead only')
  expect(lockReason('retire')).toBe('Program lead or sponsor only')
  expect(lockReason('pause', 'jordan')).toBe('Read-only access')
})

test('an unknown agent is never a permission', () => {
  expect(can(s, 'marcus', 'pause', { agentId: 'typo' })).toBe(false)
  expect(can(s, 'dana', 'pause', { agentId: 'typo' })).toBe(false)
})

test('Dana keeps the program lead column of §7 everywhere', () => {
  for (const ctx of [undefined, ...s.divisions.map((d) => ({ divisionId: d.id }))]) {
    for (const action of ['resume', 'signPrivilege', 'approveTools', 'configureTools', 'approveGoLive'] as const) {
      expect(can(s, 'dana', action, ctx), `${action} ${ctx?.divisionId ?? 'no context'}`).toBe(false)
    }
  }
})

test('Sam returns activities to Shadow on agents Sam owns technically, nobody else\'s (6c)', () => {
  expect(can(s, 'sam', 'returnToShadow', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'sam', 'returnToShadow', { agentId: 'prior-auth' })).toBe(false)
})

test('Phase 5: the board decides go-live only for Tier 2 and above (R7)', () => {
  const tier1 = { ...s, agents: s.agents.map((a) => (a.id === 'claim-scrubber' ? { ...a, riskTier: 1 as const } : a)) }
  expect(can(tier1, 'drlee', 'approveGoLive', { agentId: 'claim-scrubber' })).toBe(false)
  expect(can(s, 'drlee', 'approveGoLive', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'marcus', 'requestGoLive', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'priya', 'requestGoLive', { agentId: 'med-rec' })).toBe(false)
})

describe('roles decide scope (8b, R7)', () => {
  test('a technical-owner role in Discharge covers Discharge agents, and only while Sam holds it', () => {
    const state = createSeed()
    expect(can(state, 'sam', 'revokeTool', { agentId: 'discharge-summary' })).toBe(false)
    applyAddRole(state, 'sam', { role: 'techOwner', divisionId: 'discharge' }, '2026-12-08T09:52:00')
    expect(can(state, 'sam', 'revokeTool', { agentId: 'discharge-summary' })).toBe(true)
    expect(can(state, 'sam', 'pause', { agentId: 'discharge-summary' })).toBe(true)
    expect(can(state, 'sam', 'revokeTool', { agentId: 'prior-auth' })).toBe(false)
    applyRemoveRole(state, 'sam', { role: 'techOwner', divisionId: 'discharge' })
    expect(can(state, 'sam', 'revokeTool', { agentId: 'discharge-summary' })).toBe(false)
  })

  test('the named technical owner of an agent may act on it from another division’s role', () => {
    const state = createSeed()
    state.agents.find((a) => a.id === 'tpn-draft')!.techOwnerId = 'lena'
    expect(can(state, 'lena', 'configureTools', { agentId: 'tpn-draft' })).toBe(true)
    expect(can(state, 'lena', 'configureTools', { agentId: 'med-rec' })).toBe(false)
  })
})
