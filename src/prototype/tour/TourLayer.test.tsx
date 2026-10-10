import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { AppShell } from '../../app/AppShell'
import { useDemo } from '../../store'
import { useStory } from '../stories/progress'
import type { CardContent } from './cards'
import { FIXTURE_CHAPTERS } from './fixtures'
import type { Chapter } from './types'
import { createTourRuntime, setTourRuntime, type TourRuntime } from './useTour'

const CARDS: Record<string, CardContent> = {
  'decision-1': {
    kind: 'decision',
    n: 1,
    title: 'Grant privileges in stages',
    options: [{ label: 'All at once' }, { label: 'In stages', chosen: true }],
    tradeoff: 'Slower to go live.',
  },
  'image-1': {
    kind: 'image',
    src: '/tour/artifacts/board-01.jpg',
    alt: 'An early board',
    caption: 'Direction A',
  },
}

let mounts = 0

/** Any product page: a heading, an outline target, a control and a field. */
function Page() {
  const { pathname } = useLocation()
  useEffect(() => {
    mounts++
  }, [])
  return (
    <>
      <h1>Page {pathname}</h1>
      <div data-story-target="agent-summary">Summary</div>
      <button type="button">Product button</button>
      <div role="row" tabIndex={0} aria-label="Med Rec Agent">
        Med Rec Agent
      </div>
      <label>
        Reason <input />
      </label>
    </>
  )
}

let runtime: TourRuntime

function setup(at: string) {
  runtime = createTourRuntime(FIXTURE_CHAPTERS, {}, { voice: 'silent', cards: CARDS })
  setTourRuntime(runtime)
  const router = createMemoryRouter(
    [{ element: <AppShell shell="app" />, children: [{ path: '*', element: <Page /> }] }],
    { initialEntries: [at] },
  )
  const view = render(<RouterProvider router={router} />)
  const where = () => router.state.location.pathname + router.state.location.search
  return { router, view, where, state: () => runtime.player.getState() }
}

const bar = () => screen.queryByRole('complementary', { name: 'Tour' })

beforeEach(() => {
  mounts = 0
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
})

afterEach(() => {
  act(() => runtime.player.getState().exit())
  setTourRuntime(null)
  useStory.setState({ progress: null, exited: false, focusPanel: false })
  useDemo.getState().reset()
  vi.restoreAllMocks()
})

describe('URL sync', () => {
  test('?tour=<chapter> opens that chapter paused, on its first step, and the URL keeps naming it', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
    expect(screen.getByRole('button', { name: 'Play tour' })).toBeInTheDocument()
    expect(useDemo.getState().personaId).toBe('priya')
  })

  test('an unknown chapter is stripped and nothing opens', async () => {
    const t = setup('/operations?tour=nope')
    await waitFor(() => expect(t.where()).toBe('/operations'))
    expect(t.state().status).toBe('idle')
    expect(bar()).not.toBeInTheDocument()
  })

  test('while open, a product link that drops ?tour gets it back', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    await act(() => t.router.navigate('/inventory'))
    await waitFor(() => expect(t.where()).toBe('/inventory?tour=problem'))
  })

  test('while open, a link to another chapter’s ?tour jumps there (Ruling 16)', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    await act(() => t.router.navigate('/?tour=decisions'))
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
  })

  test('while open, an unknown ?tour is stripped and the current chapter named again', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    await act(() => t.router.navigate('/inventory?tour=nope'))
    await waitFor(() => expect(t.where()).toBe('/inventory?tour=problem'))
    expect(t.state().pos.chapter).toBe(0)
  })

  test('Exit tour drops ?tour and stays on a product route (R5)', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
    await waitFor(() => expect(t.where()).toBe('/operations'))
    expect(t.state().status).toBe('idle')
    expect(bar()).not.toBeInTheDocument()
  })

  test('Exit tour on an interlude lands on the landing page with no ?tour (R5)', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
    await waitFor(() => expect(t.where()).toBe('/'))
    // Give a late URL write the chance to undo it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(t.where()).toBe('/')
  })

  describe('scheduled as in the browser (no act), the URL never races the player’s navigation', () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    let actEnvironment: unknown

    beforeEach(() => {
      actEnvironment = Reflect.get(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
      Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false)
    })

    afterEach(() => {
      Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironment)
    })

    test('jumping to a chapter on another route lands there, naming the new chapter', async () => {
      const t = setup('/?tour=problem')
      await wait(50)
      expect(t.where()).toBe('/tour/problem?tour=problem')
      t.state().jump(1)
      await wait(50)
      expect(t.where()).toBe('/operations?tour=decisions')
    })

    test('a query on the screen it leaves does not follow the tour to the next chapter', async () => {
      const t = setup('/?tour=problem')
      await wait(50)
      // Leave the interlude for a screen with a tab in its URL, then for one without.
      act(() => t.state().next())
      await act(() => t.router.navigate('/operations/agents/med-rec?tab=scorecard'))
      await wait(50)
      expect(t.where()).toBe('/operations/agents/med-rec?tab=scorecard&tour=problem')
      t.state().jump(1)
      await wait(50)
      expect(t.where()).toBe('/operations?tour=decisions')
    })

    test('exiting on an interlude lands on the landing page', async () => {
      const t = setup('/?tour=problem')
      await wait(50)
      t.state().exit()
      await wait(50)
      expect(t.where()).toBe('/')
    })
  })
})

