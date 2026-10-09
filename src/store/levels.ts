import { TEMPLATE_RULES } from '../data/seed/autonomy'
import type { DemoState, ReviewLevel, ReviewLevelRecord, ReviewRules } from '../data/types'
import { addDays, formatDate } from '../lib/clock'

/** How much of a level's signed output a second pharmacist checks (13a's three cards). */
export const RATE: Record<ReviewLevel, { title: string; label: string; every: number }> = {
  tightened: { title: 'Tightened', label: 'Every signed output checked', every: 1 },
  normal: { title: 'Normal', label: '1 in 10 checked', every: 10 },
  reduced: { title: 'Reduced', label: '1 in 50 checked', every: 50 },
}

export const LEVEL_TITLE = (level: ReviewLevel) => RATE[level].title

/** When an activity's privilege was first signed: where its review level starts. */
function firstSigned(s: DemoState, activityId: string): string {
  return s.privileges.filter((p) => p.activityId === activityId && p.grantedAt).map((p) => p.grantedAt!).sort()[0] ?? s.now
}

/** The activity's review-level record, or the template a new activity starts with (R8). */
export function levelOf(s: DemoState, activityId: string): ReviewLevelRecord {
  const record = s.reviewLevels.find((r) => r.activityId === activityId)
  if (record) return record
  const activity = s.activities.find((a) => a.id === activityId)
  const sponsor = s.agents.find((a) => a.id === activity?.agentId)?.sponsorId ?? ''
  const since = firstSigned(s, activityId)
  return { activityId, rules: TEMPLATE_RULES, writtenBy: sponsor, writtenAt: since, since, changes: [], checks: 0, defects: 0, defectDays: [] }
}

/** The record to change, created from the template the first time (mutations only). */
function recordFor(s: DemoState, activityId: string): ReviewLevelRecord {
  let record = s.reviewLevels.find((r) => r.activityId === activityId)
  if (!record) {
    record = structuredClone(levelOf(s, activityId))
    s.reviewLevels.push(record)
  }
  return record
}

type RuleId = keyof ReviewRules
const MOVES: Record<RuleId, { from: ReviewLevel; to: ReviewLevel }> = {
  reduce: { from: 'normal', to: 'reduced' },
  restore: { from: 'reduced', to: 'normal' },
  tighten: { from: 'normal', to: 'tightened' },
  relax: { from: 'tightened', to: 'normal' },
}

/** A rule in words, from its numbers (13a's "Rule" column and the rule editor). */
export function ruleText(id: RuleId, r: ReviewRules): string {
  switch (id) {
    case 'reduce':
      return `${r.reduce.days} days in a row with no defects, at least ${r.reduce.checks} checks, and an edit rate under ${r.reduce.editRate} %`
    case 'restore':
      return `Any defect in a check, an edit rate above ${r.restore.editRate} % for ${r.restore.days} days, or a new agent or SOP version`
    case 'tighten':
      return `${r.tighten.defects} defects in any ${r.tighten.batches} batches of checks in a row`
    case 'relax':
      return `${r.relax.batches} clean batches in a row`
  }
}

export const counts = (checks: number, defects: number) => `${checks} checks · ${defects} defect${defects === 1 ? '' : 's'}`

export type RuleRow = { id: RuleId; move: string; text: string; now: 'fired' | 'watching' | 'held' | 'off'; at?: string; counts?: string }

/**
 * 13a's rules table: the rule that brought the level here "Fired", the ones that can move it from
 * here "Watching" (or "held" by a board condition), the rest "Not in use".
 */
export function ruleRows(s: DemoState, activityId: string): RuleRow[] {
  const record = levelOf(s, activityId)
  const level = s.activities.find((a) => a.id === activityId)?.reviewLevel ?? 'normal'
  const last = record.changes.at(-1)
  return (Object.keys(MOVES) as RuleId[]).map((id) => {
    const move = MOVES[id]
    const base = { id, move: `${LEVEL_TITLE(move.from)} → ${LEVEL_TITLE(move.to)}`, text: ruleText(id, record.rules) }
    if (last && last.by === 'rule' && last.from === move.from && last.to === move.to && level === move.to)
      return { ...base, now: 'fired' as const, at: last.at, ...(record.fired ? { counts: counts(record.fired.checks, record.fired.defects) } : {}) }
    if (move.from === level) {
      if (id === 'reduce' && record.noReducedBefore && record.noReducedBefore > s.now) return { ...base, now: 'held' as const, at: record.noReducedBefore }
      return { ...base, now: 'watching' as const, counts: counts(record.checks, record.defects) }
    }
    return { ...base, now: 'off' as const }
  })
}

/**
 * Move an activity's review level: record who or which rule moved it and why, start the counts
 * again, and tell the sponsor and owner (13a: "Priya and Marcus are told each time").
 */
