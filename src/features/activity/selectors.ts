import type { LadderState, LadderStep } from '../../components'
import type { DemoState, Level, ReviewLevel } from '../../data/types'
import { addDays, formatClock, formatDate, minutesBetween } from '../../lib/clock'
import { counts, LEVEL_TITLE, levelOf, levelSince, RATE, ruleRows, sinceLabel } from '../../store/levels'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'
import { criteria } from '../../store/promotions'
import { currentPrivilege, selectPrivilegeCards } from '../board/selectors'

export const LEVELS: Level[] = ['shadow', 'draft', 'supervised', 'autonomous']
export const LEVEL_NAME: Record<Level, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

export type ActivityTab = 'privilege' | 'review-level' | 'evidence' | 'history'
const TABS: { id: ActivityTab; label: string }[] = [
  { id: 'privilege', label: 'Privilege' },
  { id: 'review-level', label: 'Review level' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'history', label: 'History' },
]

const find = (s: DemoState, activityId: string) => {
  const activity = s.activities.find((a) => a.id === activityId)
  const agent = s.agents.find((a) => a.id === activity?.agentId)
  return activity && agent ? { activity, agent } : null
}

/** A branch's level: its own if it has one, else its activity's (R10). */
export const branchLevel = (activity: DemoState['activities'][number], branchId: string) => activity.branches.find((b) => b.id === branchId)?.level ?? activity.level

/**
 * The compact ladder at a level: lower levels granted before, higher ones allowed (Supervised) or
 * locked (Autonomous, and every level of a branch a hard stop forbids).
 */
export function ladderAt(level: Level, opts: { lockedBy?: string; proposed?: Level; held?: Level } = {}): LadderStep[] {
  const at = LEVELS.indexOf(level)
  return LEVELS.map((l, i): LadderStep => {
    let state: LadderState
    if (opts.lockedBy) state = 'locked'
    else if (i < at) state = 'passed'
    else if (i === at) state = 'current'
    else if (opts.held === l) state = 'held'
    else if (opts.proposed === l) state = 'proposed'
    else if (l === 'autonomous') state = 'locked'
    else state = 'available'
    return { level: l, state }
  })
}

/** "Draft since 14 Dec 14:20 · was Supervised" while a branch is stepped down (15b), else its level. */
function branchStatus(s: DemoState, activity: DemoState['activities'][number], branchId: string) {
  const d = s.stepDowns.find((x) => x.activityId === activity.id && x.branchId === branchId && !x.restoredAt)
  if (!d) return LEVEL_NAME[branchLevel(activity, branchId)]
  return `${LEVEL_NAME[d.to]} since ${formatDate(d.at)} ${formatClock(d.at)} · was ${LEVEL_NAME[d.from]}`
}

/** The header and tabs of the activity page (13a) or a branch of it (15b), or null for an unknown id. */
export function selectActivityPage(s: DemoState, activityId: string, branchId: string | null, viewerId: string) {
  const found = find(s, activityId)
  if (!found) return null
  const { activity, agent } = found
  const branch = branchId ? activity.branches.find((b) => b.id === branchId) : null
  if (branchId && !branch) return null
  const prv = currentPrivilege(s, activity.id)
  const division = s.divisions.find((d) => d.id === agent.divisionId)
  const base = branch ? `/portfolio/activities/${activity.id}/branches/${branch.id}` : `/portfolio/activities/${activity.id}`
  const defaultTab: ActivityTab = branch ? 'history' : 'review-level'
  return {
    viewerId,
    activityId: activity.id,
    agentId: agent.id,
    branchId: branch?.id ?? null,
    breadcrumb: `${division?.name ?? ''} / ${agent.name} / Privileges${prv ? ` / ${prv.code}` : ''}`,
    title: branch ? branch.name : activity.name,
    status: branch ? branchStatus(s, activity, branch.id) : `${LEVEL_NAME[activity.level]} · review level ${LEVEL_TITLE(activity.reviewLevel)}`,
    idLine: `${prv ? `${prv.code} v${prv.version} · ` : ''}${agent.name} ${agent.version}`,
    defaultTab,
    tabs: TABS.map((t) => ({ ...t, to: t.id === defaultTab ? base : `${base}?tab=${t.id}` })),
  }
}

