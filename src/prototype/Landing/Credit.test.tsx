import { render, screen } from '@testing-library/react'
import { Credit } from './Credit'

test('says who narrates, as text', () => {
  const { container } = render(<Credit name="Stefan" />)
  expect(screen.getByText('Narrated by Stefan')).toBeInTheDocument()
  expect(container.querySelector('img')).toBeNull()
})

test('shows a small round photo beside the credit when it has one, as decoration', () => {
  const { container } = render(<Credit name="Stefan" src="/tour/stefan.jpg" />)
  expect(screen.getByText('Narrated by Stefan')).toBeInTheDocument()
  // The text beside it already names the person (Ruling 33), so the photo has an empty alt.
  const photo = container.querySelector('img')
  expect(photo).toHaveAttribute('src', '/tour/stefan.jpg')
  expect(photo).toHaveAttribute('alt', '')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})
