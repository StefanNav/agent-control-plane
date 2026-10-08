import { render, screen } from '@testing-library/react'
import { WizardSteps } from './WizardSteps'

const STEPS = [
  { id: 'intake', label: '1 · Intake', sub: 'Dana · done 01 Oct', mark: 'done' as const },
  { id: 'job', label: '2 · Job description', sub: 'Marcus · 5 of 7', mark: 'todo' as const },
  { id: 'approval', label: '5 · Sponsor approval', sub: 'Priya', mark: 'locked' as const },
  { id: 'review', label: '6 · Ready for review', sub: 'AIMS Review', mark: 'review' as const },
]

test('current step has aria-current="step"', () => {
  render(<WizardSteps steps={STEPS} current="job" />)
  expect(screen.getByText('2 · Job description').closest('[aria-current]')).toHaveAttribute('aria-current', 'step')
  expect(screen.getByText('1 · Intake').closest('li')).not.toHaveAttribute('aria-current')
})

test('marks: done has a check, locked has a lock', () => {
  render(<WizardSteps steps={STEPS} current="job" />)
  const done = screen.getByText('1 · Intake').closest('li')!
  expect(done.querySelector('path')?.getAttribute('d')).toBe('M2.5 6.2l2.3 2.3 4.7-5')
  const locked = screen.getByText('5 · Sponsor approval').closest('li')!
  expect(locked.querySelector('rect')).not.toBeNull()
})

test('done and review marks are 14px; locked is 12px (as drawn in E1)', () => {
  render(<WizardSteps steps={STEPS} current="job" />)
  const svgSize = (label: string) => screen.getByText(label).closest('li')!.querySelector('svg')?.getAttribute('width')
  expect(svgSize('1 · Intake')).toBe('14')
  expect(svgSize('6 · Ready for review')).toBe('14')
  expect(svgSize('5 · Sponsor approval')).toBe('12')
})

test('a step not started yet has no mark and a muted label', () => {
  render(
    <WizardSteps
      current="intake"
      steps={[
        { id: 'intake', label: '1 · Intake', sub: 'Dana · ready to start', mark: 'todo' },
        { id: 'job', label: '2 · Job description', sub: 'Marcus · after start', mark: 'none' },
      ]}
    />,
  )
  const step = screen.getByText('2 · Job description').closest('li')!
  expect(step.querySelector('svg')).toBeNull()
  expect(screen.getByText('2 · Job description').className).toMatch(/muted/)
})
