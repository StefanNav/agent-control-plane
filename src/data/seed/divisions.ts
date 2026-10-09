import type { Division } from '../types'

/**
 * Hospital view order (E4 4a): owners and agent counts from CountersignCore `DIVS`.
 * Lapse policy and escalation chain from 8a: 14 days' grace; unanswered items reach the sponsor, then Dana after 4 h.
 */
export const divisions: Division[] = [
  {
    id: 'revenue-cycle',
    name: 'Revenue cycle',
    ownerId: 'tom',
    sponsorId: 'nina',
    lapsePolicy: 'shadow',
    graceDays: 14,
    escalation: { first: 'nina', then: 'dana', afterHours: 4 },
    monitor: { state: 'delayed', lastAt: '2026-12-08T09:46:00' },
    exceptionsByDay: [0, 0, 0, 0, 1, 1, 1],
    page: { at: '2026-12-08T08:05:00', ackAt: '2026-12-08T08:06:00', who: 'tom' },
    incidentId: 'inc-0029',
    note: '9 drafts went to the auth team',
    resumeNeeds: ['Tom', 'Nina'],
  },
  {
    id: 'medications',
    name: 'Medications',
    ownerId: 'marcus',
    sponsorId: 'priya',
    lapsePolicy: 'shadow',
    graceDays: 14,
    escalation: { first: 'priya', then: 'dana', afterHours: 4 },
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
    exceptionsByDay: [0, 1, 0, 1, 1, 2, 2],
    resumeNeeds: ['Marcus', 'Priya'],
  },
  {
    id: 'discharge',
    name: 'Discharge',
    ownerId: 'elena',
    sponsorId: 'priya',
    lapsePolicy: 'shadow',
    graceDays: 14,
    escalation: { first: 'priya', then: 'dana', afterHours: 4 },
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
    exceptionsByDay: [1, 0, 0, 1, 0, 0, 0],
    closedThisWeek: 1,
  },
  {
    id: 'imaging-referrals',
    name: 'Imaging referrals',
    ownerId: 'ravi',
    sponsorId: 'hana',
    lapsePolicy: 'nothing',
    graceDays: 14,
    escalation: { first: 'hana', then: 'dana', afterHours: 4 },
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
    exceptionsByDay: [0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'patient-messages',
    name: 'Patient messages',
    ownerId: 'grace',
    sponsorId: 'owen',
    lapsePolicy: 'nothing',
    graceDays: 14,
    escalation: { first: 'owen', then: 'dana', afterHours: 4 },
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
    exceptionsByDay: [0, 0, 0, 0, 0, 0, 0],
  },
]
