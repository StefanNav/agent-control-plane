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

const STEPPED: LadderStep[] = [
  { level: 'shadow', state: 'current' },
  { level: 'draft', state: 'held' },
  { level: 'supervised', state: 'available' },
  { level: 'autonomous', state: 'locked' },
]

test('a held level (until a step-down) is its own state, and the label says so (15a)', () => {
  const { container } = render(<AutonomyLadder variant="compact" steps={STEPPED} />)
  expect(container.querySelector('[data-state="held"]')).not.toBeNull()
  expect(screen.getByRole('img')).toHaveAccessibleName('Shadow current, Draft held')
})

test('a branch locked by policy still has a name (14a)', () => {
  const locked = STEPPED.map((step) => ({ ...step, state: 'locked' as const }))
  render(<AutonomyLadder variant="compact" size="wide" steps={locked} />)
  expect(screen.getByRole('img')).toHaveAccessibleName('Locked by policy')
})

test('the wide ladder names the levels; current and proposed in bold, locked with a lock (14a)', () => {
  const steps: LadderStep[] = [
    { level: 'shadow', state: 'passed' },
    { level: 'draft', state: 'current' },
    { level: 'supervised', state: 'proposed' },
    { level: 'autonomous', state: 'locked' },
  ]
  const { container } = render(<AutonomyLadder variant="compact" size="wide" labels steps={steps} />)
  const labels = [...container.querySelectorAll('[data-label]')]
  expect(labels.map((l) => l.textContent)).toEqual(['Shadow', 'Draft', 'Supervised', 'Autonomous'])
  expect(labels.map((l) => l.getAttribute('data-strong'))).toEqual(['false', 'true', 'true', 'false'])
  expect(labels[3]!.querySelector('svg')).not.toBeNull()
  expect(labels[0]!.querySelector('svg')).toBeNull()
})

test('without labels the wide ladder is just its four segments', () => {
  const { container } = render(<AutonomyLadder variant="compact" size="wide" steps={STEPPED} />)
  expect(container.querySelectorAll('[data-label]')).toHaveLength(0)
  expect(container.querySelectorAll('[data-state]')).toHaveLength(4)
})

test('the legend lists 14a’s six states', async () => {
  const { LadderLegend } = await import('./AutonomyLadder')
  render(<LadderLegend />)
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    'Granted · current level in bold',
    'Granted before',
    'Held until a step-down',
    'Proposed · needs signatures',
    'Allowed, not requested',
    'Locked by policy',
  ])
})
