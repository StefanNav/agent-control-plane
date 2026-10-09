import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useDemo } from '../../store'
import { ChangesTab } from './ChangesTab'

afterEach(() => useDemo.getState().reset())

const items = () => within(screen.getByRole('list', { name: 'Checks' })).getAllByRole('listitem')

test('each check says whether it is done, not only by its box (9a, Phase 9)', async () => {
  useDemo.getState().loadScenario('change-detected-v150')
  render(
    <MemoryRouter>
      <ChangesTab agentId="med-rec" />
    </MemoryRouter>,
  )
  expect(items().length).toBeGreaterThan(1)
  for (const item of items()) expect(item).toHaveTextContent(/^Not yet: /)
  const signOff = items().find((item) => within(item).queryByRole('button', { name: 'Sign off' }))!
  await userEvent.click(within(signOff).getByRole('button', { name: 'Sign off' }))
  expect(items().some((item) => /^Done: /.test(item.textContent ?? ''))).toBe(true)
})
