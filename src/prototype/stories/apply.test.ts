import { buildScenario } from '../../data/scenarios'
import { createDemoStore, dataOf } from '../../store'
import { createMemoryStorage } from '../../store/storage'
import { FIXTURE_STORY } from '../../test/storyFixture'
import { applyStep } from './apply'
import { createStoryStore } from './progress'

const stores = () => {
  const demo = createDemoStore(createMemoryStorage())
  const stories = createStoryStore(createMemoryStorage(), [FIXTURE_STORY])
  return { demo, stories }
}

test('starting loads the step’s scenario, switches persona and saves progress', () => {
  const { demo, stories } = stores()
  demo.getState().setPersona('jordan')
  const progress = applyStep(demo, stories, FIXTURE_STORY, 3, true)
  expect(progress).toEqual({ storyId: 'marcus', step: 3, loaded: 'med-rec-paused' })
  expect(stories.getState().progress).toEqual(progress)
  expect(demo.getState().personaId).toBe('marcus')
  expect(dataOf(demo.getState())).toEqual({
    ...buildScenario('med-rec-paused'),
    personaId: 'marcus',
  })
})

test('a step in the same segment changes no data', () => {
  const { demo, stories } = stores()
  applyStep(demo, stories, FIXTURE_STORY, 1, true)
  demo.getState().claimException('exc-5530')
  const before = dataOf(demo.getState())
  applyStep(demo, stories, FIXTURE_STORY, 2, false)
  expect(dataOf(demo.getState())).toEqual(before)
  expect(stories.getState().progress?.step).toBe(2)
})

test('a fresh start reloads even within the same story', () => {
  const { demo, stories } = stores()
  applyStep(demo, stories, FIXTURE_STORY, 1, true)
  demo.getState().claimException('exc-5530')
  applyStep(demo, stories, FIXTURE_STORY, 1, true)
  expect(demo.getState().exceptions.find((e) => e.id === 'exc-5530')!.claimedAt).toBeUndefined()
})
