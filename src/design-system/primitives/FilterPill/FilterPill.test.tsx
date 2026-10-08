import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterPill } from './FilterPill'

test('aria-pressed mirrors on, and clicks are reported', async () => {
  const onClick = vi.fn()
  const { rerender } = render(
    <FilterPill on={false} onClick={onClick}>
      Blocked
    </FilterPill>,
  )
  const pill = screen.getByRole('button', { name: 'Blocked' })
  expect(pill).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(pill)
  expect(onClick).toHaveBeenCalled()
  rerender(
    <FilterPill on onClick={onClick}>
      Blocked
    </FilterPill>,
  )
  expect(pill).toHaveAttribute('aria-pressed', 'true')
})
