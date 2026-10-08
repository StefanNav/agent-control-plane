import type { Division } from '../types'

/** Hospital view order (E4 4a): owners and agent counts from CountersignCore `DIVS`. */
export const divisions: Division[] = [
  {
    id: 'revenue-cycle',
    name: 'Revenue cycle',
    ownerId: 'tom',
    sponsorId: 'nina',
    lapsePolicy: 'shadow',
    monitor: { state: 'delayed', lastAt: '2026-12-08T09:46:00' },
  },
  {
    id: 'medications',
    name: 'Medications',
    ownerId: 'marcus',
    sponsorId: 'priya',
    lapsePolicy: 'shadow',
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
  },
  {
    id: 'discharge',
    name: 'Discharge',
    ownerId: 'elena',
    sponsorId: 'priya',
    lapsePolicy: 'shadow',
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
  },
  {
    id: 'imaging-referrals',
    name: 'Imaging referrals',
    ownerId: 'ravi',
    sponsorId: 'dana',
    lapsePolicy: 'nothing',
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
  },
  {
    id: 'patient-messages',
    name: 'Patient messages',
    ownerId: 'grace',
    sponsorId: 'dana',
    lapsePolicy: 'nothing',
    monitor: { state: 'live', lastAt: '2026-12-08T09:51:47' },
  },
]
