import type { DemoState, Person } from '../data/types'
import { can, type PermAction, type PermContext } from './permissions'

/** The person the visitor is viewing as. */
export function selectPersona(state: DemoState): Person {
  return state.people.find((p) => p.id === state.personaId)!
}

/** Whether the current persona may take an action here. */
export function selectCan(state: DemoState, action: PermAction, ctx?: PermContext): boolean {
  return can(state, state.personaId, action, ctx)
}
