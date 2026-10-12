import { createMemoryStorage } from '../store/storage'
import { countsThisVisit, reportArrivalAt } from './analytics'

const visit = (search: string, storage = createMemoryStorage(), automated = false) =>
  countsThisVisit({ search, storage, automated })

test('an ordinary visit counts', () => {
  expect(visit('')).toBe(true)
})

test('?notrack opts this browser out, and later visits stay uncounted', () => {
  const storage = createMemoryStorage()
  expect(visit('?notrack', storage)).toBe(false)
  expect(visit('', storage)).toBe(false)
})

test('?track opts this browser back in', () => {
  const storage = createMemoryStorage()
  visit('?notrack', storage)
  expect(visit('?track', storage)).toBe(true)
  expect(visit('', storage)).toBe(true)
})

test('?notrack works alongside other parameters', () => {
  expect(visit('?tour=open&notrack')).toBe(false)
})

test('an automated browser is never counted', () => {
  const storage = createMemoryStorage()
  expect(visit('', storage, true)).toBe(false)
  expect(visit('', storage)).toBe(true)
})

test('opting out or back in says so in the console', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const storage = createMemoryStorage()
  visit('', storage)
  expect(info).not.toHaveBeenCalled()
  visit('?notrack', storage)
  expect(info).toHaveBeenLastCalledWith('Visits from this browser are no longer counted.')
  visit('?track', storage)
  expect(info).toHaveBeenLastCalledWith('Visits from this browser are counted again.')
  info.mockRestore()
})

test('the first page view is reported at the address the visitor opened', () => {
  const beforeSend = reportArrivalAt('https://example.app/for/polly?tour=open')
  // A tour link has moved on to its first screen by the time the script loads.
  expect(beforeSend({ type: 'pageview', url: 'https://example.app/operations?tour=open' })).toEqual({
    type: 'pageview',
    url: 'https://example.app/for/polly?tour=open',
  })
  expect(beforeSend({ type: 'pageview', url: 'https://example.app/about' })).toEqual({
    type: 'pageview',
    url: 'https://example.app/about',
  })
})

test('a custom event passes unchanged and leaves the arrival to the first page view', () => {
  const beforeSend = reportArrivalAt('https://example.app/for/polly')
  expect(beforeSend({ type: 'event', url: 'https://example.app/' })).toEqual({ type: 'event', url: 'https://example.app/' })
  expect(beforeSend({ type: 'pageview', url: 'https://example.app/' })?.url).toBe('https://example.app/for/polly')
})
