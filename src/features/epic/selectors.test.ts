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