/** The last 90 days of review levels as segments of a bar (13a "Last 90 days"). */
function levelBar(s: DemoState, activityId: string) {
  const record = levelOf(s, activityId)
  const start = addDays(s.now, -90)
  const timeline: { level: ReviewLevel; from: string }[] = [{ level: 'normal', from: record.since }, ...record.changes.map((c) => ({ level: c.to, from: c.at }))]
  const spans = timeline
    .map((t, i) => ({ level: t.level, from: t.from, to: timeline[i + 1]?.from ?? s.now }))
    .filter((sp) => sp.to > start && sp.to > sp.from)
    .map((sp) => ({ ...sp, minutes: minutesBetween(sp.from < start ? start : sp.from, sp.to) }))
  const total = spans.reduce((sum, sp) => sum + sp.minutes, 0) || 1
  return spans.map((sp) => ({ level: sp.level, label: LEVEL_TITLE(sp.level), date: formatDate(sp.from), share: sp.minutes / total }))
}

const NOW_LABEL = { fired: (at?: string) => `Fired ${formatDate(at!)}`, watching: () => 'Watching', held: (at?: string) => `Held until ${formatDate(at!)} (C4)`, off: () => 'Not in use' }

/** 13a: the review level, the rules that move it, the last 90 days, and what happens at this level. */
export function selectReviewLevel(s: DemoState, activityId: string, viewerId = s.personaId) {
  const found = find(s, activityId)!
  const { activity, agent } = found
  const record = levelOf(s, activityId)
  const level = activity.reviewLevel
  const since = levelSince(s, activityId)
  const day = agent.metrics.day ?? 0
  const outputs = Math.round(day / 10) * 10
  const r = record.rules
  const last: [string, string][] =
    level === 'reduced'
      ? [['Back to Normal', 'on 1 defect']]
      : level === 'normal'
        ? [
            ['To Reduced', `after ${r.reduce.days} clean days and ${r.reduce.checks} checks`],
            ['To Tightened', `on ${r.tighten.defects} defects in ${r.tighten.batches} batches`],
          ]
        : [['Back to Normal', `after ${r.relax.batches} clean batches`]]
  return {
    activityName: activity.name,
    levels: (['tightened', 'normal', 'reduced'] as ReviewLevel[]).map((l) => ({
      level: l,
      title: RATE[l].title,
      rate: RATE[l].label,
      since: l === level && record.changes.length ? sinceLabel(since) : null,
      current: l === level,
    })),
    help: 'Pharmacists still sign every output at Draft. The review level sets how many signed outputs a second pharmacist checks independently, to catch what the agent got wrong and the reviewer missed.',
    rulesHead: `Rules that move the level · written by ${personName(s, record.writtenBy)}, ${formatDate(record.writtenAt)}`,
    rules: record.rules,
    rows: ruleRows(s, activityId).map((row) => ({ ...row, nowLabel: NOW_LABEL[row.now](row.at), counts: row.counts ?? null })),
    tightened: level === 'tightened',
    bar: levelBar(s, activityId),
    at: {
      title: `At ${RATE[level].title}`,
      sub: level === 'tightened' ? `Every one of ~${outputs} outputs a day` : `About ${Math.round(day / RATE[level].every)} checks a day of ~${outputs} outputs`,
      rows: [
        ['Checked by', `${personName(s, agent.ownerId)} · sampling queue`],
        ['Drawn', 'at random, 06:00 daily'],
        [`Since ${formatDate(since)}`, counts(record.checks, record.defects)],
        ...last,
      ] as [string, string][],
    },
    changes: [...record.changes].reverse().map((c) => ({
      date: formatDate(c.at),
      title: `${LEVEL_TITLE(c.from)} → ${LEVEL_TITLE(c.to)}`,
      sub: c.by === 'rule' ? c.why : `${c.why} · ${personName(s, c.by)}`,
    })),
    told: `${personName(s, agent.sponsorId)} and ${personName(s, agent.ownerId)} are told each time`,
    canTighten: can(s, viewerId, 'tightenReview', { agentId: agent.id }),
    canEditRules: can(s, viewerId, 'editReviewRules', { agentId: agent.id }),
  }
}

