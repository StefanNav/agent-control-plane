import { installKeyboardFocusMode } from './focus'

afterEach(() => {
  delete document.documentElement.dataset.keyboard
})

test('Tab turns keyboard mode on, mousedown turns it off', () => {
  const stop = installKeyboardFocusMode(document)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
  expect(document.documentElement.dataset.keyboard).toBe('true')
  document.dispatchEvent(new MouseEvent('mousedown'))
  expect(document.documentElement.dataset.keyboard).toBeUndefined()
  stop()
})

test('arrow keys also turn keyboard mode on', () => {
  const stop = installKeyboardFocusMode(document)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
  expect(document.documentElement.dataset.keyboard).toBe('true')
  stop()
})

test('other keys leave keyboard mode off', () => {
  const stop = installKeyboardFocusMode(document)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
  expect(document.documentElement.dataset.keyboard).toBeUndefined()
  stop()
})

test('cleanup removes listeners', () => {
  const stop = installKeyboardFocusMode(document)
  stop()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
  expect(document.documentElement.dataset.keyboard).toBeUndefined()
})
