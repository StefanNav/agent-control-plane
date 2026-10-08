import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SystemsVerbsGrid } from './SystemsVerbsGrid'

const ROWS = [
  {
    system: 'Pharmacy worklist',
    detail: '7 West and 8 East queues',
    cells: { read: 'granted', draft: 'granted', write: 'changed', submit: 'none', sign: 'locked', order: 'locked' } as const,
  },
  {
    system: 'Teams',
    detail: 'Medications owners channel',
    cells: { read: 'none', draft: 'none', write: 'none', submit: 'none', sign: 'locked', order: 'locked' } as const,
  },
]

test('sign and order are locked cells, never buttons; the policy is named once', () => {
  const { container } = render(<SystemsVerbsGrid rows={ROWS} policyId="ORG-POL-02" onToggle={() => {}} />)
  const locked = container.querySelectorAll('[data-cell="locked"]')
  expect(locked).toHaveLength(4)
  locked.forEach((cell) => expect(cell.querySelector('button')).toBeNull())
  expect(screen.getAllByText('ORG-POL-02')).toHaveLength(1)
})

test('a change needing re-approval is marked', () => {
  const { container } = render(<SystemsVerbsGrid rows={ROWS} policyId="ORG-POL-02" />)
  expect(container.querySelectorAll('[data-cell="changed"]')).toHaveLength(1)
})

test('editable cells toggle', async () => {
  const onToggle = vi.fn()
  render(<SystemsVerbsGrid rows={ROWS} policyId="ORG-POL-02" onToggle={onToggle} />)
  await userEvent.click(screen.getByRole('button', { name: 'Teams · write' }))
  expect(onToggle).toHaveBeenCalledWith('Teams', 'write')
})

test('onboarding (1c): the row needing attention is marked, and the policy line can be the step’s own', () => {
  const rows = [
    { system: 'Epic', detail: 'Encounter', cells: { read: 'granted', draft: 'none', write: 'none', submit: 'none', sign: 'locked', order: 'locked' } as const },
    { system: 'Microsoft Teams', detail: 'Messages', cells: { read: 'none', draft: 'none', write: 'changed', submit: 'none', sign: 'locked', order: 'locked' } as const },
  ]
  render(<SystemsVerbsGrid rows={rows} policyId="ORG-POL-02" selected="Microsoft Teams" policyText={<>Sign and order are locked for every agent by</>} />)
  expect(screen.getByText('Microsoft Teams').closest('[data-selected]')).toHaveAttribute('data-selected', 'true')
  expect(screen.getByText('Epic').closest('[data-selected]')).toBeNull()
  expect(screen.getByText(/Sign and order are locked for every agent by/)).toBeInTheDocument()
  expect(screen.queryByText(/stay with people at every level/)).toBeNull()
})
