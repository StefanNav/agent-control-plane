import { DEMO_NOW } from '../../lib/clock'
import { createSeed, SEED_VERSION } from './index'

const seed = createSeed()
const ids = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id))

test('five divisions with the board’s agent counts (41 agents)', () => {
  expect(seed.divisions.map((d) => d.id)).toEqual([
    'revenue-cycle',
    'medications',
    'discharge',
    'imaging-referrals',
    'patient-messages',
  ])
  const counts = Object.fromEntries(
    seed.divisions.map((d) => [d.id, seed.agents.filter((a) => a.divisionId === d.id).length]),
  )
  expect(counts).toEqual({
    'revenue-cycle': 6,
    medications: 20,
    discharge: 8,
    'imaging-referrals': 4,
    'patient-messages': 3,
  })
  expect(seed.agents).toHaveLength(41)
})

test('ids are unique within each collection', () => {
  for (const items of [seed.people, seed.divisions, seed.agents, seed.activities, seed.privileges, seed.hardStops, seed.instructions, seed.exceptions, seed.actions]) {
    expect(ids(items).size).toBe(items.length)
  }
  expect(new Set(seed.agents.map((a) => a.code)).size).toBe(seed.agents.length)
})

test('every reference resolves', () => {
  const people = ids(seed.people)
  const divisions = ids(seed.divisions)
  const agents = ids(seed.agents)
  const activities = ids(seed.activities)
  for (const d of seed.divisions) {
    expect(people.has(d.ownerId), d.id).toBe(true)
    expect(people.has(d.sponsorId), d.id).toBe(true)
  }
  for (const a of seed.agents) {
    expect(divisions.has(a.divisionId), a.id).toBe(true)
    for (const p of [a.ownerId, a.techOwnerId, a.sponsorId, a.grantorId]) expect(people.has(p), `${a.id} ${p}`).toBe(true)
    if (a.pausedBy) expect(people.has(a.pausedBy)).toBe(true)
  }
  for (const act of seed.activities) expect(agents.has(act.agentId), act.id).toBe(true)
  for (const p of seed.privileges) {
    expect(activities.has(p.activityId), p.id).toBe(true)
    expect(agents.has(p.agentId), p.id).toBe(true)
  }
  for (const e of seed.exceptions) {
    expect(agents.has(e.agentId), e.id).toBe(true)
    expect(people.has(e.ownerId), e.id).toBe(true)
  }
  for (const r of seed.roles) {
    expect(people.has(r.personId), r.personId).toBe(true)
    if (r.divisionId !== 'all') expect(divisions.has(r.divisionId), r.divisionId).toBe(true)
  }
  for (const h of seed.hardStops) expect(agents.has(h.agentId)).toBe(true)
  for (const g of seed.grants) expect(agents.has(g.agentId)).toBe(true)
  for (const x of seed.actions) expect(agents.has(x.agentId)).toBe(true)
  for (const p of ['dana', 'priya', 'marcus', 'sam', 'drlee', 'ana', 'jordan']) expect(people.has(p), p).toBe(true)
})

test('Medications agents follow the division view, in order', () => {
  const meds = seed.agents.filter((a) => a.divisionId === 'medications')
  const statuses = meds.map((a) => a.judgment.status)
  expect(statuses.slice(0, 5)).toEqual(['review', 'warn', 'warn', 'stale', 'normal'])
  expect(statuses.slice(-4)).toEqual(['paused', 'shadow', 'shadow', 'shadow'])
  expect(meds.map((a) => a.name).slice(0, 4)).toEqual([
    'Med Rec Agent',
    'Renal Dosing Agent',
    'Duplicate Rx Agent',
    'Formulary Swap Agent',
  ])
})

test('the stale agent has its metrics withdrawn', () => {
  const stale = seed.agents.find((a) => a.name === 'Formulary Swap Agent')!
  expect(stale.metrics).toMatchObject({ day: null, signedAsIs: null, edited: null, blocked: null })
})

test('Med Rec Agent matches the frames', () => {
  const medRec = seed.agents.find((a) => a.id === 'med-rec')!
  expect(medRec).toMatchObject({ code: 'AGT-0123', version: 'v1.3.0', level: 'draft' })
  expect(medRec.judgment).toEqual({ status: 'review', label: 'Review: 3 drafts', ruleTag: 'HS-04 v2' })
  expect(medRec.metrics.day).toBe(138)
  expect(seed.activities.filter((a) => a.agentId === 'med-rec').map((a) => a.name)).toEqual([
    'Reconcile home medications at admission',
    'Flag allergy conflicts',
  ])
  expect(seed.hardStops.filter((h) => h.agentId === 'med-rec').map((h) => `${h.code} v${h.version}`)).toEqual([
    'HS-04 v2',
    'HS-07 v1',
    'HS-11 v1',
  ])
})

test('the paused agent records who paused it', () => {
  const paused = seed.agents.find((a) => a.judgment.status === 'paused' && a.divisionId === 'medications')!
  expect(paused).toMatchObject({ name: 'Controlled Drug Agent', pausedBy: 'marcus', lifecycle: 'paused' })
})

test('fresh copies, default persona and clock', () => {
  const a = createSeed()
  const b = createSeed()
  expect(a).not.toBe(b)
  a.agents[0]!.name = 'changed'
  expect(b.agents[0]!.name).not.toBe('changed')
  expect(a.personaId).toBe('marcus')
  expect(a.now).toBe(DEMO_NOW)
  expect(a.version).toBe(SEED_VERSION)
  expect(a.audit).toEqual([])
})
