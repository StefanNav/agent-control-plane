import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { MemoryRouter } from 'react-router'
import { isInterlude } from '../engine'
import { MANIFEST } from '../manifest'
import { CHAPTERS } from '../script'
import { createTourRuntime, setTourRuntime, type TourRuntime } from '../useTour'
import { DecisionsPage } from './DecisionsPage'
import { ProblemPage } from './ProblemPage'
import { ProcessPage } from './ProcessPage'
import { useReveal } from './useReveal'
import { ValidatePage } from './ValidatePage'

/** Each interlude's page by its route. */
const PAGES: Record<string, ComponentType> = {
  '/tour/problem': ProblemPage,
  '/tour/decisions': DecisionsPage,
  '/tour/process': ProcessPage,
  '/tour/validate': ValidatePage,
}

const interludeSteps = CHAPTERS.flatMap((chapter) => chapter.steps).filter((step) =>
  isInterlude(step.route),
)

let runtime: TourRuntime

beforeEach(() => {
  runtime = createTourRuntime(CHAPTERS, MANIFEST, { voice: 'silent' })
  setTourRuntime(runtime)
})

afterEach(() => setTourRuntime(null))

function show(route: string) {
  const Page = PAGES[route]!
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  )
}

/** Each item on the page as `id:state`, in page order. */
function items(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-item]')].map(
    (el) => `${el.dataset.item}:${el.dataset.state}`,
  )
}

/** The items marked as the current step for assistive tech, in page order. */
function currentSteps(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[aria-current]')].map(
    (el) => `${el.dataset.item}:${el.getAttribute('aria-current')}`,
  )
}

/** Hold the tour on beat `beat` of the step `stepId`: paused, unless it is to be `playing`. */
function holdAt(stepId: string, beat: number, status: 'paused' | 'playing' = 'paused') {
  const chapter = CHAPTERS.findIndex((c) => c.steps.some((s) => s.id === stepId))
  const step = CHAPTERS[chapter]!.steps.findIndex((s) => s.id === stepId)
  act(() => runtime.player.setState({ status, pos: { chapter, step, beat } }))
}

describe('useReveal', () => {
  test('outside the tour every item shows', () => {
    const { result } = renderHook(() => useReveal('problem-page'))
    expect(result.current).toBe('all')
  })

  test('on its step: the reveals of the beats reached so far, in order, the last one current', () => {
    const { result } = renderHook(() => useReveal('problem-page'))
    holdAt('problem-page', 1)
    expect(result.current).toEqual(new Set(['act', 'approve']))
    // A line with nothing to reveal changes nothing.
    holdAt('problem-page', 3)
    expect(result.current).toEqual(new Set(['act', 'approve']))
    holdAt('problem-page', 4)
    expect([...(result.current as Set<string>)]).toEqual(['act', 'approve', 'trust'])
  })

  test('while the tour is on another step, the page reads as a static page', () => {
    const { result } = renderHook(() => useReveal('problem-page'))
    holdAt('process-page', 2)
    expect(result.current).toBe('all')
  })
})

