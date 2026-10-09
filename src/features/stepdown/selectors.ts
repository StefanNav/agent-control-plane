import { STEP_DOWN_MED_REC } from '../../data/seed/autonomy'
import type { DemoState } from '../../data/types'
import { addDays, formatClock, formatDate } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { sinceText, STEPPED_DOWN } from '../../store/stepdowns'
import { ladderAt, LEVEL_NAME } from '../activity/selectors'

/** "You, Priya and Dana" for Marcus; "Marcus, Priya and Dana" for anyone else. */
function namesFor(s: DemoState, ids: string[], viewerId: string) {
  const names = ids.includes(viewerId) ? ['You', ...ids.filter((id) => id !== viewerId).map((id) => personName(s, id))] : ids.map((id) => personName(s, id))
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '')
}

/** "16.8 %, 17.9 % and 18.4 %" */
const series = (values: number[]) => {
  const parts = values.map((v) => `${v} %`)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? '')
}

/** 15a: an activity of this agent stepped down on a threshold breach, or null. */
export function selectStepDown(s: DemoState, agentId: string, viewerId: string) {
  const d = s.stepDowns.find((x) => x.agentId === agentId && x.cause === 'threshold' && !x.restoredAt)
  const activity = s.activities.find((a) => a.id === d?.activityId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!d || !activity || !agent) return null
  const name = activity.name.replace(/ at admission$/, '')
  const content = d.activityId === STEP_DOWN_MED_REC.activityId ? STEP_DOWN_MED_REC : null
  const item = s.exceptions.find((e) => e.id === d.exceptionId)
  const code = item?.code ?? ''
  const incident = s.incidents.find((i) => i.agentId === agentId && i.state !== 'closed')
  const fired = d.fired
  const days = content?.days ?? []
  return {
    activityId: d.activityId,
    levelLine: `${name} · ${LEVEL_NAME[d.to]} since ${sinceText(d.at, s.now)}`,
    chip: STEPPED_DOWN,
    notice: {
      lead: `${name} stepped down from ${LEVEL_NAME[d.from]} to ${LEVEL_NAME[d.to]} at ${formatClock(d.at)}.`,
      text: content
        ? `A trigger on ${fired} fired: edit rate above ${content.threshold} % for ${days.length} days in a row. It was ${series(days.map((x) => x.value))}.`
        : `A trigger on ${fired} fired: ${d.trigger.toLowerCase()}.`,
    },
    exceptionId: item?.id ?? null,
    incident: incident ? { id: incident.id, code: incident.code } : null,
    incidentTitle: `${name} stepped down on ${d.trigger.toLowerCase()}`,
    chart: content
      ? {
          label: 'Edit rate · 14 days',
          values: content.series,
          days: content.series.map((_, i) => formatDate(addDays(content.firstDay, i))),
          target: content.threshold,
          targetLabel: 'step-down threshold',
          highlight: days.length,
        }
      : null,
    happenedHead: `What happened at ${formatClock(d.at)}`,
    happened: [
      { n: String(d.routed), title: 'drafts in progress went to pharmacists', sub: content?.units ?? 'Within a minute' },
      { n: '0', title: 'drafts reach pharmacists from now on', sub: 'The agent keeps running in shadow and is compared with pharmacists’ lists' },
      { n: String(d.told.length), title: 'people told', sub: `${namesFor(s, d.told, viewerId)} · exception ${code} in ${viewerId === agent.ownerId ? 'your' : `${personName(s, agent.ownerId)}’s`} inbox` },
    ],
    backHead: `Back to ${LEVEL_NAME[d.from]}`,
    back: [
      { n: 1, title: 'Find and fix the cause', sub: content?.cause ?? d.trigger, who: `${personName(s, agent.ownerId)}, ${personName(s, agent.techOwnerId)}` },
      { n: 2, title: 'Shadow scorecard meets the same targets', sub: 'At least 7 days on the fixed version', who: 'Evidence' },
      { n: 3, title: `${personName(s, agent.sponsorId)} signs again`, sub: `A new version of ${fired.split(' ')[0]}`, who: personName(s, agent.sponsorId) },
    ],
    footnote: 'Nothing steps back up automatically. Moving up always needs a signature.',
    ladderTitle: name,
    ladder: ladderAt(d.to, { held: d.from }),
    held: `the level it held until ${formatClock(d.at)}.`,
    timeline: [
      ...days.map((x) => ({ at: formatDate(x.at), title: `Edit rate ${x.value} %`, sub: x.sub })),
      { at: formatClock(d.at), title: `Stepped down to ${LEVEL_NAME[d.to]}`, sub: 'At the gateway, by rule' },
      ...(item ? [{ at: formatClock(item.raisedAt), title: `Told ${d.told.map((id) => personName(s, id)).join(', ')}`, sub: code }] : []),
    ],
  }
}
