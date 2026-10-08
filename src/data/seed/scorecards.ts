import type { SampleCase, Scorecard } from '../types'

/** A daily series that drifts from `start` to exactly `end` with a small, fixed wiggle (3a sparklines). */
function series(days: number, start: number, end: number, wiggle: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    if (i === days - 1) return end
    const base = start + ((end - start) * i) / (days - 1)
    return Math.round((base + wiggle * Math.sin(i * 1.7)) * 10) / 10
  })
}

/** Shadow results for Med Rec's two activities (3a). Admission is 3a verbatim; allergy is invented. */
export const scorecards: Scorecard[] = [
  {
    activityId: 'med-rec-admission',
    from: '2026-10-15T00:00:00',
    to: '2026-11-04T00:00:00',
    cases: 1118,
    results: {
      agreement: { value: 91.2, trend: series(21, 88.4, 91.2, 0.6) },
      omitted: { value: 2.1, trend: series(21, 3.4, 2.1, 0.3) },
      inaccurate: { value: 2.6, trend: series(21, 3.1, 2.6, 0.25) },
    },
    causes: [
      { label: 'Brand and generic names don’t match', count: 21, example: 'Lasix on the home list, furosemide in the formulary', fix: 'the name mapping' },
      { label: 'Strength taken from an old fill', count: 6, example: 'Lisinopril 10 mg filled in June, 20 mg since August' },
      { label: 'Frequency worded differently', count: 2, example: '“BID” against “twice daily with meals”' },
    ],
    hardStopNote: 'HS-04 would have fired 9 times',
    sampleCaseIds: ['enc-4022', 'enc-4105', 'enc-4231', 'enc-4310', 'enc-4140', 'enc-4166', 'enc-4189', 'enc-4205', 'enc-4252', 'enc-4277', 'enc-4298', 'enc-4321'],
  },
  {
    activityId: 'med-rec-allergy',
    from: '2026-10-15T00:00:00',
    to: '2026-12-07T00:00:00',
    cases: 2214,
    results: {
      agreement: { value: 94.6, trend: series(21, 93.8, 94.6, 0.4) },
      omitted: { value: 1.2, trend: series(21, 1.6, 1.2, 0.15) },
      inaccurate: { value: 1.1, trend: series(21, 1.4, 1.1, 0.12) },
    },
    causes: [],
    hardStopNote: 'HS-07 would have fired 2 times',
    sampleCaseIds: [],
  },
]

const POOL = [
  'Amlodipine 5 mg daily',
  'Metformin 500 mg twice daily',
  'Levothyroxine 75 mcg daily',
  'Atorvastatin 20 mg nightly',
  'Pantoprazole 40 mg daily',
  'Tamsulosin 0.4 mg nightly',
  'Aspirin 81 mg daily',
  'Metoprolol succinate 50 mg daily',
  'Montelukast 10 mg nightly',
  'Allopurinol 100 mg daily',
  'Furosemide 20 mg daily',
  'Sertraline 50 mg daily',
  'Gabapentin 300 mg three times daily',
  'Lisinopril 20 mg daily',
  'Vitamin D3 1,000 units daily',
  'Insulin glargine 20 units at night',
]
const SOURCES = ['Home list · Epic', 'Fill history · Pyxis 90 days']

/** A generated case: `meds` lines; the last `inaccurate` lines differ, then `omitted` are missing from the draft. */
function generated(encounter: string, unit: string, admittedAt: string, age: number, meds: number, inaccurate: number, omitted: number, offset: number): SampleCase {
  const draftAt = admittedAt.replace(/:(\d\d):00$/, (_, m: string) => `:${String(Number(m) + 1).padStart(2, '0')}:00`)
  const lines: SampleCase['lines'] = Array.from({ length: meds }, (_, i) => {
    const med = POOL[(i + offset) % POOL.length]!
    const source = SOURCES[i % 2]!
    if (i >= meds - omitted) return { agent: null, pharmacist: med, result: 'omitted', source: 'Patient interview only' }
    if (i >= meds - omitted - inaccurate) {
      // An older fill's strength (3a's second cause): half the current dose.
      const older = med.replace(/\d+(?:\.\d+)?/, (n) => String(Number(n) / 2))
      return { agent: older, pharmacist: med, result: 'inaccurate', note: 'strength', source: 'Fill history · Pyxis 90 days' }
    }
    return { agent: med, pharmacist: med, result: 'agrees', source }
  })
  const notes = lines.flatMap((l, i) =>
    l.result === 'inaccurate'
      ? [{ line: i + 1, title: 'why it differs', text: 'The fill history held an older strength; the pharmacist confirmed the current dose with the patient.' }]
      : l.result === 'omitted'
        ? [{ line: i + 1, title: 'omitted', text: 'This came from the patient interview, which the agent can’t see. It still counts as an omission.' }]
        : [],
  )
  return {
    id: `enc-${encounter}`,
    encounter,
    agentId: 'med-rec',
    activityId: 'med-rec-admission',
    unit,
    admittedAt,
    mrn: `••${String(3000 + Number(encounter) * 7).slice(-4)}`,
    age,
    draftAt,
    finalBy: 'Ana R.',
    finalAt: admittedAt.replace(/T(\d\d)/, (_, h: string) => `T${String(Number(h) + 1).padStart(2, '0')}`),
    lines,
    notes,
  }
}

