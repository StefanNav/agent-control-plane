import { act, render, screen } from '@testing-library/react'
import { PERSONAS } from '../personas'
import { DesktopGate } from './DesktopGate'

/** A matchMedia stub whose answer the test can flip. */
function stubMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }))
  return (next: boolean) => {
    matches = next
    listeners.forEach((fn) => fn())
  }
}

const show = () =>
  render(
    <DesktopGate>
      <p>app</p>
    </DesktopGate>,
  )

afterEach(() => vi.unstubAllGlobals())

test('below 1024 px: the gate, with the pitch, the seven people and the source', () => {
  stubMatchMedia(false)
  show()
  expect(
    screen.getByRole('heading', { level: 1, name: 'Best viewed on a desktop' }),
  ).toBeInTheDocument()
  expect(screen.queryByText('app')).not.toBeInTheDocument()
  const people = screen.getByRole('list', { name: 'Seven people use it' })
  expect(people.children).toHaveLength(PERSONAS.length)
  expect(people).toHaveTextContent('Dr. Lee · AI review board chair')
  expect(screen.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/StefanNav/agent-control-plane',
  )
})

test('1024 px and wider: the app only', () => {
  stubMatchMedia(true)
  show()
  expect(screen.getByText('app')).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Best viewed on a desktop' }),
  ).not.toBeInTheDocument()
})

test('without matchMedia the app renders', () => {
  vi.stubGlobal('matchMedia', undefined)
  show()
  expect(screen.getByText('app')).toBeInTheDocument()
})

test('resizing across 1024 px swaps them', () => {
  const resize = stubMatchMedia(true)
  show()
  act(() => resize(false))
  expect(screen.getByRole('heading', { name: 'Best viewed on a desktop' })).toBeInTheDocument()
  act(() => resize(true))
  expect(screen.getByText('app')).toBeInTheDocument()
})

test('older Safari (addListener only) still swaps them', () => {
  let matches = true
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    addListener: (fn: () => void) => listeners.add(fn),
    removeListener: (fn: () => void) => listeners.delete(fn),
  }))
  show()
  expect(screen.getByText('app')).toBeInTheDocument()
  act(() => {
    matches = false
    listeners.forEach((fn) => fn())
  })
  expect(screen.getByRole('heading', { name: 'Best viewed on a desktop' })).toBeInTheDocument()
})
