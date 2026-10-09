import { PROMOTION_CONTENT } from '../data/seed/autonomy'
import { BOARD_MEETINGS, TIER_RULES } from '../data/seed/catalogue'
import type { Condition, DemoState, Level, Privilege, Promotion, PromotionCriterion, ReviewDecision } from '../data/types'
import { addDays, dayGap, formatDate } from '../lib/clock'
import { applyLevelChange, levelSince, recordFor } from './levels'
import { nextVersion } from './mutations'
import { latestByCode, raiseItem, resolveItems, reviewDateFrom } from './onboarding'
import { personName } from './onboardingRules'

const LEVEL_NAME: Record<Level, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

/** The board's condition that holds sampling at Normal for 60 days (14b's C4). */
export const C4_ID = 'C4'
export const HOLD_DAYS = 60

/** 14b's proposed C4, dated from the decision. */
export function c4(at: string): Condition {
  return {
    id: C4_ID,
    text: `Normal review for the first ${HOLD_DAYS} days; no move to Reduced before ${formatDate(addDays(at, HOLD_DAYS))}`,
    appliesTo: 'This branch',
    activityIds: [],
    checkedBy: 'Review level rules',
  }
}

const pct = (n: number, digits = 1) => `${n.toFixed(digits)} %`
const trimPct = (n: number) => `${Number.isInteger(n) ? n : n} %`

export const promotionOf = (s: DemoState, id: string) => s.promotions.find((p) => p.id === id)
export const promotionContext = (s: DemoState, p: Promotion) => {
  const activity = s.activities.find((a) => a.id === p.activityId)
  const agent = s.agents.find((a) => a.id === activity?.agentId)
  const branch = activity?.branches.find((b) => b.id === p.branchId)
  return activity && agent && branch ? { activity, agent, branch } : null
}

/** "Review: promotion · Allergy Recon Agent": the board's hand-off, and the type the board resolves. */
export const boardItem = (agentName: string) => `Review: promotion · ${agentName}`
export const returnedItem = (agentName: string) => `Promotion returned · ${agentName}`

/** Days the branch has been at its level: since its first signature there (14a "90 days at Draft"). */
export function daysAtLevel(s: DemoState, p: Promotion): number {
  const signed = s.privileges.filter((x) => x.code === p.privilegeCode && x.level === p.from && x.grantedAt).map((x) => x.grantedAt!).sort()[0]
  return signed ? dayGap(signed, s.now) : 0
}

/**
 * 14a's criteria, from the state where it has them (R11): the signed-as-is and rejected rates are
 * the catalogue's; defects add today's checks to the catalogue's base; days at Reduced come from
 * the review level's history (0 if the activity isn't at Reduced).
 */
export function criteria(s: DemoState, id: string): PromotionCriterion[] {
  const p = promotionOf(s, id)
  const content = p && PROMOTION_CONTENT[p.id]
  if (!p || !content) return []
  const today = s.samplingDraws.filter((d) => d.activityId === p.activityId && (d.result === 'right' || d.result === 'defect'))
  const defects = content.defects.base.defects + today.filter((d) => d.result === 'defect').length
  const checks = content.defects.base.checks + today.length
  const rate = checks ? (defects / checks) * 100 : 0
  const activity = s.activities.find((a) => a.id === p.activityId)
  const reduced = activity?.reviewLevel === 'reduced' ? dayGap(levelSince(s, p.activityId), s.now) : 0
  return [
    { label: 'Signed as is', target: `≥ ${pct(content.signedAsIs.target)}`, short: `target ≥ ${trimPct(content.signedAsIs.target)}`, result: pct(content.signedAsIs.result), value: pct(content.signedAsIs.result), met: content.signedAsIs.result >= content.signedAsIs.target },
    { label: 'Rejected by the pharmacist', target: `≤ ${pct(content.rejected.target)}`, short: `target ≤ ${trimPct(content.rejected.target)}`, result: pct(content.rejected.result), value: pct(content.rejected.result), met: content.rejected.result <= content.rejected.target },
    { label: 'Defects in independent checks', target: `≤ ${pct(content.defects.target)}`, short: `target ≤ ${trimPct(content.defects.target)}`, result: `${pct(rate, 2)} · ${defects} of ${checks}`, value: `${defects} of ${checks}`, met: rate <= content.defects.target },
    { label: 'Days at Reduced review', target: `≥ ${content.reducedDays}`, short: `target ≥ ${content.reducedDays}`, result: String(reduced), value: `${reduced} days`, met: reduced >= content.reducedDays },
  ]
}

