import { render, screen } from '@testing-library/react'
import { Input } from './Input'

test('passes value and attributes to the input', () => {
  render(<Input aria-label="Name" defaultValue="Med Rec Agent" />)
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Med Rec Agent')
})

test('locked input is read-only and shows a lock', () => {
  const { container } = render(<Input aria-label="Division" defaultValue="Medications" locked />)
  expect(screen.getByRole('textbox', { name: 'Division' })).toHaveAttribute('readonly')
  expect(container.querySelector('svg rect')).not.toBeNull()
})
