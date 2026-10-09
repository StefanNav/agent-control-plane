import type { DemoState, GatewayCaller } from '../../data/types'
import { formatAgo, formatDate, minutesBetween } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'

export type GatewayTab = 'unregistered' | 'low' | 'dismissed'

const GROUP: Record<GatewayTab, GatewayCaller['group']> = { unregistered: 'unregistered', low: 'lowVolume', dismissed: 'dismissed' }

/** Unregistered callers still waiting on a decision; onboarding registers them, a block keeps them listed (R16). */
const inTab = (c: GatewayCaller, tab: GatewayTab) => c.group === GROUP[tab] && c.decision?.kind !== 'onboarding'

/** 9b: callers seen at the gateway without a registry record, and the selected one in detail. */
export function selectGateway(s: DemoState, callerId: string | null, tab: GatewayTab, viewerId: string) {
  const selected = callerId ? s.callers.find((c) => c.id === callerId) : undefined
  if (callerId && !selected) return null
  const counts = (t: GatewayTab) => s.callers.filter((c) => inTab(c, t)).length
  const listed = s.callers.filter((c) => inTab(c, tab))
  const caller = selected ?? listed[0]
  const unregistered = counts('unregistered')
  const intake = caller?.intakeId ? s.intakeRequests.find((i) => i.id === caller.intakeId) : undefined
  const owner = caller?.likelyOwner?.name
  const days = caller ? Math.floor(minutesBetween(caller.firstSeen, s.now) / (24 * 60)) : 0
  return {
    tab,
    tabs: [
      { id: 'unregistered', label: `Unregistered · ${unregistered}`, to: '/inventory/unregistered' },
      { id: 'low', label: `Low volume · ${counts('low')}`, to: '/inventory/unregistered?tab=low' },
      { id: 'dismissed', label: `Dismissed · ${counts('dismissed')}`, to: '/inventory/unregistered?tab=dismissed' },
    ],
    notice:
      tab === 'unregistered' && unregistered
        ? {
            lead: `${unregistered} ${unregistered === 1 ? 'caller' : 'callers'} this week ${unregistered === 1 ? 'has' : 'have'} no registry record.`,
            text: 'Each could be an agent working with no owner, no review and no hard stops. Their calls are logged, not blocked, until you decide.',
          }
        : null,
    rows: listed.map((c) => ({
      id: c.id,
      name: c.name,
      credential: c.credential,
      firstSeen: formatDate(c.firstSeen),
      calls: c.calls7d.toLocaleString('en-US'),
      reaches: c.reaches,
      owner: c.likelyOwner ?? { name: 'Unknown', sub: c.registeredBy?.includes('left in') ? `key owner left in ${c.registeredBy.split('left in ')[1]}` : '' },
      status: c.decision?.kind === 'blocked' ? 'Blocked' : c.decision?.kind === 'notAgent' ? c.decision.reason ?? 'Not an agent' : null,
    })),
    selectedId: caller?.id ?? null,
    detail: caller
      ? {
          name: caller.name,
          seen: `Seen for ${days} ${days === 1 ? 'day' : 'days'} · last call ${formatAgo(caller.lastCall, s.now)}`,
          does: caller.does ?? null,
          patientData: caller.patientData ?? null,
          registeredBy: caller.registeredBy ?? null,
          looksLike: intake ? `${intake.agentName} · ${intake.code}, intake approved ${formatDate(intake.approvedAt)}, never onboarded` : null,
          start: intake && !caller.decision ? { label: `Start onboarding from ${intake.code}`, to: `/inventory/agents/${intake.agentId}/onboarding/intake` } : null,
          message: owner && !caller.decision ? `Message ${owner}` : null,
          caution: owner && !caller.decision
            ? { lead: `Talk to ${owner} first.`, text: `Blocking stops calls within a minute${caller.reliance ? `, and ${caller.reliance}` : ''}.` }
            : null,
          noMatch: intake || caller.decision ? null : 'No intake matches this caller. Ask the owner to file one, or block it.',
          decision: caller.decision
            ? {
                lead: caller.decision.kind === 'blocked' ? 'Blocked at the gateway' : caller.decision.kind === 'notAgent' ? 'Not an agent' : 'Onboarding started',
                text: `${personName(s, caller.decision.by)} · ${formatDate(caller.decision.at)}${caller.decision.reason ? ` · ${caller.decision.reason}` : ''}`,
              }
            : null,
          messages: caller.messages.map((m) => `${personName(s, m.by)} · ${formatDate(m.at)}: ${m.text}`),
          canDecide: can(s, viewerId, 'decideCaller'),
        }
      : null,
  }
}
