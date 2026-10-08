import { render, screen } from '@testing-library/react'
import { Notice } from './Notice'

test('lead renders in strong before the text', () => {
  render(
    <Notice mark="warn" lead="Edit rate rising.">
      Check 7 West.
    </Notice>,
  )
  expect(screen.getByText('Edit rate rising.').tagName).toBe('STRONG')
  expect(screen.getByText(/Check 7 West/)).toBeInTheDocument()
})

test('mark="none" draws no icon', () => {
  const { container } = render(<Notice mark="none">Plain.</Notice>)
  expect(container.querySelector('svg')).toBeNull()
})