describe('the interludes', () => {
  test('every interlude step in the script has its page', () => {
    expect(interludeSteps.map((step) => step.route).sort()).toEqual(Object.keys(PAGES).sort())
  })

  test('each reveal in the script brings in items on its step’s page, and a beat brings in every item there', () => {
    for (const step of interludeSteps) {
      const { container, unmount } = show(step.route)
      const reveals = step.beats.flatMap((beat) => beat.reveal ?? [])
      for (const reveal of reveals) {
        const brought = container.querySelectorAll(`[data-reveal="${reveal}"]`)
        expect(brought.length, `${step.id}: ${reveal}`).toBeGreaterThan(0)
      }
      for (const item of container.querySelectorAll<HTMLElement>('[data-item]'))
        expect(reveals, `${step.id}: ${item.dataset.item}`).toContain(item.dataset.reveal)
      unmount()
    }
  })

  test('outside the tour each page shows every item, none of them current', () => {
    for (const route of Object.keys(PAGES)) {
      const { container, unmount } = show(route)
      const states = items(container)
      expect(states.length, route).toBeGreaterThan(0)
      for (const state of states) expect(state, route).toMatch(/:shown$/)
      expect(currentSteps(container), route).toEqual([])
      unmount()
    }
  })

  test('with two beats reached, exactly those items show and the second is current', () => {
    const { container } = show('/tour/problem')
    holdAt('problem-page', 1)
    expect(items(container)).toEqual(['act:reached', 'approve:current', 'trust:hidden'])
    expect(currentSteps(container)).toEqual(['approve:step'])
  })

  test('one line can bring in a group: the process tiles it names come in together, all current', () => {
    const { container } = show('/tour/process')
    holdAt('process-page', 2)
    expect(items(container)).toEqual([
      'research:reached',
      'vision:current',
      'prd:current',
      'roadmap:current',
      'epics:current',
      'brief:hidden',
      'explorations:hidden',
      'frames:hidden',
      'build:hidden',
    ])
    expect(currentSteps(container)).toEqual([
      'vision:step',
      'prd:step',
      'roadmap:step',
      'epics:step',
    ])
  })

  test('the decisions page brings in each decision, and the explorations after Decision 2’s', () => {
    const { container } = show('/tour/decisions')
    // "Three decisions shaped all of this": the page's title only.
    holdAt('decisions-page', 0)
    expect(items(container)).toEqual([
      'd1:hidden',
      'd2:hidden',
      'directions:hidden',
      'judged:hidden',
      'd3:hidden',
    ])
    expect(currentSteps(container)).toEqual([])
    holdAt('decisions-page', 5)
    expect(items(container)).toEqual([
      'd1:reached',
      'd2:reached',
      'directions:current',
      'judged:hidden',
      'd3:hidden',
    ])
    expect(currentSteps(container)).toEqual(['directions:step'])
    holdAt('decisions-page', 9)
    expect(items(container)).toEqual([
      'd1:reached',
      'd2:reached',
      'directions:reached',
      'judged:reached',
      'd3:current',
    ])
  })

  test('the validate page marks its current list as the current step', () => {
    const { container } = show('/tour/validate')
    holdAt('validate-page', 3)
    expect(items(container)).toEqual(['checked:reached', 'bring-in:current', 'measure:hidden'])
    expect(currentSteps(container)).toEqual(['bring-in:step'])
  })
})

