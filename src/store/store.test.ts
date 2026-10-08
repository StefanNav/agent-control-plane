import { createSeed, SEED_VERSION } from '../data/seed'
import { DEMO_NOW } from '../lib/clock'
import { createDemoStore, dataOf } from './index'
import { runAction } from './runAction'
import { createMemoryStorage, safeStorage } from './storage'

const fresh = () => createDemoStore(createMemoryStorage())

test('setPersona switches who you are', () => {
  const store = fresh()
  store.getState().setPersona('jordan')
  expect(store.getState().personaId).toBe('jordan')
})

test('reset restores the seed and Marcus', () => {
  const store = fresh()
  store.getState().setPersona('jordan')
  store.getState().claimException('exc-5530')
  store.getState().reset()
  expect(dataOf(store.getState())).toEqual(createSeed())
})

test('runAction applies the change and logs who, what and when', () => {
  const state = createSeed()
  const { state: next, result } = runAction(state, {
    action: 'resolveException',
    ctx: { divisionId: 'medications' },
    audit: { action: 'Claimed', target: 'EXC-5530' },
    mutate: (draft) => {
      draft.exceptions.find((e) => e.id === 'exc-5530')!.state = 'claimed'
    },
  })
  const byId = (s: typeof state) => s.exceptions.find((e) => e.id === 'exc-5530')!
  expect(result).toEqual({ ok: true })
  expect(next).not.toBe(state)
  expect(byId(next).state).toBe('claimed')
  expect(byId(state).state).toBe('new')
  expect(next.audit).toEqual([{ id: 'aud-1', at: DEMO_NOW, who: 'marcus', action: 'Claimed', target: 'EXC-5530' }])
})

test('Review focus 5: an action the persona may not take changes nothing', () => {
  const state = { ...createSeed(), personaId: 'jordan' as const }
  const mutate = vi.fn()
  const { state: next, result } = runAction(state, {
    action: 'resolveException',
    ctx: { divisionId: 'medications' },
    audit: { action: 'Claimed', target: 'EXC-5530' },
    mutate,
  })
  expect(result).toEqual({ ok: false, reason: 'Read-only access' })
  expect(next).toBe(state)
  expect(mutate).not.toHaveBeenCalled()
})

test('claimException claims as the current persona, and refuses read-only', () => {
  const store = fresh()
  expect(store.getState().claimException('exc-5530')).toEqual({ ok: true })
  const exc = store.getState().exceptions.find((e) => e.id === 'exc-5530')!
  expect(exc).toMatchObject({ state: 'claimed', claimedAt: DEMO_NOW })

  const readOnly = fresh()
  readOnly.getState().setPersona('jordan')
  expect(readOnly.getState().claimException('exc-5530').ok).toBe(false)
  expect(readOnly.getState().exceptions.find((e) => e.id === 'exc-5530')!.state).toBe('new')
})

test('changes persist across store instances', () => {
  const storage = createMemoryStorage()
  createDemoStore(storage).getState().setPersona('priya')
  expect(createDemoStore(storage).getState().personaId).toBe('priya')
})

test('Review focus 1: saved state from an older seed version is discarded', () => {
  const storage = createMemoryStorage()
  storage.setItem(
    'acp-demo',
    JSON.stringify({ version: SEED_VERSION - 1, state: { personaId: 'jordan', agents: [{ id: 'old' }] } }),
  )
  const store = createDemoStore(storage)
  expect(dataOf(store.getState())).toEqual(createSeed())
})

test('Review focus 2: storage that throws falls back to memory', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
  })
  try {
    safeStorage.setItem('probe', 'value')
    expect(safeStorage.getItem('probe')).toBe('value')
    const store = createDemoStore(safeStorage)
    store.getState().setPersona('sam')
    expect(store.getState().personaId).toBe('sam')
  } finally {
    vi.unstubAllGlobals()
  }
})

