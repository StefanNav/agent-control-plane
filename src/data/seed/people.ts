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
  { id: 'omar', name: 'Omar', initial: 'O', title: 'Integration analyst' },
]

/** Roles are assigned per division; 'all' spans every division. */
export const roles: RoleAssignment[] = [
  { personId: 'dana', divisionId: 'all', role: 'programLead' },
  { personId: 'priya', divisionId: 'medications', role: 'sponsor' },
  { personId: 'marcus', divisionId: 'medications', role: 'owner' },
  { personId: 'sam', divisionId: 'medications', role: 'techOwner' },
  { personId: 'drlee', divisionId: 'all', role: 'committee' },
  { personId: 'jordan', divisionId: 'all', role: 'readOnly' },
  { personId: 'ana', divisionId: 'medications', role: 'frontline' },
  { personId: 'tom', divisionId: 'revenue-cycle', role: 'owner' },
  { personId: 'nina', divisionId: 'revenue-cycle', role: 'sponsor' },
  { personId: 'elena', divisionId: 'discharge', role: 'owner' },
  { personId: 'priya', divisionId: 'discharge', role: 'sponsor' },
  { personId: 'ravi', divisionId: 'imaging-referrals', role: 'owner' },
  { personId: 'hana', divisionId: 'imaging-referrals', role: 'sponsor' },
  { personId: 'grace', divisionId: 'patient-messages', role: 'owner' },
  { personId: 'owen', divisionId: 'patient-messages', role: 'sponsor' },
  // Sam is technical owner in Medications only; Omar covers the other divisions.
  { personId: 'omar', divisionId: 'revenue-cycle', role: 'techOwner' },
  { personId: 'omar', divisionId: 'discharge', role: 'techOwner' },
  { personId: 'omar', divisionId: 'imaging-referrals', role: 'techOwner' },
  { personId: 'omar', divisionId: 'patient-messages', role: 'techOwner' },
]
