import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const OPTIONS = [
  { value: 'shadow', label: 'Shadow' },
  { value: 'draft', label: 'Draft' },
] as const

test('choosing an option calls onChange with its value', async () => {
  const onChange = vi.fn()
  render(<Select aria-label="Level" value="shadow" onChange={onChange} options={[...OPTIONS]} />)
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Level' }), 'draft')
  expect(onChange).toHaveBeenCalledWith('draft')
})

test('locked select is disabled', () => {
  render(<Select aria-label="Level" value="shadow" onChange={() => {}} options={[...OPTIONS]} locked />)
  expect(screen.getByRole('combobox', { name: 'Level' })).toBeDisabled()
})