/** The AI review board's next meeting after `at` (the second Wednesday, 15:00). */
export const nextMeeting = (at: string) => BOARD_MEETINGS.find((m) => m > at) ?? addDays(at, 28)

/** Does this promotion need the board? Above Tier 2, yes (E2's tier rules). */
export const needsBoard = (s: DemoState, p: Promotion) => {
  const agent = promotionContext(s, p)?.agent
  return agent ? TIER_RULES[agent.riskTier].promotion === 'Board' : true
}

/**
 * The promotion takes effect (14b, or the sponsor's signature at Tier 2): the next privilege version
 * grants the branch its level, with any new conditions; the review level resets to Normal; the board's
 * C4 holds Reduced off; the sponsor and owner are told.
 */
function promote(s: DemoState, p: Promotion, conditions: Condition[], by: string, at: string) {
  const ctx = promotionContext(s, p)
  const latest = latestByCode(s, p.privilegeCode)
  if (!ctx || !latest) return
  const { activity, agent, branch } = ctx
  const version = nextVersion(s, latest.code)
  for (const x of s.privileges) if (x.code === latest.code && x.state !== 'closed') x.state = 'closed'
  const next: Privilege = {
    ...latest,
    id: `${latest.code.toLowerCase()}-v${version}`,
    version,
    state: 'active',
    grantedBy: p.sponsor?.by ?? by,
    grantedAt: at,
    reviewDate: reviewDateFrom(at, agent.riskTier),
    conditions: [...latest.conditions, ...conditions.map((c) => c.id).filter((id) => !latest.conditions.includes(id))],
    branchLevels: { ...latest.branchLevels, [branch.id]: p.to },
    ...(p.sponsor ? { signReason: p.sponsor.reason } : {}),
  }
  delete next.proposedLevel
  delete next.movedBy
  delete next.trigger
  delete next.lapsedAt
  s.privileges.push(next)
  branch.level = p.to
  if (activity.reviewLevel !== 'normal') applyLevelChange(s, activity.id, 'normal', 'rule', `Promoted to ${LEVEL_NAME[p.to]} · ${next.code} v${next.version}`, at)
  if (conditions.some((c) => c.id === C4_ID)) {
    recordFor(s, activity.id).noReducedBefore = `${addDays(at, HOLD_DAYS).slice(0, 10)}T00:00:00`
  }
  p.state = 'approved'
  s.logEvents.push({
    id: `log-promoted-${p.id}`,
    at,
    agentId: agent.id,
    text: `${branch.name} promoted to ${LEVEL_NAME[p.to]} · ${next.code} v${next.version}`,
    sub: `${personName(s, by)}${conditions.length ? ` · conditions ${conditions.map((c) => c.id).join(', ')}` : ''}`,
    to: [agent.sponsorId, agent.ownerId],
  })
}

