import type { ScenarioId } from '../data/scenarios'
import { createSeed } from '../data/seed'
import type { AgentException, PersonaId } from '../data/types'
import { selectDivisionSummaries, selectOpenExceptions } from '../features/board/selectors'
import { endOfDayDeadline } from './handoffs'
import { createDemoStore } from './index'
import { JOB_ITEM } from './onboarding'
import { createMemoryStorage } from './storage'

/** Phase 12: every hand-off reaches an inbox (spec 2026-10-17). */

const fresh = () => createDemoStore(createMemoryStorage())
const open = (e: AgentException) => e.state !== 'resolved' && e.state !== 'dismissed'

function at(scenario: ScenarioId, persona: PersonaId) {
  const store = fresh()
  store.getState().loadScenario(scenario)
  store.getState().setPersona(persona)
  return store
}

describe('endOfDayDeadline', () => {
  test('17:00 the same day before 15:00', () => {
    expect(endOfDayDeadline('2026-12-08T11:58:00')).toBe('2026-12-08T17:00:00')
  })
  test('17:00 the next day from 15:00 on', () => {
    expect(endOfDayDeadline('2026-12-08T15:00:00')).toBe('2026-12-09T17:00:00')
  })
})

describe('H1 · starting onboarding asks the owner', () => {
  test('Dana starts Med Rec: Marcus gets "Job: description and systems to write"', () => {
    const store = at('onboarding-intake', 'dana')
    expect(store.getState().startOnboarding('req-0093', { ownerId: 'marcus', techOwnerId: 'sam' })).toEqual({ ok: true })
    const items = store.getState().exceptions.filter((e) => e.type === JOB_ITEM && open(e))
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      agentId: 'med-rec',
      status: 'review',
      kind: 'review',
      ownerId: 'marcus',
      copied: ['dana'],
      reason: 'Med Rec Agent from REQ-0093: write the job description, then systems and verbs',
      action: 'write the job description',
      actionSub: 'Then systems and verbs. Sam tests the hard stops after.',
      link: { label: 'Open the job description', to: '/inventory/agents/med-rec/onboarding/job' },
      deadline: '2026-10-08T17:00:00',
    })
  })

  test('finishing systems and verbs closes it, as Sam is asked for the hard stops', () => {
    const store = at('onboarding-systems', 'marcus')
    expect(store.getState().exceptions.some((e) => e.type === JOB_ITEM && open(e))).toBe(true)
    store.getState().updateSystems('med-rec', { kind: 'reason', system: 'Microsoft Teams', verb: 'write', activity: 'escalation' })
    const s = store.getState()
    expect(s.exceptions.find((e) => e.type === JOB_ITEM)).toMatchObject({ state: 'resolved', outcome: 'Job and systems done', closedBy: 'marcus' })
    expect(s.exceptions.some((e) => e.type === 'Tools: hard stops to test' && open(e))).toBe(true)
  })

  test('Review focus 5: starting as the owner raises nothing for yourself', () => {
    const store = at('onboarding-intake', 'marcus')
    expect(store.getState().startOnboarding('req-0093', { ownerId: 'marcus', techOwnerId: 'sam' }).ok).toBe(true)
    expect(store.getState().exceptions.some((e) => e.type === JOB_ITEM)).toBe(false)
  })
})

describe('Review focus 3: hand-offs stay off the agent boards', () => {
  test('an open hand-off for Allergy Recon changes no division summary and no exceptions-first row', () => {
    const seed = createSeed()
    const withItem = createSeed()
    withItem.exceptions.push({
      ...withItem.exceptions.find((e) => e.id === 'exc-5530')!,
      id: 'exc-9999',
      code: 'EXC-9999',
      agentId: 'allergy-recon',
      type: 'Some hand-off',
      link: { label: 'Open it', to: '/somewhere' },
    })
    expect(selectDivisionSummaries(withItem)).toEqual(selectDivisionSummaries(seed))
    expect(selectOpenExceptions(withItem)).toEqual(selectOpenExceptions(seed))
  })
})
