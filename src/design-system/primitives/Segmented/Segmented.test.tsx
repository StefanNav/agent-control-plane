import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Segmented } from './Segmented'

test('marks the selected segment and reports clicks', async () => {
  const onChange = vi.fn()
  render(
    <Segmented
      value="needs-me"
      onChange={onChange}
      variant="control"
      options={[
        { value: 'needs-me', label: 'Needs me · 4' },
        { value: 'digest', label: 'Daily digest · 6' },
        { value: 'log', label: 'Log' },
      ]}
    />,
  )
  expect(screen.getByRole('button', { name: 'Needs me · 4' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Log' })).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(screen.getByRole('button', { name: 'Daily digest · 6' }))
  expect(onChange).toHaveBeenCalledWith('digest')
})
