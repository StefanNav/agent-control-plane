import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionTrace, type ActionTraceView } from './ActionTrace'

const VIEW: ActionTraceView = {
  title: 'Draft med list · encounter 4417',
  code: 'ACT-88213',
  agent: 'Med Rec Agent',
  version: 'v1.3.0',
  sop: 'v1.3',
  actingFor: 'Ana R., PharmD · 7 West',
  steps: [
    { at: '09:38:02.114', kind: 'input', title: 'Admission to 7 West · encounter 4417' },
    { at: '09:38:04.512', kind: 'policyBlocked', ruleTag: 'HS-04 v2', title: 'Never change a dose', detail: 'The gateway kept 25 mg.', meta: 'decided in 0.4 ms' },
    { at: '09:44:31.000', kind: 'reviewer', title: 'Edited 1 line, signed' },
  ],
}

test('shows the action, its steps in order, and expands the blocked step', async () => {
  const onExport = vi.fn()
  render(<ActionTrace view={VIEW} onExport={onExport} />)
  expect(screen.getByText('ACT-88213')).toBeInTheDocument()
  const times = screen.getAllByText(/^09:\d\d:\d\d\.\d{3}$/).map((n) => n.textContent)
  expect(times).toEqual(['09:38:02.114', '09:38:04.512', '09:44:31.000'])
  expect(screen.getByText('Policy check · blocked')).toBeInTheDocument()
  expect(screen.getByText('The gateway kept 25 mg.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Export for surveyor' }))
  expect(onExport).toHaveBeenCalled()
})
