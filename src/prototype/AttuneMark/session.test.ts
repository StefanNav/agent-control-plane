import { forgetWelcomed, hasWelcomed, markWelcomed } from './session'

afterEach(() => {
  vi.restoreAllMocks()
  forgetWelcomed()
})

test('a session starts unwelcomed, and is welcomed once marked', () => {
  expect(hasWelcomed()).toBe(false)
  markWelcomed()
  expect(hasWelcomed()).toBe(true)
})

test('the flag lives in sessionStorage', () => {
  markWelcomed()
  expect(sessionStorage.getItem('attune-welcomed')).toBe('1')
  forgetWelcomed()
  expect(sessionStorage.getItem('attune-welcomed')).toBeNull()
  sessionStorage.setItem('attune-welcomed', '1')
  expect(hasWelcomed()).toBe(true)
})

test('when storage throws, the flag holds for the page instead', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(hasWelcomed()).toBe(false)
  expect(() => markWelcomed()).not.toThrow()
  expect(hasWelcomed()).toBe(true)
})
