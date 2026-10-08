import { TIER_RULES } from '../../data/seed/catalogue'
import type { DemoState, Tier } from '../../data/types'
import { addDays, formatDate } from '../../lib/clock'
import { onboardingContext, personName, riskFactors, type Mark } from '../../store/onboardingRules'

export type ReviewStepId = 'onboarding' | 'tier' | 'packet' | 'decision' | 'shadow'

/** The last day of shadow: from + days − 1 (15 Oct + 21 → 04 Nov). */
export const shadowEnd = (from: string, days: number) => addDays(from, days - 1)

/** The AIMS Review rail (2b, 2d): onboarding, tier, packet, decision, shadow. */
export function reviewRail(s: DemoState, agentId: string): { id: ReviewStepId; label: string; sub: string; mark: Mark; to: string }[] {
  const { record, people } = onboardingContext(s, agentId)
  const review = record?.review
  const lead = personName(s, people.lead)
  const chair = personName(s, s.roles.find((r) => r.role === 'committee')?.personId)
  const owner = personName(s, people.owner)
  const base = `/inventory/agents/${agentId}`
  const tierOne = review?.tier === 1
  const step = (id: ReviewStepId, n: number, name: string, sub: string, mark: Mark, to: string) => ({ id, label: `${n} · ${name}`, sub, mark, to })
  const shadow = (() => {
    if (!review?.shadowFrom) return step('shadow', 5, 'Shadow', 'after approval', 'none', `/operations/agents/${agentId}?tab=scorecard`)
    const end = shadowEnd(review.shadowFrom, review.shadowDays + (s.scorecards.find((c) => c.activityId === record?.job.activities[0]?.id)?.extendedDays ?? 0))
    const over = s.now.slice(0, 10) > end.slice(0, 10)
    return step('shadow', 5, 'Shadow', over ? `${owner} · ${formatDate(review.shadowFrom)} to ${formatDate(end)}` : `${owner} · from ${formatDate(review.shadowFrom)}`, over ? 'done' : 'todo', `/operations/agents/${agentId}?tab=scorecard`)
  })()
  return [
    step('onboarding', 1, 'Onboarding', record?.frozenAt ? `done ${formatDate(record.frozenAt)}` : 'in progress', record?.frozenAt ? 'done' : 'todo', `${base}/onboarding/review`),
    review?.tier ? step('tier', 2, 'Risk tier', `${lead} · ${formatDate(review.tierAt!)}`, 'done', `${base}/risk-tier`) : step('tier', 2, 'Risk tier', `${lead} · now`, record?.frozenAt ? 'todo' : 'none', `${base}/risk-tier`),
    tierOne
      ? step('packet', 3, 'Committee packet', 'not needed · Tier 1', 'none', `/portfolio/reviews/${agentId}`)
      : review?.packetAt
        ? step('packet', 3, 'Committee packet', `${lead} · ${formatDate(review.packetAt)}`, 'done', `/portfolio/reviews/${agentId}`)
        : step('packet', 3, 'Committee packet', `${lead} · after tier`, 'none', `/portfolio/reviews/${agentId}`),
    tierOne
      ? step('decision', 4, 'Committee decision', 'not needed · Tier 1', 'none', base)
      : review?.decision
        ? step('decision', 4, 'Committee decision', `${personName(s, review.decision.by)} · ${formatDate(review.decision.at)}`, 'done', base)
        : step('decision', 4, 'Committee decision', `${chair} · ${review ? formatDate(review.meeting) : 'next meeting'}`, review?.packetAt ? 'todo' : 'none', base),
    shadow,
  ]
}

/** The risk-tier step (2b): factors, the suggestion, and what the chosen tier sets against it. */
export function selectRiskTier(s: DemoState, agentId: string, chosen: Tier) {
  const { record, intake, people } = onboardingContext(s, agentId)
  const review = record?.review
  if (!record || !review) return null
  const { rows, suggested } = riskFactors(s, agentId)
  const a = TIER_RULES[review.suggestedTier]
  const b = TIER_RULES[chosen]
  const intakeDays = Number(/(\d+)-day shadow/.exec(intake?.condition?.text ?? '')?.[1] ?? 0)
  const changes = [a.board !== b.board && 'the board', a.reviewDays !== b.reviewDays && 'the review cycle', a.promotion !== b.promotion && !(a.board !== b.board) && 'who promotes it'].filter(Boolean) as string[]
  const shadowSame = intakeDays >= Math.max(a.shadowDays, b.shadowDays)
  return {
    lead: personName(s, people.lead),
    factors: rows,
    suggested: review.suggestedTier ?? suggested,
    set: review.tier ? { tier: review.tier, label: TIER_RULES[review.tier].label, by: personName(s, review.tierBy), at: formatDate(review.tierAt!), reason: review.tierReason ?? null } : null,
    compare: {
      head: [`Tier ${review.suggestedTier}`, `Tier ${chosen}`],
      rows: [
        ['Shadow minimum', `${a.shadowDays} days`, `${b.shadowDays} days`],
        ['Board', a.board, b.board],
        ['Privilege review', `${a.reviewDays} days`, `${b.reviewDays} days`],
        ['Promotion above Draft', a.promotion, b.promotion],
      ] as [string, string, string][],
      note:
        chosen === review.suggestedTier
          ? `Tier ${chosen} is the suggestion; nothing changes against it.`
          : `${shadowSame && intakeDays ? `The intake already asked for a ${intakeDays}-day shadow, so ` : ''}Tier ${chosen} changes ${changes.length ? changes.join(' and ') : 'little'}${shadowSame ? ', not the shadow length' : ''}.`.replace(/^(.)/, (c) => c.toUpperCase()),
    },
    button: chosen === 1 ? 'Set Tier 1 and start shadow' : `Set Tier ${chosen} and build the packet`,
  }
}
