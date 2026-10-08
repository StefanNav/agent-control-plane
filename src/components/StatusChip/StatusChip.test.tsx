import { render, screen } from '@testing-library/react'
import { StatusChip } from './StatusChip'

test('normal is a plain word: no box, no icon', () => {
  const { container } = render(<StatusChip status="normal" label="Within scope" />)
  expect(container.querySelector('svg')).toBeNull()
  expect(screen.getByText('Within scope').className).toMatch(/plain/)
})

test('stale is dashed with a dashed ring', () => {
  const { container } = render(<StatusChip status="stale" label="No data for 3h" />)
  const chip = container.querySelector('[data-status="stale"]')!
  expect(chip.className).toMatch(/dashed/)
  expect(chip.querySelector('path')?.getAttribute('stroke-dasharray')).toBe('2.2 1.75')
})

test('critical draws a triangle', () => {
  const { container } = render(<StatusChip status="crit" label="Wrong-patient draft · paused" />)
  expect(container.querySelector('path')?.getAttribute('d')).toBe('M6 1.2L11.4 10.6H0.6Z')
})

test('attention states use bold text; shadow and paused do not', () => {
  render(
    <>
      <StatusChip status="review" label="Review: 3 drafts" />
      <StatusChip status="shadow" label="Shadow" />
    </>,
  )
  expect(screen.getByText('Review: 3 drafts').className).toMatch(/strong/)
  expect(screen.getByText('Shadow').className).not.toMatch(/strong/)
})

test('aligned normal sits in an invisible chip with icon space, still without an icon', () => {
  const { container } = render(<StatusChip status="normal" label="Within scope" align />)
  const chip = container.querySelector('[data-status="normal"]')!
  expect(chip.className).toMatch(/invisible/)
  expect(chip.querySelector('svg')).toBeNull()
})
