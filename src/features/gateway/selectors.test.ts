import { createSeed } from '../../data/seed'
import { selectGateway } from './selectors'

test('9b: three unregistered callers, the bot’s traffic, and what Dana can do', () => {
  const view = selectGateway(createSeed(), 'svc-dc-summary-bot', 'unregistered', 'dana')!
  expect(view.tabs.map((t) => t.label)).toEqual(['Unregistered · 3', 'Low volume · 7', 'Dismissed · 12'])
  expect(view.notice).toEqual({ lead: '3 callers this week have no registry record.', text: 'Each could be an agent working with no owner, no review and no hard stops. Their calls are logged, not blocked, until you decide.' })
  expect(view.rows[0]).toEqual({
    id: 'svc-dc-summary-bot',
    name: 'svc-dc-summary-bot',
    credential: 'Entra app · client 7f3a…c21',
    firstSeen: '22 Nov',
    calls: '2,318',
    reaches: ['Epic read · notes, 5 South', 'Teams write · 5 South channel'],
    owner: { name: 'K. Osei', sub: 'Hospital Medicine' },
    status: null,
  })
  expect(view.rows.map((r) => r.firstSeen)).toEqual(['22 Nov', '03 Dec', '05 Dec'])
  const d = view.detail!
  expect(d.seen).toBe('Seen for 16 days · last call 2 min ago')
  expect(d.does).toBe('Reads discharge notes on 5 South and posts a summary to the 5 South team channel in Teams.')
  expect(d.patientData).toEqual({ flag: 'Notes leave Epic', note: 'Channel has 46 members' })
  expect(d.registeredBy).toBe('K. Osei, Hospital Medicine, on 18 Nov')
  expect(d.looksLike).toBe('Discharge Huddle Summary Agent · REQ-0081, intake approved 06 Nov, never onboarded')
  expect(d.start).toEqual({ label: 'Start onboarding from REQ-0081', to: '/inventory/agents/discharge-huddle/onboarding/intake' })
  expect(d.message).toBe('Message K. Osei')
  expect(d.caution).toEqual({ lead: 'Talk to K. Osei first.', text: 'Blocking stops calls within a minute, and 5 South may rely on the summaries.' })
  expect(d.canDecide).toBe(true)
})

test('a caller with no matching intake and no known owner', () => {
  const d = selectGateway(createSeed(), 'ed-triage-helper', 'unregistered', 'dana')!.detail!
  expect(d.start).toBeNull()
  expect(d.message).toBeNull()
  expect(d.noMatch).toBe('No intake matches this caller. Ask the owner to file one, or block it.')
})

test('the low-volume and dismissed tabs; an unknown caller is not found', () => {
  const s = createSeed()
  expect(selectGateway(s, null, 'low', 'dana')!.rows).toHaveLength(7)
  expect(selectGateway(s, null, 'dismissed', 'dana')!.rows).toHaveLength(12)
  expect(selectGateway(s, 'nope', 'unregistered', 'dana')).toBeNull()
  expect(selectGateway(s, null, 'unregistered', 'marcus')!.detail!.canDecide).toBe(false)
})
