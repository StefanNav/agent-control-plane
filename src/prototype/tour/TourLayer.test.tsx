import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { AppShell } from '../../app/AppShell'
import { useDemo } from '../../store'
import { Landing } from '../Landing/Landing'
import { useStory } from '../stories/progress'
import type { CardContent } from './cards'
import { FIXTURE_CHAPTERS } from './fixtures'
import { tourMinutes } from './tourMinutes'
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
    width: 1600,
    height: 1000,
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

/** Load the app at `at`; a list is the tab's history, loaded at its entry `index` (a refresh there). */
function setup(at: string | string[], index?: number) {
  runtime = createTourRuntime(FIXTURE_CHAPTERS, {}, { voice: 'silent', cards: CARDS })
  setTourRuntime(runtime)
  const router = createMemoryRouter(
    [{ element: <AppShell shell="app" />, children: [{ path: '*', element: <Page /> }] }],
    { initialEntries: typeof at === 'string' ? [at] : at, initialIndex: index },
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

describe('Back and Forward (Ruling 38)', () => {
  test('the location the page loads on opens its chapter, even at a later entry (a refresh)', async () => {
    const t = setup(['/inventory', '/?tour=decisions'], 1)
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
  })

  test('closed, a link to a chapter (a push) still opens it', async () => {
    const t = setup('/inventory')
    await act(() => t.router.navigate('/?tour=decisions'))
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
  })

  test('closed, Back onto a chapter’s link leaves the tour closed, and the URL drops ?tour', async () => {
    const t = setup(['/?tour=decisions', '/inventory'], 1)
    await act(() => t.router.navigate(-1))
    await waitFor(() => expect(t.where()).toBe('/'))
    expect(t.state().status).toBe('idle')
    expect(bar()).not.toBeInTheDocument()
  })

  test('after Exit, Back through the tour’s pages never opens it again', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
    await waitFor(() => expect(t.where()).toBe('/'))
    await act(() => t.router.navigate(-1))
    await waitFor(() => expect(t.where()).toBe('/tour/problem'))
    expect(t.state().status).toBe('idle')
    // Back to the link the page loaded on: it was left since, so it is a Back like any other.
    await act(() => t.router.navigate(-1))
    await waitFor(() => expect(t.where()).toBe('/'))
    expect(t.state().status).toBe('idle')
    expect(bar()).not.toBeInTheDocument()
  })

  test('open, Back is a take-over where the tour is, never a jump; Forward still leads on', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    act(() => t.state().jump(1))
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    act(() => t.state().play())
    const at = t.state().pos
    // Back to the problem chapter's page: the tour stays in its own chapter, the visitor driving.
    await act(() => t.router.navigate(-1))
    await waitFor(() => expect(t.state().status).toBe('driving'))
    expect(t.state().pos).toEqual(at)
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=decisions'))
    // Nothing was pushed: Forward still goes to the entry Back left.
    await act(() => t.router.navigate(1))
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'driving', pos: at })
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

describe('a dialog owns the keyboard (Ruling 32)', () => {
  test('with the tour’s image open, ←, → and Space leave the tour where it is', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    act(() => t.state().next())
    await waitFor(() => expect(t.where()).toBe('/operations/agents/med-rec?tour=problem'))
    act(() => runtime.player.setState({ card: { id: 'image-1', side: 'right' } }))
    await userEvent.click(screen.getByRole('button', { name: 'An early board, open larger' }))
    const image = within(screen.getByRole('dialog', { name: 'Direction A' })).getByRole('img')
    expect(image).toHaveFocus()
    fireEvent.keyDown(image, { key: 'ArrowRight' })
    fireEvent.keyDown(image, { key: 'ArrowLeft' })
    fireEvent.keyDown(image, { key: ' ' })
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 0, step: 1, beat: 0 } })
    expect(screen.getByRole('dialog', { name: 'Direction A' })).toBeInTheDocument()
  })

  test('so does a product dialog; once it closes, the keys are the tour’s again', async () => {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.tabIndex = -1
    document.body.append(dialog)
    onTestFinished(() => dialog.remove())
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    fireEvent.keyDown(dialog, { key: ' ' })
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 0, step: 0, beat: 0 } })
    dialog.remove()
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(t.state().pos).toEqual({ chapter: 0, step: 1, beat: 0 })
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

