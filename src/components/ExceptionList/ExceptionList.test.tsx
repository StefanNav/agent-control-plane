import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExceptionList, type ExceptionView } from './ExceptionList'

const drafts: ExceptionView = {
  id: 'exc-5531',
  status: 'review',
  type: 'Drafts to review',
  reason: '3 med lists held by HS-04 v2 need a pharmacist decision',
  agent: 'Med Rec Agent',
  ruleTag: 'HS-04 v2',
  raised: '09:42',
  action: 'Review 3 drafts →',
  actionSub: 'opens side by side with the source list',
  owner: 'Marcus',
  ownerSub: 'unclaimed',
  deadline: '10:30',
  deadlineSub: 'in 48 min',
  state: 'new',
}

function setup() {
  const onOpen = vi.fn()
  render(
    <ExceptionList
      ariaLabel="Inbox"
      onOpen={onOpen}
      groups={[
        { id: 'overdue', label: 'Overdue', count: 1, items: [{ ...drafts, id: 'a', state: 'overdue', deadline: 'Overdue 12 min', deadlineSub: 'escalated to Priya', ownerSub: 'claimed 09:44' }] },
        { id: 'soon', label: 'Due soon', count: 1, items: [drafts] },
        { id: 'done', label: 'Resolved today', count: 1, items: [{ ...drafts, id: 'c', state: 'resolved', outcome: '3 drafts decided', outcomeSub: '2 signed as is, 1 edited · Ana R.', deadline: 'Closed 10:21', deadlineSub: '' }] },
      ]}
    />,
  )
  return { onOpen }
}

test('group headers show their label and count', () => {
  setup()
  expect(screen.getByText('Overdue').parentElement).toHaveTextContent('Overdue1')
  expect(screen.getByText('Resolved today')).toBeInTheDocument()
})

test('a new exception has the ink dot and a bold reason', () => {
  setup()
  const item = screen.getByText('Due soon').closest('[role="rowgroup"]')!.querySelector('[data-state="new"]')!
  expect(item.querySelector('[data-dot]')).not.toBeNull()
  expect(item.querySelector('[data-reason]')!.className).toMatch(/strongReason/)
})

test('overdue deadlines are critical', () => {
  setup()
  expect(screen.getByText('Overdue 12 min').className).toMatch(/overdue/)
})

test('resolved items show their outcome and close time', () => {
  setup()
  expect(screen.getByText('3 drafts decided')).toBeInTheDocument()
  expect(screen.getByText('Closed 10:21')).toBeInTheDocument()
})

test('Enter opens the focused item', async () => {
  const { onOpen } = setup()
  ;(document.querySelector('[data-state="new"]') as HTMLElement).focus()
  await userEvent.keyboard('{Enter}')
  expect(onOpen).toHaveBeenCalledWith('exc-5531')
})
