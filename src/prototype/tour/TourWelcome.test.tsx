import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FIXTURE_CHAPTERS } from './fixtures'
import { TourWelcome, type TourWelcomeProps } from './TourWelcome'

const BODY =
  'A working prototype of how a hospital brings on and supervises its AI agents. Press Play and I’ll walk you through it in my own voice, about 7 minutes, while it clicks through the real screens. Pause or take over at any time.'

function setup(overrides: Partial<TourWelcomeProps> = {}) {
  const onDismiss = vi.fn()
  const props: TourWelcomeProps = {
    open: true,
    bodyId: 'welcome-body',
    chapters: FIXTURE_CHAPTERS,
    chapter: 0,
    minutes: 7,
    onDismiss,
    ...overrides,
  }
  const view = render(<TourWelcome {...props} />)
  const rerender = (next: Partial<TourWelcomeProps>) =>
    view.rerender(<TourWelcome {...props} {...next} />)
  return {
    onDismiss,
    rerender,
    region: () => screen.queryByRole('region', { name: 'Welcome to Agent Control Plane' }),
    layer: () => document.querySelector('[data-tour="welcome"]'),
    scrim: () => document.querySelector<HTMLElement>('[data-tour="welcome"] [data-scrim]')!,
  }
}

/** A Play tour button where the bar puts it, measured as `rect` until changed. */
function playAt(rect: { left: number; width: number }) {
  const play = document.createElement('button')
  play.dataset.tour = 'play'
  document.body.append(play)
  onTestFinished(() => play.remove())
  const box = { ...rect }
  play.getBoundingClientRect = () =>
    DOMRect.fromRect({ x: box.left, y: 852, width: box.width, height: 36 })
  return {
    move(next: { left: number; width: number }) {
      Object.assign(box, next)
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

test('a region named by its heading, not a dialog (Ruling 45), with the photo as decoration', () => {
  const { region } = setup()
  expect(region()).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(
    screen.getByRole('heading', { level: 2, name: 'Welcome to Agent Control Plane' }),
  ).toBeInTheDocument()
  const photo = region()!.querySelector('img')!
  expect(photo).toHaveAttribute('src', '/tour/stefan.jpg')
  expect(photo).toHaveAttribute('alt', '')
  expect(photo).toHaveAttribute('width', '40')
  expect(photo).toHaveAttribute('height', '40')
})

test('its body, under the id Play tour is described by, says how long the tour runs', () => {
  setup({ minutes: 7 })
  expect(document.getElementById('welcome-body')).toHaveTextContent(BODY, {
    normalizeWhitespace: true,
  })
})

test('it is tour UI: inside it, nothing counts as using the page', () => {
  const { layer } = setup()
  expect(layer()).toBeInTheDocument()
})

test('a link that starts after the first chapter says where it starts', () => {
  setup({ chapter: 1 })
  expect(screen.getByText('You’re starting at chapter 2 of 2: Decision 1.')).toBeInTheDocument()
  expect(document.getElementById('welcome-body')).toHaveTextContent(
    'You’re starting at chapter 2 of 2: Decision 1.',
  )
})

test('at the first chapter it says nothing about where it starts', () => {
  setup({ chapter: 0 })
  expect(screen.queryByText(/You’re starting at chapter/)).not.toBeInTheDocument()
})

test('it has no Play button of its own: Look around first is its one action', () => {
  const { region } = setup()
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Look around first'])
  expect(region()).not.toHaveTextContent('Play tour')
})

test('Look around first dismisses it, handing focus to Play tour, which it points at', async () => {
  playAt({ left: 24, width: 104 })
  const { onDismiss } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Look around first' }))
  expect(onDismiss).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[data-tour="play"]')).toHaveFocus()
})

test('Escape dismisses it, unless something else has used the key (a menu closing)', () => {
  const { onDismiss } = setup()
  const menu = document.createElement('div')
  menu.addEventListener('keydown', (event) => event.preventDefault())
  document.body.append(menu)
  onTestFinished(() => menu.remove())
  fireEvent.keyDown(menu, { key: 'Escape' })
  expect(onDismiss).not.toHaveBeenCalled()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(onDismiss).toHaveBeenCalledTimes(1)
})

test('a click on the dimmed page dismisses it, keeping focus where it was and the click to itself', async () => {
  const { onDismiss, scrim } = setup()
  const play = document.createElement('button')
  document.body.append(play)
  onTestFinished(() => play.remove())
  play.focus()
  const clicks = vi.fn()
  document.addEventListener('click', clicks)
  onTestFinished(() => document.removeEventListener('click', clicks))
  await userEvent.click(scrim())
  expect(onDismiss).toHaveBeenCalledTimes(1)
  expect(play).toHaveFocus()
  expect(clicks).not.toHaveBeenCalled()
})

test('closing, it leaves the accessibility tree at once and the page after its fade', () => {
  vi.useFakeTimers()
  const { region, layer, rerender, onDismiss } = setup()
  rerender({ open: false })
  expect(region()).not.toBeInTheDocument()
  expect(layer()).toHaveAttribute('data-state', 'closing')
  expect(layer()).toHaveAttribute('inert')
  // Fading, it no longer answers Escape.
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(200))
  expect(layer()).not.toBeInTheDocument()
})

test('closed from the start, it renders nothing', () => {
  const { layer } = setup({ open: false })
  expect(layer()).not.toBeInTheDocument()
})

test('its pointer aims at the middle of Play tour, measured, and again when the window resizes', () => {
  const play = playAt({ left: 24, width: 104 })
  setup()
  const card = screen.getByRole('region', { name: 'Welcome to Agent Control Plane' })
  const notch = document.querySelector<HTMLElement>('[data-tour="welcome"] [data-notch]')!
  // The card lines up with the button; its notch, placed from inside the card's 1 px border, sits
  // under the button's middle (24 + 1 + 51 = 76).
  expect(card.style.left).toBe('24px')
  expect(notch.style.left).toBe('51px')
  play.move({ left: 200, width: 120 })
  act(() => void window.dispatchEvent(new Event('resize')))
  expect(card.style.left).toBe('200px')
  expect(notch.style.left).toBe('59px')
})

test('the card stays inside the window, its pointer still on the button', () => {
  // jsdom's window is 1024 wide: a 360 px card fits up to 1024 − 16 − 360 = 648.
  playAt({ left: 900, width: 104 })
  setup()
  const card = screen.getByRole('region', { name: 'Welcome to Agent Control Plane' })
  const notch = document.querySelector<HTMLElement>('[data-tour="welcome"] [data-notch]')!
  expect(card.style.left).toBe('648px')
  expect(notch.style.left).toBe('303px')
})
