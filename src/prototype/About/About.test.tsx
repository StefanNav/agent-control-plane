import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { stepHref, storyById } from '../stories'
import { CARDS } from '../tour/cards'
import { CHAPTERS } from '../tour/script'
import { typographic } from '../tour/typographic'
import { About } from './About'

const show = () =>
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  )

/** The tour's chapters but its close, in running order. */
const CASE = CHAPTERS.filter((chapter) => chapter.id !== 'close')

/** A chapter's section: the region its heading names. */
const section = (title: string) => screen.getByRole('region', { name: title })

const hrefOf = (el: HTMLElement) => el.getAttribute('href')

test('the case study: every chapter of the tour, then the principles, the design system and the build', () => {
  show()
  expect(screen.getByRole('heading', { level: 1, name: 'About this work' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    ...CASE.map((chapter) => chapter.title),
    'Principles',
    'Countersign, the design system',
    'How it’s built',
  ])
})

test('the heading levels never skip one', () => {
  show()
  const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)))
  expect(levels[0]).toBe(1)
  levels.forEach((level, i) => {
    if (i > 0) expect(level).toBeLessThanOrEqual(levels[i - 1]! + 1)
  })
})

test('opens with a line that says it is the tour in reading form, and links to play it', () => {
  const { container } = show()
  expect(container).toHaveTextContent('This is the guided tour in reading form')
  expect(screen.getByRole('link', { name: 'Play the tour' })).toHaveAttribute('href', '/?tour=open')
  expect(container).toHaveTextContent('Attune, Lakeshore Health and everyone in it are fictional')
})

test('each chapter tells its narration, word for word', () => {
  show()
  for (const chapter of CASE) {
    const text = section(chapter.title).textContent ?? ''
    for (const step of chapter.steps)
      for (const beat of step.beats) expect(text, beat.id).toContain(typographic(beat.text))
  }
})

test("the narration shows ’ for its apostrophes, never '", () => {
  show()
  expect(section('Open on the product')).toHaveTextContent(
    'Hi, I’m Stefan. Imagine you’re responsible for forty-one AI agents',
  )
  for (const chapter of CASE) expect(section(chapter.title).textContent).not.toContain("'")
})

test('Play from here opens the tour on that chapter', () => {
  show()
  const links = screen.getAllByRole('link', { name: 'Play from here' })
  expect(links.map(hrefOf)).toEqual(CASE.map((chapter) => `/?tour=${chapter.id}`))
  for (const chapter of CASE)
    expect(
      within(section(chapter.title)).getByRole('link', { name: 'Play from here' }),
    ).toHaveAttribute('href', `/?tour=${chapter.id}`)
})

test('a product chapter opens its live screen, the matching step of a story', () => {
  show()
  const live = (title: string) =>
    hrefOf(within(section(title)).getByRole('link', { name: 'Open the live screen' }))
  const step = (story: string, n: number) => stepHref(storyById(story)!, n)
  expect(live('Open on the product')).toBe(step('marcus', 3))
  expect(live('Bring it on')).toBe(step('dana', 1))
  expect(live('Earn trust')).toBe(step('priya', 2))
  expect(live('Supervise')).toBe(step('marcus', 6))
  expect(live('Trust drops')).toBe(step('priya', 7))
  expect(screen.getAllByRole('link', { name: 'Open the live screen' })).toHaveLength(5)
  expect(live('Supervise')).toBe(
    '/operations/agents/med-rec?control=pause-agent&story=marcus&step=6',
  )
})

test('an interlude chapter opens its page, and Who it’s for has no second link', () => {
  show()
  const page = (title: string) =>
    hrefOf(within(section(title)).getByRole('link', { name: 'Open the page' }))
  expect(page('The problem')).toBe('/tour/problem')
  expect(page('Three key decisions')).toBe('/tour/decisions')
  expect(page('How I got here')).toBe('/tour/process')
  expect(page('How I’d validate it')).toBe('/tour/validate')
  expect(screen.getAllByRole('link', { name: 'Open the page' })).toHaveLength(4)
  expect(within(section('Who it’s for')).getAllByRole('link')).toHaveLength(1)
})

