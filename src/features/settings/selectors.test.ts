import { createSeed } from '../../data/seed'
import { selectDivisionSettings, selectNewDivision } from './selectors'

test('8a reads from data: counts, span and the lapse preview for the seed policy', () => {
  const view = selectDivisionSettings(createSeed(), 'medications', {}, 'dana')!
  expect(view.title).toBe('Medications')
  expect(view.sub).toBe('Division · 20 agents · 17 activities at Draft')
  expect(view.tabs.map((t) => t.label)).toEqual(['Settings', 'People and roles · 16', 'Agents · 20'])
  expect(view.divisions.head).toBe('DIVISIONS · 5')
  expect(view.divisions.rows[0]).toMatchObject({ id: 'medications', name: 'Medications', sub: 'Marcus · 20 agents', current: true })
  expect(view.span).toEqual({ lead: 'Marcus directly supervises 22 activities.', text: 'The guideline is 7. Splitting Medications in two keeps each owner within span.' })
  expect(view.lapse.value).toBe('shadow')
  expect(view.lapse.graceDays).toBe(14)
  expect(view.lapse.preview).toBe('Duplicate Rx Agent is 7 days past its review date. With this setting it returns to Shadow on 15 Dec.')
  expect(view.escalation.firstOptions.map((o) => o.label)).toEqual(['Priya · clinical sponsor', 'Marcus · agent owner', 'Dana · program lead'])
  expect(view.footer).toEqual({ changes: 0, line: 'No changes' })
  expect(view.editable).toBe(true)
})

test('the preview and the footer follow the draft', () => {
  const s = createSeed()
  expect(selectDivisionSettings(s, 'medications', { lapsePolicy: 'nothing' }, 'dana')!.lapse.preview).toBe(
    'Duplicate Rx Agent is 7 days past its review date. With this setting it keeps its level until someone acts.',
  )
  expect(selectDivisionSettings(s, 'medications', { lapsePolicy: 'shadowNow' }, 'dana')!.lapse.preview).toBe(
    'Duplicate Rx Agent is 7 days past its review date. With this setting it returns to Shadow when you save.',
  )
  expect(selectDivisionSettings(s, 'medications', { lapsePolicy: 'pause' }, 'dana')!.lapse.preview).toBe(
    'Duplicate Rx Agent is 7 days past its review date. With this setting its activity is paused when you save.',
  )
  expect(selectDivisionSettings(s, 'medications', { lapsePolicy: 'shadow', graceDays: 7 }, 'dana')!.lapse.preview).toBe(
    'Duplicate Rx Agent is 7 days past its review date. With this setting it returns to Shadow when you save.',
  )
  expect(selectDivisionSettings(s, 'medications', { lapsePolicy: 'shadowNow' }, 'dana')!.footer).toEqual({ changes: 1, line: '1 change · logged as Dana · Priya told' })
})

test('a division with nothing overdue names its next review; others read only', () => {
  const view = selectDivisionSettings(createSeed(), 'discharge', {}, 'marcus')!
  expect(view.lapse.preview).toMatch(/^No privilege in Discharge is past its review date\./)
  expect(view.editable).toBe(false)
  expect(view.span!.lead).toBe('Elena directly supervises 8 activities.')
  expect(selectDivisionSettings(createSeed(), 'imaging-referrals', {}, 'dana')!.span).toBeNull()
})

test('an unknown division has no settings', () => {
  expect(selectDivisionSettings(createSeed(), 'nope', {}, 'dana')).toBeNull()
})

test('the split modal lists the division’s agents, most activities first, and counts both spans', () => {
  const view = selectNewDivision(createSeed(), 'medications', { ownerId: 'elena', agentIds: ['tpn-draft', 'warfarin-check'] })
  expect(view.title).toBe('Split Medications')
  expect(view.agents[0]).toMatchObject({ id: 'med-rec', name: 'Med Rec Agent', activities: 2 })
  expect(view.agents.filter((a) => a.checked).map((a) => a.id)).toEqual(['tpn-draft', 'warfarin-check'])
  expect(view.line).toBe('Marcus keeps 20 activities · Elena takes 2')
  expect(view.button).toBe('Create division and move 2 agents')
  expect(selectNewDivision(createSeed(), null, { ownerId: 'elena', agentIds: [] })).toMatchObject({ title: 'New division', agents: [], line: null, button: 'Create division' })
})
