import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardContent } from './cards'
import { TourCard } from './TourCard'

function show(
  content: CardContent,
  { side = 'right', playing = false }: { side?: 'left' | 'right'; playing?: boolean } = {},
) {
  const onPause = vi.fn()
  render(<TourCard content={content} side={side} playing={playing} onPause={onPause} />)
  return { onPause, card: () => screen.getByRole('complementary', { name: 'Tour card' }) }
}

test('a decision card: which of three, the options weighed with the chosen one marked, and the trade-off', () => {
  const { card } = show({
    kind: 'decision',
    n: 2,
    title: 'Where a flag is raised',
    options: [
      { label: 'In the control plane' },
      { label: 'In the EHR', chosen: true },
      { label: 'By email' },
    ],
    tradeoff: 'Two places to look.',
  })
  expect(card()).toHaveTextContent('Decision 2 of 3')
  expect(screen.getByRole('heading', { name: 'Where a flag is raised' })).toBeInTheDocument()
  const options = within(screen.getByRole('list')).getAllByRole('listitem')
  expect(options.map((o) => o.textContent)).toEqual([
    'In the control plane',
    'In the EHRChosen',
    'By email',
  ])
  expect(card()).toHaveTextContent('Trade-off: Two places to look.')
})

test('an excerpt card: the quote and its source, as text', () => {
  show({
    kind: 'excerpt',
    quote: 'Reviewers caught one bad action in five.',
    source: 'Research notes · Chen et al. 2026, preprint',
  })
  expect(
    screen.getByText('Reviewers caught one bad action in five.').closest('blockquote'),
  ).not.toBeNull()
  expect(screen.getByText('Research notes · Chen et al. 2026, preprint')).toBeInTheDocument()
})

test('a story card: the epic, its story and one acceptance criterion', () => {
  const { card } = show({
    kind: 'story',
    epic: 'E1 · Onboarding',
    story: 'As an agent owner, I want to register an agent.',
    criterion: 'The record names a technical owner.',
  })
  expect(card()).toHaveTextContent('E1 · Onboarding')
  expect(card()).toHaveTextContent('As an agent owner, I want to register an agent.')
  expect(card()).toHaveTextContent('Acceptance criterion')
  expect(card()).toHaveTextContent('The record names a technical owner.')
})

const IMAGE: CardContent = {
  kind: 'image',
  src: '/tour/artifacts/board-01.jpg',
  alt: 'An early hospital board',
  width: 1600,
  height: 1000,
  caption: 'Direction A: the ledger',
}

test('an image card: a thumbnail and its caption; while paused the thumbnail opens the full image', async () => {
  const { onPause } = show(IMAGE)
  expect(screen.getByText('Direction A: the ledger')).toBeInTheDocument()
  await userEvent.click(
    screen.getByRole('button', { name: 'An early hospital board, open larger' }),
  )
  expect(onPause).not.toHaveBeenCalled()
  const dialog = screen.getByRole('dialog', { name: 'Direction A: the ledger' })
  expect(within(dialog).getByRole('img', { name: 'An early hospital board' })).toHaveAttribute(
    'src',
    '/tour/artifacts/board-01.jpg',
  )
  await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('while playing, opening the image pauses the tour first', async () => {
  const { onPause } = show(IMAGE, { playing: true })
  await userEvent.click(
    screen.getByRole('button', { name: 'An early hospital board, open larger' }),
  )
  expect(onPause).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('dialog', { name: 'Direction A: the ledger' })).toBeInTheDocument()
})

test('sits on the side it is given', () => {
  const { card } = show(IMAGE, { side: 'left' })
  expect(card()).toHaveAttribute('data-side', 'left')
})
