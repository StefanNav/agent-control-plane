import { createSeed } from '../data/seed'
import type { DemoState } from '../data/types'
import { createDemoStore, dataOf } from './index'
import { can } from './permissions'
import { applyDivisionSettings, applyLapses, diffDivision, lapseDate } from './settings'
import { createMemoryStorage } from './storage'

const AT = '2026-12-08T09:52:00'
const fresh = () => createDemoStore(createMemoryStorage())
const medications = (s: DemoState) => s.divisions.find((d) => d.id === 'medications')!
const prv0098 = (s: DemoState) => s.privileges.filter((p) => p.code === 'PRV-0098').at(-1)!
const dupRx = (s: DemoState) => s.activities.find((a) => a.id === 'duplicate-rx')!

describe('the lapse policy acts when it is saved', () => {
  test('lapseDate follows the policy: review date + grace, the review date, or never', () => {
    const s = createSeed()
    expect(lapseDate(s, prv0098(s))).toBe('2026-12-15T00:00:00')
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
