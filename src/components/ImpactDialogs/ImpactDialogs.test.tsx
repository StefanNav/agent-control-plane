import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PauseDialog, ResumeDialog } from './ImpactDialogs'

test('pause dialog: scope, effect and confirm', async () => {
  const onScopeChange = vi.fn()
  const onConfirm = vi.fn()
  render(
    <PauseDialog
      open
      agentName="Med Rec Agent"
      scopes={[
        { value: 'activity', title: 'This activity · reconcile home medications' },
        { value: 'agent', title: 'This agent · both activities' },
      ]}
      scope="agent"
      onScopeChange={onScopeChange}
      effect={{ lead: '12 drafts in progress go back to pharmacists.', text: 'Nothing is lost.' }}
      resumeRule={{ lead: 'Resuming needs Priya and Marcus.', text: 'Both, with a reason.' }}
      reason=""
      onReasonChange={() => {}}
      audit="Logs Marcus · 09:47"
      onCancel={() => {}}
      onConfirm={onConfirm}
    />,
  )
  expect(screen.getByRole('dialog', { name: 'Pause Med Rec Agent?' })).toBeInTheDocument()
  expect(screen.getByText('12 drafts in progress go back to pharmacists.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: /This activity/ }))
  expect(onScopeChange).toHaveBeenCalledWith('activity')
  await userEvent.click(screen.getByRole('button', { name: 'Pause agent' }))
  expect(onConfirm).toHaveBeenCalled()
})

function Resume({ reason, onSubmit }: { reason: string; onSubmit: () => void }) {
  return (
    <ResumeDialog
      open
      mode="request"
      agentName="Med Rec Agent"
      pausedBy="Marcus"
      pausedAt="09:47"
      pausedAgo="2 h 14 min ago"
      needs={[
        { name: 'Marcus · agent owner', status: 'requesting now', done: true },
        { name: 'Priya · clinical sponsor', status: 'approval pending', done: false },
      ]}
      returnsTo={[{ activity: 'Reconcile home medications', level: 'Draft' }]}
      reason={reason}
      onReasonChange={() => {}}
      statusLine="Stays paused until Priya approves"
      onCancel={() => {}}
      onSubmit={onSubmit}
    />
  )
}

test('resume needs a written reason', async () => {
  const onSubmit = vi.fn()
  const { rerender } = render(<Resume reason="   " onSubmit={onSubmit} />)
  const submit = screen.getByRole('button', { name: 'Request resume' })
  expect(submit).toHaveAttribute('aria-disabled', 'true')
  await userEvent.click(submit)
  expect(onSubmit).not.toHaveBeenCalled()
  rerender(<Resume reason="Root cause fixed in v1.3.1." onSubmit={onSubmit} />)
  await userEvent.click(screen.getByRole('button', { name: 'Request resume' }))
  expect(onSubmit).toHaveBeenCalled()
})