export function applyLevelChange(s: DemoState, activityId: string, to: ReviewLevel, by: 'rule' | string, why: string, at: string): DemoState {
  const activity = s.activities.find((a) => a.id === activityId)
  const agent = s.agents.find((a) => a.id === activity?.agentId)
  if (!activity || !agent || activity.reviewLevel === to) return s
  const record = recordFor(s, activityId)
  const from = activity.reviewLevel
  record.changes.push({ at, from, to, by, why })
  if (by === 'rule') record.fired = { checks: record.checks, defects: record.defects }
  record.checks = 0
  record.defects = 0
  activity.reviewLevel = to
  s.logEvents.push({
    id: `log-level-${activityId}-${record.changes.length}`,
    at,
    agentId: agent.id,
    text: `${activity.name}: ${LEVEL_TITLE(from)} → ${LEVEL_TITLE(to)}`,
    sub: by === 'rule' ? `By rule · ${why}` : `${s.people.find((p) => p.id === by)?.name ?? by} · ${why}`,
    to: [agent.sponsorId, agent.ownerId],
  })
  return s
}

/** "Tighten now…" (13a): a person may tighten at any time, with a reason; nobody loosens by hand. */
export function applyTighten(s: DemoState, activityId: string, reason: string, by: string, at: string): DemoState {
  return applyLevelChange(s, activityId, 'tightened', by, reason, at)
}

/** "Edit rules" (13a, composed): the sponsor rewrites the numbers; the level itself doesn't move. */
export function applyRules(s: DemoState, activityId: string, input: { rules: ReviewRules; reason: string }, by: string, at: string): DemoState {
  const activity = s.activities.find((a) => a.id === activityId)
  if (!activity) return s
  const record = recordFor(s, activityId)
  record.rules = structuredClone(input.rules)
  record.writtenBy = by
  record.writtenAt = at
  s.logEvents.push({ id: `log-rules-${activityId}-${s.logEvents.length + 1}`, at, agentId: activity.agentId, text: `${activity.name}: review-level rules edited`, sub: input.reason })
  return s
}

/** 13a's Reduced → Normal rule: a new agent or SOP version sends every Reduced activity back to Normal. */
export function applyNewVersionLevels(s: DemoState, agentId: string, at: string): DemoState {
  for (const activity of s.activities)
    if (activity.agentId === agentId && activity.reviewLevel === 'reduced') applyLevelChange(s, activity.id, 'normal', 'rule', 'New agent or SOP version', at)
  return s
}

/** Every number in the rules must be a whole number of at least 1. */
export const validRules = (r: ReviewRules) => Object.values(r).every((group) => Object.values(group as Record<string, number>).every((n) => Number.isFinite(n) && n >= 1))

/** "since 24 Nov": when the current level began. */
export function levelSince(s: DemoState, activityId: string): string {
  const record = levelOf(s, activityId)
  return record.changes.at(-1)?.at ?? record.since
}

export const sinceLabel = (iso: string) => `since ${formatDate(iso)}`

/** The reviewer's name as the check names them: "Lee T., PharmD" → "Lee T.". */
export const reviewerName = (signedBy: string) => signedBy.replace(/, PharmD$/, '')

/**
 * Record one independent check (13b). "Right" counts a check; "Defect" counts a check and a
 * defect and moves the level by rule (Reduced → Normal on any defect; Normal → Tightened on enough
 * defects within the batches); "Can't tell" counts neither and asks the reviewer (R9).
 */
export function applyCheck(s: DemoState, drawId: string, input: { result: 'right' | 'defect' | 'cantTell'; note?: string }, by: string, at: string): DemoState {
  const draw = s.samplingDraws.find((d) => d.id === drawId)
  const activity = s.activities.find((a) => a.id === draw?.activityId)
  if (!draw || !activity || draw.result) return s
  Object.assign(draw, { result: input.result, checkedBy: by, checkedAt: at, ...(input.note?.trim() ? { note: input.note.trim() } : {}) })
  if (input.result === 'cantTell') {
    s.logEvents.push({ id: `log-ask-${draw.id}`, at, agentId: activity.agentId, text: `Asked ${reviewerName(draw.signedBy)} about ${draw.actionCode}`, sub: 'Can’t tell from the record · counts as neither' })
    return s
  }
  const record = recordFor(s, activity.id)
  record.checks += 1
  if (input.result === 'right') return s
  record.defects += 1
  record.defectDays.push(at.slice(0, 10))
  if (activity.reviewLevel === 'reduced') return applyLevelChange(s, activity.id, 'normal', 'rule', `1 defect in a check · ${draw.actionCode}`, at)
  if (activity.reviewLevel === 'normal') {
    const { defects, batches } = record.rules.tighten
    const window = addDays(at, -(batches - 1)).slice(0, 10)
    const recent = record.defectDays.filter((day) => day >= window).length
    if (recent >= defects) return applyLevelChange(s, activity.id, 'tightened', 'rule', `${defects} defects in ${batches} batches · ${draw.actionCode}`, at)
  }
  return s
}
