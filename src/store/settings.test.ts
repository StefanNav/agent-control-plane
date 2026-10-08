import { createSeed } from '../data/seed'
import type { DemoState } from '../data/types'
import { createDemoStore, dataOf } from './index'
import { can } from './permissions'
import { applyCreateDivision, applyDivisionSettings, applyLapses, diffDivision, lapseDate } from './settings'
import { createMemoryStorage } from './storage'

const AT = '2026-12-08T09:52:00'
const fresh = () => createDemoStore(createMemoryStorage())
const medications = (s: DemoState) => s.divisions.find((d) => d.id === 'medications')!
const prv0098 = (s: DemoState) => s.privileges.filter((p) => p.code === 'PRV-0098').at(-1)!
const dupRx = (s: DemoState) => s.activities.find((a) => a.id === 'duplicate-rx')!

describe('the lapse policy acts when it is saved', () => {
  test('lapseDate follows the policy: review date + grace, the review date, or never', () => {
    const s = createSeed()
    expect(lapseDate(s, prv0098(s))).toBe('2026-12-15T17:00:00')
    medications(s).lapsePolicy = 'shadowNow'
    expect(lapseDate(s, prv0098(s))).toBe('2026-12-01T00:00:00')
    medications(s).lapsePolicy = 'nothing'
    expect(lapseDate(s, prv0098(s))).toBeNull()
  })

  test('"Back to Shadow at once" sends Duplicate Rx to Shadow on save; saving again does nothing more', () => {
    const s = applyDivisionSettings(createSeed(), 'medications', { lapsePolicy: 'shadowNow' }, 'dana', AT)
    expect(prv0098(s)).toMatchObject({ state: 'lapsed', movedBy: 'ORG-LAPSE-01' })
    expect(dupRx(s).level).toBe('shadow')
    const again = applyLapses(structuredClone(s))
    expect(again.privileges).toEqual(s.privileges)
    expect(again.activities).toEqual(s.activities)
  })

  test('"Pause the activity" pauses Duplicate Rx’s activity once', () => {
    const s = applyDivisionSettings(createSeed(), 'medications', { lapsePolicy: 'pause' }, 'dana', AT)
    const agent = s.agents.find((a) => a.id === 'duplicate-rx')!
    expect(agent.pause).toMatchObject({ scope: 'activity', activityId: 'duplicate-rx' })
    expect(agent.pausedBy).toBe('ORG-LAPSE-01')
    const paused = structuredClone(agent)
    applyLapses(s)
    expect(s.agents.find((a) => a.id === 'duplicate-rx')).toEqual(paused)
    expect(prv0098(s).state).toBe('due')
  })

  test('"Raise an exception only" leaves it due', () => {
    const s = applyDivisionSettings(createSeed(), 'medications', { lapsePolicy: 'nothing' }, 'dana', AT)
    expect(prv0098(s).state).toBe('due')
    expect(dupRx(s).level).toBe('draft')
  })
})

test('diffDivision counts what changed, and nothing for an identical patch', () => {
  const d = medications(createSeed())
  expect(diffDivision(d, { lapsePolicy: 'shadowNow' })).toEqual(['what happens when a review date passes'])
  expect(diffDivision(d, { lapsePolicy: 'shadow', graceDays: 14, ownerId: 'marcus' })).toEqual([])
  expect(diffDivision(d, { graceDays: 7, escalation: { first: 'dana', then: 'dana', afterHours: 4 } })).toHaveLength(2)
})

test('changing the owner moves the role, the agents and their open items; the sponsor is told', () => {
  const s = applyDivisionSettings(createSeed(), 'medications', { ownerId: 'elena' }, 'dana', AT)
  expect(medications(s).ownerId).toBe('elena')
  expect(s.agents.filter((a) => a.divisionId === 'medications').every((a) => a.ownerId === 'elena')).toBe(true)
  expect(s.exceptions.find((e) => e.id === 'exc-5530')).toMatchObject({ ownerId: 'elena' })
  expect(s.exceptions.find((e) => e.id === 'exc-5530')!.copied).toContain('marcus')
  expect(s.roles).toContainEqual(expect.objectContaining({ personId: 'elena', divisionId: 'medications', role: 'owner' }))
  expect(s.roles.some((r) => r.personId === 'marcus' && r.divisionId === 'medications' && r.role === 'owner')).toBe(false)
  expect(can(s, 'elena', 'pause', { agentId: 'med-rec' })).toBe(true)
  expect(can(s, 'marcus', 'pause', { agentId: 'med-rec' })).toBe(false)
  const told = s.logEvents.at(-1)!
  expect(told).toMatchObject({ to: ['priya'] })
  expect(told.text).toMatch(/Medications/)
})

