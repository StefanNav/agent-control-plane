import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivilegeCard, type PrivilegeCardView } from './PrivilegeCard'

const AWAITING: PrivilegeCardView = {
  state: 'awaiting',
  statusLabel: 'Awaiting signature',
  code: 'PRV-0142 v3',
  title: 'Reconcile home medications at admission',
  scope: 'Med Rec Agent · 7 West, 8 East · adults 18+',
  ladder: ['current', 'proposed', 'locked', 'locked'],
  ladderCaption: 'Shadow now · Draft proposed',
  rows: [
    { key: 'Granted by', value: 'Awaiting Priya · asked by Marcus' },
    { key: 'Evidence', value: '21-day shadow · 1,204 cases · 2 of 3 targets met' },
  ],
  footnote: '1 target missed: signing needs a written reason',
  actionLabel: 'Review and sign',
}

test('awaiting card names its status, record and next step', async () => {
  const onAction = vi.fn()
  render(<PrivilegeCard view={AWAITING} onAction={onAction} />)
  expect(screen.getByText('Awaiting signature')).toBeInTheDocument()
  expect(screen.getByText('PRV-0142 v3')).toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Review and sign' })
  expect(button.className).toMatch(/primary/)
  await userEvent.click(button)
  expect(onAction).toHaveBeenCalled()
})

test('an active privilege has a plain status and a quiet action', () => {
  render(<PrivilegeCard view={{ ...AWAITING, state: 'active', statusLabel: 'Active', actionLabel: 'Open record' }} />)
  expect(screen.getByRole('button', { name: 'Open record' }).className).toMatch(/ghost/)
})
