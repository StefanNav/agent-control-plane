import type { ChangeEvent, LogEvent } from '../types'

/** "Changed yesterday" in the 07:00 digest (5c), verbatim. */
export const changeEvents: ChangeEvent[] = [
  {
    id: 'chg-1',
    at: '2026-12-07T15:20:00',
    text: 'Allergy Recon Agent v1.2.1 deployed by Sam. Re-validation passed on 200 replayed cases.',
    sub: 'Privilege unchanged · Priya told',
  },
  {
    id: 'chg-2',
    at: '2026-12-07T11:05:00',
    text: 'HS-04 v2 published: dose checks now read strengths from the formulary table.',
    sub: 'Applies to Med Rec Agent and Discharge Meds Agent',
  },
]

/** Routine events that stay in the log: deploys, config reads, routine policy passes. */
const KINDS: Array<[string, string, string]> = [
  ['med-rec', 'Policy check passed · HS-11 v1', 'Patient identity matched the encounter'],
  ['discharge-meds', 'Config read · formulary table', 'gw-east-2 · 41 ms'],
  ['allergy-recon', 'Policy check passed · HS-07 v1', 'No allergy removed'],
  ['drug-interaction', 'Config read · interaction rules', 'gw-east-2 · 38 ms'],
  ['med-history', 'Policy check passed · HS-11 v1', 'Patient identity matched the encounter'],
  ['infusion-rate', 'Heartbeat', 'Monitoring data received'],
]

/** 41 log events between 07:00 and 09:50, newest first (the digest says "41 events"). */
export const logEvents: LogEvent[] = Array.from({ length: 41 }, (_, i) => {
  const [agentId, text, sub] = KINDS[i % KINDS.length]!
  const minutes = 9 * 60 + 50 - i * 4
  const at = `2026-12-08T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
  return { id: `log-${41 - i}`, at, agentId, text, sub }
})
