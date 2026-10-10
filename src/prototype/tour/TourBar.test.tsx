import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildTimeline } from './engine'
import { FIXTURE_CHAPTERS } from './fixtures'
import type { TourRate, TourStatus } from './player'
import { TourBar, type TourBarProps } from './TourBar'

const timeline = buildTimeline(FIXTURE_CHAPTERS, {})

function setup(overrides: Partial<TourBarProps> = {}) {
  const calls: string[] = []
  const record = (name: string) => vi.fn(() => void calls.push(name))
  const controls = {
    play: record('play'),
    pause: record('pause'),
    resume: record('resume'),
    jump: vi.fn((chapter: number) => void calls.push(`jump:${chapter}`)),
    setRate: vi.fn((rate: TourRate) => void calls.push(`rate:${rate}`)),
    toggleCaptions: record('captions'),
    exit: record('exit'),
  }
  const props: TourBarProps = {
    chapters: FIXTURE_CHAPTERS,
    timeline,
    status: 'paused',
    pos: { chapter: 0, step: 0, beat: 0 },
    rate: 1,
    captions: true,
    elapsed: 0,
    skipped: 0,
    controls,
    unlock: record('unlock'),
    ...overrides,
  }
  const view = render(<TourBar {...props} />)
  const rerender = (next: Partial<TourBarProps>) => view.rerender(<TourBar {...props} {...next} />)
  return {
    calls,
    controls,
    rerender,
    bar: () => screen.getByRole('complementary', { name: 'Tour' }),
  }
}

test('is an aside named Tour that stays usable beside a dialog', () => {
  const { bar } = setup({ skipped: 2 })
  expect(bar()).toHaveAttribute('data-modal-companion')
  expect(bar()).toHaveAttribute('data-skipped', '2')
})

test('paused, it offers Play tour, which unlocks the audio inside the click before playing', async () => {
  const { calls } = setup({ status: 'paused' })
  expect(screen.queryByRole('button', { name: 'Pause tour' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Play tour' }))
  expect(calls).toEqual(['unlock', 'play'])
})

test('playing, it offers Pause tour', async () => {
  const { calls } = setup({ status: 'playing' })
  expect(screen.queryByRole('button', { name: 'Play tour' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Pause tour' }))
  expect(calls).toEqual(['pause'])
})

test('driving, it says so and offers Resume tour, which unlocks the audio first', async () => {
  const { calls } = setup({ status: 'driving' })
  expect(screen.getByText('Paused. You’re driving.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Play tour' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Pause tour' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Resume tour' }))
  expect(calls).toEqual(['unlock', 'resume'])
})

test.each<TourStatus>(['playing', 'paused'])(
  '%s, it does not say the visitor is driving',
  (status) => {
    setup({ status: status as TourBarProps['status'] })
    expect(screen.queryByText('Paused. You’re driving.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resume tour' })).not.toBeInTheDocument()
  },
)

test('one progress segment per chapter, labelled, each jumping to its chapter (Ruling 6)', async () => {
  const { calls } = setup()
  const segments = within(screen.getByRole('group', { name: 'Chapters' })).getAllByRole('button')
  expect(segments.map((s) => s.getAttribute('aria-label'))).toEqual([
    'Go to chapter 1: Why this problem',
    'Go to chapter 2: Decision 1',
  ])
  await userEvent.click(segments[1]!)
  expect(calls).toEqual(['jump:1'])
})

test('the segments fill to the current point', () => {
  // 15 s in: chapter 1 (14 s long) is done, chapter 2 (6.4 s) is 1 s in.
  setup({ pos: { chapter: 1, step: 0, beat: 0 }, elapsed: 15_000 })
  const fills = within(screen.getByRole('group', { name: 'Chapters' }))
    .getAllByRole('button')
    .map((s) => (s.firstElementChild as HTMLElement).style.width)
  expect(fills).toEqual(['100%', '15.625%'])
})

test('shows elapsed and total time as m:ss', () => {
  setup({ elapsed: 15_400 })
  expect(screen.getByText('0:15 / 0:20')).toBeInTheDocument()
})

test('the chapter menu shows the current chapter and lists every chapter with its start, decisions marked', async () => {
  const { calls } = setup({ pos: { chapter: 0, step: 1, beat: 0 } })
  const trigger = screen.getByRole('button', { name: '1 · Why this problem' })
  expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
  await userEvent.click(trigger)
  const items = screen.getAllByRole('menuitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Why this problem')
  expect(items[0]).toHaveTextContent('0:00')
  expect(items[0]).not.toHaveTextContent('Decision')
  expect(items[1]).toHaveTextContent('Decision 1')
  expect(items[1]).toHaveTextContent('0:14')
  await userEvent.click(items[1]!)
  expect(calls).toEqual(['jump:1'])
})

test('speed cycles 1× → 1.25× → 1.5× → 1×', async () => {
  const { calls, rerender } = setup({ rate: 1 })
  await userEvent.click(screen.getByRole('button', { name: 'Speed 1×' }))
  rerender({ rate: 1.25 })
  await userEvent.click(screen.getByRole('button', { name: 'Speed 1.25×' }))
  rerender({ rate: 1.5 })
  await userEvent.click(screen.getByRole('button', { name: 'Speed 1.5×' }))
  expect(calls).toEqual(['rate:1.25', 'rate:1.5', 'rate:1'])
})

test('captions show the sentence being spoken; the toggle hides the caption line', async () => {
  const { calls, rerender } = setup({ pos: { chapter: 0, step: 0, beat: 1 } })
  const toggle = screen.getByRole('button', { name: 'Captions' })
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Nobody can say who owns one.')).toBeInTheDocument()
  await userEvent.click(toggle)
  expect(calls).toEqual(['captions'])
  rerender({ pos: { chapter: 0, step: 0, beat: 1 }, captions: false })
  expect(screen.getByRole('button', { name: 'Captions' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.queryByText('Nobody can say who owns one.')).not.toBeInTheDocument()
})

test('Exit tour exits', async () => {
  const { calls } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
  expect(calls).toEqual(['exit'])
})

test('a status region names the chapter, so a screen reader hears each new one', () => {
  const { rerender } = setup()
  expect(screen.getByRole('status')).toHaveTextContent('Chapter 1: Why this problem')
  rerender({ pos: { chapter: 1, step: 0, beat: 0 } })
  expect(screen.getByRole('status')).toHaveTextContent('Chapter 2: Decision 1')
})