/** Case 2 of 12, verbatim from 3b. */
const case4105: SampleCase = {
  id: 'enc-4105',
  encounter: '4105',
  agentId: 'med-rec',
  activityId: 'med-rec-admission',
  unit: '7 West',
  admittedAt: '2026-10-28T14:12:00',
  mrn: '••3307',
  age: 81,
  draftAt: '2026-10-28T14:13:00',
  finalBy: 'Ana R.',
  finalAt: '2026-10-28T15:02:00',
  traceId: 'act-61840',
  lines: [
    { agent: 'Metoprolol tartrate 25 mg twice daily', pharmacist: 'Metoprolol tartrate 25 mg twice daily', result: 'agrees', source: 'Fill history · Pyxis 90 days' },
    { agent: 'Atorvastatin 40 mg nightly', pharmacist: 'Atorvastatin 40 mg nightly', result: 'agrees', source: 'Home list · Epic' },
    { agent: 'Apixaban 5 mg twice daily', pharmacist: 'Apixaban 5 mg twice daily', result: 'agrees', source: 'Home list · Epic' },
    { agent: 'Lasix 40 mg daily', pharmacist: 'Furosemide 40 mg daily', result: 'inaccurate', note: 'name', source: 'Home list · brand name' },
    { agent: null, pharmacist: 'Vitamin D3 2,000 units daily', result: 'omitted', source: 'Patient interview only' },
    { agent: 'Omeprazole 20 mg daily', pharmacist: 'Omeprazole 20 mg daily', result: 'agrees', source: 'Home list · Epic' },
    { agent: 'Sertraline 50 mg daily', pharmacist: 'Sertraline 50 mg daily', result: 'agrees', source: 'Fill history · Pyxis 90 days' },
  ],
  notes: [
    {
      line: 4,
      title: 'why it differs',
      text: 'The home list had the brand name Lasix. SOP v1.3 maps brand to generic for 412 drugs, and Lasix wasn’t in the table. 21 of the 29 inaccurate lines in shadow have the same cause. Fixed in SOP v1.3.1, which adds 186 brand names. Re-run on all 12 sample cases: 0 name mismatches.',
    },
    { line: 5, title: 'omitted', text: 'Vitamin D3 came from the patient interview, which the agent can’t see. It still counts as an omission.' },
  ],
}

/** The 12 cases Marcus compared (3a): 3a's four in order, then eight more (invented). */
export const sampleCases: SampleCase[] = [
  generated('4022', '7 West', '2026-10-16T09:20:00', 67, 9, 0, 0, 0),
  case4105,
  generated('4231', '8 East', '2026-10-30T11:05:00', 74, 14, 1, 0, 2),
  generated('4310', '8 East', '2026-11-02T16:40:00', 58, 5, 0, 0, 5),
  generated('4140', '7 West', '2026-10-20T08:15:00', 72, 11, 0, 1, 7),
  generated('4166', '8 East', '2026-10-21T13:30:00', 49, 6, 0, 0, 9),
  generated('4189', '7 West', '2026-10-23T10:10:00', 85, 16, 1, 0, 3),
  generated('4205', '8 East', '2026-10-24T15:25:00', 63, 8, 0, 0, 11),
  generated('4252', '7 West', '2026-10-31T07:50:00', 77, 12, 0, 1, 4),
  generated('4277', '8 East', '2026-11-01T12:45:00', 55, 7, 0, 0, 6),
  generated('4298', '7 West', '2026-11-02T09:35:00', 81, 10, 1, 0, 8),
  generated('4321', '8 East', '2026-11-03T14:20:00', 69, 9, 0, 0, 1),
]