describe('hydration rejects saved state that is not a full current snapshot (Review focus 1)', () => {
  const load = (raw: string) => {
    const storage = createMemoryStorage()
    storage.setItem('acp-demo', raw)
    return dataOf(createDemoStore(storage).getState())
  }
  const current = () => ({ ...createSeed(), personaId: 'priya' })

  test('corrupt JSON', () => {
    expect(load('{not json')).toEqual(createSeed())
  })
  test('a payload with no version', () => {
    expect(load(JSON.stringify({ state: { personaId: 'priya' } }))).toEqual(createSeed())
  })
  test('the current version but missing data', () => {
    expect(load(JSON.stringify({ version: SEED_VERSION, state: { version: SEED_VERSION, personaId: 'priya' } }))).toEqual(createSeed())
  })
  test('an unknown persona', () => {
    const bad = { ...current(), personaId: 'nobody' }
    expect(load(JSON.stringify({ version: SEED_VERSION, state: bad }))).toEqual(createSeed())
  })
  test('a valid snapshot is kept', () => {
    expect(load(JSON.stringify({ version: SEED_VERSION, state: current() })).personaId).toBe('priya')
  })
})

describe('claiming an exception', () => {
  test('cannot claim what is already claimed or resolved; nothing changes or is logged', () => {
    const store = fresh()
    const before = store.getState().exceptions.find((e) => e.id === 'exc-5501')!
    expect(store.getState().claimException('exc-5501')).toEqual({ ok: false, reason: 'Already claimed' })
    expect(store.getState().claimException('exc-5521')).toEqual({ ok: false, reason: 'Already resolved' })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5501')!.claimedAt).toBe(before.claimedAt)
    expect(store.getState().audit).toEqual([])
  })
  test('claiming makes you the owner', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    expect(store.getState().claimException('exc-5530')).toEqual({ ok: true })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5530')!.ownerId).toBe('dana')
  })
})

test('snoozeException hides the item until the time and logs it; read-only is refused', () => {
  const store = fresh()
  expect(store.getState().snoozeException('exc-5512', '2026-12-08T10:52:00')).toEqual({ ok: true })
  const exc = store.getState().exceptions.find((e) => e.id === 'exc-5512')!
  expect(exc.snoozedUntil).toBe('2026-12-08T10:52:00')
  expect(store.getState().audit.at(-1)).toMatchObject({ who: 'marcus', action: 'Snoozed', target: 'EXC-5512', reason: 'until 10:52' })

  const readOnly = fresh()
  readOnly.getState().setPersona('jordan')
  expect(readOnly.getState().snoozeException('exc-5512', '2026-12-08T10:52:00')).toMatchObject({ ok: false })
  expect(readOnly.getState().exceptions.find((e) => e.id === 'exc-5512')!.snoozedUntil).toBeUndefined()
})

test('snoozeException refuses resolved items and unknown ids', () => {
  const store = fresh()
  expect(store.getState().snoozeException('exc-5521', '2026-12-08T10:52:00')).toEqual({ ok: false, reason: 'Already resolved' })
  expect(store.getState().snoozeException('nope', '2026-12-08T10:52:00')).toEqual({ ok: false, reason: 'Not found' })
})

