import { createSeed } from '../../data/seed'
import { applyFlag } from '../../store/feedback'
import { selectEpic } from './selectors'

test('10a: Ana’s Epic stand-in shows today’s draft with her edit, and her panel', () => {
  const view = selectEpic(createSeed(), 'ana')!
  expect(view.patient).toEqual({ name: 'Harper, Lillian', facts: ['78 y · F', 'MRN 00412873', '7 West · 712-B', 'Allergy: penicillin', 'Admitted 08 Dec 06:40'] })
  expect(view.subline).toBe('Drafted by Med Rec Agent at 09:32 · review each line before you verify')
  expect(view.rows).toHaveLength(6)
  expect(view.rows[0]).toEqual({ med: 'Metoprolol tartrate 25 mg tab', dose: '25 mg', route: 'PO', frequency: 'BID', was: 'every 12 h + BID', editedByYou: true, lastTaken: '08 Dec 08:00', source: 'Outside fill 23 Nov' })
  expect(view.rows[3]).toMatchObject({ med: 'Furosemide 20 mg tab', source: 'Admission interview' })
  expect(view.rows[4]).toMatchObject({ med: 'Latanoprost 0.005 % drops', route: 'Each eye', lastTaken: '07 Dec 21:00', source: 'Outside fill 02 Nov' })
  expect(view.panel).toEqual({
    agent: 'Med Rec Agent',
    build: 'v1.3.0',
    sub: 'Draft for this admission · DR-88412 · 09:32',
    sources: 'Outside pharmacy fills · Epic home med list · admission interview note',
    did: 'Matched 6 medications, marked 1 possible duplicate, changed no doses (HS-04)',
    edits: '1 · metoprolol frequency',
  })
  expect(view.form).toEqual({ to: 'Flag this draft to Marcus', edit: { title: 'Metoprolol tartrate 25 mg · frequency', from: 'every 12 h + BID', to: 'BID' }, reason: 'frequency', footer: 'Sends the draft, your edit and the agent’s trace to Marcus’s inbox. You stay in Epic.' })
  expect(view.flags.head).toBe('Your flags · 2')
  expect(view.flags.items.map((f) => [f.code, f.title, f.status, f.note])).toEqual([
    ['FB-2286', 'Missed eye drops from an outside record', 'In progress · Marcus', 'Adding Pyxis dispense history as a source'],
    ['FB-2277', 'Duplicate apixaban line', 'Not a defect', 'Two fills from different pharmacies; the agent listed both and marked the duplicate for you.'],
  ])
  expect(view.flagged).toBeNull()
  expect(view.canFlag).toBe(true)
  expect(view.trace.map((t) => t.title)).toContain('No dose changed')
})

test('after sending, the button reads "Flagged · FB-2291" and the flag is in the list', () => {
  const s = applyFlag(createSeed(), { draftId: 'DR-88412', reason: 'frequency' }, 'ana', '2026-12-08T09:52:00')
  const view = selectEpic(s, 'ana')!
  expect(view.flagged).toEqual({ code: 'FB-2291', confirm: 'Flag FB-2291 sent to Marcus. You’ll see here when it leads to a fix.' })
  expect(view.flags.head).toBe('Your flags · 3')
  expect(view.flags.items.map((f) => f.status)).toEqual(['In progress · Marcus', 'Sent · Marcus', 'Not a defect'])
})

test('anyone but a pharmacist sees it read only', () => {
  const view = selectEpic(createSeed(), 'marcus')!
  expect(view.canFlag).toBe(false)
  expect(view.readOnlyNote).toBe('Viewing Ana R.’s Epic stand-in. Only pharmacists flag drafts here.')
})

describe('10b: nine days later (epic-fixed-later)', () => {
  test('the scenario: 17 Dec 09:52, v1.5.0 accepted on 16 Dec, FB-2291 fixed with Marcus’s reply, Okafor’s draft today', async () => {
    const { buildScenario } = await import('../../data/scenarios')
    const s = buildScenario('epic-fixed-later')
    expect(s.now).toBe('2026-12-17T09:52:00')
    expect(s.agents.find((a) => a.id === 'med-rec')).toMatchObject({ version: 'v1.5.0', sop: 'v1.5' })
    expect(s.changes[0]).toMatchObject({ status: 'accepted', closedAt: '2026-12-16T08:30:00' })
    expect(s.flags.find((f) => f.code === 'FB-2291')).toMatchObject({ status: 'fixed', fixedIn: 'v1.5.0', reply: { by: 'marcus', text: 'Thanks. This caused the edit-rate jump on 7 West.' } })
    expect(s.epicDrafts.at(-1)!.id).toBe('DR-90455')
  })

  test('Ana sees her flag led to a fix, today’s draft, and her three flags', async () => {
    const { buildScenario } = await import('../../data/scenarios')
    const s = buildScenario('epic-fixed-later')
    const view = selectEpic(s, 'ana')!
    expect(view.patient).toEqual({ name: 'Okafor, James', facts: ['66 y · M', 'MRN 00419920', '8 East · 804-A', 'Allergy: none known', 'Admitted 17 Dec 05:55'] })
    expect(view.subline).toBe('Drafted by Med Rec Agent v1.5.0 at 08:14 · review each line before you verify')
    expect(view.rows.map((r) => [r.med, r.dose, r.source])).toEqual([
      ['Lisinopril 10 mg tab', '10 mg', 'Outside fill 03 Dec'],
      ['Metformin 500 mg tab', '1,000 mg', 'Outside fill 03 Dec'],
      ['Amlodipine 5 mg tab', '5 mg', 'Epic list 27 Oct'],
      ['Tamsulosin 0.4 mg cap', '0.4 mg', 'Admission interview'],
      ['Insulin glargine 100 unit/mL', '18 units', 'Pyxis 15 Dec'],
    ])
    expect(view.panel.sub).toBe('Draft for this admission · DR-90455 · 08:14')
    expect(view.fix).toMatchObject({
      code: 'FB-2291',
      title: 'Frequency split into two lines',
      line: 'Fixed in v1.5.0, live since 16 Dec. 5 other pharmacists flagged the same thing.',
      quote: 'Marcus: “Thanks. This caused the edit-rate jump on 7 West.”',
    })
    expect(view.thisDraft).toBe('Drafted by v1.5.0 · 5 medications · no edits yet')
    expect(view.flags.head).toBe('Your flags · 3')
    expect(view.flags.items.map((f) => [f.code, f.status])).toEqual([
      ['FB-2291', 'Fixed in v1.5.0'],
      ['FB-2286', 'In progress · Marcus'],
      ['FB-2277', 'Not a defect'],
    ])
  })

  test('Dismiss hides the fix card but keeps the flag in the list', async () => {
    const { buildScenario } = await import('../../data/scenarios')
    const store = (await import('../../store')).createDemoStore((await import('../../store/storage')).createMemoryStorage())
    store.getState().loadScenario('epic-fixed-later')
    store.getState().setPersona('ana')
    expect(store.getState().dismissFixNotice('fb-2291')).toEqual({ ok: true })
    const view = selectEpic(store.getState(), 'ana')!
    expect(view.fix).toBeNull()
    expect(view.flags.items[0]!.status).toBe('Fixed in v1.5.0')
    store.getState().setPersona('marcus')
    expect(store.getState().dismissFixNotice('fb-2291').ok).toBe(false)
    expect(buildScenario('epic-fixed-later').flags.find((f) => f.id === 'fb-2291')!.seenFixAt).toBeUndefined()
  })
})
