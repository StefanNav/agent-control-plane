import { CHECKED_EARLIER_THIS_WEEK } from '../../data/seed/autonomy'
import { REVIEWER_STATS } from '../../data/seed/catalogue'
import type { DemoState, ReviewLevel, SamplingDraw } from '../../data/types'
import { formatClock, formatDate } from '../../lib/clock'
import { levelOf, LEVEL_TITLE, reviewerName } from '../../store/levels'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'
import { reviewerDivision } from '../reviewers/selectors'

export type SamplingTab = 'today' | 'week' | 'rules'

/** "1 in 50": how often a level draws a signed output for a check. */
const SHORT_RATE: Record<ReviewLevel, string> = { tightened: 'every output', normal: '1 in 10', reduced: '1 in 50' }

export const RESULT_LABEL: Record<NonNullable<SamplingDraw['result']>, string> = {
  right: 'Right as signed',
  defect: 'Defect',
  cantTell: 'Can’t tell from the record',
}

/** The three answers, verbatim (13b). */
export const OPTIONS: { value: NonNullable<SamplingDraw['result']>; title: string; description: string }[] = [
  { value: 'right', title: 'Right as signed', description: 'The agent and the reviewer were both correct' },
  { value: 'defect', title: 'Defect', description: 'Wrong as signed: the agent erred and the reviewer missed it' },
  { value: 'cantTell', title: 'Can’t tell from the record', description: 'Counts as neither; asks the reviewer' },
]

const lower = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`

/** What a recorded result does to this activity's level, said before you record it (13b's notice). */
function notice(s: DemoState, activityId: string, name: string) {
  const level = s.activities.find((a) => a.id === activityId)?.reviewLevel ?? 'normal'
  const r = levelOf(s, activityId).rules
  const text = 'Your result counts toward its rules as soon as you record it.'
  if (level === 'reduced') return { lead: `One defect moves ${lower(name)} back to Normal review.`, text }
  if (level === 'normal') return { lead: `${r.tighten.defects} defects in ${r.tighten.batches} batches move ${lower(name)} to Tightened review.`, text }
  return { lead: `${lower(name)} stays at Tightened review until ${r.relax.batches} clean batches in a row.`.replace(/^./, (c) => c.toUpperCase()), text }
}

/** 13b: today's random draw of signed outputs, grouped by activity, and the check of one of them. */
export function selectSampling(s: DemoState, viewerId: string, tab: SamplingTab, drawId: string | null) {
  const divisionId = reviewerDivision(s, null, viewerId)
  const division = s.divisions.find((d) => d.id === divisionId)
  const inDivision = (activityId: string) => s.agents.find((a) => a.id === s.activities.find((x) => x.id === activityId)?.agentId)?.divisionId === divisionId
  const draws = s.samplingDraws.filter((d) => inDivision(d.activityId))
  const reduced = s.activities.filter((a) => a.reviewLevel === 'reduced' && inDivision(a.id))
  const checked = draws.filter((d) => d.result)
  const activityIds = [...new Set(draws.map((d) => d.activityId))]
  const agentOf = (activityId: string) => s.agents.find((a) => a.id === s.activities.find((x) => x.id === activityId)?.agentId)!
  const selected = draws.find((d) => d.id === drawId) ?? draws.find((d) => !d.result) ?? draws[0]
  const base = '/operations/sampling'

  const detail = selected
    ? (() => {
        const activity = s.activities.find((a) => a.id === selected.activityId)!
        const agent = agentOf(activity.id)
        return {
          id: selected.id,
          meta: `${selected.actionCode} · ${agent.name} ${selected.build} · signed as is ${formatClock(selected.signedAt)}`,
          title: `Encounter ${selected.encounter} · ${selected.unit} · ${selected.list}`,
          lines: selected.lines,
          independent: `Your check, independent of ${reviewerName(selected.signedBy)}`,
          notice: notice(s, activity.id, activity.name),
          foot: `Drawn at random · ${SHORT_RATE[activity.reviewLevel]} · not chosen by anyone`,
          canRecord: can(s, viewerId, 'recordCheck', { agentId: agent.id }),
          result: selected.result
            ? { label: RESULT_LABEL[selected.result], by: personName(s, selected.checkedBy), at: formatClock(selected.checkedAt!), note: selected.note ?? null }
            : null,
          next: draws.find((d) => !d.result && d.id !== selected.id)?.id ?? null,
        }
      })()
    : null

  return {
    breadcrumb: 'Operations / Sampling queue',
    title: 'Sampling queue',
    status: `${personName(s, division?.ownerId)} · ${reduced.length} activit${reduced.length === 1 ? 'y' : 'ies'} on Reduced review`,
    tabs: [
      { id: 'today' as const, label: `Today · ${draws.length}`, to: base },
      { id: 'week' as const, label: `Checked this week · ${CHECKED_EARLIER_THIS_WEEK + checked.length}`, to: `${base}?tab=week` },
      { id: 'rules' as const, label: 'Rules', to: `${base}?tab=rules` },
    ],
    tab,
    head: `${draws.length} drawn · ${draws.length - checked.length} to check`,
    drawnAt: draws[0] ? `drawn ${formatClock(draws[0].drawnAt)}` : '',
    groups: activityIds.map((id) => {
      const activity = s.activities.find((a) => a.id === id)!
      return {
        activityId: id,
        title: activity.name,
        sub: `${agentOf(id).name} · ${LEVEL_TITLE(activity.reviewLevel)} · ${SHORT_RATE[activity.reviewLevel]}`,
        rows: draws
          .filter((d) => d.activityId === id)
          .map((d) => ({ id: d.id, title: `${d.actionCode} · enc ${d.encounter}`, sub: `signed by ${d.signedBy}`, time: formatClock(d.signedAt), checked: Boolean(d.result) })),
      }
    }),
    detail,
    week: {
      rows: checked.map((d) => ({ id: d.id, code: d.actionCode, activity: s.activities.find((a) => a.id === d.activityId)!.name, result: RESULT_LABEL[d.result!], by: personName(s, d.checkedBy), time: formatClock(d.checkedAt!) })),
      earlier: `${CHECKED_EARLIER_THIS_WEEK} more earlier this week`,
    },
    // In the queue's order, then any other activity off Normal review.
    rules: s.activities
      .filter((a) => inDivision(a.id) && a.reviewLevel !== 'normal')
      .sort((a, b) => (activityIds.indexOf(a.id) + 1 || 99) - (activityIds.indexOf(b.id) + 1 || 99))
      .map((a) => ({ id: a.id, activity: a.name, level: `${LEVEL_TITLE(a.reviewLevel)} · ${SHORT_RATE[a.reviewLevel]}`, to: `/portfolio/activities/${a.id}` })),
    units: s.reviewChanges
      .filter((c) => c.state === 'signed' && c.option === 'sampling' && c.until && c.until > s.now)
      .map((c) => `${REVIEWER_STATS.find((u) => u.id === c.unitId)?.name ?? c.unitId}: 20 % until ${formatDate(c.until!)}`),
  }
}
