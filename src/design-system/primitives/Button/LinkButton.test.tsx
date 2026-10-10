import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { LinkButton } from './LinkButton'

test('is a real link that can carry a tour target', () => {
  render(
    <MemoryRouter>
      <LinkButton to="/operations/divisions/medications" variant="primary" data-story-target="board-open-division">
        Open division
      </LinkButton>
    </MemoryRouter>,
  )
  const link = screen.getByRole('link', { name: 'Open division' })
  expect(link).toHaveAttribute('href', '/operations/divisions/medications')
  expect(link).toHaveAttribute('data-story-target', 'board-open-division')
})
