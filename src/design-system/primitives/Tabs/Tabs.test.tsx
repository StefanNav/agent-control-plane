import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Tabs } from './Tabs'

test('current tab has aria-current and linked tabs are links', () => {
  render(
    <MemoryRouter>
      <Tabs
        ariaLabel="Operations"
        current="board"
        items={[
          { id: 'board', label: 'Board', to: '/operations' },
          { id: 'inbox', label: 'Inbox · 4', to: '/operations/inbox' },
        ]}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Inbox · 4' })).not.toHaveAttribute('aria-current')
  expect(screen.getByRole('link', { name: 'Inbox · 4' })).toHaveAttribute('href', '/operations/inbox')
})

test('unlinked tabs report selection', async () => {
  const onSelect = vi.fn()
  render(
    <Tabs
      ariaLabel="Agent"
      current="overview"
      onSelect={onSelect}
      items={[
        { id: 'overview', label: 'Overview' },
        { id: 'history', label: 'History' },
      ]}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'History' }))
  expect(onSelect).toHaveBeenCalledWith('history')
})

test('unlinked tabs are a switch: pressed, not a current page (Phase 9)', () => {
  render(
    <Tabs
      ariaLabel="Fix one thing"
      current="overview"
      onSelect={() => {}}
      items={[
        { id: 'overview', label: 'Overview' },
        { id: 'history', label: 'History' },
      ]}
    />,
  )
  expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'Overview' })).not.toHaveAttribute('aria-current')
})
