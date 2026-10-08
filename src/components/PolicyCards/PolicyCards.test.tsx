import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HardStopCard, InstructionCard } from './PolicyCards'

test('a hard stop says it is enforced at the gateway and names its rule', () => {
  render(
    <HardStopCard
      code="HS-04 v2"
      title="Never change a dose"
      description="Applies to every Med Rec Agent activity."
      rows={[{ key: 'Owner', value: 'Sam · technical owner' }]}
      footer="The agent can't edit or talk past this rule."
    />,
  )
  expect(screen.getByText('Hard stop · enforced at the gateway')).toBeInTheDocument()
  expect(screen.getByText('HS-04 v2')).toBeInTheDocument()
  expect(screen.getByText('Never change a dose').tagName).toBe('H3')
})

test('an instruction is editable guidance', async () => {
  const onEdit = vi.fn()
  render(<InstructionCard text="Write generic names." rows={[]} onEdit={onEdit} />)
  expect(screen.getByText("Instruction · in the agent's prompt")).toBeInTheDocument()
  expect(screen.getByText(/Guidance only/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
  expect(onEdit).toHaveBeenCalled()
})
