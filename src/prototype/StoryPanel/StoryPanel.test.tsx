import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { useDemo } from '../../store'
import { FIXTURE_STORY } from '../../test/storyFixture'
import { useStory } from '../stories/progress'
import type { StoryProgress } from '../stories/types'
import { StoryPanel } from './StoryPanel'

const stories = [FIXTURE_STORY]

function Where() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname + location.search}</output>
}

function show(step: number, at: string) {
  const progress: StoryProgress = { storyId: 'marcus', step, loaded: 'baseline' }
  useStory.setState({ progress })
  return render(
    <MemoryRouter initialEntries={[at]}>
      <StoryPanel stories={stories} />
      <Where />
    </MemoryRouter>,
  )
}

afterEach(() => {
  useStory.setState({ progress: null })
  useDemo.getState().reset()
})

test('shows the story, the step and its narration', () => {
  show(2, '/operations/agents/med-rec?tab=scorecard&story=marcus&step=2')
  const panel = screen.getByRole('complementary', { name: 'Story' })
  expect(panel).toHaveTextContent('Fixture story')
  expect(panel).toHaveTextContent('Step 2 of 3')
  expect(screen.getByRole('heading', { name: 'Two' })).toBeInTheDocument()
  expect(panel).toHaveTextContent('First. Second.')
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  expect(screen.queryByText(/You’ve left this step/)).not.toBeInTheDocument()
})

test('step 1 has no Back', () => {
  show(1, '/operations?story=marcus&step=1')
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
})

test('the last step finishes and says where to go next', () => {
  show(3, '/operations/agents/med-rec?story=marcus&step=3')
  expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
  expect(
    screen.getByText(
      'End of Marcus’s story. Keep exploring as Marcus, or pick another from Stories.',
    ),
  ).toBeInTheDocument()
})

test('off the step’s screen it offers the way back', async () => {
  show(2, '/inventory?story=marcus&step=2')
  expect(screen.getByText(/You’ve left this step\./)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Return to it' }))
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
    '/operations/agents/med-rec?tab=scorecard&story=marcus&step=2',
  )
})

test('Next opens the next step and goes to its screen', async () => {
  show(1, '/operations?story=marcus&step=1')
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(useStory.getState().progress).toEqual({ storyId: 'marcus', step: 2, loaded: 'baseline' })
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
    '/operations/agents/med-rec?tab=scorecard&story=marcus&step=2',
  )
})

test('Hide folds it to one line; Show brings it back', async () => {
  show(2, '/operations/agents/med-rec?tab=scorecard&story=marcus&step=2')
  await userEvent.click(screen.getByRole('button', { name: 'Hide' }))
  const panel = screen.getByRole('complementary', { name: 'Story' })
  expect(panel).toHaveTextContent('Step 2 of 3')
  expect(panel).not.toHaveTextContent('First. Second.')
  await userEvent.click(screen.getByRole('button', { name: 'Show' }))
  expect(screen.getByRole('heading', { name: 'Two' })).toBeInTheDocument()
})

test('the step’s target gets the ink outline; a step without one gets none', () => {
  const { container, unmount } = show(
    2,
    '/operations/agents/med-rec?tab=scorecard&story=marcus&step=2',
  )
  const rule = container.querySelector('style')?.textContent ?? ''
  expect(rule).toContain('[data-story-target="agent-summary"]')
  expect(rule).toContain('outline: 2px solid var(--cs-ink)')
  unmount()
  const again = show(1, '/operations?story=marcus&step=1')
  expect(again.container.querySelector('style')).toBeNull()
})

test('Exit clears the story and its params, and stays on the screen', async () => {
  show(2, '/operations/agents/med-rec?tab=scorecard&story=marcus&step=2')
  await userEvent.click(screen.getByRole('button', { name: 'Exit' }))
  expect(useStory.getState().progress).toBeNull()
  expect(screen.queryByRole('complementary', { name: 'Story' })).not.toBeInTheDocument()
  expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(
    /^\/operations\/agents\/med-rec\?tab=scorecard$/,
  )
})
