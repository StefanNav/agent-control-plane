import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioCardGroup } from './RadioCardGroup'

const OPTIONS = [
  { value: 'activity', title: 'This activity' },
  { value: 'agent', title: 'This agent', disabled: true },
  { value: 'division', title: 'Every agent in Medications' },
] as const

function setup(value: 'activity' | 'agent' | 'division' | null = 'activity') {
  const onChange = vi.fn()
  render(<RadioCardGroup name="scope" value={value} onChange={onChange} options={[...OPTIONS]} />)
  return onChange
}

test('is a radiogroup with the selected option checked', () => {
  setup()
  expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'This activity' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: /Every agent/ })).toHaveAttribute('aria-checked', 'false')
})

test('clicking an option selects it', async () => {
  const onChange = setup()
  await userEvent.click(screen.getByRole('radio', { name: /Every agent/ }))
  expect(onChange).toHaveBeenCalledWith('division')
})

test('ArrowDown moves to the next enabled option', async () => {
  const onChange = setup()
  screen.getByRole('radio', { name: 'This activity' }).focus()
  await userEvent.keyboard('{ArrowDown}')
  expect(onChange).toHaveBeenCalledWith('division')
})

test('disabled options cannot be chosen', async () => {
  const onChange = setup()
  await userEvent.click(screen.getByRole('radio', { name: 'This agent' }))
  expect(onChange).not.toHaveBeenCalled()
})
