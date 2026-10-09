import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { selectBoardDecision, selectPromotion } from './selectors'

test('14a for Priya: the branch, the evidence, who decides and the signature (R11)', () => {
  const view = selectPromotion(createSeed(), 'prm-0007', 'priya')!
  expect(view.breadcrumb).toBe('Medications / Allergy Recon Agent / Privileges / PRV-0087')
  expect(view.title).toBe('Promote “add an allergy from outside records” to Supervised')
  expect(view.idLine).toBe('PRV-0087 v6 draft')
  expect(view.chip).toEqual({ status: 'review', label: 'Review: your signature' })
  expect(view.branchesTitle).toBe('Reconcile allergy lists · 3 branches')
  expect(view.branches.map((b) => [b.name, b.note, b.ladder.map((l) => l.state)])).toEqual([
    ['Add an allergy from outside records', 'This promotion', ['passed', 'current', 'proposed', 'locked']],
    ['Update a reaction or severity', 'Stays at Draft', ['passed', 'current', 'available', 'locked']],
    ['Remove an allergy', 'HS-07 v1', ['locked', 'locked', 'locked', 'locked']],
  ])
  expect(view.evidenceHead).toBe('Evidence · 90 days at Draft · 4,212 adds')
  expect(view.who.map((w) => [w.label, w.meta, w.state])).toEqual([
    ['Marcus requested', '25 Nov', 'done'],
    ['You sign as sponsor', 'now', 'current'],
    ['AI review board decides', '09 Dec · Tier 3', 'todo'],
    ['Takes effect at the gateway', 'on approval', 'todo'],
  ])
  expect(view.signature.accept).toBe('I accept accountability for this branch at Supervised until 10 Mar 2027, or until it steps down.')
  expect(view.signature.button).toBe('Sign and send to the board')
  expect(view.signature.notice).toEqual({ lead: 'Tier 3: this goes to the AI review board after you sign.', text: 'Nothing changes until the board approves. Dr. Lee sees your reason and this evidence.' })
  expect(selectPromotion(createSeed(), 'prm-0007', 'jordan')!.chip).toEqual({ status: 'review', label: 'Waiting for Priya' })
  expect(selectPromotion(createSeed(), 'nope', 'priya')).toBeNull()
})

test('14b at the board: what Priya signed, frozen; the decision form for Dr. Lee', () => {
  const s = buildScenario('promotion-at-board')
  const view = selectBoardDecision(s, 'prm-0007', 'drlee')!
  expect(view.breadcrumb).toBe('Portfolio / AI review board / 09 Dec 2026 / Item 2 of 4')
  expect(view.title).toBe('Promotion · Allergy Recon Agent')
  expect(view.status).toBe('Tier 3 · signed by Priya 08 Dec')
  expect(view.idLine).toBe('PRV-0087 v6')
  expect(view.paperTitle).toBe('Add an allergy from outside records · Draft to Supervised')
  expect(view.paperSub).toBe('Reconcile allergy lists · Medications · owner Marcus · sponsor Priya')
  expect(view.stats.map((x) => [x.label, x.value, x.sub])).toEqual([
    ['Signed as is', '99.1 %', 'target ≥ 98 %'],
    ['Rejected', '0.1 %', 'target ≤ 0.5 %'],
    ['Check defects', '2 of 412', 'target ≤ 0.5 %'],
    ['At Reduced', '14 days', 'target ≥ 14'],
  ])
  expect(view.reasonHead).toBe('Priya’s reason · 08 Dec')
  expect(view.mode).toBe('decide')
  expect(view.proposed.map((c) => c.text)).toEqual(['Normal review for the first 60 days; no move to Reduced before 07 Feb'])
  expect(view.logged).toBe('Logged as Dr. Lee · AI review board chair')
  expect(selectBoardDecision(createSeed(), 'prm-0007', 'drlee')!.mode).toBe('waiting')
})