describe('keyboard', () => {
  test('Space on the page body starts playing, and again pauses', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(t.state().status).toBe('playing')
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(t.state().status).toBe('paused')
  })

  test('Space on the main region or its heading toggles too, but not on a button or in a field', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    fireEvent.keyDown(screen.getByRole('main'), { key: ' ' })
    expect(t.state().status).toBe('playing')
    fireEvent.keyDown(screen.getByRole('heading', { level: 1 }), { key: ' ' })
    expect(t.state().status).toBe('paused')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Exit tour' }), { key: ' ' })
    expect(t.state().status).toBe('paused')
    // In a field, Space is typing: the visitor takes over (Ruling 12) rather than playing.
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Reason' }), { key: ' ' })
    expect(t.state().status).toBe('driving')
  })

  test('→ and ← step through the tour from the page or the bar', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(t.state().pos).toEqual({ chapter: 0, step: 1, beat: 0 })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Captions' }), { key: 'ArrowLeft' })
    expect(t.state().pos).toEqual({ chapter: 0, step: 0, beat: 0 })
    // With a modifier it is the browser's (Back, Forward).
    fireEvent.keyDown(document.body, { key: 'ArrowRight', metaKey: true })
    expect(t.state().pos).toEqual({ chapter: 0, step: 0, beat: 0 })
  })
})

