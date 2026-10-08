import { noticeMark } from './noticeMark'

test('a notice carries the mark of its status: teal ring for review only, dashed for stale', () => {
  expect(noticeMark('crit')).toBe('crit')
  expect(noticeMark('warn')).toBe('warn')
  expect(noticeMark('review')).toBe('review')
  expect(noticeMark('stale')).toBe('stale')
  expect(noticeMark('normal')).toBe('none')
  expect(noticeMark('paused')).toBe('none')
  expect(noticeMark('shadow')).toBe('none')
})
