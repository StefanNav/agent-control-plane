import { act, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { usePageChrome } from './usePageChrome'

function Shell() {
  usePageChrome()
  return <Outlet />
}

const page = (title: string) => (
  <main>
    <h1>{title}</h1>
    <button>Go</button>
  </main>
)

/** The app renders in StrictMode, so dev runs every effect twice on mount (main.tsx). */
function setup() {
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: '/a', element: page('Page A'), handle: { nav: null, title: 'Page A' } },
          { path: '/b', element: page('Page B'), handle: { nav: null, title: 'Page B' } },
        ],
      },
    ],
    { initialEntries: ['/a'] },
  )
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return router
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

test('a fresh load leaves focus where the browser puts it, in dev’s StrictMode too (R2, R4)', () => {
  setup()
  expect(document.activeElement).toBe(document.body)
  expect(document.title).toBe('Page A · Signal Agent Control Plane')
})

test('a navigation that took focus with it lands on the new page’s heading, without scrolling it (R4, R8)', async () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus')
  const router = setup()
  await act(() => router.navigate('/b'))
  expect(document.activeElement).toHaveTextContent('Page B')
  expect(document.activeElement?.tagName).toBe('H1')
  expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
})
