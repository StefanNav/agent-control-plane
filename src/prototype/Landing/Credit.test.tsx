import { render, screen } from '@testing-library/react'
import { Credit } from './Credit'

test('says who narrates, as text', () => {
  render(<Credit name="Stefan" />)
  expect(screen.getByText('Narrated by Stefan')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('shows a small round photo beside the credit when it has one', () => {
  render(<Credit name="Stefan" src="/tour/stefan.jpg" />)
  expect(screen.getByText('Narrated by Stefan')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Stefan' })).toHaveAttribute('src', '/tour/stefan.jpg')
})
