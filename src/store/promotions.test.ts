import { createSeed } from '../data/seed'
import { createDemoStore, dataOf } from './index'
import { levelOf } from './levels'
import { latestByCode } from './onboarding'
import { c4, criteria } from './promotions'
import { createMemoryStorage } from './storage'

const REASON = 'Adding an outside allergy only makes prescribing more cautious. 90 days of evidence, every criterion met, and step-down on any defect.'
const fresh = (persona: 'marcus' | 'priya' | 'drlee' | 'jordan' = 'priya') => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona(persona)
  return store
}

test('14a’s evidence, from data: 99.1 %, 0.1 %, 2 of 412 defects, 14 days at Reduced (R11)', () => {
  expect(criteria(createSeed(), 'prm-0007')).toEqual([
    { label: 'Signed as is', target: '≥ 98.0 %', short: 'target ≥ 98 %', result: '99.1 %', value: '99.1 %', met: true },
    { label: 'Rejected by the pharmacist', target: '≤ 0.5 %', short: 'target ≤ 0.5 %', result: '0.1 %', value: '0.1 %', met: true },
    { label: 'Defects in independent checks', target: '≤ 0.5 %', short: 'target ≤ 0.5 %', result: '0.49 % · 2 of 412', value: '2 of 412', met: true },
    { label: 'Days at Reduced review', target: '≥ 14', short: 'target ≥ 14', result: '14', value: '14 days', met: true },
  ])
})

test('Priya signs: Tier 3 goes to the 09 Dec board as item 2 of 4; the evidence is frozen; Dr. Lee gets the item', () => {
  const store = fresh('priya')
  expect(store.getState().signPromotion('prm-0007', { reason: REASON, accepted: false })).toEqual({ ok: false, reason: 'Accept accountability to sign' })
  expect(store.getState().signPromotion('prm-0007', { reason: ' ', accepted: true })).toEqual({ ok: false, reason: 'Write a reason' })
  expect(store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })).toEqual({ ok: true })
  const s = store.getState()
  const p = s.promotions.find((x) => x.id === 'prm-0007')!
  expect(p).toMatchObject({ state: 'board', sponsor: { by: 'priya', at: s.now, reason: REASON }, board: { meeting: '2026-12-09T15:00:00', item: 2, of: 4 } })
  expect(p.evidence!.criteria.map((c) => c.result)).toEqual(['99.1 %', '0.1 %', '0.49 % · 2 of 412', '14'])
  expect(s.exceptions.find((e) => e.type === 'Review: promotion · Allergy Recon Agent')).toMatchObject({ ownerId: 'drlee', deadline: '2026-12-09T15:00:00', link: { to: '/portfolio/promotions/prm-0007' } })
  expect(store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })).toEqual({ ok: false, reason: 'Not waiting for a signature' })
})

test('Marcus can’t sign; a missed criterion locks signing (a defect sends the level back to Normal)', () => {
  const marcus = fresh('marcus')
  const before = dataOf(marcus.getState())
  expect(marcus.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })).toEqual({ ok: false, reason: 'Clinical sponsor only' })
  expect(dataOf(marcus.getState())).toEqual(before)
  marcus.getState().recordCheck('draw-act-90412', { result: 'defect' })
  marcus.getState().setPersona('priya')
  expect(marcus.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })).toEqual({ ok: false, reason: 'Every criterion must be met' })
})

test('the board decides only after the sponsor signs; approving writes PRV-0087 v6 with the branch at Supervised', () => {
  const store = fresh('drlee')
  expect(store.getState().decidePromotion('prm-0007', { kind: 'approve', conditions: [], reason: 'Good' })).toEqual({ ok: false, reason: 'Waiting for Priya’s signature' })
  store.getState().setPersona('priya')
  store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })
  store.getState().setPersona('drlee')
  const at = '2026-12-09T15:20:00'
  store.setState({ now: at })
  const condition = c4(at)
  expect(condition.text).toBe('Normal review for the first 60 days; no move to Reduced before 07 Feb')
  expect(store.getState().decidePromotion('prm-0007', { kind: 'approveWithConditions', conditions: [condition], reason: '' })).toEqual({ ok: false, reason: 'Write a reason' })
  expect(store.getState().decidePromotion('prm-0007', { kind: 'approveWithConditions', conditions: [condition], reason: 'Good evidence on a branch that only adds caution.' })).toEqual({ ok: true })
  const s = store.getState()
  const v6 = latestByCode(s, 'PRV-0087')!
  expect(v6).toMatchObject({ version: 6, state: 'active', level: 'draft', branchLevels: { 'outside-records': 'supervised' }, conditions: ['C1', 'C3', 'C4'], grantedBy: 'priya', grantedAt: at, reviewDate: '2027-03-10T00:00:00' })
  expect(s.privileges.find((p) => p.code === 'PRV-0087' && p.version === 5)!.state).toBe('closed')
  const activity = s.activities.find((a) => a.id === 'allergy-recon')!
  expect(activity.level).toBe('draft')
  expect(activity.branches.find((b) => b.id === 'outside-records')!.level).toBe('supervised')
  expect(activity.reviewLevel).toBe('normal')
  expect(levelOf(s, 'allergy-recon')).toMatchObject({ noReducedBefore: '2027-02-07T00:00:00' })
  expect(levelOf(s, 'allergy-recon').changes.at(-1)).toMatchObject({ from: 'reduced', to: 'normal', by: 'drlee', why: 'Promoted to Supervised · PRV-0087 v6' })
  expect(s.exceptions.find((e) => e.type === 'Review: promotion · Allergy Recon Agent')!.state).toBe('resolved')
  expect(store.getState().decidePromotion('prm-0007', { kind: 'approve', conditions: [], reason: 'Again' })).toEqual({ ok: false, reason: 'Already decided' })
})

