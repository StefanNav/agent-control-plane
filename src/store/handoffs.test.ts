import { buildScenario, type ScenarioId } from '../data/scenarios'
import { rewindTo } from '../data/scenarios/rewind'
import { createSeed } from '../data/seed'
import type { AgentException, PersonaId } from '../data/types'
import { selectDivisionSummaries, selectOpenExceptions } from '../features/board/selectors'
import { selectAgentExceptionCount, selectInbox } from '../features/inbox/selectors'
import { commanderItem, endOfDayDeadline, raiseResumeItem, RESUME_ITEM } from './handoffs'
import { createDemoStore } from './index'
import { applyStart, JOB_ITEM } from './onboarding'
import { promotionToSign, raisePromotionItem } from './promotions'
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
  test('the item is called "Job and systems to write"', () => {
    expect(JOB_ITEM).toBe('Job and systems to write')
  })

  test('Dana starts Med Rec: Marcus gets "Job and systems to write"', () => {
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
      short: 'from REQ-0093: write the job description, then systems and verbs',
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
      short: 'Marcus asks to resume it. Paused by Marcus at 09:47.',
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
    expect(resumeItems(retired)[0]!.state).toBe('resolved')
  })

  test('scenario resume-requested: Priya has the open item from 11:58', () => {
    const store = at('resume-requested', 'priya')
    const items = resumeItems(store).filter(open)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ ownerId: 'priya', raisedAt: '2026-12-08T11:58:00', deadline: '2026-12-08T17:00:00' })
  })
})

describe('H3 · opening an incident tells its commander', () => {
  const opened = (persona: PersonaId) => {
    const store = at('baseline', persona)
    expect(store.getState().openIncident('med-rec', { title: 'Dose changes proposed', actionIds: ['act-88213'] })).toEqual({ ok: true })
    return store
  }
  const commander = (store: ReturnType<typeof fresh>) => store.getState().exceptions.filter((e) => e.type === commanderItem('INC-0031'))

  test('Jordan opens INC-0031: Marcus, the commander, gets "Commander: INC-0031"', () => {
    const items = commander(opened('jordan'))
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      agentId: 'med-rec',
      state: 'new',
      status: 'review',
      ownerId: 'marcus',
      copied: ['jordan'],
      reason: 'Jordan opened INC-0031: Dose changes proposed',
      action: 'run the incident',
      actionSub: 'Root cause and corrections, each with an owner',
      link: { label: 'Open INC-0031', to: '/operations/incidents/inc-0031' },
      deadline: '2026-12-08T17:00:00',
    })
  })

  test('the commander opening it raises nothing', () => {
    expect(commander(opened('marcus'))).toHaveLength(0)
  })

  test('closing the incident closes the item', () => {
    const store = opened('jordan')
    store.getState().setPersona('marcus')
    expect(store.getState().closeIncident('inc-0031', 'No harm; HS-04 held every dose.').ok).toBe(true)
    expect(commander(store)[0]).toMatchObject({ state: 'resolved', outcome: 'Incident closed', closedBy: 'marcus' })
  })

  test('scenario resume-requested: Marcus has the open item for INC-0031 from 10:05', () => {
    const items = commander(at('resume-requested', 'marcus')).filter(open)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ ownerId: 'marcus', copied: ['jordan'], raisedAt: '2026-12-08T10:05:00' })
  })
})

