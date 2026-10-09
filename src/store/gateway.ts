import type { DemoState, GatewayCaller } from '../data/types'
import { personName } from './onboardingRules'

/** Dana's inbox item for a caller (9b "flagged to Dana"). */
const itemFor = (s: DemoState, callerId: string) =>
  s.exceptions.filter((e) => e.type === 'Unregistered caller' && e.link?.to === `/inventory/unregistered/${callerId}` && e.state !== 'resolved' && e.state !== 'dismissed')

function decide(s: DemoState, c: GatewayCaller, decision: NonNullable<GatewayCaller['decision']>, outcome: string) {
  c.decision = decision
  for (const e of itemFor(s, c.id)) Object.assign(e, { state: 'resolved', outcome, outcomeSub: decision.reason, closedAt: decision.at, closedBy: decision.by })
  s.logEvents.push({ id: `log-gateway-${s.logEvents.length + 1}`, at: decision.at, text: `${c.name}: ${outcome.toLowerCase()}`, sub: `${personName(s, decision.by)}${decision.reason ? ` · ${decision.reason}` : ''}` })
}

/** Block at the gateway (9b): calls stop within a minute; the caller stays listed as blocked. */
export function applyBlockCaller(s: DemoState, id: string, reason: string, by: string, at: string): DemoState {
  const c = s.callers.find((x) => x.id === id)
  if (c) decide(s, c, { kind: 'blocked', reason, by, at }, 'Blocked at the gateway')
  return s
}

/** "Not an agent" (9b): the caller moves to Dismissed, with the reason. */
export function applyDismissCaller(s: DemoState, id: string, reason: string, by: string, at: string): DemoState {
  const c = s.callers.find((x) => x.id === id)
  if (!c) return s
  c.group = 'dismissed'
  decide(s, c, { kind: 'notAgent', reason, by, at }, 'Not an agent')
  return s
}

/** "Message K. Osei" (9b): the owner isn't a console user, so the message is logged on the caller. */
export function applyMessageOwner(s: DemoState, id: string, text: string, by: string, at: string): DemoState {
  const c = s.callers.find((x) => x.id === id)
  if (!c?.likelyOwner) return s
  c.messages.push({ by, text, at })
  s.logEvents.push({ id: `log-gateway-${s.logEvents.length + 1}`, at, text: `Message to ${c.likelyOwner.name} about ${c.name}`, sub: text })
  return s
}

/** Starting onboarding from the intake a caller looks like registers it (R16): it leaves Unregistered. */
export function markCallerOnboarding(s: DemoState, intakeId: string, agentId: string, by: string, at: string): DemoState {
  for (const c of s.callers) if (c.intakeId === intakeId && !c.decision) decide(s, c, { kind: 'onboarding', by, at, agentId }, 'Onboarding started')
  return s
}
