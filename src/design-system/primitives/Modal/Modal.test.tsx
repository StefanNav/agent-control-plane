import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Modal } from './Modal'

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Pause…</button>
      <Modal
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="Pause Med Rec Agent?"
        audit="Logs Marcus · 09:47"
        actions={
          <>
            <button onClick={() => setOpen(false)}>Cancel</button>
            <button>Pause agent</button>
          </>
        }
      >
        <input aria-label="Reason" />
      </Modal>
    </>
  )
}

test('renders a labelled modal dialog with audit text', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: 'Pause…' }))
  const dialog = screen.getByRole('dialog', { name: 'Pause Med Rec Agent?' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(screen.getByText('Logs Marcus · 09:47')).toBeInTheDocument()
})

test('focus moves inside on open', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: 'Pause…' }))
  expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus()
})

test('Tab from the last focusable wraps to the first', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: 'Pause…' }))
  screen.getByRole('button', { name: 'Pause agent' }).focus()
  await userEvent.tab()
  expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus()
  await userEvent.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Pause agent' })).toHaveFocus()
})

test('Escape calls onClose', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: 'Pause…' }))
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})

test('closing returns focus to the opener', async () => {
  render(<Harness />)
  const opener = screen.getByRole('button', { name: 'Pause…' })
  await userEvent.click(opener)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(opener).toHaveFocus()
})

test('Shift+Tab and Tab from the dialog container stay inside', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('button', { name: 'Pause…' }))
  const dialog = screen.getByRole('dialog')
  dialog.focus()
  await userEvent.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Pause agent' })).toHaveFocus()
  dialog.focus()
  await userEvent.tab()
  expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus()
})

test('focus that escapes the dialog is pulled back, and Escape still closes', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  const opener = screen.getByRole('button', { name: 'Pause…' })
  await userEvent.click(opener)
  opener.focus()
  expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})

test('clicking the scrim does not close the dialog', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: 'Pause…' }))
  const scrim = document.querySelector('[data-scrim]')
  expect(scrim).not.toBeNull()
  await userEvent.click(scrim!)
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