/** The Privilege tab (composed): the privilege in force and, if the activity has branches, each on its ladder. */
export function selectPrivilegeTab(s: DemoState, activityId: string) {
  const { activity, agent } = find(s, activityId)!
  const prv = currentPrivilege(s, activity.id)
  const card = prv ? (selectPrivilegeCards(s, agent.id).find((c) => c.code === `${prv.code} v${prv.version}`) ?? null) : null
  // 14a: a promotion of one of its branches waiting for the sponsor (R11: no seeded inbox item).
  const waiting = s.promotions.find((p) => p.activityId === activity.id && (p.state === 'sponsor' || p.state === 'returned' || p.state === 'board'))
  const branchName = waiting ? (activity.branches.find((b) => b.id === waiting.branchId)?.name ?? '') : ''
  return {
    card,
    promotion: waiting
      ? {
          id: waiting.id,
          text: `${personName(s, waiting.requestedBy)} asked to promote “${branchName.charAt(0).toLowerCase()}${branchName.slice(1)}” to ${LEVEL_NAME[waiting.to]} on ${formatDate(waiting.requestedAt)}.`,
          to: `/inventory/promotions/${waiting.id}`,
        }
      : null,
    title: `${activity.name} · ${activity.branches.length} branches`,
    branches: activity.branches.map((b) => {
      const level = branchLevel(activity, b.id)
      return {
        id: b.id,
        name: b.name,
        sub: b.sub ?? null,
        ladder: ladderAt(level, { ...(b.lockedBy ? { lockedBy: b.lockedBy } : {}) }),
        note: b.lockedBy ? { kind: 'tag' as const, text: b.lockedBy } : { kind: 'text' as const, text: `At ${LEVEL_NAME[level]}` },
      }
    }),
  }
}

/** The Evidence tab (composed): the evidence the privilege in force was signed on, and the latest promotion's criteria. */
export function selectEvidenceTab(s: DemoState, activityId: string) {
  const prv = currentPrivilege(s, activityId)
  const promotion = [...s.promotions].reverse().find((p) => p.activityId === activityId)
  const branch = promotion && s.activities.find((a) => a.id === activityId)?.branches.find((b) => b.id === promotion.branchId)
  return {
    promotion: promotion && branch ? { head: `${branch.name} · criteria for ${LEVEL_NAME[promotion.to]}`, criteria: promotion.evidence?.criteria ?? criteria(s, promotion.id) } : null,
    rows: prv
      ? ([
          ['Evidence', prv.evidence],
          ['Signed', `${personName(s, prv.grantedBy)}${prv.grantedAt ? ` · ${formatDate(prv.grantedAt)}` : ''}`],
          ['Review', prv.reviewDate ? formatDate(prv.reviewDate) : '—'],
        ] as [string, string][])
      : [],
  }
}

/**
 * History (composed): each change of the activity's level, newest first: the signatures that moved it
 * and the step-downs a rule made (review fix I5: a stepped-down version isn't anyone's signature).
 */
export function historyRows(s: DemoState, activityId: string) {
  const versions = s.privileges.filter((p) => p.activityId === activityId && p.grantedAt && p.state !== 'steppedDown').sort((a, b) => a.version - b.version)
  const rows: { key: string; at: string; date: string; title: string; sub: string; ladder: LadderStep[] }[] = []
  let previous: Level | null = null
  for (const p of versions) {
    if (p.level === previous) continue
    previous = p.level
    rows.push({ key: `${p.code}-v${p.version}`, at: p.grantedAt!, date: formatDate(p.grantedAt!), title: LEVEL_NAME[p.level], sub: `${personName(s, p.grantedBy)} signed ${p.code} v${p.version}`, ladder: ladderAt(p.level) })
  }
  for (const d of s.stepDowns.filter((x) => x.activityId === activityId && !x.branchId))
    rows.push({ key: d.id, at: d.at, date: `${formatDate(d.at)} ${formatClock(d.at)}`, title: `Stepped down to ${LEVEL_NAME[d.to]}`, sub: `By rule · ${d.trigger}`, ladder: ladderAt(d.to, { held: d.from }) })
  return rows.sort((a, b) => b.at.localeCompare(a.at))
}