test('re-review returns it to Priya with the board’s question; she can sign again', () => {
  const store = fresh('priya')
  store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })
  store.getState().setPersona('drlee')
  expect(store.getState().decidePromotion('prm-0007', { kind: 'reReview', conditions: [], reason: 'What about allergies with no reaction recorded?' })).toEqual({ ok: true })
  const p = store.getState().promotions.find((x) => x.id === 'prm-0007')!
  expect(p).toMatchObject({ state: 'sponsor', returned: { by: 'drlee', note: 'What about allergies with no reaction recorded?' } })
  store.getState().setPersona('priya')
  expect(store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })).toEqual({ ok: true })
})

test('Request changes goes back to Marcus, who can send it again', () => {
  const store = fresh('priya')
  expect(store.getState().returnPromotion('prm-0007', '')).toEqual({ ok: false, reason: 'Write a note' })
  expect(store.getState().returnPromotion('prm-0007', 'Show the 2 January defects first')).toEqual({ ok: true })
  expect(store.getState().exceptions.find((e) => e.type === 'Promotion returned · Allergy Recon Agent')).toMatchObject({ ownerId: 'marcus' })
  store.getState().setPersona('marcus')
  expect(store.getState().resendPromotion('prm-0007')).toEqual({ ok: true })
  expect(store.getState().promotions.find((x) => x.id === 'prm-0007')!.state).toBe('sponsor')
})

test('Tier 2 and below: the sponsor’s signature is enough', () => {
  const store = fresh('priya')
  store.setState({ agents: store.getState().agents.map((a) => (a.id === 'allergy-recon' ? { ...a, riskTier: 2 } : a)) })
  expect(store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })).toEqual({ ok: true })
  const s = store.getState()
  expect(s.promotions.find((x) => x.id === 'prm-0007')!.state).toBe('approved')
  expect(s.activities.find((a) => a.id === 'allergy-recon')!.branches[0]!.level).toBe('supervised')
})

describe('review fixes I1 and I8: the board decides on evidence that still holds, and never loosens review', () => {
  test('after two defects the board can’t approve on Priya’s frozen evidence; re-review still works', () => {
    const store = fresh('priya')
    store.getState().signPromotion('prm-0007', { reason: REASON, accepted: true })
    store.getState().setPersona('marcus')
    store.getState().recordCheck('draw-act-90412', { result: 'defect' })
    store.getState().recordCheck('draw-act-90377', { result: 'defect' })
    expect(store.getState().activities.find((a) => a.id === 'allergy-recon')!.reviewLevel).toBe('tightened')
    store.getState().setPersona('drlee')
    const before = dataOf(store.getState())
    expect(store.getState().decidePromotion('prm-0007', { kind: 'approve', conditions: [], reason: 'Looks good' })).toEqual({
      ok: false,
      reason: 'The evidence changed since Priya signed: defects in independent checks no longer meet the target',
    })
    expect(dataOf(store.getState())).toEqual(before)
    expect(store.getState().decidePromotion('prm-0007', { kind: 'reReview', conditions: [], reason: 'Two defects since you signed.' })).toEqual({ ok: true })
    expect(store.getState().activities.find((a) => a.id === 'allergy-recon')!.reviewLevel).toBe('tightened')
  })

  test('approval moves Reduced to Normal as the board’s decision, not a rule firing; Tightened stays Tightened', async () => {
    const { applyDecidePromotion, applySignPromotion } = await import('./promotions')
    const { ruleRows } = await import('./levels')
    const s = createSeed()
    applySignPromotion(s, 'prm-0007', REASON, 'priya', '2026-12-08T10:00:00')
    applyDecidePromotion(s, 'prm-0007', { kind: 'approve', conditions: [], reason: 'Good' }, 'drlee', '2026-12-08T11:00:00')
    expect(levelOf(s, 'allergy-recon').changes.at(-1)).toMatchObject({ from: 'reduced', to: 'normal', by: 'drlee', why: 'Promoted to Supervised · PRV-0087 v6' })
    expect(ruleRows(s, 'allergy-recon').find((r) => r.id === 'restore')!.now).toBe('off')

    const t = createSeed()
    applySignPromotion(t, 'prm-0007', REASON, 'priya', '2026-12-08T10:00:00')
    t.activities.find((a) => a.id === 'allergy-recon')!.reviewLevel = 'tightened'
    applyDecidePromotion(t, 'prm-0007', { kind: 'approve', conditions: [], reason: 'Good' }, 'drlee', '2026-12-08T11:00:00')
    expect(t.activities.find((a) => a.id === 'allergy-recon')!.reviewLevel).toBe('tightened')
  })
})