describe('dismissException', () => {
  const input = { category: 'expected' as const, reason: 'Formulary update F-112 explains it.' }

  test('an empty reason is refused and nothing changes', () => {
    const store = fresh()
    const before = dataOf(store.getState())
    expect(store.getState().dismissException('exc-5512', { ...input, reason: '   ' })).toEqual({ ok: false, reason: 'A reason is required' })
    expect(dataOf(store.getState())).toEqual(before)
  })

  test('a valid dismissal closes the item and logs the reason', () => {
    const store = fresh()
    expect(store.getState().dismissException('exc-5512', input)).toEqual({ ok: true })
    const exc = store.getState().exceptions.find((e) => e.id === 'exc-5512')!
    expect(exc).toMatchObject({ state: 'dismissed', dismissReason: 'Formulary update F-112 explains it.', closedAt: DEMO_NOW })
    expect(store.getState().audit.at(-1)).toMatchObject({
      who: 'marcus',
      action: 'Dismissed',
      target: 'EXC-5512',
      reason: 'Expected change · Formulary update F-112 explains it.',
    })
  })

  test('tuning the rule is logged on the agent for the technical owner to confirm', () => {
    const store = fresh()
    store.getState().dismissException('exc-5512', { ...input, tune: 'Raise the MR-12 threshold for Renal Dosing Agent to 20 % until 11 Dec' })
    expect(store.getState().logEvents.at(-1)).toMatchObject({
      at: DEMO_NOW,
      agentId: 'renal-dosing',
      text: 'Raise the MR-12 threshold for Renal Dosing Agent to 20 % until 11 Dec',
      sub: 'Requested by Marcus · Sam is asked to confirm',
    })
  })

  test('read-only is refused', () => {
    const store = fresh()
    store.getState().setPersona('jordan')
    expect(store.getState().dismissException('exc-5512', input)).toMatchObject({ ok: false })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5512')!.state).toBe('new')
  })
})

test('assignException hands the item to someone else, keeps the previous owner copied and logs it', () => {
  const store = fresh()
  store.getState().loadScenario('stale-escalated')
  store.getState().setPersona('priya')
  expect(store.getState().assignException('exc-5508', 'sam')).toEqual({ ok: true })
  const exc = store.getState().exceptions.find((e) => e.id === 'exc-5508')!
  expect(exc.ownerId).toBe('sam')
  expect(exc.assignedAt).toBe('2026-12-08T12:00:00')
  expect(exc.copied).toEqual(expect.arrayContaining(['marcus', 'priya']))
  expect(store.getState().audit.at(-1)).toMatchObject({ who: 'priya', action: 'Assigned', target: 'EXC-5508', reason: 'to Sam' })
})

describe('answerQuestion', () => {
  test('answering closes the question with the answer, logged', () => {
    const store = fresh()
    expect(store.getState().answerQuestion('exc-5514', 'yes')).toEqual({ ok: true })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5514')).toMatchObject({
      state: 'resolved',
      outcome: 'Answered yes',
      closedAt: DEMO_NOW,
      closedBy: 'marcus',
    })
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Answered', target: 'EXC-5514', reason: 'Yes' })
  })

  test('only questions take an answer; read-only is refused', () => {
    const store = fresh()
    expect(store.getState().answerQuestion('exc-5512', 'no')).toEqual({ ok: false, reason: 'Not a question' })
    store.getState().setPersona('jordan')
    expect(store.getState().answerQuestion('exc-5514', 'no')).toMatchObject({ ok: false })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5514')!.state).toBe('new')
  })
})

test('dismissing records who closed it', () => {
  const store = fresh()
  store.getState().dismissException('exc-5512', { category: 'expected', reason: 'F-112.' })
  expect(store.getState().exceptions.find((e) => e.id === 'exc-5512')!.closedBy).toBe('marcus')
})

test('assignException as read-only or frontline changes nothing', () => {
  for (const persona of ['jordan', 'ana'] as const) {
    const store = fresh()
    store.getState().loadScenario('stale-escalated')
    store.getState().setPersona(persona)
    const before = dataOf(store.getState())
    expect(store.getState().assignException('exc-5508', 'sam')).toMatchObject({ ok: false })
    expect(dataOf(store.getState())).toEqual(before)
  }
})

