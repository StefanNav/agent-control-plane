import { render } from '@testing-library/react'
import { DefinitionList } from './DefinitionList'

test('renders dt/dd pairs in order', () => {
  const { container } = render(
    <DefinitionList
      items={[
        { key: 'Granted by', value: 'Priya' },
        { key: 'Review', value: '05 Jan' },
      ]}
    />,
  )
  expect(container.querySelector('dl')).not.toBeNull()
  expect([...container.querySelectorAll('dt')].map((n) => n.textContent)).toEqual(['Granted by', 'Review'])
  expect([...container.querySelectorAll('dd')].map((n) => n.textContent)).toEqual(['Priya', '05 Jan'])
})