describe('on the tour’s own pages, input pauses instead (Ruling 41)', () => {
  /** The problem chapter's interlude, playing. */
  async function playingInterlude() {
    const t = setup('/?tour=problem')
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    act(() => t.state().play())
    return t
  }

  test('a pointer down on the page while playing pauses, where it is: Play, not Resume tour', async () => {
    const t = await playingInterlude()
    const at = t.state().pos
    fireEvent.pointerDown(screen.getByRole('main'))
    expect(t.state()).toMatchObject({ status: 'paused', pos: at })
    expect(screen.getByRole('button', { name: 'Play tour' })).toBeInTheDocument()
    expect(screen.queryByText('Paused. You’re driving.')).not.toBeInTheDocument()
  })

  test('so does a key on a control; while paused, input changes nothing', async () => {
    const t = await playingInterlude()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Product button' }), { key: 'Enter' })
    expect(t.state().status).toBe('paused')
    fireEvent.pointerDown(screen.getByRole('main'))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Reason' }), { key: 'a' })
    expect(t.state().status).toBe('paused')
  })

  test('Play then carries on from the line, not from the step’s start', async () => {
    const t = await playingInterlude()
    fireEvent.pointerDown(screen.getByRole('main'))
    const { stepKey, pos } = t.state()
    act(() => t.state().play())
    // A restart would enter the step again: a new step key and its first line.
    expect(t.state()).toMatchObject({ status: 'playing', stepKey, pos })
  })

  test('on a product screen it is still a take-over', async () => {
    const t = await playingInterlude()
    act(() => t.state().next())
    await waitFor(() => expect(t.where()).toBe('/operations/agents/med-rec?tour=problem'))
    act(() => t.state().play())
    fireEvent.pointerDown(screen.getByRole('main'))
    expect(t.state().status).toBe('driving')
  })

  test('input that leaves the page still ends up a take-over: Reset demo goes to Marcus’s division', async () => {
    const t = await playingInterlude()
    const at = t.state().pos
    await userEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
    await waitFor(() => expect(t.where()).toBe('/operations/divisions/medications?tour=problem'))
    expect(t.state()).toMatchObject({ status: 'driving', pos: at })
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
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

describe('Explore freely closes the tour (Ruling 39)', () => {
  /** The app with the real landing page at `/`, the tour open at `chapter`, the visitor on `/`. */
  async function onLanding(chapter: string, first: string) {
    runtime = createTourRuntime(FIXTURE_CHAPTERS, {}, { voice: 'silent', cards: CARDS })
    setTourRuntime(runtime)
    const router = createMemoryRouter(
      [
        {
          element: <AppShell shell="app" />,
          children: [
            { path: '/', element: <Landing /> },
            { path: '*', element: <Page /> },
          ],
        },
      ],
      { initialEntries: [`/?tour=${chapter}`] },
    )
    render(<RouterProvider router={router} />)
    const where = () => router.state.location.pathname + router.state.location.search
    await waitFor(() => expect(where()).toBe(first))
    await act(() => router.navigate('/'))
    await waitFor(() => expect(where()).toBe(`/?tour=${chapter}`))
    act(() => useDemo.getState().setPersona('jordan'))
    return where
  }

  test.each([
    ['a product step', 'decisions', '/operations?tour=decisions'],
    ['an interlude, whose exit goes to the landing page', 'problem', '/tour/problem?tour=problem'],
  ])(
    'from %s: the tour closes, and the visitor is Marcus on his division',
    async (_, chapter, first) => {
      const where = await onLanding(chapter, first)
      expect(runtime.player.getState().status).not.toBe('idle')
      await userEvent.click(screen.getByRole('button', { name: 'Explore freely' }))
      expect(runtime.player.getState().status).toBe('idle')
      expect(bar()).not.toBeInTheDocument()
      expect(useDemo.getState().personaId).toBe('marcus')
      await waitFor(() => expect(where()).toBe('/operations/divisions/medications'))
      // Give a late URL write the chance to undo it.
      await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
      expect(where()).toBe('/operations/divisions/medications')
    },
  )

  test('scheduled as in the browser (no act), the exit’s own navigation doesn’t win', async () => {
    const where = await onLanding('problem', '/tour/problem?tour=problem')
    const actEnvironment = Reflect.get(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false)
    try {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      screen.getByRole('button', { name: 'Explore freely' }).click()
      await wait(50)
      expect(runtime.player.getState().status).toBe('idle')
      expect(where()).toBe('/operations/divisions/medications')
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
  const clip = { ms: 2000, source: 'placeholder', textHash: '0', levels: '' } as const

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

describe('the voice meter', () => {
  /** A 20 s line, then a 5 s line ending on a long wait: 2 s and 500 ms in the silent voice. */
  const SPOKEN: Chapter[] = [
    {
      id: 'supervising',
      title: 'Supervise',
      steps: [
        {
          id: 'spoken',
          route: '/operations',
          scenario: 'baseline',
          persona: 'marcus',
          beats: [
            { id: 'spoken-1', text: 'One.' },
            { id: 'spoken-2', text: 'Two.', after: [{ kind: 'wait', ms: 20_000 }] },
          ],
        },
      ],
    },
  ]
  const meter = () => document.querySelector('[data-tour="voice-level"]')
  const bars = () => [...meter()!.children].map((bar) => (bar as HTMLElement).style.transform)
  /** All four bars at a level (0–9): its share of the 14 px bar, never under 2 px. */
  const at = (level: number) => Array(4).fill(`scaleY(${Math.max(2, (level / 9) * 14) / 14})`)

  test('moves with each line’s own levels while it plays; quiet through a line’s after-actions; hidden when paused', async () => {
    runtime = createTourRuntime(
      SPOKEN,
      {
        'spoken-1': { ms: 20_000, source: 'recorded', textHash: '0', levels: '9'.repeat(400) },
        'spoken-2': { ms: 5000, source: 'recorded', textHash: '0', levels: '5'.repeat(100) },
      },
      { voice: 'silent' },
    )
    setTourRuntime(runtime)
    const router = createMemoryRouter(
      [{ element: <AppShell shell="app" />, children: [{ path: '*', element: <Page /> }] }],
      { initialEntries: ['/?tour=supervising'] },
    )
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('button', { name: 'Play tour' })).toBeInTheDocument()
    expect(meter()).not.toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Play tour' }))
    expect(meter()).toBeVisible()
    await waitFor(() => expect(meter()).toHaveAttribute('data-speaking', 'true'))
    // Every window of the first line is at 9: full height.
    await waitFor(() => expect(bars()).toEqual(at(9)))

    await userEvent.click(screen.getByRole('button', { name: 'Pause tour' }))
    expect(meter()).not.toBeVisible()
    expect(meter()).toHaveAttribute('data-speaking', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Play tour' }))
    await waitFor(() => expect(meter()).toHaveAttribute('data-speaking', 'true'))
    // The second line reads its own levels, at 5.
    await waitFor(() => expect(bar()).toHaveTextContent('Two.'), { timeout: 3000 })
    await waitFor(() => expect(bars()).toEqual(at(5)))
    // Its clip ends, and its wait holds the line: still shown, quiet.
    await waitFor(() => expect(meter()).toHaveAttribute('data-speaking', 'false'), {
      timeout: 1500,
    })
    expect(bar()).toHaveTextContent('Two.')
    expect(meter()).toBeVisible()
    expect(bars()).toEqual(at(0))
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

describe('the welcome (Checkpoint E)', () => {
  const welcome = () => screen.queryByRole('region', { name: 'Welcome to Agent Control Plane' })
  const play = () => screen.getByRole('button', { name: 'Play tour' })

  /** A link to a chapter, opened on the page's first location: the welcome is up over it. */
  async function linked(at = '/?tour=decisions') {
    const t = setup(at)
    await waitFor(() => expect(t.state().status).toBe('paused'))
    expect(welcome()).toBeInTheDocument()
    return t
  }

  test('a link opened on the page’s first location shows it, paused, Play tour focused and described by it', async () => {
    const t = await linked()
    expect(t.state()).toMatchObject({ status: 'paused', welcome: true })
    expect(play()).toHaveFocus()
    expect(play()).toHaveAccessibleDescription(
      expect.stringMatching(/^A working prototype of how a hospital brings on/),
    )
    // The tour's length, as the landing page's Play says it.
    expect(welcome()).toHaveTextContent(`about ${tourMinutes(runtime.timeline.total)} minutes`)
  })

  test('so does a refresh at a later entry in the tab’s history', async () => {
    setup(['/inventory', '/?tour=decisions'], 1)
    await waitFor(() => expect(welcome()).toBeInTheDocument())
  })

  test('not after the landing page’s Play, which plays at once', async () => {
    runtime = createTourRuntime(FIXTURE_CHAPTERS, {}, { voice: 'silent', cards: CARDS })
    setTourRuntime(runtime)
    const router = createMemoryRouter(
      [
        {
          element: <AppShell shell="app" />,
          children: [
            { path: '/', element: <Landing /> },
            { path: '*', element: <Page /> },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    await userEvent.click(screen.getByRole('button', { name: /^Play the tour · \d+ min$/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tour/problem'))
    expect(runtime.player.getState()).toMatchObject({ status: 'playing', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test('not for a link followed inside the app (About’s Play from here)', async () => {
    const t = setup('/inventory')
    await act(() => t.router.navigate('/?tour=decisions'))
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'paused', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test('never on Back or Forward: Back onto a chapter’s link leaves the tour closed', async () => {
    const t = setup(['/?tour=decisions', '/inventory'], 1)
    await act(() => t.router.navigate(-1))
    await waitFor(() => expect(t.where()).toBe('/'))
    expect(t.state()).toMatchObject({ status: 'idle', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test('says where a link starts after the first chapter, and nothing of it at the first', async () => {
    await linked('/?tour=decisions')
    expect(welcome()).toHaveTextContent('You’re starting at chapter 2 of 2: Decision 1.')
    act(() => runtime.player.getState().exit())
    setTourRuntime(null)
    cleanup()
    await linked('/?tour=problem')
    expect(welcome()).not.toHaveTextContent('You’re starting at chapter')
  })

  test('Play tour starts the tour and takes it down, the audio unlocked inside the click', async () => {
    const t = await linked()
    const unlock = vi.spyOn(runtime.voice, 'unlock')
    await userEvent.click(play())
    expect(unlock).toHaveBeenCalled()
    expect(t.state()).toMatchObject({ status: 'playing', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test('Space, from the focused Play tour, starts it too', async () => {
    const t = await linked()
    await userEvent.keyboard(' ')
    expect(t.state()).toMatchObject({ status: 'playing', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test('Space from the page body starts it too', async () => {
    const t = await linked()
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(t.state()).toMatchObject({ status: 'playing', welcome: false })
  })

  test('Escape takes it down, the tour still paused, Play tour still focused', async () => {
    const t = await linked()
    fireEvent.keyDown(play(), { key: 'Escape' })
    expect(t.state()).toMatchObject({ status: 'paused', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
    expect(play()).toHaveFocus()
  })

  test('Look around first takes it down, the tour still paused, focus back on Play tour', async () => {
    const t = await linked()
    await userEvent.click(screen.getByRole('button', { name: 'Look around first' }))
    expect(t.state()).toMatchObject({ status: 'paused', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
    expect(play()).toHaveFocus()
  })

  test('a click on the dimmed page takes it down, and is no take-over: still paused', async () => {
    const t = await linked()
    const scrim = document.querySelector<HTMLElement>('[data-tour="welcome"] [data-scrim]')!
    await userEvent.click(scrim)
    expect(t.state()).toMatchObject({ status: 'paused', welcome: false })
    expect(screen.queryByText('Paused. You’re driving.')).not.toBeInTheDocument()
    expect(welcome()).not.toBeInTheDocument()
    expect(play()).toHaveFocus()
  })

  test('a chapter jump from the bar takes it down', async () => {
    const t = await linked('/?tour=problem')
    await userEvent.click(screen.getByRole('button', { name: 'Go to chapter 2: Decision 1' }))
    await waitFor(() => expect(t.where()).toBe('/operations?tour=decisions'))
    expect(t.state()).toMatchObject({ status: 'paused', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test('using the page (typing in a field) is a take-over, and takes it down', async () => {
    const t = await linked()
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Reason' }), { key: 'a' })
    expect(t.state()).toMatchObject({ status: 'driving', welcome: false })
    expect(welcome()).not.toBeInTheDocument()
  })

  test.each([
    [
      'a key on a control',
      () =>
        fireEvent.keyDown(screen.getByRole('button', { name: 'Product button' }), { key: 'Enter' }),
    ],
    ['a pointer down on the page', () => fireEvent.pointerDown(screen.getByRole('main'))],
  ])(
    'on the tour’s own pages, where input only pauses, %s still takes it down',
    async (_, input) => {
      const t = await linked('/?tour=problem')
      input()
      expect(t.state()).toMatchObject({ status: 'paused', welcome: false })
      expect(welcome()).not.toBeInTheDocument()
    },
  )

  test('once down, it stays down: Exit and a link to the tour inside the app don’t bring it back', async () => {
    const t = await linked()
    await userEvent.click(screen.getByRole('button', { name: 'Look around first' }))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
    await waitFor(() => expect(t.state().status).toBe('idle'))
    await act(() => t.router.navigate('/?tour=problem'))
    await waitFor(() => expect(t.where()).toBe('/tour/problem?tour=problem'))
    expect(welcome()).not.toBeInTheDocument()
  })
})
