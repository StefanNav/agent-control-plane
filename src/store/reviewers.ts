import { REVIEWER_STATS, type UnitStats } from '../data/seed/catalogue'
import type { DemoState, ReviewChange } from '../data/types'
import { addDays } from '../lib/clock'
import { raiseItem, resolveItems } from './onboarding'
import { personName } from './onboardingRules'

export type Read = 'Agent improved' | 'Reviewers checking less' | 'Agent drifting, reviewers catching it' | 'Both slipping' | 'Steady'

/**
 * 11a's "How to read it": edit rate alone can't tell the stories apart; the independent check can.
 * Edits falling or rising by half a point or more; the check worse when misses rose half a point.
 */
export function readUnit(u: UnitStats): Read {
  const edits = u.editRate <= u.wasEditRate - 0.5 ? 'falling' : u.editRate >= u.wasEditRate + 0.5 ? 'rising' : 'flat'
  const worse = u.missRate >= u.wasMissRate + 0.5
  if (edits === 'falling') return worse ? 'Reviewers checking less' : 'Agent improved'
  if (edits === 'rising') return worse ? 'Both slipping' : 'Agent drifting, reviewers catching it'
  return worse ? 'Reviewers checking less' : 'Steady'
}

export const unitById = (id: string) => REVIEWER_STATS.find((u) => u.id === id)

/** What each response asks for, as its review item names it. */
export const OPTION_ITEM: Record<ReviewChange['option'], string> = {
  sampling: 'sampling change',
  tighten: 'review level',
  minTime: 'minimum review time',
}

const itemType = (c: Pick<ReviewChange, 'option'>, unit: UnitStats) => `Review: ${OPTION_ITEM[c.option]} · ${unit.name}`
const sponsorOf = (s: DemoState, unit: UnitStats) => s.divisions.find((d) => d.id === unit.divisionId)?.sponsorId ?? ''

/** The owner sends one response to the sponsor for sign-off (11b); the sponsor gets a review item. */
export function applyProposeReviewChange(s: DemoState, unitId: string, option: ReviewChange['option'], by: string, at: string): DemoState {
  const unit = unitById(unitId)
  if (!unit) return s
  const change: ReviewChange = { id: `rc-${unitId}-${s.reviewChanges.length + 1}`, unitId, option, by, at, state: 'waiting' }
  s.reviewChanges.push(change)
  const item = raiseItem(s, {
    agentId: '',
    type: itemType(change, unit),
    reason: `${personName(s, by)} asks you to sign a ${OPTION_ITEM[option]} for ${unit.name}: approvals got faster while the independent check found more misses.`,
    action: 'sign or decline',
    actionSub: 'by unit and shift, never by name',
    ownerId: sponsorOf(s, unit),
    copied: [by],
    link: { label: `Open ${unit.name}`, to: `/operations/reviewers/${unitId}` },
    at,
  })
  item.from = by
  // Review fix I5: an item about a unit follows the division's roles when they change hands.
  item.divisionId = unit.divisionId
  return s
}

/** The sponsor signs: it runs 14 days, and the night charge pharmacist is told what changed and why. */
export function applySignReviewChange(s: DemoState, id: string, by: string, at: string): DemoState {
  const change = s.reviewChanges.find((c) => c.id === id)
  const unit = change ? unitById(change.unitId) : undefined
  if (!change || !unit) return s
  Object.assign(change, { state: 'signed', decidedBy: by, decidedAt: at, until: addDays(at, 14) })
  resolveItems(s, '', itemType(change, unit), by, at, 'Signed')
  s.logEvents.push({ id: `log-review-${s.logEvents.length + 1}`, at, text: `${unit.name}: ${OPTION_ITEM[change.option]} signed by ${personName(s, by)}`, sub: 'The charge pharmacist is told what changed and why' })
  return s
}

export function applyDeclineReviewChange(s: DemoState, id: string, reason: string, by: string, at: string): DemoState {
  const change = s.reviewChanges.find((c) => c.id === id)
  const unit = change ? unitById(change.unitId) : undefined
  if (!change || !unit) return s
  Object.assign(change, { state: 'declined', decidedBy: by, decidedAt: at, reason })
  resolveItems(s, '', itemType(change, unit), by, at, 'Declined')
  return s
}

/** "Share with Priya" (11a): an FYI in the log, addressed to the sponsor (R18). */
export function applyShareFinding(s: DemoState, unitId: string, by: string, at: string): DemoState {
  const unit = unitById(unitId)
  if (!unit) return s
  s.logEvents.push({
    id: `log-share-${unitId}-${s.logEvents.length + 1}`,
    at,
    text: `${personName(s, by)} shared reviewer behaviour on ${unit.name}`,
    sub: 'Approvals faster, independent misses up',
    to: [sponsorOf(s, unit)],
  })
  return s
}
