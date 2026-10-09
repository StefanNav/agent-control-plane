import { createSeed } from '../../data/seed'
import { DEMO_NOW } from '../../lib/clock'
import { applyFlag } from '../../store/feedback'
import { packetEstimate, ruaihCell, selectAgentEvidence, selectCoverage } from './selectors'

const cells = (row: { cells: ReturnType<typeof ruaihCell>[] }) => row.cells.map((c) => ('gap' in c ? 'gap' : c.count))

test('12a: every agent on the boards against the 7 elements, counted from data (R3, R4)', () => {
  const view = selectCoverage(createSeed(), 'dana')
  expect(view.breadcrumb).toBe('Reports / RUAIH evidence')
  expect(view.title).toBe('RUAIH evidence')
  expect(view.status).toBe('Survey window opens 29 Dec · 21 days')
  expect(view.sub).toBe('Each agent’s records mapped to the seven elements of the Joint Commission and CHAI guidance on the Responsible Use of AI in Healthcare.')
  expect(view.stats).toEqual([
    { label: 'Agents in scope', value: '41', sub: '5 divisions' },
    { label: 'Elements covered', value: '279 of 287', sub: '7 elements × 41 agents' },
    { label: 'Open gaps', value: '8', sub: '5 owners, all dated' },
    { label: 'Last export', value: '01 Dec', sub: 'Mock survey' },
  ])
  expect(view.rows.map((r) => [r.name, r.sub])).toEqual([
    ['Med Rec Agent', 'Medications'],
    ['Discharge Meds Agent', 'Medications'],
    ['Allergy Recon Agent', 'Medications'],
    ['Renal Dosing Agent', 'Medications'],
    ['Formulary Swap Agent', 'Medications'],
    ['Discharge Summary Agent', 'Discharge'],
    ['Prior Auth Agent', 'Revenue cycle'],
    ['Message Triage Agent', 'Patient messages · Shadow'],
  ])
  expect(cells(view.rows[0]!)).toEqual([6, 'gap', 4, 22, 7, 3, 2])
  expect(cells(view.rows[7]!)).toEqual([3, 'gap', 'gap', 5, 1, 1, 1])
  expect(view.more.count).toBe(33)
  const covered = [...view.rows, ...view.more.rows].flatMap((r) => r.cells).filter((c) => !('gap' in c)).length
  expect(covered).toBe(279)
  expect(view.more.rows.every((r) => r.cells.every((c) => !('gap' in c)))).toBe(true)
  expect(view.foot).toBe('RUAIH is voluntary guidance, not a scored accreditation standard. Lakeshore’s mapping rules decide which records count for each element; Dana owns them.')
  expect(view.tabs).toEqual({ gaps: 8, exports: 2 })
})

test('12a: open gaps sorted by due date, with owners (R1, R4)', () => {
  const { gaps } = selectCoverage(createSeed(), 'dana')
  expect(gaps.map((g) => g.due)).toEqual(['15 Dec', '19 Dec', '22 Dec', '25 Dec', '26 Dec', '27 Dec', '28 Dec', '28 Dec'])
  expect(gaps[0]).toEqual({
    agentId: 'formulary-swap',
    element: '4 · Quality monitoring',
    due: '15 Dec',
    agent: 'Formulary Swap Agent',
    text: 'Monitor stale for 3 h on 06 Dec, with no review recorded',
    owner: 'Owner Sam',
  })
  expect(gaps.slice(1, 5).map((g) => [g.element, g.agent, g.owner])).toEqual([
    ['2 · Privacy and transparency', 'Med Rec Agent', 'Owner Dana'],
    ['5 · Safety event reporting', 'Discharge Summary Agent', 'Owner Dana'],
    ['6 · Risk and bias', 'Renal Dosing Agent', 'Owner Marcus'],
    ['7 · Education and training', 'Allergy Recon Agent', 'Owner Priya'],
  ])
})

test('records made since the mapping add to its count: Ana’s live flag (R4, R5)', () => {
  const s = createSeed()
  expect(ruaihCell(s, 'med-rec', 5)).toEqual({ count: 7 })
  applyFlag(s, { draftId: 'DR-88412', reason: 'frequency', note: 'Frequency split into two lines' }, 'ana', DEMO_NOW)
  expect(ruaihCell(s, 'med-rec', 5)).toEqual({ count: 8 })
  expect(selectAgentEvidence(s, 'med-rec')!.rows[4]!.chips[0]).toBe('FB-2291 + 7 flags')
})

test('12b: Med Rec’s records follow the state; its gap is listed, not hidden (R5)', () => {
  const view = selectAgentEvidence(createSeed(), 'med-rec')!
  expect(view.breadcrumb).toBe('Reports / RUAIH evidence / Med Rec Agent')
  expect(view.title).toBe('Med Rec Agent')
  expect(view.status).toBe('6 of 7 elements covered')
  expect(view.idLine).toBe('AGT-0123 · Medications')
  expect(view.rows.map((r) => [r.n, r.name, r.status])).toEqual([
    [1, 'Governance', 'covered'],
    [2, 'Privacy and transparency', 'gap'],
    [3, 'Data security', 'covered'],
    [4, 'Quality monitoring', 'covered'],
    [5, 'Safety event reporting', 'covered'],
    [6, 'Risk and bias', 'covered'],
    [7, 'Education and training', 'covered'],
  ])
  expect(view.rows[0]!.chips).toEqual(['JD v3', 'PRV-0142 v3', 'Board minutes 14 Oct'])
  expect(view.rows[1]!.chips).toEqual(['Data use: Epic read, worklist draft'])
  expect(view.rows[1]!.gapLine).toBe('No patient-facing notice yet · Dana · due 19 Dec')
  expect(view.rows[3]!.chips).toEqual(['Weekly scorecard'])
  expect(view.rows[4]!.chips).toEqual(['FB-2290 + 6 flags', 'HS-04 fired × 3', 'Blinded PSO report · Nov'])
  expect(view.rows[5]!.chips).toEqual(['Risk tier 3', 'Subgroups: age, language · 17 Nov'])
  expect(view.rows[6]!.chips).toEqual(['31 of 31 reviewers trained', 'Session 15 Nov'])
  expect(view.exports).toBe(2)
})

test('12b: unknown or retired agents have no packet', () => {
  expect(selectAgentEvidence(createSeed(), 'nope')).toBeNull()
  expect(selectAgentEvidence(createSeed(), 'warfarin-dosing')).toBeNull()
})

test('the packet estimate: Med Rec over 12 months reads 214 pages, about 2 min (R7)', () => {
  expect(packetEstimate(1, 12)).toEqual({ pages: 214, minutes: 2 })
  expect(packetEstimate(1, 3)).toEqual({ pages: 84, minutes: 1 })
  expect(packetEstimate(20, 12)).toEqual({ pages: 4280, minutes: 43 })
})
