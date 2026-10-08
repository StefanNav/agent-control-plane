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

const firstSentences = (text: string, n: number) => text.split(/(?<=\.)\s+/).slice(0, n).join(' ')

/** The committee packet (2c): the record as the board reads it, and where the decision stands. */
export function selectPacket(s: DemoState, agentId: string) {
  const { record, intake, people } = onboardingContext(s, agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  const review = record?.review
  if (!record || !agent || !review) return null
  const tier = review.tier ?? agent.riskTier
  const meeting = review.meeting
  const lead = personName(s, review.tierBy ?? people.lead)
  const triggers = record.job.escalation.map((t, i) => (i ? t.charAt(0).toLowerCase() + t.slice(1) : t))
  return {
    breadcrumb: `Portfolio / AI review board / ${formatDate(meeting)} ${meeting.slice(0, 4)}${review.agendaItem ? ` / Item ${review.agendaItem.item} of ${review.agendaItem.of}` : ''}`,
    title: `${agent.name} · review packet`,
    status: `Tier ${tier} · ${TIER_RULES[tier].label}`,
    idLine: `${agent.code} v1.0${intake ? ` · ${intake.code}` : ''}`,
    state: review.decision ? ('decided' as const) : review.packetAt ? ('open' as const) : ('notBuilt' as const),
    people: [
      ['Division', s.divisions.find((d) => d.id === agent.divisionId)?.name ?? ''],
      ['Sponsor', personName(s, people.sponsor)],
      ['Owner', personName(s, people.owner)],
      ['Technical owner', personName(s, people.tech)],
    ] as [string, string][],
    owner: personName(s, people.owner),
    tech: personName(s, people.tech),
    lead,
    chair: personName(s, s.roles.find((r) => r.role === 'committee')?.personId),
    meeting: formatDate(meeting),
    handsOff: triggers.join(' · '),
    never: [
      ...record.job.never.map((text) => ({ text: thirdPersonNever(text), code: record.limits.find((l) => l.from === text)?.code ?? '' })),
      { text: 'Signs, releases or orders anything', code: 'ORG-POL-02' },
    ],
    tier: review.tier
      ? `Tier ${review.tier} · ${TIER_RULES[review.tier].label}. Suggested Tier ${review.suggestedTier}.${review.tierReason ? ` ${lead} ${review.tier > review.suggestedTier ? 'raised' : 'lowered'} it: “${firstSentences(review.tierReason, 2)}”` : ''}`
      : null,
    proposed: review.proposedConditions,
    decision: review.decision ?? null,
  }
}

/** "Change a dose" → "Changes a dose" (2c's Never list reads in the third person). */
const thirdPersonNever = (text: string) => {
  const [first = '', ...rest] = text.split(' ')
  return [/(s|sh|ch|x|z|o)$/.test(first) ? `${first}es` : `${first}s`, ...rest].join(' ')
}

const DECISION_LABEL = { approve: 'Approved', approveWithConditions: 'Approved with conditions', reReview: 'Re-review', deny: 'Denied' } as const
const LEVEL_NAME = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' } as const

/** Decision logged (2d): the decision, its conditions on the privilege record, and the decision log. */
export function selectDecision(s: DemoState, agentId: string) {
  const { record, people } = onboardingContext(s, agentId)
  const decision = record?.review?.decision
  if (!record || !decision) return null
  const review = record.review!
  const activities = record.job.activities
  const current = (activityId: string) => s.privileges.filter((p) => p.activityId === activityId && p.state !== 'closed').sort((a, b) => b.version - a.version)[0]
  return {
    meta: `${personName(s, decision.by)} · ${formatDate(decision.at)} ${decision.at.slice(11, 16)}`,
    by: personName(s, decision.by),
    label: DECISION_LABEL[decision.kind],
    reason: decision.reason,
    conditions: decision.conditions.map((c) => ({ id: c.id, text: c.text, appliesTo: c.appliesTo, checkedBy: c.checkedBy })),
    privileges: activities.flatMap((a) => {
      const p = current(a.id)
      if (!p) return []
      const level = p.proposedLevel ? `${LEVEL_NAME[p.level]} · ${LEVEL_NAME[p.proposedLevel]} requested` : p.level === 'shadow' ? `Shadow from ${formatDate(review.shadowFrom ?? p.grantedAt ?? decision.at)}` : `${LEVEL_NAME[p.level]} since ${formatDate(p.grantedAt ?? decision.at)}`
      return [{ id: p.id, activity: a.name, level, domain: p.domain, conditions: p.conditions }]
    }),
    log: record.history.filter((h) => h.decision).slice().reverse().map((h) => ({ date: formatDate(h.at), text: h.text, sub: h.sub })),
    next: review.shadowFrom && s.now < review.shadowFrom ? `Next: shadow starts ${formatDate(review.shadowFrom)} on ${record.job.domain.units.join(' and ')}. ${personName(s, people.owner)} sees the scorecard from day one.` : null,
  }
}
