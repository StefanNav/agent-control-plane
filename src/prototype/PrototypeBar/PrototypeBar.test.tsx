import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { useDemo } from '../../store'
import { FIXTURE_STORY } from '../../test/storyFixture'
import { useStory } from '../stories/progress'
import { PrototypeBar } from './PrototypeBar'

function Where() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname + location.search}</output>
}

const renderBar = () =>
  render(
    <MemoryRouter initialEntries={['/inventory']}>
      <PrototypeBar stories={[FIXTURE_STORY]} />
      <Where />
    </MemoryRouter>,
  )

afterEach(() => {
  useStory.setState({ progress: null })
  useDemo.getState().reset()
})

test('Stories lists each story with its person and length, and starts one', async () => {
  useDemo.getState().setPersona('jordan')
  renderBar()
  await userEvent.click(screen.getByRole('button', { name: /^Stories/ }))
  const item = screen.getByRole('menuitem', { name: /Fixture story/ })
  expect(item).toHaveTextContent('Marcus · Agent owner · 3 steps')
  expect(screen.queryByRole('menuitem', { name: 'Exit story' })).not.toBeInTheDocument()
  await userEvent.click(item)
  expect(useStory.getState().progress).toEqual({ storyId: 'marcus', step: 1, loaded: 'baseline' })
  expect(useDemo.getState().personaId).toBe('marcus')
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent('/operations?story=marcus&step=1')
})

test('while a story runs, Stories offers Exit story', async () => {
  useStory.setState({ progress: { storyId: 'marcus', step: 2, loaded: 'baseline' } })
  renderBar()
  await userEvent.click(screen.getByRole('button', { name: /^Stories/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Exit story' }))
  expect(useStory.getState().progress).toBeNull()
})

test('Reset demo also ends the story', async () => {
  useStory.setState({ progress: { storyId: 'marcus', step: 2, loaded: 'baseline' } })
  renderBar()
  await userEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
  expect(useStory.getState().progress).toBeNull()
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(/^\/operations\/divisions\/medications$/)
})
