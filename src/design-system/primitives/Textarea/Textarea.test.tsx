import { render, screen } from '@testing-library/react'
import { Textarea } from './Textarea'

test('renders a textarea with the given value', () => {
  render(<Textarea aria-label="Reason" defaultValue="Target missed by one case." />)
  expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveValue('Target missed by one case.')
})