describe('H4 · a promotion waiting for the sponsor reaches their inbox', () => {
  const TYPE = promotionToSign('Allergy Recon Agent')
  const items = (s: { exceptions: AgentException[] }) => s.exceptions.filter((e) => e.type === TYPE)

  test('seed: PRM-0007 waits for Priya as EXC-5468, due the day before the 09 Dec board', () => {
    expect(items(createSeed())).toEqual([
      expect.objectContaining({
        id: 'exc-5468',
        code: 'EXC-5468',
        agentId: 'allergy-recon',
        state: 'new',
        status: 'review',
        kind: 'review',
        ownerId: 'priya',
        copied: ['marcus'],
        reason: 'Marcus asks to promote a branch to Supervised: add an allergy from outside records',
        action: 'sign or send back',
        actionSub: 'Tier 3: after you sign, the board decides on 09 Dec',
        link: { label: 'Open the promotion', to: '/inventory/promotions/prm-0007' },
        raisedAt: '2026-11-25T11:00:00',
        deadline: '2026-12-08T17:00:00',
      }),
    ])
  })

  test('the seeded item is exactly what the store raises', () => {
    const s = createSeed()
    const seeded = items(s)[0]!
    s.exceptions = s.exceptions.filter((e) => e.id !== 'exc-5468')
    raisePromotionItem(s, 'prm-0007', 'marcus', '2026-11-25T11:00:00')
    const raised = items(s)[0]!
    expect({ ...raised, id: seeded.id, code: seeded.code }).toEqual(seeded)
  })

  test('Review focus 4: signing closes it; returning closes it; sending again raises one new item', () => {
    const signed = at('baseline', 'priya')
    expect(signed.getState().signPromotion('prm-0007', { reason: 'Only adds caution.', accepted: true }).ok).toBe(true)
    expect(items(signed.getState())[0]).toMatchObject({ state: 'resolved', outcome: 'Signed' })

    const store = at('baseline', 'priya')
    expect(store.getState().returnPromotion('prm-0007', 'Show me the 2 defects first.').ok).toBe(true)
    expect(items(store.getState())[0]).toMatchObject({ state: 'resolved', outcome: 'Sent back' })
    store.getState().setPersona('marcus')
    expect(store.getState().resendPromotion('prm-0007').ok).toBe(true)
    const open_ = items(store.getState()).filter(open)
    expect(open_).toHaveLength(1)
    expect(open_[0]).toMatchObject({ ownerId: 'priya', copied: ['marcus'], raisedAt: store.getState().now })
  })

  test('the board sending it back for re-review asks Priya again', () => {
    const store = at('promotion-at-board', 'drlee')
    expect(store.getState().decidePromotion('prm-0007', { kind: 'reReview', conditions: [], reason: 'What did the 2 defects have in common?' }).ok).toBe(true)
    const open_ = items(store.getState()).filter(open)
    expect(open_).toHaveLength(1)
    expect(open_[0]).toMatchObject({ ownerId: 'priya', copied: ['drlee'], reason: 'Back from the board: What did the 2 defects have in common?' })
  })
})

describe('seed: the Culture Follow-up draft waits on Marcus, in his inbox', () => {
  test('the draft started 03 Dec, and EXC-5491 asks Marcus for the job and systems by 10 Dec', () => {
    const s = createSeed()
    const record = s.onboardings.find((r) => r.agentId === 'culture-followup')!
    expect(record).toMatchObject({ startedAt: '2026-12-03T10:00:00', done: { intake: { at: '2026-12-03T10:00:00', by: 'dana' } } })
    expect(record.history[0]).toMatchObject({ at: '2026-12-03T10:00:00' })
    expect(s.intakeRequests.find((r) => r.id === 'req-0099')!.startedAt).toBe('2026-12-03T10:00:00')
    expect(s.exceptions.find((e) => e.id === 'exc-5491')).toMatchObject({
      code: 'EXC-5491',
      type: JOB_ITEM,
      state: 'new',
      agentId: 'culture-followup',
      ownerId: 'marcus',
      copied: ['dana'],
      reason: 'Culture Follow-up Agent from REQ-0099: write the job description, then systems and verbs',
      actionSub: 'Then systems and verbs. Sam tests the hard stops after.',
      link: { label: 'Open the job description', to: '/inventory/agents/culture-followup/onboarding/job' },
      raisedAt: '2026-12-03T10:00:00',
      deadline: '2026-12-10T17:00:00',
    })
  })

  test('the seeded item is exactly what starting onboarding raises', () => {
    const seeded = createSeed().exceptions.find((e) => e.id === 'exc-5491')!
    const s = createSeed()
    s.exceptions = s.exceptions.filter((e) => e.id !== 'exc-5491')
    s.onboardings = s.onboardings.filter((r) => r.agentId !== 'culture-followup')
    s.agents = s.agents.filter((a) => a.id !== 'culture-followup')
    applyStart(s, 'req-0099', { ownerId: 'marcus', techOwnerId: 'sam' }, 'dana', '2026-12-03T10:00:00')
    const raised = s.exceptions.find((e) => e.type === JOB_ITEM && e.agentId === 'culture-followup')!
    expect({ ...raised, id: seeded.id, code: seeded.code }).toEqual(seeded)
  })

  test('Review focus 1: rewinding to October drops both December hand-offs', () => {
    const s = rewindTo(createSeed(), '2026-10-01T09:05:00')
    expect(s.exceptions.some((e) => e.id === 'exc-5468' || e.id === 'exc-5491')).toBe(false)
  })
})

