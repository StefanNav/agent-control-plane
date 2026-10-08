import * as catalogue from './catalogue'
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
    seed.divisions.map((d) => [d.id, seed.agents.filter((a) => a.lifecycle !== 'retired' && a.lifecycle !== 'onboarding' && a.divisionId === d.id).length]),
  )
  expect(counts).toEqual({
    'revenue-cycle': 6,
    medications: 20,
    discharge: 8,
    'imaging-referrals': 4,
    'patient-messages': 3,
  })
  // 41 on the board, plus 6 retired agents kept on record (Phase 4) and 1 draft being onboarded (Phase 5).
  expect(seed.agents).toHaveLength(48)
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
  const meds = seed.agents.filter((a) => a.lifecycle !== 'retired' && a.lifecycle !== 'onboarding' && a.divisionId === 'medications')
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

  test('seed version 6 or later (Phase 5: onboarding records)', () => {
    expect(SEED_VERSION).toBeGreaterThanOrEqual(6)
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

  test('Med Rec has its five recent actions (4c) plus ACT-88171 (7a), Ana’s draft ACT-88209 (10a) and the shadow case ACT-61840 (3b); ACT-88213 keeps its trace', () => {
    expect(seed.actions.filter((a) => a.agentId === 'med-rec').map((a) => a.code)).toEqual([
      'ACT-88240',
      'ACT-88213',
      'ACT-88207',
      'ACT-88199',
      'ACT-88188',
      'ACT-88171',
      'ACT-88209',
      'ACT-61840',
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

  test('inventory records: 2 approved intakes not started, 3 past exports', () => {
    expect(s.intakeRequests.filter((r) => !r.startedAt).map((r) => r.code)).toEqual(['REQ-0106', 'REQ-0108'])
    expect(s.exports).toHaveLength(3)
  })
})

describe('Phase 5: onboarding data (seed v6)', () => {
  const s = createSeed()

  test('seed version 7 (Phase 6: division settings and role dates)', () => {
    expect(SEED_VERSION).toBe(7)
  })

  test('every intake reserves a unique agent id and code; only a started intake’s agent uses them', () => {
    const codes = s.intakeRequests.map((r) => r.agentCode)
    expect(new Set(codes).size).toBe(codes.length)
    for (const intake of s.intakeRequests) {
      const holder = s.agents.find((a) => a.code === intake.agentCode || a.id === intake.agentId)
      if (intake.startedAt) expect(holder?.id, intake.code).toBe(intake.agentId)
      else expect(holder, intake.code).toBeUndefined()
    }
    expect(s.intakeRequests.find((r) => r.code === 'REQ-0093')).toMatchObject({ agentId: 'med-rec', agentCode: 'AGT-0123', sponsorId: 'priya' })
  })

  test('Med Rec’s record is complete and frozen at v1.0; Culture Follow-up is a live draft', async () => {
    const { recordItems, openStep } = await import('../../store/onboardingRules')
    const medRec = s.onboardings.find((r) => r.agentId === 'med-rec')!
    expect(medRec.version).toBe(10)
    expect(medRec.frozenAt).toBe('2026-10-07T16:02:00')
    expect(recordItems(s, 'med-rec')).toEqual({ done: 13, total: 13 })
    expect(medRec.review?.decision).toMatchObject({ kind: 'approveWithConditions', at: '2026-10-14T16:20:00' })

    expect(s.agents.find((a) => a.id === 'culture-followup')).toMatchObject({ lifecycle: 'onboarding', code: 'AGT-0184' })
    expect(recordItems(s, 'culture-followup')).toEqual({ done: 4, total: 10 })
    expect(openStep(s, 'culture-followup')).toEqual({
      step: 'job',
      number: 2,
      name: 'Job description',
      missing: ['Never list', 'Acting for', 'Escalation triggers', 'Success criteria'],
      waitingOn: 'marcus',
    })
  })

  test('privilege codes: next is PRV-0144; Med Rec holds PRV-0142 v3 (Draft) and PRV-0143 v2 (Shadow)', async () => {
    const { nextPrivilegeCode } = await import('../../store/mutations')
    expect(nextPrivilegeCode(s)).toBe('PRV-0144')
    const medRec = s.privileges.filter((p) => p.agentId === 'med-rec' && p.state !== 'closed')
    expect(medRec.map((p) => [p.code, p.version, p.level, p.conditions])).toEqual([
      ['PRV-0142', 3, 'draft', ['C1', 'C2', 'C3']],
      ['PRV-0143', 2, 'shadow', ['C1', 'C3']],
    ])
    expect(medRec[0]).toMatchObject({ grantedAt: '2026-11-06T09:52:00', evidence: '21-day shadow · 1,118 cases · 2 of 3 targets met' })
    const others = s.privileges.filter((p) => p.agentId !== 'med-rec').map((p) => Number(p.code.slice(4)))
    expect(Math.max(...others)).toBeLessThan(142)
  })

  test('no retirement falls inside the onboarding window', () => {
    expect(s.agents.filter((a) => a.retirement && a.retirement.at > '2026-09-29T00:00:00')).toEqual([])
  })

  test('technical owners: Lena owns Discharge; Omar is clinical informatics', () => {
    expect(s.agents.filter((a) => a.divisionId === 'discharge').every((a) => a.techOwnerId === 'lena')).toBe(true)
    expect(s.roles).toContainEqual(expect.objectContaining({ personId: 'lena', divisionId: 'discharge', role: 'techOwner' }))
    expect(s.roles).not.toContainEqual(expect.objectContaining({ personId: 'omar', divisionId: 'discharge', role: 'techOwner' }))
    expect(s.people.find((p) => p.id === 'omar')!.title).toBe('Clinical informatics analyst')
  })

  test('3d: the overdue Duplicate Rx review copies Marcus and Dana', () => {
    expect(s.exceptions.find((e) => e.id === 'exc-5497')!.copied).toEqual(['marcus', 'dana'])
  })
})

describe('Phase 5: shadow scorecards and sample cases (3a, 3b)', () => {
  const s = createSeed()

  test('admission scorecard: 21 days, 1,118 admissions, 91.2 / 2.1 / 2.6, 29 inaccurate lines by cause, 12 cases', () => {
    const card = s.scorecards.find((c) => c.activityId === 'med-rec-admission')!
    expect(card).toMatchObject({ from: '2026-10-15T00:00:00', to: '2026-11-04T00:00:00', cases: 1118, hardStopNote: 'HS-04 would have fired 9 times' })
    expect(Object.fromEntries(Object.entries(card.results).map(([k, v]) => [k, [v.value, v.trend.length, v.trend.at(-1)]]))).toEqual({
      agreement: [91.2, 21, 91.2],
      omitted: [2.1, 21, 2.1],
      inaccurate: [2.6, 21, 2.6],
    })
    expect(card.causes.reduce((n, c) => n + c.count, 0)).toBe(29)
    expect(card.sampleCaseIds.slice(0, 4)).toEqual(['enc-4022', 'enc-4105', 'enc-4231', 'enc-4310'])
    expect(card.sampleCaseIds).toHaveLength(12)
  })

  test('case 4105 is 3b verbatim: 7 lines, 5 agree, Lasix → furosemide, vitamin D omitted, trace ACT-61840', () => {
    const c = s.sampleCases.find((x) => x.id === 'enc-4105')!
    expect(c).toMatchObject({ encounter: '4105', unit: '7 West', mrn: '••3307', age: 81, finalBy: 'Ana R.', traceId: 'act-61840' })
    expect(c.lines.map((l) => l.result)).toEqual(['agrees', 'agrees', 'agrees', 'inaccurate', 'omitted', 'agrees', 'agrees'])
    expect(c.lines[3]).toMatchObject({ agent: 'Lasix 40 mg daily', pharmacist: 'Furosemide 40 mg daily', note: 'name', source: 'Home list · brand name' })
    expect(s.actions.find((a) => a.id === 'act-61840')).toMatchObject({ at: '2026-10-28T14:13:00', agentId: 'med-rec' })
    for (const id of s.scorecards.flatMap((x) => x.sampleCaseIds)) expect(s.sampleCases.some((x) => x.id === id), id).toBe(true)
  })

  test('the allergy activity is still in shadow at baseline, every target met', () => {
    const card = s.scorecards.find((c) => c.activityId === 'med-rec-allergy')!
    expect(card.to).toBe('2026-12-07T00:00:00')
    expect(Object.values(card.results).map((r) => r.value)).toEqual([94.6, 1.2, 1.1])
  })
})

describe('Phase 6: v2 frames re-dated to December (R1, R2)', () => {
  const strings = (value: unknown, out: string[] = []): string[] => {
    if (typeof value === 'string') out.push(value)
    else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
    else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
    return out
  }

  test('no seed or catalogue string shows a March date, and Med Rec never reads v1.4.2 (Review focus 5)', () => {
    const seedNow = createSeed()
    const all = [...strings(seedNow), ...strings(Object.values(catalogue))]
    expect(all.filter((t) => /\b\d{2} Mar\b/.test(t))).toEqual([])
    // Claim Scrubber Agent really is v1.4.2; nothing else may be (9a, 10a's March build).
    expect([...strings({ ...seedNow, agents: [] }), ...strings(Object.values(catalogue))].filter((t) => t.includes('v1.4.2'))).toEqual([])
  })

  test('flag codes are unique and stop at FB-2290, so Ana’s flag is FB-2291', () => {
    const codes = createSeed().flags.map((f) => f.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect([...codes].sort().at(-1)).toBe('FB-2290')
  })
})
