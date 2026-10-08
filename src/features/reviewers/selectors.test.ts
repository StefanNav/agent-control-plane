import { createSeed } from '../../data/seed'
import { selectReviewers, selectUnit } from './selectors'

test('11a: Medications over 8 weeks; 6 North reads "checking less"', () => {
  const view = selectReviewers(createSeed(), 'medications', 8, 'marcus')!
  expect(view.breadcrumb).toBe('Operations / Medications')
  expect(view.sub).toBe('All agents in Medications · 20 Oct to 08 Dec')
  expect(view.insight).toEqual({
    unitId: '6-north',
    lead: 'Approvals on 6 North got faster while the independent check found more misses.',
    text: 'Median time to approve fell from 38 s to 9 s and edits fell to 1.3 %, but second-pharmacist checks found errors in 2.4 % of approved lists, up from 0.5 %. That points to reviewers checking less, not the agent getting better.',
  })
  expect(view.weekly!.head).toBe('6 North · weekly')
  expect(view.weekly!.cards.map((c) => [c.label, c.value, c.was, c.from, c.to])).toEqual([
    ['Median time to approve', '9 s', 'was 38 s', '20 Oct', '08 Dec'],
    ['Edit rate', '1.3 %', 'was 5.9 %', '20 Oct', '08 Dec'],
    ['Independent check · misses in approved lists', '2.4 %', 'was 0.5 %', '20 Oct', '08 Dec'],
  ])
  expect(view.weekly!.cards[2]!.note).toBe('3 of 124 sampled · small numbers, so confirm first')
  expect(view.rows.map((r) => [r.unit, r.approved, r.time, r.edit, r.misses, r.read, r.flag])).toEqual([
    ['6 North', '1,214', '9 s · was 38', '1.3 % ↓', '2.4 % · 3 of 124', 'Checking less?', true],
    ['7 West', '1,842', '36 s', '17.9 % ↑', '0.6 % · 1 of 180', 'Agent drifting, reviewers catching it', false],
    ['8 East', '1,610', '41 s', '16.2 % ↑', '0.5 % · 1 of 161', 'Agent drifting, reviewers catching it', false],
    ['5 South', '702', '33 s', '3.0 % ↓', '0.4 % · 0 of 70', 'Agent improved', false],
    ['ED observation', '402', '52 s', '7.4 %', '0.9 % · 0 of 40', 'Steady', false],
  ])
  expect(view.grid).toEqual([
    { read: 'Agent improved', units: '5 South', current: false },
    { read: 'Reviewers checking less', units: '6 North', current: true },
    { read: 'Agent drifting, reviewers catching it', units: '7 West, 8 East', current: false },
    { read: 'Both slipping', units: 'None', current: false },
  ])
  expect(view.check).toBe('A second pharmacist re-checks a random 10 % of approved lists, blind to the first review.')
})

test('4 weeks narrows the window; another division has no independent check yet', () => {
  const four = selectReviewers(createSeed(), 'medications', 4, 'marcus')!
  expect(four.sub).toBe('All agents in Medications · 17 Nov to 08 Dec')
  expect(four.weekly!.cards[0]!.was).toBe('was 15 s')
  const discharge = selectReviewers(createSeed(), 'discharge', 8, 'marcus')!
  expect(discharge.rows).toEqual([])
  expect(discharge.empty).toBe('No independent check runs in Discharge yet.')
})

test('11b: 6 North by shift, the misses the check found, and the three responses', () => {
  const view = selectUnit(createSeed(), '6-north', 'marcus', null)!
  expect(view.title).toBe('6 North')
  expect(view.sub).toBe('Approvals and the independent check · 11 Nov to 08 Dec')
  expect(view.note).toEqual({ lead: 'Night coverage changed on 15 Nov.', text: 'One pharmacist now covers 6 North, 6 South and ICU step-down. Approvals per night pharmacist rose from 31 to 74.' })
  expect(view.shifts.map((r) => [r.name, r.hours, r.approved, r.time, r.edit, r.misses])).toEqual([
    ['Days', '07:00 to 15:00', '512', '22 s', '2.9 %', '0 of 52'],
    ['Evenings', '15:00 to 23:00', '418', '11 s', '1.1 %', '1 of 42'],
    ['Nights', '23:00 to 07:00', '284', '4 s', '0.4 %', '2 of 30'],
  ])
  expect(view.missesHead).toBe('Misses found by the independent check · 3')
  expect(view.misses.map((m) => [m.draft, m.agent, m.approvedIn, m.shift, m.found, m.flag])).toEqual([
    ['DR-90121', 'Med Rec Agent', '4 s', 'Night', 'Kept a duplicate apixaban line from two pharmacies', null],
    ['DR-89960', 'Discharge Meds Agent', '6 s', 'Night', 'Stopped medication still on the discharge list', null],
    ['DR-89802', 'Med Rec Agent', '9 s', 'Evening', 'Missed eye drops from an outside record', 'FB-2286'],
  ])
  expect(view.options.map((o) => [o.value, o.title])).toEqual([
    ['sampling', 'Raise sampling to 20 % on 6 North'],
    ['tighten', 'Tighten review level on 6 North'],
    ['minTime', 'Set a minimum review time'],
  ])
  expect(view.options[0]!.description).toBe('For 14 days · about 240 more checks · confirms or clears the signal')
  expect(view.respond).toMatchObject({ mode: 'propose', button: 'Send to Priya for sign-off' })
})

test('an unknown unit is not found', () => {
  expect(selectUnit(createSeed(), 'nope', 'marcus', null)).toBeNull()
})