describe('pauseAgent (6b)', () => {
  test('Marcus pauses Med Rec: paused judgment, drafts routed, audited as Paused', () => {
    const store = fresh()
    expect(store.getState().pauseAgent('med-rec', { scope: 'agent', reason: 'HS-04 blocked 3 dose changes.' })).toEqual({ ok: true })
    const agent = store.getState().agents.find((a) => a.id === 'med-rec')!
    expect(agent).toMatchObject({ lifecycle: 'paused', pausedBy: 'marcus', pausedAt: DEMO_NOW, judgment: { status: 'paused', label: 'Paused by Marcus' } })
    expect(agent.pause).toMatchObject({ scope: 'agent', routed: 12, reason: 'HS-04 blocked 3 dose changes.', wasJudgment: { status: 'review' } })
    expect(store.getState().audit.at(-1)).toMatchObject({ who: 'marcus', action: 'Paused', target: 'AGT-0123', reason: 'HS-04 blocked 3 dose changes.' })
  })

  test('a second pause is refused and changes nothing; Jordan is refused', () => {
    const store = fresh()
    store.getState().pauseAgent('med-rec', { scope: 'agent' })
    const before = dataOf(store.getState())
    expect(store.getState().pauseAgent('med-rec', { scope: 'agent' })).toEqual({ ok: false, reason: 'Already paused' })
    expect(dataOf(store.getState())).toEqual(before)
    const ro = fresh()
    ro.getState().setPersona('jordan')
    expect(ro.getState().pauseAgent('med-rec', { scope: 'agent' })).toMatchObject({ ok: false })
    expect(ro.getState().agents.find((a) => a.id === 'med-rec')!.lifecycle).toBe('live')
  })

  test('this activity only: the activity pauses, the agent keeps running', () => {
    const store = fresh()
    expect(store.getState().pauseAgent('med-rec', { scope: 'activity' })).toEqual({ ok: true })
    expect(store.getState().agents.find((a) => a.id === 'med-rec')!.lifecycle).toBe('live')
    expect(store.getState().activities.find((a) => a.id === 'med-rec-admission')!.paused).toBe(true)
  })

  test('every agent in Medications: the 19 not already paused, one audit entry', () => {
    const store = fresh()
    expect(store.getState().pauseAgent('med-rec', { scope: 'division' })).toEqual({ ok: true })
    const meds = store.getState().agents.filter((a) => a.divisionId === 'medications' && a.lifecycle !== 'retired')
    expect(meds.every((a) => a.lifecycle === 'paused')).toBe(true)
    expect(meds.filter((a) => a.pause?.scope === 'division')).toHaveLength(19)
    expect(store.getState().audit.filter((a) => a.action === 'Paused')).toHaveLength(1)
  })
})

describe('fix one thing (6c)', () => {
  const asSam = () => {
    const store = fresh()
    store.getState().setPersona('sam')
    return store
  }

  test('Sam returns admission med rec to Shadow: PRV-0142 v3 closes, v4 is drafted for Priya', () => {
    const store = asSam()
    expect(store.getState().returnToShadow('med-rec-admission', 'Dose proposals on 3 admissions today.')).toEqual({ ok: true })
    const st = store.getState()
    expect(st.activities.find((a) => a.id === 'med-rec-admission')!.level).toBe('shadow')
    expect(st.agents.find((a) => a.id === 'med-rec')!.level).toBe('shadow')
    const versions = st.privileges.filter((p) => p.code === 'PRV-0142').map((p) => [p.version, p.state, p.level, p.proposedLevel])
    expect(versions).toEqual([
      [3, 'closed', 'draft', undefined],
      [4, 'awaiting', 'shadow', 'draft'],
    ])
    expect(st.audit.at(-1)).toMatchObject({ who: 'sam', action: 'Returned to Shadow', target: 'AGT-0123', reason: 'Reconcile home medications at admission · Dose proposals on 3 admissions today.' })
  })

  test('a reason is required; Shadow can\'t go to Shadow; Jordan is refused', () => {
    const store = asSam()
    const before = dataOf(store.getState())
    expect(store.getState().returnToShadow('med-rec-admission', '  ')).toEqual({ ok: false, reason: 'A reason is required' })
    expect(store.getState().returnToShadow('med-rec-allergy', 'x')).toEqual({ ok: false, reason: 'Already in Shadow' })
    expect(dataOf(store.getState())).toEqual(before)
    const ro = fresh()
    ro.getState().setPersona('jordan')
    expect(ro.getState().returnToShadow('med-rec-admission', 'x')).toMatchObject({ ok: false })
  })

  test('revoking a tool removes one grant; an ungranted one is refused', () => {
    const store = asSam()
    expect(store.getState().revokeTool('med-rec', { system: 'Epic', verb: 'draft' }, 'Stop drafting while we look.')).toEqual({ ok: true })
    expect(store.getState().grants.find((g) => g.agentId === 'med-rec' && g.system === 'Epic')!.cells.draft).toBe('none')
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Revoked tool', target: 'AGT-0123', reason: 'Epic · draft · Stop drafting while we look.' })
    const before = dataOf(store.getState())
    expect(store.getState().revokeTool('med-rec', { system: 'Epic', verb: 'write' }, 'x')).toEqual({ ok: false, reason: 'Not granted' })
    expect(dataOf(store.getState())).toEqual(before)
  })
})