describe('page copy', () => {
  test('the problem: three lines under its title', () => {
    show('/tour/problem')
    expect(screen.getByRole('heading', { level: 1, name: 'The problem' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'AI agents that act, not just suggest',
      'Approval of every action, by a person',
      'How hospitals already trust someone new',
    ])
  })

  test('how I got here: nine tiles in order, each with one line under it', () => {
    show('/tour/process')
    expect(screen.getByRole('heading', { level: 1, name: 'How I got here' })).toBeInTheDocument()
    const tiles = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(tiles.map((tile) => tile.firstElementChild?.textContent)).toEqual([
      'Research',
      'Vision',
      'PRD',
      'Roadmap',
      'Epics and stories',
      'Design system brief',
      'Explorations',
      '55 frames',
      '10 build phases',
    ])
    for (const tile of tiles) expect(tile.children).toHaveLength(2)
  })

  test('how I’d validate it: three short lists, each under its heading', () => {
    show('/tour/validate')
    expect(
      screen.getByRole('heading', { level: 1, name: 'How I’d validate it' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'What I checked',
      'Who I’d bring in first, and what I’d ask',
      'What I’d measure',
    ])
    for (const list of screen.getAllByRole('list'))
      expect(within(list).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
  })

  test('three key decisions: each in order, its options with the chosen one marked, its trade-off and its screen', () => {
    const { container } = show('/tour/decisions')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Three key decisions' }),
    ).toBeInTheDocument()
    const decision = (id: string) => container.querySelector<HTMLElement>(`[data-item="${id}"]`)!
    const read = (id: string) => {
      const el = decision(id)
      return {
        label: el.querySelector('span')?.textContent,
        title: within(el).getByRole('heading', { level: 2 }).textContent,
        options: within(within(el).getByRole('list'))
          .getAllByRole('listitem')
          .map((li) => li.textContent),
        tradeoff: within(el).getByText(/^Trade-off: /).textContent,
      }
    }
    expect(read('d1')).toEqual({
      label: 'Decision 1 of 3',
      title: 'How an agent earns trust',
      options: [
        'A person approves every action',
        'Trust the agent as a whole',
        'Each task earns its own privilege, signed by a named personChosen',
      ],
      tradeoff: 'Trade-off: More work up front, a lot less checking after',
    })
    expect(read('d2')).toEqual({
      label: 'Decision 2 of 3',
      title: 'How to protect people’s attention',
      options: [
        'Ledger · precise',
        'Ward Round · fast to read',
        'Countersign · accountableChosen',
        'Linen · calm',
        'Handover · calm + accountable',
      ],
      tradeoff: 'Trade-off: Less colour at a glance, so the colour that does appear is believed',
    })
    expect(read('d3')).toEqual({
      label: 'Decision 3 of 3',
      title: 'How to stop and restart',
      options: [
        'One person resumes',
        'It resumes on its own after a fix',
        'Stopping takes one person; starting again takes twoChosen',
      ],
      tradeoff: 'Trade-off: Slower recovery, on purpose',
    })
    // Each shows the screen it played out on, as the product shows it.
    const screens = ['d1', 'd2', 'd3'].map((id) =>
      within(decision(id)).getByRole('img').getAttribute('src'),
    )
    expect(screens).toEqual([
      '/tour/artifacts/decision-1-sign.jpg',
      '/tour/artifacts/decision-2-division.jpg',
      '/tour/artifacts/decision-3-resume.jpg',
    ])
  })

  test('Decision 2’s explorations: the five directions, the Ledger conflict, then the same crowded screens', () => {
    const { container } = show('/tour/decisions')
    const group = (id: string) => container.querySelector<HTMLElement>(`[data-item="${id}"]`)!
    const figures = (id: string) => within(group(id)).getAllByRole('figure')
    /** Each figure's name: the first line of its caption. */
    const names = (id: string) =>
      figures(id).map((figure) => figure.querySelector('figcaption > :first-child')?.textContent)
    expect(names('directions')).toEqual([
      'Ledger',
      'Ward Round',
      'Countersign',
      'Linen',
      'Handover',
      'Ledger, on a crowded screen',
    ])
    // Each direction has one line under its name.
    for (const figure of figures('directions'))
      expect(figure.querySelector('figcaption')?.children).toHaveLength(2)
    expect(figures('directions').at(-1)).toHaveTextContent(
      'The selected row and “needs review” were both indigo',
    )
    expect(
      within(group('judged')).getByRole('heading', {
        level: 3,
        name: 'Judged on the same real, crowded screens',
      }),
    ).toBeInTheDocument()
    expect(names('judged')).toEqual([
      'Countersign · the division view',
      'Countersign · signing',
      'Final · the division view',
    ])
  })

  test('every image says what it shows, keeps its room before it loads, and loads when it is near', () => {
    const { container } = show('/tour/decisions')
    const images = [...container.querySelectorAll('img')]
    // Three screens, five overviews, the conflict, the stress test pair and the final view.
    expect(images).toHaveLength(12)
    for (const img of images) {
      const src = img.getAttribute('src')
      expect(img.getAttribute('alt')?.length, src!).toBeGreaterThan(20)
      expect(Number(img.getAttribute('width')), src!).toBeGreaterThan(0)
      expect(Number(img.getAttribute('height')), src!).toBeGreaterThan(0)
      expect(img, src!).toHaveAttribute('loading', 'lazy')
      expect(src).toMatch(/^\/tour\/artifacts\/[a-z0-9-]+\.jpg$/)
    }
  })

  test('an image opens larger in a dialog, and closes', async () => {
    show('/tour/decisions')
    await userEvent.click(
      screen.getByRole('button', { name: /^Ledger’s overview sheet.*, open larger$/ }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Ledger' })
    expect(within(dialog).getByRole('img')).toHaveAttribute(
      'src',
      '/tour/artifacts/explore-ledger.jpg',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('while the tour plays, opening an image pauses it first', async () => {
    show('/tour/decisions')
    holdAt('decisions-page', 9, 'playing')
    await userEvent.click(
      screen.getByRole('button', { name: /^Med Rec Agent, paused.*, open larger$/ }),
    )
    expect(runtime.player.getState().status).toBe('paused')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
