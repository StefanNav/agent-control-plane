import { render, screen } from '@testing-library/react'
import { AutonomyLadder, type LadderStep } from './AutonomyLadder'

const SIGNING: LadderStep[] = [
  { level: 'shadow', state: 'current', caption: 'Current · since 15 Sep', evidence: '21 days · 1,204 cases' },
  { level: 'draft', state: 'proposed', caption: 'Proposed · awaiting Priya', evidence: '2 of 3 targets met' },
  { level: 'supervised', state: 'locked', caption: 'Locked · v2', evidence: 'Favourable branches only' },
  { level: 'autonomous', state: 'locked', caption: 'Locked', evidence: 'Administrative tasks only' },
]

test('compact ladder is four segments in order', () => {
  const { container } = render(<AutonomyLadder variant="compact" steps={SIGNING} />)
  expect([...container.querySelectorAll('[data-state]')].map((n) => n.getAttribute('data-state'))).toEqual([
    'current',
    'proposed',
    'locked',
    'locked',
  ])
})

test('full ladder names each level and marks the proposal and locks', () => {
  const { container } = render(<AutonomyLadder variant="full" steps={SIGNING} />)
  expect(screen.getByText('Draft').closest('[data-state]')).toHaveAttribute('data-state', 'proposed')
  const locked = screen.getByText('Supervised').closest('[data-state]')!
  expect(locked.querySelector('rect')).not.toBeNull()
  expect(container.textContent).toContain('2 of 3 targets met')
})
