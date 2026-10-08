import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PauseDialog, ResumeDialog } from './ImpactDialogs'

test('pause dialog (6b): scope, numbered effects, resume rule and confirm', async () => {
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
      effects={[
        { value: '12', lead: 'drafts in progress go back to pharmacists', text: 'They appear in the 7 West and 8 East worklists within a minute.' },
        { value: '~6', lead: 'admissions an hour reconciled by hand', text: 'Until the agent resumes. Charge pharmacists are told.' },
      ]}
      resumeRule={{ lead: 'Resuming needs Priya and you,', text: 'both with a reason. Each activity returns to the level it had.' }}
      reason=""
      onReasonChange={() => {}}
      audit="Logs Marcus · 09:47"
      onCancel={() => {}}
      onConfirm={onConfirm}
    />,
  )
  expect(screen.getByRole('dialog', { name: 'Pause Med Rec Agent?' })).toBeInTheDocument()
  expect(screen.getByText('Takes effect at the gateway within seconds. Nothing is lost.')).toBeInTheDocument()
  const effects = screen.getAllByRole('listitem')
  expect(effects.map((e) => e.textContent)).toEqual([
    '12drafts in progress go back to pharmacistsThey appear in the 7 West and 8 East worklists within a minute.',
    '~6admissions an hour reconciled by handUntil the agent resumes. Charge pharmacists are told.',
  ])
  expect(screen.getByText('Optional · goes on the incident record')).toBeInTheDocument()
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
