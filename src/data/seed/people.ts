import type { Person, RoleAssignment } from '../types'

/** The seven personas, plus the division owners and sponsors named in the frames. */
export const people: Person[] = [
  { id: 'dana', name: 'Dana', initial: 'D', title: 'AI program lead' },
  { id: 'priya', name: 'Priya', initial: 'P', title: 'Director of Pharmacy' },
  { id: 'marcus', name: 'Marcus', initial: 'M', title: 'Pharmacy informatics manager' },
  { id: 'sam', name: 'Sam', initial: 'S', title: 'Integration analyst' },
  { id: 'drlee', name: 'Dr. Lee', initial: 'L', title: 'Chair, AI review board' },
  { id: 'ana', name: 'Ana R., PharmD', initial: 'A', title: 'Pharmacist, 7 West' },
  { id: 'jordan', name: 'Jordan', initial: 'J', title: 'Risk manager' },
  { id: 'tom', name: 'Tom', initial: 'T', title: 'Revenue cycle manager' },
  { id: 'nina', name: 'Nina', initial: 'N', title: 'Director of Revenue Cycle' },
  { id: 'elena', name: 'Elena', initial: 'E', title: 'Discharge services manager' },
  { id: 'ravi', name: 'Ravi', initial: 'R', title: 'Imaging operations manager' },
  { id: 'grace', name: 'Grace', initial: 'G', title: 'Patient access manager' },
  { id: 'hana', name: 'Hana', initial: 'H', title: 'Director of Imaging' },
  { id: 'owen', name: 'Owen', initial: 'O', title: 'Director of Patient Access' },
  { id: 'omar', name: 'Omar', initial: 'O', title: 'Clinical informatics analyst' },
  { id: 'lena', name: 'Lena', initial: 'L', title: 'Integration analyst' },
]

/** Roles are assigned per division; 'all' spans every division. `since` from 8b ("since Mar 2026"); others invented. */
export const roles: RoleAssignment[] = [
  { personId: 'dana', divisionId: 'all', role: 'programLead', since: '2025-09-01T09:00:00' },
  { personId: 'priya', divisionId: 'medications', role: 'sponsor', since: '2025-11-03T09:00:00' },
  { personId: 'marcus', divisionId: 'medications', role: 'owner', since: '2025-11-03T09:00:00' },
  { personId: 'sam', divisionId: 'medications', role: 'techOwner', since: '2026-03-01T09:00:00' },
  { personId: 'drlee', divisionId: 'all', role: 'committee', since: '2025-09-01T09:00:00' },
  { personId: 'jordan', divisionId: 'all', role: 'readOnly', since: '2026-01-12T09:00:00' },
  { personId: 'ana', divisionId: 'medications', role: 'frontline', since: '2026-02-02T09:00:00' },
  { personId: 'tom', divisionId: 'revenue-cycle', role: 'owner', since: '2026-01-05T09:00:00' },
  { personId: 'nina', divisionId: 'revenue-cycle', role: 'sponsor', since: '2026-01-05T09:00:00' },
  { personId: 'elena', divisionId: 'discharge', role: 'owner', since: '2026-04-06T09:00:00' },
  { personId: 'priya', divisionId: 'discharge', role: 'sponsor', since: '2026-04-06T09:00:00' },
  { personId: 'ravi', divisionId: 'imaging-referrals', role: 'owner', since: '2026-05-04T09:00:00' },
  { personId: 'hana', divisionId: 'imaging-referrals', role: 'sponsor', since: '2026-05-04T09:00:00' },
  { personId: 'grace', divisionId: 'patient-messages', role: 'owner', since: '2026-06-01T09:00:00' },
  { personId: 'owen', divisionId: 'patient-messages', role: 'sponsor', since: '2026-06-01T09:00:00' },
  // Sam is technical owner in Medications only, Lena in Discharge (2a); Omar covers the rest.
  { personId: 'omar', divisionId: 'revenue-cycle', role: 'techOwner', since: '2026-01-05T09:00:00' },
  { personId: 'lena', divisionId: 'discharge', role: 'techOwner', since: '2026-04-06T09:00:00' },
  { personId: 'omar', divisionId: 'imaging-referrals', role: 'techOwner', since: '2026-05-04T09:00:00' },
  { personId: 'omar', divisionId: 'patient-messages', role: 'techOwner', since: '2026-06-01T09:00:00' },
]
