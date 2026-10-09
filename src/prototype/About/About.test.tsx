import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { About } from './About'

const show = () =>
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  )

test('the case-study sections, in order', () => {
  show()
  expect(
    screen.getByRole('heading', { level: 1, name: 'About this prototype' }),
  ).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    'What it is',
    'The problem',
    'Principles',
    'Countersign, the design system',
    'How to use it',
    'How it’s built',
  ])
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

test('says the hospital and the brand are fictional, and uses no gendered pronouns', () => {
  const { container } = show()
  expect(container).toHaveTextContent('Signal, Lakeshore Health and everyone in it are fictional')
  expect(container.textContent).not.toMatch(/\b(he|she|him|her|his|hers)\b/i)
})
