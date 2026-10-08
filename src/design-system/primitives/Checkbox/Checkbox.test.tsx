import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

test('exposes checked state', () => {
  render(<Checkbox checked onChange={() => {}} label="Tested" />)
  expect(screen.getByRole('checkbox', { name: 'Tested' })).toHaveAttribute('aria-checked', 'true')
})

test('click and Space toggle', async () => {
  const onChange = vi.fn()
  render(<Checkbox checked={false} onChange={onChange} label="Tested" />)
  const box = screen.getByRole('checkbox', { name: 'Tested' })
  await userEvent.click(box)
  expect(onChange).toHaveBeenLastCalledWith(true)
  box.focus()
  await userEvent.keyboard(' ')
  expect(onChange).toHaveBeenCalledTimes(2)
})

test('disabled blocks click and Space', async () => {
  const onChange = vi.fn()
  render(<Checkbox checked={false} onChange={onChange} label="Tested" disabled />)
  const box = screen.getByRole('checkbox', { name: 'Tested' })
  await userEvent.click(box)
  box.focus()
  await userEvent.keyboard(' ')
  expect(onChange).not.toHaveBeenCalled()
})