test('the research and the principle the narration puts up are quoted with their sources', () => {
  show()
  const problem = within(section('The problem'))
  for (const id of ['research-r1', 'research-r2', 'research-r3']) {
    const card = CARDS[id]
    if (card?.kind !== 'excerpt') throw new Error(`${id} is not an excerpt`)
    expect(problem.getByText(card.quote)).toBeInTheDocument()
    expect(problem.getByText(card.source)).toBeInTheDocument()
  }
  const hardStops = CARDS['hard-stops-outside']
  if (hardStops?.kind !== 'excerpt') throw new Error('hard-stops-outside is not an excerpt')
  expect(within(section('Bring it on')).getByText(hardStops.quote)).toBeInTheDocument()
  expect(within(section('Bring it on')).getByText(hardStops.source)).toBeInTheDocument()
})

test('the three decisions come with their options, trade-off and the screen they played out on', () => {
  show()
  const decisions = within(section('Three key decisions'))
  for (const n of [1, 2, 3] as const) {
    const card = CARDS[`decision-${n}`]
    if (card?.kind !== 'decision') throw new Error(`decision-${n} is not a decision`)
    expect(decisions.getByText(`Decision ${n} of 3`)).toBeInTheDocument()
    expect(decisions.getByRole('heading', { level: 3, name: card.title })).toBeInTheDocument()
    expect(decisions.getByText(`Trade-off: ${card.tradeoff}`)).toBeInTheDocument()
    expect(
      decisions.getByRole('button', { name: `${card.screen!.alt}, open larger` }),
    ).toBeInTheDocument()
  }
  expect(decisions.getAllByText('Chosen')).toHaveLength(3)
})

test('every exploration is there to open larger, with its caption', () => {
  show()
  const decisions = within(section('Three key decisions'))
  const explorations = Object.entries(CARDS).filter(([id]) => id.startsWith('explore-'))
  expect(explorations).toHaveLength(9)
  for (const [id, card] of explorations) {
    if (card.kind !== 'image') throw new Error(`${id} is not an image`)
    expect(
      decisions.getByRole('button', { name: `${card.alt}, open larger` }),
      id,
    ).toBeInTheDocument()
    expect(decisions.getByText(card.caption), id).toBeInTheDocument()
  }
  expect(
    decisions.getByRole('heading', { level: 3, name: 'Five directions from one brief' }),
  ).toBeVisible()
  expect(
    decisions.getByRole('heading', { level: 3, name: 'Judged on the same real, crowded screens' }),
  ).toBeVisible()
})

test('an image opens larger straight away, and closes again', async () => {
  show()
  const card = CARDS['explore-ledger-conflict']
  if (card?.kind !== 'image') throw new Error('explore-ledger-conflict is not an image')
  await userEvent.click(screen.getByRole('button', { name: `${card.alt}, open larger` }))
  const dialog = screen.getByRole('dialog', { name: card.title })
  expect(within(dialog).getByRole('img', { name: card.alt })).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('the decisions come in as the narration reaches them', () => {
  show()
  const text = section('Three key decisions').textContent ?? ''
  const at = (needle: string) => {
    const i = text.indexOf(needle)
    expect(i, needle).toBeGreaterThanOrEqual(0)
    return i
  }
  const order = [
    'First, how an agent earns trust.',
    'Decision 1 of 3',
    'Second, how to protect people',
    'Decision 2 of 3',
    'I explored five visual directions',
    'Five directions from one brief',
    'So I judged every direction',
    'Judged on the same real, crowded screens',
    'Third, how to stop and restart.',
    'Decision 3 of 3',
  ].map(at)
  expect(order).toEqual([...order].sort((a, b) => a - b))
})

test('links to the component gallery and the source', () => {
  show()
  expect(screen.getByRole('link', { name: 'See the components' })).toHaveAttribute(
    'href',
    '/about/components',
  )
  expect(screen.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/StefanNav/agent-control-plane',
  )
})

test('says how it was built from what the repo shows', () => {
  show()
  expect(screen.getByRole('region', { name: 'How it’s built' })).toHaveTextContent(
    '10 build phases, each one a reviewed pull request',
  )
})

test('says the hospital and the brand are fictional, and uses no gendered pronouns', () => {
  const { container } = show()
  expect(container).toHaveTextContent('Attune, Lakeshore Health and everyone in it are fictional')
  expect(container.textContent).not.toMatch(/\b(he|she|him|her|his|hers)\b/i)
})
