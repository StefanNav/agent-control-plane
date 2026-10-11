import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useDemo } from '../../store'
import { PERSONAS } from '../personas'
import { STORIES, stepHref, storyById } from '../stories'
import { useStory } from '../stories/progress'
import { MANIFEST } from '../tour/manifest'
import { CHAPTERS } from '../tour/script'
import { createTourRuntime, setTourRuntime, type TourRuntime } from '../tour/useTour'
import { Landing } from './Landing'

function Where() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname + location.search}</output>
}

const show = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={null} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )

let runtime: TourRuntime

beforeEach(() => {
  runtime = createTourRuntime(CHAPTERS, MANIFEST, { voice: 'silent' })
  setTourRuntime(runtime)
})

afterEach(() => {
  runtime.player.getState().exit()
  setTourRuntime(null)
  useStory.setState({ progress: null, exited: false })
  useDemo.getState().reset()
})

/** The tour's length as the button says it: whole minutes. */
const tourMinutes = () => Math.max(1, Math.round(runtime.timeline.total / 60_000))

/** Show the landing over a tour that runs for `total` ms. */
function showWithLength(total: number) {
  setTourRuntime({ ...runtime, timeline: { ...runtime.timeline, total } })
  show()
}

test('says what the product is, and offers seven stories in persona order', () => {
  show()
  expect(screen.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeInTheDocument()
  expect(screen.getByText(/Attune’s AI management system \(AIMS\)/)).toBeInTheDocument()
  const follow = screen.getAllByRole('button', { name: /^Follow .+’s story →$/ })
  expect(follow.map((b) => b.textContent)).toEqual(
    PERSONAS.map((p) => `Follow ${p.name}’s story →`),
  )
  expect(screen.getByRole('button', { name: 'Follow Dr. Lee’s story →' })).toBeInTheDocument()
  const card = screen.getByRole('article', { name: 'Priya' })
  expect(within(card).getByText('Clinical sponsor')).toBeInTheDocument()
  expect(within(card).getByText(storyById('priya')!.title)).toBeInTheDocument()
  expect(within(card).getByText(storyById('priya')!.summary)).toBeInTheDocument()
  expect(within(card).getByText(`${storyById('priya')!.steps.length} steps`)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'About this work' })).toHaveAttribute(
    'href',
    '/about',
  )
  expect(STORIES).toHaveLength(7)
})

test('following a story starts it as that person, on its first screen', async () => {
  show()
  await userEvent.click(screen.getByRole('button', { name: 'Follow Priya’s story →' }))
  expect(useStory.getState().progress).toEqual({
    storyId: 'priya',
    step: 1,
    loaded: 'shadow-day-21',
  })
  expect(useDemo.getState().personaId).toBe('priya')
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
    stepHref(storyById('priya')!, 1),
  )
})

test('Explore freely leaves any story and lands on Marcus’s division, keeping the data', async () => {
  useStory.setState({ progress: { storyId: 'dana', step: 2, loaded: 'onboarding-intake' } })
  expect(useDemo.getState().claimException('exc-5530').ok).toBe(true)
  useDemo.getState().setPersona('jordan')
  show()
  await userEvent.click(screen.getByRole('button', { name: 'Explore freely' }))
  expect(useStory.getState()).toMatchObject({ progress: null, exited: true })
  expect(useDemo.getState().personaId).toBe('marcus')
  expect(useDemo.getState().exceptions.find((e) => e.id === 'exc-5530')!.claimedAt).toBeDefined()
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
    /^\/operations\/divisions\/medications$/,
  )
})

test('Play the tour is the page’s one primary button, labelled with the tour’s length in whole minutes', () => {
  show()
  const play = screen.getByRole('button', { name: `Play the tour · ${tourMinutes()} min` })
  expect(play.className).toMatch(/primary/)
  expect(tourMinutes()).toBeGreaterThan(0)
  const primary = screen
    .getAllByRole('button')
    .filter((b) => /primary/.test(b.className))
    .map((b) => b.textContent)
  expect(primary).toEqual([`Play the tour · ${tourMinutes()} min`])
  expect(screen.getByRole('button', { name: 'Explore freely' }).className).toMatch(/secondary/)
})

test('one line under the button says what the tour covers', () => {
  show()
  expect(
    screen.getByText(
      'A narrated walkthrough of one agent’s life: the problem, the product, three key decisions and how I’d validate it.',
    ),
  ).toBeInTheDocument()
})

test('credits Stefan as the narrator, with his photo as decoration beside it', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/']}>
      <Landing />
    </MemoryRouter>,
  )
  expect(screen.getByText('Narrated by Stefan')).toBeInTheDocument()
  const photo = container.querySelector('img')
  expect(photo).toHaveAttribute('src', '/tour/stefan.jpg')
  expect(photo).toHaveAttribute('alt', '')
})

test('the Marcus hint sits directly under Explore freely, and describes it', () => {
  show()
  const explore = screen.getByRole('button', { name: 'Explore freely' })
  const hint = screen.getByText('Explore freely starts as Marcus, the agent owner.')
  expect(explore).toHaveAccessibleDescription('Explore freely starts as Marcus, the agent owner.')
  // The line right under the row that holds the button.
  expect(explore.parentElement!.nextElementSibling).toBe(hint)
})

test('the button says the tour’s length in whole minutes, and never 0', () => {
  showWithLength((7 * 60 + 2) * 1000)
  expect(screen.getByRole('button', { name: 'Play the tour · 7 min' })).toBeInTheDocument()
})

test('a tour of 20 seconds says 1 min', () => {
  showWithLength(20_000)
  expect(screen.getByRole('button', { name: 'Play the tour · 1 min' })).toBeInTheDocument()
})

test('Play the tour primes the voice inside the click, then opens the tour at chapter 0, playing', async () => {
  const statusAtUnlock: string[] = []
  vi.spyOn(runtime.voice, 'unlock').mockImplementation(() => {
    statusAtUnlock.push(runtime.player.getState().status)
  })
  show()
  expect(runtime.player.getState().status).toBe('idle')
  await userEvent.click(screen.getByRole('button', { name: /^Play the tour/ }))
  expect(statusAtUnlock).toEqual(['idle'])
  expect(runtime.player.getState()).toMatchObject({ status: 'playing', pos: { chapter: 0 } })
})

test('Play the tour leaves any story in progress', async () => {
  useStory.setState({ progress: { storyId: 'dana', step: 2, loaded: 'onboarding-intake' } })
  show()
  await userEvent.click(screen.getByRole('button', { name: /^Play the tour/ }))
  expect(useStory.getState().progress).toBeNull()
  expect(runtime.player.getState().status).toBe('playing')
})

test('the story cards sit under “Or explore on your own”, still the targets the people chapter outlines', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/']}>
      <Landing />
    </MemoryRouter>,
  )
  const heading = screen.getByRole('heading', { level: 2, name: 'Or explore on your own' })
  expect(screen.queryByText('Follow one person’s story')).not.toBeInTheDocument()
  const section = screen.getByRole('region', { name: 'Or explore on your own' })
  expect(section).toContainElement(heading)
  expect(within(section).getAllByRole('article')).toHaveLength(STORIES.length)
  expect(container.querySelector('[data-story-target="people-cards"]')).not.toBeNull()
  for (const persona of PERSONAS)
    expect(container.querySelector(`[data-story-target="people-${persona.id}"]`)).not.toBeNull()
})