test('changing the sponsor moves the role and the agents; old and new sponsor are told', () => {
  const s = applyDivisionSettings(createSeed(), 'medications', { sponsorId: 'nina' }, 'dana', AT)
  expect(s.agents.filter((a) => a.divisionId === 'medications').every((a) => a.sponsorId === 'nina')).toBe(true)
  expect(s.roles.some((r) => r.personId === 'priya' && r.divisionId === 'medications' && r.role === 'sponsor')).toBe(false)
  expect(s.roles.some((r) => r.personId === 'priya' && r.divisionId === 'discharge' && r.role === 'sponsor')).toBe(true)
  expect(s.logEvents.at(-1)!.to).toEqual(['nina', 'priya'])
  // Signed privileges keep their grantor.
  expect(s.privileges.find((p) => p.code === 'PRV-0142' && p.state === 'active')!.grantedBy).toBe('priya')
})

describe('updateDivisionSettings', () => {
  test('Dana saves; the audit names what changed', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    expect(store.getState().updateDivisionSettings('medications', { lapsePolicy: 'shadowNow' })).toEqual({ ok: true })
    expect(store.getState().audit.at(-1)).toMatchObject({ who: 'dana', action: 'Changed division settings', target: 'Medications', reason: 'what happens when a review date passes' })
  })

  test.each(['marcus', 'jordan', 'priya'] as const)('%s may not change division settings', (persona) => {
    const store = fresh()
    store.getState().setPersona(persona)
    const before = dataOf(store.getState())
    expect(store.getState().updateDivisionSettings('medications', { lapsePolicy: 'shadowNow' }).ok).toBe(false)
    expect(dataOf(store.getState())).toEqual(before)
  })

  test('nothing to save, or an unknown division, is refused', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    expect(store.getState().updateDivisionSettings('medications', { lapsePolicy: 'shadow' })).toEqual({ ok: false, reason: 'Nothing to save' })
    expect(store.getState().updateDivisionSettings('nope', { lapsePolicy: 'shadow' })).toEqual({ ok: false, reason: 'Division not found' })
  })
})

describe('a lapsed privilege can be re-signed', () => {
  test('Priya renews PRV-0098 after it lapsed: the activity returns to Draft', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    store.getState().updateDivisionSettings('medications', { lapsePolicy: 'shadowNow' })
    store.getState().setPersona('priya')
    expect(store.getState().signPrivilege('PRV-0098', { accepted: true })).toEqual({ ok: true })
    const s = store.getState()
    expect(prv0098(s).state).toBe('active')
    expect(dupRx(s).level).toBe('draft')
  })
})