describe('two-person resume (6d, 6e) — Review focus 1', () => {
  const scenario = (persona: 'marcus' | 'priya' | 'dana' | 'jordan') => {
    const store = fresh()
    store.getState().loadScenario('resume-requested')
    store.getState().setPersona(persona)
    return store
  }

  test('Priya approves Marcus\'s request: the agent is live again with its judgment, audited Resumed', () => {
    const store = scenario('priya')
    expect(store.getState().approveResume('med-rec', 'Root cause fixed and replayed clean.')).toEqual({ ok: true })
    const st = store.getState()
    const agent = st.agents.find((a) => a.id === 'med-rec')!
    expect(agent.lifecycle).toBe('live')
    expect(agent.judgment).toMatchObject({ status: 'review', label: 'Review: 3 drafts' })
    expect(agent.pause).toBeUndefined()
    expect(st.resumeRequests).toHaveLength(0)
    expect(st.audit.at(-1)).toMatchObject({ who: 'priya', action: 'Resumed', target: 'AGT-0123', reason: 'Root cause fixed and replayed clean.' })
    expect(st.incidents.find((i) => i.code === 'INC-0031')!.timeline.at(-1)).toMatchObject({ title: 'Resume approved', sub: 'Priya' })
  })

  test('the requester can\'t approve their own request; nothing changes', () => {
    const store = scenario('marcus')
    const before = dataOf(store.getState())
    expect(store.getState().approveResume('med-rec', 'Looks fine.')).toEqual({ ok: false, reason: 'You already approved; the other person must' })
    expect(dataOf(store.getState())).toEqual(before)
  })

  test('Dana can\'t approve; nobody approves without a request or a reason', () => {
    const dana = scenario('dana')
    expect(dana.getState().approveResume('med-rec', 'x')).toMatchObject({ ok: false })
    const priya = fresh()
    priya.getState().setPersona('priya')
    expect(priya.getState().approveResume('med-rec', 'x')).toEqual({ ok: false, reason: 'No resume request' })
    expect(scenario('priya').getState().approveResume('med-rec', '  ')).toEqual({ ok: false, reason: 'A reason is required' })
  })

  test('requesting needs a paused agent, a reason, and no open request', () => {
    const store = fresh()
    expect(store.getState().requestResume('med-rec', 'x')).toEqual({ ok: false, reason: 'Not paused' })
    store.getState().pauseAgent('med-rec', { scope: 'agent' })
    expect(store.getState().requestResume('med-rec', ' ')).toEqual({ ok: false, reason: 'A reason is required' })
    expect(store.getState().requestResume('med-rec', 'Fixed in SOP v1.3.2.')).toEqual({ ok: true })
    expect(store.getState().resumeRequests[0]).toMatchObject({ agentId: 'med-rec', requestedBy: 'marcus', approvals: [{ personId: 'marcus' }] })
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Requested resume', target: 'AGT-0123' })
    expect(store.getState().requestResume('med-rec', 'Again.')).toEqual({ ok: false, reason: 'A resume request is already open' })
  })

  test('only the requester withdraws; the other person declines with a reason', () => {
    expect(scenario('priya').getState().withdrawResume('med-rec')).toEqual({ ok: false, reason: 'Only Marcus can withdraw this request' })
    const marcus = scenario('marcus')
    expect(marcus.getState().withdrawResume('med-rec')).toEqual({ ok: true })
    expect(marcus.getState().resumeRequests).toHaveLength(0)
    const priya = scenario('priya')
    expect(priya.getState().declineResume('med-rec', 'Wait for the new case set.')).toEqual({ ok: true })
    expect(priya.getState().resumeRequests).toHaveLength(0)
    expect(priya.getState().agents.find((a) => a.id === 'med-rec')!.lifecycle).toBe('paused')
    expect(priya.getState().audit.at(-1)).toMatchObject({ action: 'Declined resume', reason: 'Wait for the new case set.' })
  })
})

