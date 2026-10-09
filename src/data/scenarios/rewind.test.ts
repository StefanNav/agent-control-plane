import { buildScenario } from './index'
import { createSeed } from '../seed'
import { rewindTo } from './rewind'

describe('rewindTo: the hospital as it stood at an earlier moment (Review focus 5)', () => {
  const s = rewindTo(createSeed(), '2026-10-04T08:41:00')
  const agent = (id: string) => s.agents.find((a) => a.id === id)!

  test('the clock moves back', () => {
    expect(s.now).toBe('2026-10-04T08:41:00')
  })

  test('nothing dated later survives', () => {
    expect(s.exceptions).toEqual([])
    expect(s.actions).toEqual([])
    expect(s.incidents).toEqual([])
    expect(s.exports).toEqual([])
    expect(s.logEvents).toEqual([])
    expect(s.changeEvents).toEqual([])
    expect(s.resumeRequests).toEqual([])
    expect(s.intakeRequests.map((r) => r.code)).toEqual(['REQ-0093'])
    expect(s.onboardings.map((r) => r.agentId)).toEqual(['med-rec'])
    expect(s.agents.find((a) => a.id === 'culture-followup')).toBeUndefined()
  })

  test('nobody has paused anything yet; the boards are calm', () => {
    expect(agent('controlled-drug')).toMatchObject({ lifecycle: 'live', judgment: { status: 'normal', label: 'Within scope' } })
    expect(agent('controlled-drug').pausedBy).toBeUndefined()
    expect(agent('prior-auth')).toMatchObject({ lifecycle: 'live', judgment: { status: 'normal', label: 'Within scope' } })
    expect(agent('renal-dosing').judgment).toEqual({ status: 'normal', label: 'Within scope' })
    expect(agent('iv-to-oral').judgment).toEqual({ status: 'shadow', label: 'Shadow' })
  })

  test('heartbeats are live a minute ago, including the agent that was stale', () => {
    expect(agent('formulary-swap').monitor.lastSeen).toBe('2026-10-04T08:40:00')
    expect(s.divisions.every((d) => d.monitor.state === 'live' && d.monitor.lastAt === '2026-10-04T08:40:00')).toBe(true)
  })

  test('divisions carry no page, incident, note or open exceptions', () => {
    const revenue = s.divisions.find((d) => d.id === 'revenue-cycle')!
    expect(revenue.page).toBeUndefined()
    expect(revenue.incidentId).toBeUndefined()
    expect(revenue.note).toBeUndefined()
    expect(revenue.resumeNeeds).toBeUndefined()
    expect(s.divisions.find((d) => d.id === 'medications')!.exceptionsByDay.every((n) => n === 0)).toBe(true)
  })

  test('a review that only falls due in December is active in October', () => {
    expect(s.privileges.find((p) => p.code === 'PRV-0098')!.state).toBe('active')
    expect(s.stats24h.lastHour).toEqual({ hardStops: 0, pauses: 0, pages: 0 })
  })
})

test('review fix M9: an October rewind drops this phase’s later callers, flags and Epic drafts', () => {
  const s = buildScenario('onboarding-intake')
  expect(s.callers.filter((c) => c.group === 'unregistered')).toEqual([])
  expect(s.callers.every((c) => c.firstSeen <= s.now && (!c.decision || c.decision.at <= s.now))).toBe(true)
  expect(s.flags.every((f) => f.at <= s.now)).toBe(true)
  expect(s.epicDrafts).toEqual([])
})

test('Phase 7: an October rewind rolls review levels back to that day (R17)', async () => {
  const { levelOf } = await import('../../store/levels')
  const s = rewindTo(createSeed(), '2026-10-07T09:05:00')
  expect(s.activities.find((a) => a.id === 'allergy-recon')!.reviewLevel).toBe('tightened')
  expect(levelOf(s, 'allergy-recon').changes.map((c) => c.at)).toEqual(['2026-10-06T06:00:00'])
  expect(s.activities.find((a) => a.id === 'duplicate-rx')!.reviewLevel).toBe('normal')
})
