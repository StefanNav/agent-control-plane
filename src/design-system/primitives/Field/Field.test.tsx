import { render, screen } from '@testing-library/react'
import { Input } from '../Input/Input'
import { Field } from './Field'

test('label is wired to the control', () => {
  render(
    <Field label="Purpose" htmlFor="purpose" hint="Required" help="One sentence.">
      <Input id="purpose" />
    </Field>,
  )
  expect(screen.getByLabelText('Purpose')).toHaveAttribute('id', 'purpose')
  expect(screen.getByText('Required')).toBeInTheDocument()
  expect(screen.getByText('One sentence.')).toBeInTheDocument()
})
