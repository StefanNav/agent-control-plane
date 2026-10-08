import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

test('defaults to type="button"', () => {
  render(<Button>Save</Button>)
  expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
})

test('primary variant gets the primary class', () => {
  render(<Button variant="primary">Sign</Button>)
  expect(screen.getByRole('button', { name: 'Sign' }).className).toMatch(/primary/)
})

test('blocked is aria-disabled and swallows clicks', async () => {
  const onClick = vi.fn()
  render(
    <Button variant="blocked" onClick={onClick}>
      Send to Priya
    </Button>,
  )
  const button = screen.getByRole('button', { name: 'Send to Priya' })
  expect(button).toHaveAttribute('aria-disabled', 'true')
  await userEvent.click(button)
  expect(onClick).not.toHaveBeenCalled()
})

test('renders an icon before the label', () => {
  render(<Button icon={<svg data-testid="icon" />}>Pause</Button>)
  expect(screen.getByTestId('icon')).toBeInTheDocument()
})

test('locked: the designed locked state, focusable, with its reason announced', async () => {
  const onClick = vi.fn()
  render(
    <Button locked="Read-only access" onClick={onClick}>
      Pause agent
    </Button>,
  )
  const button = screen.getByRole('button', { name: 'Pause agent' })
  expect(button).toHaveAttribute('aria-disabled', 'true')
  expect(button).toHaveAccessibleDescription('Read-only access')
  expect(button).toHaveAttribute('title', 'Read-only access')
  expect(button.querySelector('[data-icon="lock"], svg')).not.toBeNull()
  button.focus()
  expect(button).toHaveFocus()
  await userEvent.click(button)
  expect(onClick).not.toHaveBeenCalled()
})