describe('a new division, or a split (R6)', () => {
  const MOVE = ['tpn-draft', 'warfarin-check', 'infusion-rate']

  test('splitting Medications moves three agents to Elena, with roles that follow', () => {
    const s = applyCreateDivision(createSeed(), { name: 'Medications · surgical', ownerId: 'elena', sponsorId: 'priya', agentIds: MOVE }, 'medications', 'dana', AT)
    expect(s.divisions).toHaveLength(6)
    const d = s.divisions.at(-1)!
    expect(d).toMatchObject({ id: 'medications-surgical', name: 'Medications · surgical', ownerId: 'elena', sponsorId: 'priya', lapsePolicy: 'shadow', graceDays: 14, escalation: { first: 'priya', then: 'dana', afterHours: 4 } })
    expect(d.monitor.state).toBe('live')
    expect(d.exceptionsByDay).toEqual([0, 0, 0, 0, 0, 0, 0])
    for (const id of MOVE) expect(s.agents.find((a) => a.id === id)).toMatchObject({ divisionId: d.id, ownerId: 'elena' })
    expect(s.roles).toContainEqual(expect.objectContaining({ personId: 'elena', divisionId: d.id, role: 'owner' }))
    expect(s.roles).toContainEqual(expect.objectContaining({ personId: 'priya', divisionId: d.id, role: 'sponsor' }))
    expect(s.roles).toContainEqual(expect.objectContaining({ personId: 'sam', divisionId: d.id, role: 'techOwner' }))
    expect(s.roles).toContainEqual(expect.objectContaining({ personId: 'ana', divisionId: d.id, role: 'frontline' }))
    expect(can(s, 'sam', 'revokeTool', { agentId: 'tpn-draft' })).toBe(true)
    expect(can(s, 'elena', 'pause', { agentId: 'tpn-draft' })).toBe(true)
    expect(can(s, 'marcus', 'pause', { agentId: 'tpn-draft' })).toBe(false)
  })

  test('a new division without agents is created empty', () => {
    const s = applyCreateDivision(createSeed(), { name: 'Oncology', ownerId: 'tom', sponsorId: 'nina', agentIds: [] }, null, 'dana', AT)
    expect(s.divisions.at(-1)).toMatchObject({ id: 'oncology', ownerId: 'tom', lapsePolicy: 'shadow' })
    expect(s.agents.filter((a) => a.divisionId === 'oncology')).toHaveLength(0)
  })

  test('createDivision refuses a split with no agents, a used name, or no owner; Marcus may not', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    const before = dataOf(store.getState())
    expect(store.getState().createDivision({ name: 'Surgical', ownerId: 'elena', sponsorId: 'priya', agentIds: [] }, 'medications')).toEqual({ ok: false, reason: 'Choose the agents to move' })
    expect(store.getState().createDivision({ name: 'Discharge', ownerId: 'elena', sponsorId: 'priya', agentIds: [] })).toEqual({ ok: false, reason: 'A division with that name exists' })
    expect(store.getState().createDivision({ name: ' ', ownerId: 'elena', sponsorId: 'priya', agentIds: [] })).toEqual({ ok: false, reason: 'Name the division' })
    expect(store.getState().createDivision({ name: 'Surgical', ownerId: '', sponsorId: 'priya', agentIds: [] })).toEqual({ ok: false, reason: 'Choose an owner' })
    store.getState().setPersona('marcus')
    expect(store.getState().createDivision({ name: 'Surgical', ownerId: 'elena', sponsorId: 'priya', agentIds: MOVE }, 'medications').ok).toBe(false)
    expect(dataOf(store.getState())).toEqual({ ...before, personaId: 'marcus' })
    store.getState().setPersona('dana')
    expect(store.getState().createDivision({ name: 'Surgical', ownerId: 'elena', sponsorId: 'priya', agentIds: MOVE }, 'medications')).toEqual({ ok: true })
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Created division', target: 'Surgical', reason: 'Split from Medications · 3 agents' })
  })
})

