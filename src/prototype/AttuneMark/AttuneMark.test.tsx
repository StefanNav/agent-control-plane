import { render } from '@testing-library/react'
import { AttuneMark } from './AttuneMark'
import { pebblePath, restPose, transformOf } from './geometry'

const mark = (view: ReturnType<typeof render>) => view.container.querySelector('svg')!

test('renders four decorative pebbles at their rest pose', () => {
  const svg = mark(render(<AttuneMark size={14} />))
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('focusable', 'false')
  expect(svg).toHaveAttribute('data-attune', 'mark')
  expect(svg).toHaveAttribute('viewBox', '-70 -65 140 130')
  expect(svg).toHaveAttribute('width', '14')
  expect(svg).toHaveAttribute('height', '13')
  const paths = [...svg.querySelectorAll('path')]
  expect(paths).toHaveLength(4)
  paths.forEach((path, i) => {
    expect(path).toHaveAttribute('d', pebblePath(i, 0, 1))
    expect(path).toHaveAttribute('transform', transformOf(restPose(i)))
  })
})

test('the top-left and bottom-right pebbles are deep, the others soft', () => {
  const paths = [...mark(render(<AttuneMark size={32} />)).querySelectorAll('path')]
  const deep = paths.map((path) => path.getAttribute('class'))
  expect(deep[0]).toBe(deep[3])
  expect(deep[1]).toBe(deep[2])
  expect(deep[0]).not.toBe(deep[1])
})

test('a tone for light surfaces by default, and one for the ink bar', () => {
  expect(mark(render(<AttuneMark size={16} />))).toHaveAttribute('data-tone', 'surface')
  expect(mark(render(<AttuneMark size={16} tone="ink" />))).toHaveAttribute('data-tone', 'ink')
})

test('a caller places it with a class', () => {
  expect(mark(render(<AttuneMark size={16} className="placed" />))).toHaveClass('placed')
})
