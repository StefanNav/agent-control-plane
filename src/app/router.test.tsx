import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RouteError } from './RouteError'
import { routes } from './router'

test('every page route renders errors inside its shell', () => {
  for (const layout of routes) {
    for (const child of layout.children ?? []) {
      expect(child.errorElement, String(child.path)).toBeDefined()
    }
  }
})

test('a page that throws shows the in-app error screen', () => {
  function Boom(): never {
    throw new Error('boom')
  }
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter([{ path: '/', element: <Boom />, errorElement: <RouteError /> }])
  render(<RouterProvider router={router} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to the Command Board' })).toHaveAttribute('href', '/operations')
  spy.mockRestore()
})