describe('disable or retire (6f) — Review focus 2, 3, 4', () => {
  const asDana = () => {
    const store = fresh()
    store.getState().setPersona('dana')
    return store
  }
  const input = { typedName: 'IV-to-Oral Agent', reason: 'Shadow agreement 82 % against a 90 % target after 42 days.' }

  test('Dana retires IV-to-Oral: archived as RET-07, access revoked, privileges closed', () => {
    const store = asDana()
    expect(store.getState().retireAgent('iv-to-oral', input)).toEqual({ ok: true })
    const st = store.getState()
    const agent = st.agents.find((a) => a.id === 'iv-to-oral')!
    expect(agent.lifecycle).toBe('retired')
    expect(agent.retirement).toMatchObject({ code: 'RET-07', by: 'dana', at: DEMO_NOW, reason: input.reason })
    expect(st.privileges.filter((p) => p.agentId === 'iv-to-oral').every((p) => p.state === 'closed')).toBe(true)
    expect(st.audit.at(-1)).toMatchObject({ who: 'dana', action: 'Retired', target: 'AGT-0141' })
  })

  test('a near-miss name, Marcus, or a second retire are refused and change nothing', () => {
    const store = asDana()
    const before = dataOf(store.getState())
    for (const typedName of ['iv-to-oral agent', 'IV to Oral Agent', 'IV-to-Oral']) {
      expect(store.getState().retireAgent('iv-to-oral', { ...input, typedName })).toEqual({ ok: false, reason: 'Type the agent’s name exactly' })
    }
    expect(store.getState().retireAgent('iv-to-oral', { ...input, reason: ' ' })).toEqual({ ok: false, reason: 'A reason is required' })
    expect(dataOf(store.getState())).toEqual(before)
    expect(store.getState().retireAgent('iv-to-oral', { ...input, typedName: '  IV-to-Oral Agent ' })).toEqual({ ok: true })
    expect(store.getState().retireAgent('iv-to-oral', input)).toEqual({ ok: false, reason: 'Already retired' })
    const marcus = fresh()
    expect(marcus.getState().retireAgent('iv-to-oral', input)).toMatchObject({ ok: false })
  })

  test('disabling revokes access but keeps the record on the board', () => {
    const store = asDana()
    expect(store.getState().disableAgent('med-rec', 'Pending vendor review.')).toEqual({ ok: true })
    const agent = store.getState().agents.find((a) => a.id === 'med-rec')!
    expect(agent).toMatchObject({ lifecycle: 'disabled', judgment: { status: 'paused', label: 'Disabled by Dana' } })
    expect(store.getState().grants.filter((g) => g.agentId === 'med-rec').every((g) => Object.values(g.cells).every((c) => c !== 'granted' && c !== 'changed'))).toBe(true)
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Disabled', target: 'AGT-0123' })
  })
})

