import { act, render, renderHook, screen, within } from '@testing-library/react'
import type { ComponentType } from 'react'
import { MemoryRouter } from 'react-router'
import { isInterlude } from '../engine'
import { MANIFEST } from '../manifest'
import { CHAPTERS } from '../script'
import { createTourRuntime, setTourRuntime, type TourRuntime } from '../useTour'
import { ProblemPage } from './ProblemPage'
import { ProcessPage } from './ProcessPage'
import { useReveal } from './useReveal'
import { ValidatePage } from './ValidatePage'

/** Each interlude's page by its route. */
const PAGES: Record<string, ComponentType> = {
  '/tour/problem': ProblemPage,
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

/** Hold the tour, paused, on beat `beat` of the step `stepId`. */
function holdAt(stepId: string, beat: number) {
  const chapter = CHAPTERS.findIndex((c) => c.steps.some((s) => s.id === stepId))
  const step = CHAPTERS[chapter]!.steps.findIndex((s) => s.id === stepId)
  act(() => runtime.player.setState({ status: 'paused', pos: { chapter, step, beat } }))
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
})
