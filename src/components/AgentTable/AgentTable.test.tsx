import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentTable, type AgentRowView } from './AgentTable'

const base = { ladder: ['passed', 'current', 'locked', 'locked'] as const, level: 'Draft', grantor: 'Priya', reviewDate: '05 Feb', trend: [90, 91, 90, 92, 91, 91, 91] }
const ROWS: AgentRowView[] = [
  { ...base, id: 'med-rec', status: 'review', label: 'Review: 3 drafts', ruleTag: 'HS-04 v2', name: 'Med Rec Agent', version: 'v1.3.0', day: '138', signedAsIs: '89.6%', edited: '8.9%', blocked: '3', ladder: [...base.ladder] },
  { ...base, id: 'renal', status: 'warn', label: 'Edit rate rising', ruleTag: 'MR-12 v1', name: 'Renal Dosing Agent', version: 'v1.1.4', day: '198', signedAsIs: '78.3%', edited: '19.2%', blocked: '0', ladder: [...base.ladder] },
  { ...base, id: 'formulary', status: 'stale', label: 'No data for 3h', ruleTag: 'MON-02 v1', name: 'Formulary Swap Agent', version: 'v1.4.0', day: '—', signedAsIs: '—', edited: '—', blocked: '—', ladder: [...base.ladder] },
  { ...base, id: 'controlled', status: 'paused', label: 'Paused by Marcus', name: 'Controlled Drug Agent', version: 'v1.1.0', day: '0', signedAsIs: '—', edited: '—', blocked: '0', ladder: [...base.ladder] },
]

function setup() {
  const onSelect = vi.fn()
  render(<AgentTable ariaLabel="Medications agents" rows={ROWS} onSelect={onSelect} selectedId="med-rec" />)
  return { onSelect }
}

const row = (name: string) => screen.getByText(name).closest('[role="row"]') as HTMLElement

test('headers follow the division view', () => {
  setup()
  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
    'Status · rule ↓',
    'Agent',
    '24h',
    'Signed as is',
    'Edited',
    'Blocked',
    '7 days',
    'Privilege',
  ])
})

test('stale rows withdraw every metric and dash the trend', () => {
  setup()
  const stale = row('Formulary Swap Agent')
  expect(within(stale).getAllByText('—')).toHaveLength(4)
  expect(stale.querySelector('svg path[stroke-dasharray="2 2"]')).not.toBeNull()
  expect(stale.querySelector('circle')).toBeNull()
})

test('a rising edit rate is marked; blocked actions are emphasised', () => {
  setup()
  expect(within(row('Renal Dosing Agent')).getByText('19.2%').className).toMatch(/warnText/)
  expect(within(row('Med Rec Agent')).getByText('3').className).toMatch(/emphasis/)
})

test('paused rows hide the trend end dot', () => {
  setup()
  expect(row('Controlled Drug Agent').querySelector('circle')).toBeNull()
  expect(row('Med Rec Agent').querySelector('circle')).not.toBeNull()
})

test('clicking a row selects it; the selected name is bold', async () => {
  const { onSelect } = setup()
  await userEvent.click(screen.getByText('Renal Dosing Agent'))
  expect(onSelect).toHaveBeenCalledWith('renal')
  expect(screen.getByText('Med Rec Agent').className).toMatch(/selectedName/)
})

test('with a target prefix, each agent name is a tour target', async () => {
  const onSelect = vi.fn()
  render(<AgentTable ariaLabel="Medications agents" rows={ROWS} onSelect={onSelect} targetPrefix="division-" />)
  const name = document.querySelector<HTMLElement>('[data-story-target="division-med-rec"]')
  expect(name).toHaveTextContent('Med Rec Agent')
  await userEvent.click(name!)
  expect(onSelect).toHaveBeenCalledWith('med-rec')
})

test('without one, no targets', () => {
  setup()
  expect(document.querySelector('[data-story-target]')).toBeNull()
})
