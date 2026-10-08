import type { PersonaId } from '../data/types'

export interface Persona {
  id: PersonaId
  name: string
  initial: string
  roleLabel: string
  /** Where "Viewing as …" takes this person (spec §4.4). */
  landing: string
}

/** The seven people a visitor can view the prototype as, Marcus (the primary user) first. */
export const PERSONAS: Persona[] = [
  { id: 'marcus', name: 'Marcus', initial: 'M', roleLabel: 'Agent owner', landing: '/operations/divisions/medications' },
  { id: 'priya', name: 'Priya', initial: 'P', roleLabel: 'Clinical sponsor', landing: '/portfolio/privileges' },
  { id: 'dana', name: 'Dana', initial: 'D', roleLabel: 'AI program lead', landing: '/operations' },
  { id: 'sam', name: 'Sam', initial: 'S', roleLabel: 'Technical owner', landing: '/inventory' },
  { id: 'drlee', name: 'Dr. Lee', initial: 'L', roleLabel: 'AI review board chair', landing: '/portfolio/reviews/med-rec' },
  { id: 'ana', name: 'Ana', initial: 'A', roleLabel: 'Pharmacist', landing: '/epic' },
  { id: 'jordan', name: 'Jordan', initial: 'J', roleLabel: 'Risk manager', landing: '/operations/actions' },
]

export function personaById(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id)!
}
