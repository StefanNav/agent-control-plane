import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Menu } from './Menu'

function setup() {
  const onPause = vi.fn()
  const onRetire = vi.fn()
  render(
    <Menu
      trigger={({ toggle, ref, open }) => (
        <button ref={ref} onClick={toggle} aria-expanded={open}>
          Controls
        </button>
      )}
      groups={[
        { label: 'Scope', items: [{ id: 'pause', label: 'Pause agent', onSelect: onPause }] },
        { items: [{ id: 'retire', label: 'Retire agent', onSelect: onRetire, locked: true }] },
      ]}
    />,
  )
  return { onPause, onRetire }
}

test('opens on trigger click and focuses the first item', async () => {
  setup()
  expect(screen.queryByRole('menu')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Controls' }))
  expect(screen.getByRole('menu')).toBeInTheDocument()
  expect(screen.getByRole('menuitem', { name: 'Pause agent' })).toHaveFocus()
})

test('ArrowDown moves focus between items', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Controls' }))
  await userEvent.keyboard('{ArrowDown}')
  expect(screen.getByRole('menuitem', { name: /Retire agent/ })).toHaveFocus()
})

test('selecting an item calls onSelect and closes', async () => {
  const { onPause } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Controls' }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Pause agent' }))
  expect(onPause).toHaveBeenCalled()
  expect(screen.queryByRole('menu')).toBeNull()
})

test('locked items are aria-disabled and do nothing', async () => {
  const { onRetire } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Controls' }))
  const retire = screen.getByRole('menuitem', { name: /Retire agent/ })
  expect(retire).toHaveAttribute('aria-disabled', 'true')
  await userEvent.click(retire)
  expect(onRetire).not.toHaveBeenCalled()
})

test('Escape closes and returns focus to the trigger', async () => {
  setup()
  const trigger = screen.getByRole('button', { name: 'Controls' })
  await userEvent.click(trigger)
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('menu')).toBeNull()
  expect(trigger).toHaveFocus()
})