test('Jordan opens an incident from ACT-88213 with the day\'s blocked actions linked (7a, 7c)', () => {
  const store = fresh()
  store.getState().setPersona('jordan')
  expect(store.getState().openIncident('med-rec', { title: 'Dose changes proposed on admission drafts', actionIds: ['act-88213', 'act-88199', 'act-88171'] })).toEqual({ ok: true })
  const inc = store.getState().incidents.at(-1)!
  expect(inc).toMatchObject({ code: 'INC-0031', agentId: 'med-rec', state: 'open', openedBy: 'jordan', commanderId: 'marcus', openedAt: DEMO_NOW })
  expect(inc.linkedActionIds).toEqual(['act-88213', 'act-88199', 'act-88171'])
  expect(inc.timeline.map((t) => t.title)).toEqual(['First dose change blocked', 'Blocked again', 'Blocked again', 'Jordan opened this incident'])
  expect(store.getState().audit.at(-1)).toMatchObject({ who: 'jordan', action: 'Opened incident', target: 'INC-0031' })
})

test('openIncident needs a title', () => {
  const store = fresh()
  expect(store.getState().openIncident('med-rec', { title: ' ', actionIds: [] })).toEqual({ ok: false, reason: 'A title is required' })
})

describe('incident record (7c)', () => {
  const at1158 = (persona: 'marcus' | 'jordan' | 'sam') => {
    const store = fresh()
    store.getState().loadScenario('resume-requested')
    store.getState().setPersona(persona)
    return store
  }

  test('the commander can\'t close while a correction is open; finishing it, then closing, works', () => {
    const store = at1158('marcus')
    expect(store.getState().closeIncident('inc-0031', 'All corrections done.')).toEqual({ ok: false, reason: 'Corrections still open (1)' })
    expect(store.getState().completeCorrection('inc-0031', 'c4')).toEqual({ ok: true })
    expect(store.getState().incidents.find((i) => i.id === 'inc-0031')!.corrections.find((c) => c.id === 'c4')).toMatchObject({ done: true, status: 'Done 11:58' })
    expect(store.getState().closeIncident('inc-0031', 'All corrections done.')).toEqual({ ok: true })
    expect(store.getState().incidents.find((i) => i.id === 'inc-0031')).toMatchObject({ state: 'closed', closedAt: '2026-12-08T11:58:00' })
    expect(store.getState().audit.at(-1)).toMatchObject({ who: 'marcus', action: 'Closed incident', target: 'INC-0031' })
  })

  test('only the correction\'s owner, the commander or the program lead completes a correction; Jordan adds entries', () => {
    const jordan = at1158('jordan')
    expect(jordan.getState().completeCorrection('inc-0031', 'c4')).toEqual({ ok: false, reason: 'Only Marcus or the commander can mark it done' })
    expect(jordan.getState().addIncidentEntry('inc-0031', 'Spoke with 7 West charge pharmacist.')).toEqual({ ok: true })
    expect(jordan.getState().incidents.find((i) => i.id === 'inc-0031')!.timeline.at(-1)).toMatchObject({ title: 'Spoke with 7 West charge pharmacist.', sub: 'Jordan' })
    expect(jordan.getState().addIncidentEntry('inc-0031', '  ')).toEqual({ ok: false, reason: 'An entry needs text' })
    expect(at1158('sam').getState().closeIncident('inc-0031', 'x')).toMatchObject({ ok: false })
  })
})

test('buildExport logs an export record (7d); it needs an agent; Jordan may build', () => {
  const store = fresh()
  store.getState().setPersona('dana')
  const input = { agentIds: ['med-rec'], from: '2026-11-06T00:00:00', to: '2026-12-08T00:00:00', format: 'packet' as const, masked: true }
  expect(store.getState().buildExport(input)).toEqual({ ok: true })
  expect(store.getState().exports.at(-1)).toMatchObject({ code: 'EXP-0004', by: 'dana', agentIds: ['med-rec'], at: DEMO_NOW })
  expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Built export', target: 'EXP-0004' })
  expect(store.getState().buildExport({ ...input, agentIds: [] })).toEqual({ ok: false, reason: 'Choose at least one agent' })
  store.getState().setPersona('jordan')
  expect(store.getState().buildExport(input)).toEqual({ ok: true })
})