/** The sponsor signs (14a): above Tier 2 it goes to the board's next meeting; otherwise it takes effect now. */
export function applySignPromotion(s: DemoState, id: string, reason: string, by: string, at: string): DemoState {
  const p = promotionOf(s, id)
  const ctx = p && promotionContext(s, p)
  if (!p || !ctx || p.state !== 'sponsor') return s
  const { activity, agent } = ctx
  p.evidence = { days: daysAtLevel(s, p), outputs: PROMOTION_CONTENT[p.id]?.outputs ?? '', criteria: criteria(s, p.id) }
  p.sponsor = { by, at, reason }
  delete p.returned
  resolveItems(s, agent.id, boardItem(agent.name), by, at, 'Signed again')
  if (!needsBoard(s, p)) {
    promote(s, p, [], by, at)
    return s
  }
  const meeting = nextMeeting(at)
  p.state = 'board'
  p.board = { meeting, ...(PROMOTION_CONTENT[p.id]?.agenda ?? { item: 1, of: 1 }) }
  const chair = s.roles.find((r) => r.role === 'committee')?.personId ?? 'drlee'
  raiseItem(s, {
    agentId: agent.id,
    type: boardItem(agent.name),
    reason: `${personName(s, by)} signed: ${activity.branches.find((b) => b.id === p.branchId)!.name.toLowerCase()} to ${LEVEL_NAME[p.to]}`,
    action: 'decide',
    actionSub: `Tier ${agent.riskTier} · board ${formatDate(meeting)}`,
    ownerId: chair,
    copied: [agent.sponsorId, agent.ownerId],
    link: { label: 'Open the promotion', to: `/portfolio/promotions/${p.id}` },
    at,
    deadline: meeting,
  })
  return s
}

/** The sponsor's "Request changes" (14a): back to the owner with a note. */
export function applyReturnPromotion(s: DemoState, id: string, note: string, by: string, at: string): DemoState {
  const p = promotionOf(s, id)
  const ctx = p && promotionContext(s, p)
  if (!p || !ctx || p.state !== 'sponsor') return s
  p.state = 'returned'
  p.returned = { by, at, note }
  raiseItem(s, {
    agentId: ctx.agent.id,
    type: returnedItem(ctx.agent.name),
    reason: note,
    action: 'answer',
    actionSub: `${personName(s, by)} asked for changes`,
    ownerId: p.requestedBy,
    copied: [by],
    link: { label: 'Open the promotion', to: `/inventory/promotions/${p.id}` },
    at,
  })
  return s
}

/** The owner sends a returned promotion to the sponsor again (14a, composed). */
export function applyResendPromotion(s: DemoState, id: string, by: string, at: string): DemoState {
  const p = promotionOf(s, id)
  const ctx = p && promotionContext(s, p)
  if (!p || !ctx || p.state !== 'returned') return s
  p.state = 'sponsor'
  delete p.returned
  resolveItems(s, ctx.agent.id, returnedItem(ctx.agent.name), by, at, 'Sent again')
  return s
}

/** The board's decision (14b), as 2c's four outcomes. */
export function applyDecidePromotion(s: DemoState, id: string, input: { kind: ReviewDecision['kind']; conditions: Condition[]; reason: string }, by: string, at: string): DemoState {
  const p = promotionOf(s, id)
  const ctx = p && promotionContext(s, p)
  if (!p || !ctx || p.state !== 'board') return s
  const { agent } = ctx
  const conditions = input.kind === 'approveWithConditions' ? input.conditions : []
  p.decision = { kind: input.kind, conditions, reason: input.reason, by, at }
  resolveItems(s, agent.id, boardItem(agent.name), by, at, input.kind === 'reReview' ? 'Back to the sponsor' : input.kind === 'deny' ? 'Denied' : 'Approved')
  if (input.kind === 'approve' || input.kind === 'approveWithConditions') {
    promote(s, p, conditions, by, at)
  } else if (input.kind === 'reReview') {
    p.state = 'sponsor'
    p.returned = { by, at, note: input.reason }
    s.logEvents.push({ id: `log-rereview-${p.id}-${s.logEvents.length + 1}`, at, agentId: agent.id, text: `Promotion back to ${personName(s, agent.sponsorId)} with questions`, sub: input.reason, to: [agent.sponsorId, agent.ownerId] })
  } else {
    p.state = 'denied'
    s.logEvents.push({ id: `log-denied-${p.id}`, at, agentId: agent.id, text: `Promotion denied · stays at ${LEVEL_NAME[p.from]}`, sub: input.reason, to: [agent.sponsorId, agent.ownerId] })
  }
  return s
}
