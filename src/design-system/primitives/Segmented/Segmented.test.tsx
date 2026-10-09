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

test('disabled: shows the choice, says it can’t change, and ignores clicks (read-only viewers)', async () => {
  const onChange = vi.fn()
  render(
    <Segmented
      aria-label="Tier"
      value="2"
      onChange={onChange}
      disabled
      options={[
        { value: '2', label: 'Tier 2', sub: 'Suggested' },
        { value: '3', label: 'Tier 3' },
      ]}
    />,
  )
  const three = screen.getByRole('button', { name: 'Tier 3' })
  expect(three).toHaveAttribute('aria-disabled', 'true')
  await userEvent.click(three)
  expect(onChange).not.toHaveBeenCalled()
})
