import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { TopNav } from './TopNav'

function setup(current: Parameters<typeof TopNav>[0]['current'] = 'operations') {
  render(
    <MemoryRouter>
      <TopNav current={current} avatarInitial="M" />
    </MemoryRouter>,
  )
}

test('renders the five sections in order with the AIMS wordmark', () => {
  setup()
  expect(screen.getByText('AIMS')).toBeInTheDocument()
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual([
    'Portfolio',
    'Inventory',
    'Operations',
    'Reports',
    'Settings',
  ])
})

test('marks only the current section', () => {
  setup('operations')
  expect(screen.getByRole('link', { name: 'Operations' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Inventory' })).not.toHaveAttribute('aria-current')
})

test('shows the hospital and the avatar initial', () => {
  setup()
  expect(screen.getByText('Lakeshore Health')).toBeInTheDocument()
  expect(screen.getByText('M')).toBeInTheDocument()
})
