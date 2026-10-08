import type { DemoState } from '../data/types'
import { can, lockReason, type PermAction, type PermContext } from './permissions'

export type ActionResult = { ok: true } | { ok: false; reason: string }

export interface ActionSpec {
  action: PermAction
  ctx?: PermContext
  audit: { action: string; target: string; reason?: string }
  mutate: (draft: DemoState) => void
}

/**
 * The only way state changes. Checks the current persona may act here; if not, returns the
 * same state untouched. Otherwise applies `mutate` to a copy and logs who, what and when.
 */
export function runAction(state: DemoState, spec: ActionSpec): { state: DemoState; result: ActionResult } {
  if (!can(state, state.personaId, spec.action, spec.ctx)) {
    return { state, result: { ok: false, reason: lockReason(spec.action, state.personaId) } }
  }
  const draft = structuredClone(state)
  spec.mutate(draft)
  draft.audit.push({
    id: `aud-${draft.audit.length + 1}`,
    at: draft.now,
    who: draft.personaId,
    ...spec.audit,
  })
  return { state: draft, result: { ok: true } }
}