describe('review fix: disable, pause and resume compose (Important #1)', () => {
  const disabledMedRec = () => {
    const store = fresh()
    store.getState().setPersona('dana')
    store.getState().disableAgent('med-rec', 'Vendor review.')
    store.getState().setPersona('marcus')
    return store
  }

  test('a disabled agent can\'t be paused, so it can\'t come back through resume', () => {
    const store = disabledMedRec()
    const before = dataOf(store.getState())
    expect(store.getState().pauseAgent('med-rec', { scope: 'agent' })).toEqual({ ok: false, reason: 'Disabled agents can’t be paused' })
    expect(store.getState().requestResume('med-rec', 'x')).toEqual({ ok: false, reason: 'Not paused' })
    expect(dataOf(store.getState())).toEqual(before)
  })

  test('a division pause skips disabled agents', () => {
    const store = disabledMedRec()
    store.getState().pauseAgent('renal-dosing', { scope: 'division' })
    expect(store.getState().agents.find((a) => a.id === 'med-rec')!).toMatchObject({ lifecycle: 'disabled' })
    expect(store.getState().agents.find((a) => a.id === 'med-rec')!.pause).toBeUndefined()
  })

  test('disabling or retiring a paused agent clears the pause and its resume request', () => {
    const store = fresh()
    store.getState().loadScenario('resume-requested')
    store.getState().setPersona('dana')
    expect(store.getState().disableAgent('med-rec', 'Vendor review.')).toEqual({ ok: true })
    const agent = store.getState().agents.find((a) => a.id === 'med-rec')!
    expect(agent.pause).toBeUndefined()
    expect(agent.pausedAt).toBeUndefined()
    expect(store.getState().resumeRequests).toHaveLength(0)
    store.getState().setPersona('priya')
    expect(store.getState().approveResume('med-rec', 'x')).toEqual({ ok: false, reason: 'No resume request' })
  })
})

describe('review fix: every pause can be resumed (Important #2, #3)', () => {
  test('an activity pause resumes through the two-person rule', () => {
    const store = fresh()
    store.getState().pauseAgent('med-rec', { scope: 'activity' })
    expect(store.getState().requestResume('med-rec', 'Cause found.')).toEqual({ ok: true })
    store.getState().setPersona('priya')
    expect(store.getState().approveResume('med-rec', 'Agreed.')).toEqual({ ok: true })
    expect(store.getState().activities.find((a) => a.id === 'med-rec-admission')!.paused).toBeUndefined()
    expect(store.getState().agents.find((a) => a.id === 'med-rec')!.pause).toBeUndefined()
  })

  test('the seeded paused Controlled Drug Agent resumes within scope', () => {
    const store = fresh()
    expect(store.getState().requestResume('controlled-drug', 'Checked; safe to restart.')).toEqual({ ok: true })
    store.getState().setPersona('priya')
    expect(store.getState().approveResume('controlled-drug', 'Agreed.')).toEqual({ ok: true })
    expect(store.getState().agents.find((a) => a.id === 'controlled-drug')).toMatchObject({ lifecycle: 'live', judgment: { status: 'normal', label: 'Within scope' } })
  })

  test('a pause goes on the agent\'s open incident record (re-graded minor)', () => {
    const store = fresh()
    store.getState().openIncident('med-rec', { title: 'Dose changes', actionIds: ['act-88213'] })
    store.getState().pauseAgent('med-rec', { scope: 'agent', reason: 'Until we know why.' })
    expect(store.getState().incidents.at(-1)!.timeline.at(-1)).toMatchObject({ title: 'Marcus paused the agent', sub: '12 drafts to pharmacists' })
  })
})