describe('people and roles (8b)', () => {
  test('Dana adds and removes a role; a hospital-wide role is always "all"', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    expect(store.getState().addRole('sam', { role: 'techOwner', divisionId: 'discharge' })).toEqual({ ok: true })
    expect(store.getState().roles).toContainEqual({ personId: 'sam', divisionId: 'discharge', role: 'techOwner', since: AT })
    expect(store.getState().addRole('sam', { role: 'techOwner', divisionId: 'discharge' })).toEqual({ ok: false, reason: 'Sam already has that role in Discharge' })
    expect(store.getState().addRole('elena', { role: 'readOnly', divisionId: 'discharge' })).toEqual({ ok: true })
    expect(store.getState().roles).toContainEqual(expect.objectContaining({ personId: 'elena', divisionId: 'all', role: 'readOnly' }))
    expect(store.getState().removeRole('sam', { role: 'techOwner', divisionId: 'discharge' })).toEqual({ ok: true })
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Removed role', target: 'Sam', reason: 'Technical owner · Discharge' })
  })

  test('the last program lead and a division’s named owner or sponsor cannot be removed', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    const before = dataOf(store.getState())
    expect(store.getState().removeRole('dana', { role: 'programLead', divisionId: 'all' })).toEqual({ ok: false, reason: 'Lakeshore needs a program lead' })
    expect(store.getState().removeRole('marcus', { role: 'owner', divisionId: 'medications' })).toEqual({
      ok: false,
      reason: 'Marcus is Medications’ division owner. Choose another owner in Division settings first.',
    })
    expect(store.getState().removeRole('priya', { role: 'sponsor', divisionId: 'discharge' }).ok).toBe(false)
    expect(store.getState().removeRole('sam', { role: 'owner', divisionId: 'medications' })).toEqual({ ok: false, reason: 'Sam doesn’t have that role' })
    expect(dataOf(store.getState())).toEqual(before)
  })

  test('Dana invites a person with a role; only Dana may change roles', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    expect(store.getState().invitePerson({ name: ' ', title: '', role: 'frontline', divisionId: 'medications' })).toEqual({ ok: false, reason: 'Name the person' })
    expect(store.getState().invitePerson({ name: 'Kofi Osei', title: 'Hospitalist', role: 'frontline', divisionId: 'discharge' })).toEqual({ ok: true })
    expect(store.getState().people.at(-1)).toEqual({ id: 'kofi-osei', name: 'Kofi Osei', initial: 'K', title: 'Hospitalist' })
    expect(store.getState().roles.at(-1)).toEqual({ personId: 'kofi-osei', divisionId: 'discharge', role: 'frontline', since: AT })
    store.getState().setPersona('marcus')
    const before = dataOf(store.getState())
    expect(store.getState().addRole('sam', { role: 'techOwner', divisionId: 'discharge' }).ok).toBe(false)
    expect(store.getState().removeRole('ana', { role: 'frontline', divisionId: 'medications' }).ok).toBe(false)
    expect(dataOf(store.getState())).toEqual(before)
  })
})

describe('review fixes', () => {
  test('I1: the overdue item is due when the lapse acts, and follows a grace change', () => {
    const s = applyDivisionSettings(createSeed(), 'medications', { graceDays: 7 }, 'dana', AT)
    expect(s.exceptions.find((e) => e.id === 'exc-5497')!.deadline).toBe('2026-12-08T17:00:00')
    expect(prv0098(s).state).toBe('due')
  })

  test('I4: "Pause the activity" acts once, even after a resume', async () => {
    const { applyResume } = await import('./mutations')
    const s = applyDivisionSettings(createSeed(), 'medications', { lapsePolicy: 'pause' }, 'dana', AT)
    expect(prv0098(s).lapsedAt).toBe(AT)
    applyResume(s, 'duplicate-rx', 'priya')
    expect(s.activities.find((a) => a.id === 'duplicate-rx')!.paused).toBeFalsy()
    const logs = s.logEvents.length
    applyDivisionSettings(s, 'medications', { graceDays: 30 }, 'dana', AT)
    expect(s.activities.find((a) => a.id === 'duplicate-rx')!.paused).toBeFalsy()
    expect(s.logEvents.length).toBe(logs + 1)
  })

  test('I2: a technical-owner role can’t be removed while the person is named on agents there', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    store.getState().addRole('sam', { role: 'techOwner', divisionId: 'discharge' })
    expect(store.getState().removeRole('sam', { role: 'techOwner', divisionId: 'medications' })).toEqual({
      ok: false,
      reason: 'Sam is technical owner of 21 Medications agents. Name another technical owner for them first.',
    })
    expect(store.getState().removeRole('sam', { role: 'techOwner', divisionId: 'discharge' })).toEqual({ ok: true })
  })

  test('I5: a unit’s sampling item follows a sponsor change; a split hands the moved agents’ sponsor items over', () => {
    const store = fresh()
    store.getState().setPersona('marcus')
    store.getState().proposeReviewChange('6-north', 'sampling')
    store.getState().setPersona('dana')
    store.getState().updateDivisionSettings('medications', { sponsorId: 'hana' })
    const item = store.getState().exceptions.find((e) => e.type === 'Review: sampling change · 6 North')!
    expect(item.ownerId).toBe('hana')
    expect(item.copied).toContain('priya')

    const split = applyCreateDivision(createSeed(), { name: 'Medications · reviews', ownerId: 'tom', sponsorId: 'nina', agentIds: ['duplicate-rx'] }, 'medications', 'dana', AT)
    expect(split.exceptions.find((e) => e.id === 'exc-5497')).toMatchObject({ ownerId: 'nina' })
  })
})