describe('taking over (spec §4.5)', () => {
  async function playing() {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    act(() => t.state().play())
    return t
  }

  test('a pointer down on the page while playing hands it over: driving', async () => {
    const t = await playing()
    fireEvent.pointerDown(screen.getByRole('main'))
    expect(t.state().status).toBe('driving')
    expect(screen.getByText('Paused. You’re driving.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })

  test('the prototype bar counts as the page (persona switcher, Reset demo, Stories)', async () => {
    const t = await playing()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Reset demo' }))
    expect(t.state().status).toBe('driving')
  })

  test('a pointer down on the tour bar does not', async () => {
    const t = await playing()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Captions' }))
    expect(t.state().status).toBe('playing')
  })

  test('typing in a field or pressing a key on a control hands it over; other keys do not', async () => {
    const t = await playing()
    fireEvent.keyDown(document.body, { key: 'a' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Product button' }), { key: 'Tab' })
    expect(t.state().status).toBe('playing')
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Reason' }), { key: 'a' })
    expect(t.state().status).toBe('driving')
  })

  test('Enter on a focusable table row (role="row", tabIndex 0) hands it over', async () => {
    const t = await playing()
    fireEvent.keyDown(screen.getByRole('row', { name: 'Med Rec Agent' }), { key: 'Enter' })
    expect(t.state().status).toBe('driving')
  })

  test('Space on a focusable row is the row’s, not play/pause: it hands over instead', async () => {
    const t = await playing()
    fireEvent.keyDown(screen.getByRole('row', { name: 'Med Rec Agent' }), { key: ' ' })
    expect(t.state().status).toBe('driving')
  })

  test('Enter on a product button hands it over too', async () => {
    const t = await playing()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Product button' }), { key: 'Enter' })
    expect(t.state().status).toBe('driving')
  })

  test('while paused, a pointer down on the page hands it over too, so Play restarts the step (Ruling 12)', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    fireEvent.pointerDown(screen.getByRole('main'))
    expect(t.state().status).toBe('driving')
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })

  test('while paused, typing in a field hands it over too (Ruling 12)', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Reason' }), { key: 'a' })
    expect(t.state().status).toBe('driving')
  })

  test('while paused, the tour bar and Space are still the tour’s', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Captions' }))
    expect(t.state().status).toBe('paused')
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(t.state().status).toBe('playing')
  })

  test('the tour’s own enlarged image is not the page: closing it keeps the tour paused', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    act(() => runtime.player.setState({ card: { id: 'image-1', side: 'right' } }))
    await userEvent.click(screen.getByRole('button', { name: 'An early board, open larger' }))
    const dialog = screen.getByRole('dialog', { name: 'Direction A' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(t.state().status).toBe('paused')
  })
})

describe('starting a story closes the tour (Ruling 14)', () => {
  test('from the Stories menu: the tour is closed and the story panel shows its first step', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    await userEvent.click(screen.getByRole('button', { name: 'Stories' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Supervise by exception/ }))
    expect(t.state().status).toBe('idle')
    expect(bar()).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Story' })).toBeInTheDocument()
    await waitFor(() => expect(t.where()).toBe('/operations?story=marcus&step=1'))
    expect(useStory.getState().progress).toMatchObject({ storyId: 'marcus', step: 1 })
  })

  test('scheduled as in the browser (no act), the closing tour leaves the story’s URL alone', async () => {
    const actEnvironment = Reflect.get(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false)
    try {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      // A step with a query of its own, so stale params would show.
      const t = setup('/?tour=problem')
      await wait(50)
      t.state().next()
      await wait(50)
      expect(t.where()).toBe('/operations/agents/med-rec?tour=problem')
      screen.getByRole('button', { name: 'Stories' }).click()
      await wait(50)
      screen.getByRole('menuitem', { name: /Supervise by exception/ }).click()
      await wait(50)
      expect(t.state().status).toBe('idle')
      expect(t.where()).toBe('/operations?story=marcus&step=1')
    } finally {
      Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironment)
    }
  })
})

describe('the tab and the layer going away (Review focus 4)', () => {
  test('hiding the tab pauses the tour', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    act(() => t.state().play())
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(t.state().status).toBe('paused')
    visibility.mockRestore()
  })

  test('unmounting stops the voice and pauses, so nothing plays on with nothing on screen', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    act(() => t.state().play())
    const stop = vi.spyOn(runtime.voice, 'stop')
    t.view.unmount()
    expect(stop).toHaveBeenCalled()
    expect(t.state().status).toBe('paused')
  })
})

