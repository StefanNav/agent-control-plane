import { createMemoryStorage } from '../../store/storage'
import { FIXTURE_STORY } from '../../test/storyFixture'
import { createStoryStore } from './progress'

const stories = [FIXTURE_STORY]
const saved = (state: unknown) => {
  const storage = createMemoryStorage()
  storage.setItem('acp-story', JSON.stringify({ version: 1, state: { progress: state } }))
  return createStoryStore(storage, stories).getState().progress
}

test('progress persists across store instances', () => {
  const storage = createMemoryStorage()
  createStoryStore(storage, stories)
    .getState()
    .setProgress({ storyId: 'marcus', step: 2, loaded: 'baseline' })
  expect(createStoryStore(storage, stories).getState().progress).toEqual({
    storyId: 'marcus',
    step: 2,
    loaded: 'baseline',
  })
})

test('clearing progress persists', () => {
  const storage = createMemoryStorage()
  const store = createStoryStore(storage, stories)
  store.getState().setProgress({ storyId: 'marcus', step: 2, loaded: 'baseline' })
  store.getState().setProgress(null)
  expect(createStoryStore(storage, stories).getState().progress).toBeNull()
})

describe('saved progress from an older build is dropped (Review focus 4)', () => {
  test('an unknown story', () => {
    expect(saved({ storyId: 'nope', step: 1, loaded: 'baseline' })).toBeNull()
  })
  test('a step past the end', () => {
    expect(saved({ storyId: 'marcus', step: 7, loaded: 'baseline' })).toBeNull()
  })
  test('a removed scenario', () => {
    expect(saved({ storyId: 'marcus', step: 1, loaded: 'removed-scenario' })).toBeNull()
  })
  test('corrupt JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem('acp-story', '{not json')
    expect(createStoryStore(storage, stories).getState().progress).toBeNull()
  })
})

test('Exit marks the story as left for this page only; following one again clears it', () => {
  const storage = createMemoryStorage()
  const store = createStoryStore(storage, stories)
  store.getState().setProgress({ storyId: 'marcus', step: 2, loaded: 'baseline' })
  store.getState().exit()
  expect(store.getState()).toMatchObject({ progress: null, exited: true })
  // Not saved: a new page load (a shared link, a refresh) starts unexited.
  expect(createStoryStore(storage, stories).getState().exited).toBe(false)
  store.getState().setProgress({ storyId: 'marcus', step: 1, loaded: 'baseline' })
  expect(store.getState().exited).toBe(false)
})
