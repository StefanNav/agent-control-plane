import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useDemo } from '../../store'
import { PERSONAS } from '../personas'
import { STORIES, stepHref, storyById } from '../stories'
import { useStory } from '../stories/progress'
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

afterEach(() => {
  useStory.setState({ progress: null })
  useDemo.getState().reset()
})

test('says what the product is, and offers seven stories in persona order', () => {
  show()
  expect(screen.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeInTheDocument()
  expect(screen.getByText(/Signal’s AI management system \(AIMS\)/)).toBeInTheDocument()
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
  expect(screen.getByRole('link', { name: 'About this prototype' })).toHaveAttribute(
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
  expect(useStory.getState().progress).toBeNull()
  expect(useDemo.getState().personaId).toBe('marcus')
  expect(useDemo.getState().exceptions.find((e) => e.id === 'exc-5530')!.claimedAt).toBeDefined()
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
    /^\/operations\/divisions\/medications$/,
  )
})