describe('the bar’s clock (Ruling 24)', () => {
  /** One chapter of two 2 s lines; the first ends on a long wait, as a line ending on a confirm does. */
  const HELD: Chapter[] = [
    {
      id: 'supervising',
      title: 'Supervise',
      steps: [
        {
          id: 'held',
          route: '/operations',
          scenario: 'baseline',
          persona: 'marcus',
          beats: [
            { id: 'held-1', text: 'One.', after: [{ kind: 'wait', ms: 20_000 }] },
            { id: 'held-2', text: 'Two.' },
          ],
        },
      ],
    },
  ]
  const clip = { ms: 2000, source: 'placeholder', textHash: '0' } as const

  test('holds at the end of a line while its after-actions run, never going back', async () => {
    runtime = createTourRuntime(HELD, { 'held-1': clip, 'held-2': clip }, { voice: 'silent' })
    setTourRuntime(runtime)
    const router = createMemoryRouter(
      [{ element: <AppShell shell="app" />, children: [{ path: '*', element: <Page /> }] }],
      { initialEntries: ['/?tour=supervising'] },
    )
    render(<RouterProvider router={router} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Play tour' }))
    const fill = () =>
      (
        within(screen.getByRole('group', { name: 'Chapters' })).getByRole('button')
          .firstElementChild as HTMLElement
      ).style.width
    // The silent clip lasts 200 ms; then the wait holds the line, and the clock sits at its end.
    await waitFor(() => expect(fill()).toBe('50%'), { timeout: 1500 })
    // Two more ticks of the bar, still in the wait.
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
    expect(fill()).toBe('50%')
    expect(bar()).toHaveTextContent('One.')
  })
})

describe('the shell while the tour is open', () => {
  test('the story panel renders nothing while the tour is open', async () => {
    const t = setup('/operations')
    act(() => useStory.setState({ progress: { storyId: 'marcus', step: 1, loaded: 'baseline' } }))
    expect(screen.getByRole('complementary', { name: 'Story' })).toBeInTheDocument()
    act(() => t.state().open(1, false))
    act(() => useStory.setState({ progress: { storyId: 'marcus', step: 1, loaded: 'baseline' } }))
    expect(screen.queryByRole('complementary', { name: 'Story' })).not.toBeInTheDocument()
    expect(bar()).toBeInTheDocument()
  })

  test('room for the bar under the page, only while the tour is open (R4)', async () => {
    const t = setup('/operations')
    const main = screen.getByRole('main')
    expect(document.querySelector('[data-tour-space]')).toBeNull()
    act(() => t.state().open(1, false))
    expect(main.nextElementSibling).toHaveAttribute('data-tour-space')
    expect(main.nextElementSibling).toHaveStyle({ height: '88px' })
  })

  test('room for the bar under dialogs too, only while the tour is open (R4)', async () => {
    const t = setup('/operations')
    const docked = () => document.documentElement.style.getPropertyValue('--docked-bottom')
    expect(docked()).toBe('')
    act(() => t.state().open(1, false))
    expect(docked()).toBe('88px')
    act(() => t.state().exit())
    expect(docked()).toBe('')
  })

  test('normal navigation keeps the page; every step entry gives a fresh one (R6)', async () => {
    const t = setup('/operations')
    expect(mounts).toBe(1)
    await act(() => t.router.navigate('/inventory'))
    expect(mounts).toBe(1)
    act(() => t.state().open(1, false))
    await waitFor(() => expect(mounts).toBe(2))
    // Re-entering the same step on the same route still remounts it.
    act(() => t.state().takeOver())
    act(() => t.state().resume())
    await waitFor(() => expect(mounts).toBe(3))
  })

  test('a step’s first beat waits for its screen, then runs on it: Play shows the step’s card', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    await userEvent.click(screen.getByRole('button', { name: 'Play tour' }))
    // Well inside the 1500 ms safety wait: the screen settled, not the timeout.
    expect(
      await screen.findByRole('heading', { name: 'Grant privileges in stages' }, { timeout: 500 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Decision 1 of 3')).toBeInTheDocument()
  })

  test('the outline is one style rule for its target', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    act(() => runtime.player.setState({ outline: 'agent-summary' }))
    const rules = Array.from(document.querySelectorAll('style')).map((s) => s.textContent)
    expect(rules).toContain(
      '[data-story-target="agent-summary"] { outline: 2px solid var(--cs-ink); outline-offset: 2px; }',
    )
  })

  test('the cursor shows only while playing, once the tour has moved it', async () => {
    const t = setup('/?tour=decisions')
    await waitFor(() => expect(t.state().status).toBe('paused'))
    const cursor = () => document.querySelector('[data-tour="cursor"]')
    expect(cursor()).toHaveAttribute('data-visible', 'false')
    act(() =>
      runtime.player.setState({ cursor: { x: 40, y: 50, visible: true, click: true }, clicks: 1 }),
    )
    expect(cursor()).toHaveAttribute('data-visible', 'true')
    expect(cursor()).toHaveStyle({ transform: 'translate(40px, 50px)' })
  })
})
