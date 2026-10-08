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
    seed.divisions.map((d) => [d.id, seed.agents.filter((a) => a.lifecycle !== 'retired' && a.divisionId === d.id).length]),
  )
  expect(counts).toEqual({
    'revenue-cycle': 6,
    medications: 20,
    discharge: 8,
    'imaging-referrals': 4,
    'patient-messages': 3,
  })
  // 41 on the board, plus 6 retired agents kept on record (Phase 4).
  expect(seed.agents).toHaveLength(47)
})

test('ids are unique within each collection', () => {
  const collections: Array<Array<{ id: string }>> = [
    seed.people,
    seed.divisions,
    seed.agents,
    seed.activities,
    seed.privileges,
    seed.hardStops,
    seed.instructions,
    seed.exceptions,
    seed.actions,
  ]
  for (const items of collections) {
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
  const meds = seed.agents.filter((a) => a.lifecycle !== 'retired' && a.divisionId === 'medications')
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

test('agent owners, sponsors and tech owners hold those roles in the agent’s division', () => {
  const holds = (personId: string, role: string, divisionId: string) =>
    seed.roles.some((r) => r.personId === personId && r.role === role && (r.divisionId === divisionId || r.divisionId === 'all'))
  for (const a of seed.agents) {
    expect(holds(a.ownerId, 'owner', a.divisionId), `${a.id} owner`).toBe(true)
    expect(holds(a.sponsorId, 'sponsor', a.divisionId), `${a.id} sponsor`).toBe(true)
    expect(holds(a.techOwnerId, 'techOwner', a.divisionId), `${a.id} tech owner`).toBe(true)
  }
})

describe('E4 and E5 refinements', () => {
  const open = (e: (typeof seed.exceptions)[number]) => e.state !== 'resolved' && e.state !== 'dismissed'

  test('seed version 5 (Phase 4: incidents, pause detail, inventory)', () => {
    expect(SEED_VERSION).toBe(5)
  })

  test('Medications has exactly four agents needing a human', () => {
    const statuses = seed.agents.filter((a) => a.divisionId === 'medications').map((a) => a.judgment.status)
    expect(statuses.filter((st) => ['crit', 'warn', 'review', 'stale'].includes(st)).sort()).toEqual(['review', 'stale', 'warn', 'warn'])
  })

  test('Marcus owns the four items of 5a and is copied on two', () => {
    const mine = seed.exceptions.filter((e) => e.ownerId === 'marcus' && open(e))
    expect(mine.map((e) => e.type).sort()).toEqual(['Edit rate rising', 'Monitor stale', 'Question', 'Review: 3 drafts'])
    expect(seed.exceptions.filter((e) => e.copied.includes('marcus') && e.ownerId !== 'marcus' && open(e))).toHaveLength(2)
  })

  test('the edit-rate detail carries the 14-day chart and the 32 edits', () => {
    const detail = seed.exceptions.find((e) => e.code === 'EXC-5512')!.detail!
    expect(detail.trend).toHaveLength(14)
    expect(detail.trend!.at(-1)).toBe(19.2)
    expect(detail.target).toBe(10)
    expect(detail.breakdown!.reduce((sum, b) => sum + b.count, 0)).toBe(32)
  })

  test('activities match 4c and 4b', () => {
    expect(seed.activities.filter((a) => a.agentId === 'med-rec').map((a) => a.level)).toEqual(['draft', 'shadow'])
    expect(seed.activities.filter((a) => a.agentId === 'discharge-meds').map((a) => a.name)).toEqual([
      'Draft discharge med list',
      'Flag discharge interactions',
    ])
  })

  test('Med Rec has its five recent actions (4c) plus ACT-88171 (7a); ACT-88213 keeps its trace', () => {
    expect(seed.actions.filter((a) => a.agentId === 'med-rec').map((a) => a.code)).toEqual([
      'ACT-88240',
      'ACT-88213',
      'ACT-88207',
      'ACT-88199',
      'ACT-88188',
      'ACT-88171',
    ])
    expect(seed.actions.find((a) => a.code === 'ACT-88213')!.steps).toHaveLength(8)
  })

  test('the log has 41 events and two changes from yesterday', () => {
    expect(seed.logEvents).toHaveLength(41)
    expect(seed.changeEvents).toHaveLength(2)
  })

  test('Revenue cycle carries its page, incident and resume rule', () => {
    expect(seed.divisions.find((d) => d.id === 'revenue-cycle')).toMatchObject({
      incidentId: 'inc-0029',
      resumeNeeds: ['Tom', 'Nina'],
      page: { at: '2026-12-08T08:05:00', ackAt: '2026-12-08T08:06:00', who: 'tom' },
    })
  })
})

describe('Phase 4: controls and audit data', () => {
  const s = createSeed()
  const byId = (id: string) => s.agents.find((a) => a.id === id)!

  test('incidents: INC-0029 open on Prior Auth, INC-0030 closed; the next is INC-0031', async () => {
    const { nextIncidentCode } = await import('../../store/mutations')
    expect(s.incidents.map((i) => [i.code, i.agentId, i.state])).toEqual([
      ['INC-0029', 'prior-auth', 'open'],
      ['INC-0030', 'discharge-meds', 'closed'],
    ])
    expect(s.incidents[0]).toMatchObject({ commanderId: 'tom', harm: 'None reached a patient' })
    expect(nextIncidentCode(s)).toBe('INC-0031')
  })

  test('six retired agents are on record; the next archive code is RET-07', async () => {
    const { nextArchiveCode } = await import('../../store/mutations')
    const retired = s.agents.filter((a) => a.lifecycle === 'retired')
    expect(retired.map((a) => a.retirement!.code)).toEqual(['RET-01', 'RET-02', 'RET-03', 'RET-04', 'RET-05', 'RET-06'])
    expect(nextArchiveCode(s)).toBe('RET-07')
  })

  test('the three blocked admissions from 7a', () => {
    const blocked = s.actions.filter((a) => a.blockedBy === 'HS-04 v2').map((a) => [a.code, a.at, a.reviewerOutcome])
    expect(blocked).toEqual([
      ['ACT-88213', '2026-12-08T09:38:02', 'Edited 1 line, signed'],
      ['ACT-88199', '2026-12-08T09:24:51', 'Edited 1 line, signed'],
      ['ACT-88171', '2026-12-08T09:02:17', 'Edited 1 line, signed'],
    ])
    expect(s.stats24h.actionsToday).toBe(1912)
  })

  test('risk tiers from 8c and 6f; Med Rec queue from 6b', () => {
    expect(['med-rec', 'allergy-recon', 'renal-dosing', 'duplicate-rx', 'prior-auth'].map((id) => byId(id).riskTier)).toEqual([3, 3, 3, 3, 3])
    expect(['formulary-swap', 'iv-to-oral'].map((id) => byId(id).riskTier)).toEqual([2, 2])
    expect(byId('med-rec').queue).toEqual({ inProgress: 12, awaitingReview: 4, perHour: 6 })
  })

  test('inventory records: 2 approved intakes, 3 onboarding drafts, 3 past exports', () => {
    expect(s.intakeRequests).toHaveLength(2)
    expect(s.onboardingDrafts.map((d) => d.agentName)).toEqual(['Discharge Summary Agent', 'Prior Auth Agent v2', 'Referral Triage Agent'])
    expect(s.exports).toHaveLength(3)
  })
})
