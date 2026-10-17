import type { ScenarioId } from '../data/scenarios'
import { createSeed } from '../data/seed'
import type { AgentException, PersonaId } from '../data/types'
import { selectDivisionSummaries, selectOpenExceptions } from '../features/board/selectors'
import { endOfDayDeadline, RESUME_ITEM } from './handoffs'
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

describe('H2 · a resume request reaches the other approver', () => {
  const REASON = 'Dose mapping fixed; replayed clean.'
  const requested = () => {
    const store = at('med-rec-paused', 'marcus')
    expect(store.getState().requestResume('med-rec', REASON)).toEqual({ ok: true })
    return store
  }
  const resumeItems = (store: ReturnType<typeof fresh>) => store.getState().exceptions.filter((e) => e.type === RESUME_ITEM)

  test('Marcus asks: Priya gets "Review: resume", due 17:00 today', () => {
    const items = resumeItems(requested())
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      agentId: 'med-rec',
      state: 'new',
      status: 'review',
      ownerId: 'priya',
      copied: ['marcus'],
      reason: 'Marcus asks to resume Med Rec Agent. Paused by Marcus at 09:47.',
      action: 'approve or decline the resume',
      actionSub: 'It stays paused until you agree',
      link: { label: 'Open the resume request', to: '/operations/agents/med-rec' },
      deadline: '2026-12-08T17:00:00',
    })
  })

  test('Priya approves: it closes as Approved', () => {
    const store = requested()
    store.getState().setPersona('priya')
    expect(store.getState().approveResume('med-rec', 'Root cause fixed.').ok).toBe(true)
    expect(resumeItems(store)[0]).toMatchObject({ state: 'resolved', outcome: 'Approved', closedBy: 'priya' })
  })

  test('Priya declines: it closes as Declined, and Marcus is told in the log', () => {
    const store = requested()
    store.getState().setPersona('priya')
    expect(store.getState().declineResume('med-rec', 'Replay the newer-fill cases first.').ok).toBe(true)
    const s = store.getState()
    expect(resumeItems(store)[0]).toMatchObject({ state: 'resolved', outcome: 'Declined', closedBy: 'priya' })
    expect(s.logEvents.at(-1)).toMatchObject({
      agentId: 'med-rec',
      text: 'Priya declined resuming Med Rec Agent',
      sub: 'Replay the newer-fill cases first. · Marcus told',
      to: ['marcus'],
    })
  })

  test('Marcus withdraws: it closes as Withdrawn', () => {
    const store = requested()
    expect(store.getState().withdrawResume('med-rec').ok).toBe(true)
    expect(resumeItems(store)[0]).toMatchObject({ state: 'resolved', outcome: 'Withdrawn' })
  })

  test('Review focus 2: disabling or retiring the agent leaves no open resume item', () => {
    const disabled = requested()
    disabled.getState().setPersona('dana')
    expect(disabled.getState().disableAgent('med-rec', 'Replaced by a vendor tool.').ok).toBe(true)
    expect(resumeItems(disabled)[0]).toMatchObject({ state: 'resolved', outcome: 'Agent disabled' })

    const retired = requested()
    retired.getState().setPersona('dana')
    expect(retired.getState().retireAgent('med-rec', { typedName: 'Med Rec Agent', reason: 'Replaced.' }).ok).toBe(true)
    expect(resumeItems(retired)[0].state).toBe('resolved')
  })

  test('scenario resume-requested: Priya has the open item from 11:58', () => {
    const store = at('resume-requested', 'priya')
    const items = resumeItems(store).filter(open)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ ownerId: 'priya', raisedAt: '2026-12-08T11:58:00', deadline: '2026-12-08T17:00:00' })
  })
})
