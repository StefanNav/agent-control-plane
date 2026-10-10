import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { PersonaId } from '../../data/types'
import { useDemo } from '../../store'
import { AgentView } from './AgentView'

afterEach(() => useDemo.getState().reset())

async function openControlsAs(personaId: PersonaId) {
  useDemo.getState().setPersona(personaId)
  render(
    <MemoryRouter initialEntries={['/operations/agents/med-rec']}>
      <Routes>
        <Route path="/operations/agents/:agentId" element={<AgentView />} />
      </Routes>
    </MemoryRouter>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Controls' }))
  return screen.getByRole('menuitem', { name: /Pause this agent…/ })
}

test('the tour can press "Pause this agent…" for a person who may pause', async () => {
  const item = await openControlsAs('marcus')
  expect(item.querySelector('[data-story-target="controls-pause"]')).not.toBeNull()
})

test('a locked "Pause this agent…" gives the tour no target, so its click is a skip, not a silent no-op', async () => {
  const item = await openControlsAs('jordan')
  expect(item).toHaveAttribute('aria-disabled', 'true')
  expect(document.querySelector('[data-story-target="controls-pause"]')).toBeNull()
})