describe('FYIs go to the log, addressed to the person told', () => {
  const openCount = (store: ReturnType<typeof fresh>) => store.getState().exceptions.filter(open).length

  test('H5: Sam returns admission med rec to Shadow; Priya is told, and nothing reaches an inbox', () => {
    const store = at('baseline', 'sam')
    const before = openCount(store)
    expect(store.getState().returnToShadow('med-rec-admission', 'Dose proposals on 3 admissions today.').ok).toBe(true)
    expect(openCount(store)).toBe(before)
    expect(store.getState().logEvents.at(-1)).toMatchObject({
      agentId: 'med-rec',
      text: 'Sam returned Reconcile home medications at admission to Shadow',
      sub: 'PRV-0142 v3 closed · Priya told',
      to: ['priya'],
    })
  })

  test('H5: the sponsor returning it tells nobody', () => {
    const store = at('baseline', 'priya')
    const before = store.getState().logEvents.length
    expect(store.getState().returnToShadow('med-rec-admission', 'Holding until the fix.').ok).toBe(true)
    expect(store.getState().logEvents.slice(before).some((e) => e.text.includes('returned'))).toBe(false)
  })

  test('H6: Flag for SOP is shared with the technical owner', () => {
    const store = at('shadow-day-21', 'marcus')
    expect(store.getState().flagCaseLine('enc-4105', 4).ok).toBe(true)
    expect(store.getState().logEvents.at(-1)).toMatchObject({ sub: 'Shared with Sam to check the SOP mapping · Marcus', to: ['sam'] })
  })
})

describe('final review fixes', () => {
  test('fix 1: in 9a the gateway’s re-validation items stay on the boards, because they explain Med Rec’s judgment', async () => {
    const { selectWall } = await import('../features/board/selectors')
    const s = buildScenario('change-detected-v150')
    const revalidate = s.exceptions.find((e) => e.type === 'Re-validation needed')!
    expect(selectOpenExceptions(s).map((r) => r.id)).toContain(revalidate.id)
    const medications = selectWall(s).attention.find((d) => d.id === 'medications')!
    expect(medications.items.map((i) => i.fullName)).toContain('Med Rec Agent')
    expect(selectAgentExceptionCount(s, 'marcus')).toBe(selectInbox(s, 'marcus').needsMe.filter((i) => i.type !== 'Job and systems to write').length)
  })

  test('fix 1: the division board’s Work button counts agent exceptions, not hand-offs (baseline: 4)', () => {
    expect(selectAgentExceptionCount(createSeed(), 'marcus')).toBe(4)
  })

  test('fix 2: after an owner change, a partial approval hands the resume to whoever still has to agree', () => {
    const store = at('resume-requested', 'dana')
    expect(store.getState().updateDivisionSettings('medications', { ownerId: 'elena' }).ok).toBe(true)
    store.getState().setPersona('priya')
    expect(store.getState().approveResume('med-rec', 'Fixed and replayed.').ok).toBe(true)
    const items = store.getState().exceptions.filter((e) => e.type === RESUME_ITEM)
    expect(items.find((e) => e.ownerId === 'priya')).toMatchObject({ state: 'resolved', outcome: 'Approved' })
    expect(items.filter(open)).toEqual([expect.objectContaining({ ownerId: 'elena', copied: ['marcus'] })])
  })

  test('fix 2: a request from someone not named on the agent asks both the owner and the sponsor', () => {
    // Tom holds an owner role in Medications but isn't named on Med Rec; personas can't be Tom, so drive the helper.
    const s = buildScenario('med-rec-paused')
    s.resumeRequests.push({ agentId: 'med-rec', requestedBy: 'tom', requestedAt: s.now, reason: 'Covering for Marcus today.', approvals: [{ personId: 'tom', reason: 'Covering for Marcus today.', at: s.now }] })
    raiseResumeItem(s, 'med-rec', 'tom', s.now)
    const owners = s.exceptions.filter((e) => e.type === RESUME_ITEM && open(e)).map((e) => e.ownerId).sort()
    expect(owners).toEqual(['marcus', 'priya'])
  })

  test('fix 2: an owner change moves the commander of the open incident with the commander item', () => {
    const store = at('resume-requested', 'dana')
    expect(store.getState().updateDivisionSettings('medications', { ownerId: 'elena' }).ok).toBe(true)
    const s = store.getState()
    expect(s.incidents.find((i) => i.id === 'inc-0031')!.commanderId).toBe('elena')
    expect(s.exceptions.find((e) => e.type === commanderItem('INC-0031'))).toMatchObject({ ownerId: 'elena' })
  })
})
