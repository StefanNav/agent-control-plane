import type { DemoState } from '../../data/types'
import { formatClock, formatDate, minutesBetween } from '../../lib/clock'
import { latestPrivilege } from '../../store/onboarding'
import { criteriaStatus, onboardingContext, personName, recordOfActivity, shadowProgress, templateFor } from '../../store/onboardingRules'

const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)} %`)
const n = (value: number) => value.toLocaleString('en-US')

/** Calendar days from one date to another, inclusive (15 Oct to 04 Nov → 21). */
const daysInclusive = (from: string, to: string) => Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86400000) + 1

/** "1 inaccurate · 1 omitted", or "None". */
function differences(lines: DemoState['sampleCases'][number]['lines']) {
  const inaccurate = lines.filter((l) => l.result === 'inaccurate').length
  const omitted = lines.filter((l) => l.result === 'omitted').length
  const parts = [inaccurate && `${inaccurate} inaccurate`, omitted && `${omitted} omitted`].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'None'
}

/** The shadow scorecard for one activity (3a): criteria, causes, sample cases and the go-live decision. */
export function selectScorecard(s: DemoState, agentId: string, activityId: string) {
  const agent = s.agents.find((a) => a.id === agentId)
  const activity = s.activities.find((a) => a.id === activityId && a.agentId === agentId)
  const card = s.scorecards.find((c) => c.activityId === activityId)
  if (!agent || !activity || !card) return null
  const record = recordOfActivity(s, activityId)
  const template = templateFor(s.intakeRequests.find((i) => i.id === record?.intakeId))
  const { people } = onboardingContext(s, agentId)
  const sponsor = personName(s, people.sponsor)
  const owner = personName(s, people.owner)
  const criteria = criteriaStatus(s, activityId)
  const progress = shadowProgress(s, activityId)
  const met = criteria.filter((c) => c.met).length
  const top = card.causes[0]
  const current = latestPrivilege(s, activityId)
  const signed = activity.level !== 'shadow' && current?.grantedAt ? `${personName(s, current.grantedBy)} signed Shadow → ${activity.level.charAt(0).toUpperCase()}${activity.level.slice(1)} · ${formatDate(current.grantedAt)}` : null
  const requested = current?.state === 'awaiting' && current.proposedLevel ? `Requested · waiting for ${sponsor}` : null
  const conditions = current?.conditions ?? []
  const maxCause = Math.max(1, ...card.causes.map((c) => c.count))
  const cases = card.sampleCaseIds.flatMap((id) => {
    const c = s.sampleCases.find((x) => x.id === id)
    if (!c) return []
    const agree = c.lines.filter((l) => l.result === 'agrees').length
    return [{ id: c.id, encounter: c.encounter, unit: c.unit, homeMeds: c.lines.length, agreement: `${Math.round((agree / c.lines.length) * 100)} %`, differences: differences(c.lines) }]
  })
  return {
    activities: s.activities.filter((a) => a.agentId === agentId && s.scorecards.some((c) => c.activityId === a.id)).map((a) => ({ id: a.id, name: a.name.replace(/ at admission$/, '') })),
    hasData: card.cases > 0,
    empty: `Shadow starts ${formatDate(card.from)}. Results appear after the first full day.`,
    line: `${daysInclusive(card.from, card.to)} days · ${n(card.cases)} ${template.caseNoun} · ${formatDate(card.from)} to ${formatDate(card.to)} · ${template.compareLine}`,
    criteria: criteria.map((c) => ({
      id: c.id,
      label: c.label,
      brief: c.brief,
      target: `${c.direction === 'atLeast' ? '≥' : '≤'} ${pct(c.target)}`,
      result: pct(c.result),
      trend: c.trend,
      met: c.met,
      status: c.met ? 'Met' : 'Below target',
    })),
    causesTitle: card.causes.length ? `Inaccurate lines by cause · ${card.causes.reduce((sum, c) => sum + c.count, 0)} lines` : null,
    causes: card.causes.map((c) => ({ ...c, share: c.count / maxCause })),
    casesTitle: `Sample cases · ${cases.length} compared by ${owner}`,
    cases,
    golive: {
      state: signed ? ('signed' as const) : requested ? ('requested' as const) : progress?.done ? ('ask' as const) : ('running' as const),
      signed,
      requested,
      runsUntil: progress ? `Shadow runs until ${progress.endsOn}` : null,
      rows: [
        ...criteria.map((c) => ({ label: c.brief, value: c.met ? 'met' : `${pct(c.result)} · target ${pct(c.target)}`, ok: c.met })),
        ...(conditions.length ? [{ label: 'Conditions', value: conditions.join(', '), ok: true, plain: true }] : []),
        ...(card.hardStopNote ? [{ label: 'Hard stops in shadow', value: card.hardStopNote, ok: true, plain: true }] : []),
      ],
      summary:
        met === criteria.length
          ? `All ${criteria.length} targets met. ${sponsor} can sign.`
          : `${met} of ${criteria.length} targets met. ${sponsor} can still sign, with a written reason that stays on the privilege.${top?.fix ? ` Or extend shadow and fix ${top.fix} first.` : ''}`,
      sponsor,
      extended: card.extendedDays ? `Extended by ${card.extendedDays} days` : null,
      // The header already says it for an agent in its first shadow; a later activity says it here.
      shadow: progress && activity.level === 'shadow' && agent.level !== 'shadow' ? `Shadow · ${progress.label}` : null,
    },
  }
}

/** One sample case, agent and pharmacist side by side (3b). */
export function selectCase(s: DemoState, agentId: string, caseId: string) {
  const c = s.sampleCases.find((x) => x.id === caseId && x.agentId === agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!c || !agent) return null
  const card = s.scorecards.find((x) => x.activityId === c.activityId)
  const ids = card?.sampleCaseIds ?? [c.id]
  const index = ids.indexOf(c.id)
  const { people } = onboardingContext(s, agentId)
  const minutes = minutesBetween(c.admittedAt, c.draftAt)
  const agree = c.lines.filter((l) => l.result === 'agrees').length
  const inaccurate = c.lines.filter((l) => l.result === 'inaccurate').length
  const omitted = c.lines.filter((l) => l.result === 'omitted').length
  return {
    breadcrumb: `Operations / ${s.divisions.find((d) => d.id === agent.divisionId)?.name ?? ''} / ${agent.name} / Scorecard / Case ${index + 1} of ${ids.length}`,
    position: `Case ${index + 1} of ${ids.length}`,
    title: `Encounter ${c.encounter} · ${c.unit}`,
    admitted: `Admitted ${formatDate(c.admittedAt)} ${formatClock(c.admittedAt)}`,
    ids: `MRN ${c.mrn} · ${c.age} y`,
    chip: differences(c.lines) === 'None' ? 'Agrees' : differences(c.lines),
    agrees: differences(c.lines) === 'None',
    prev: index > 0 ? ids[index - 1]! : null,
    next: index < ids.length - 1 ? ids[index + 1]! : null,
    source: `Agent draft at ${formatClock(c.draftAt)}, ${minutes === 1 ? 'one minute' : `${minutes} minutes`} after admission · pharmacist’s final list signed by ${c.finalBy} at ${formatClock(c.finalAt)}`,
    lines: c.lines.map((l, i) => ({
      n: i + 1,
      agent: l.agent ?? 'Not in the draft',
      missing: l.agent === null,
      pharmacist: l.pharmacist ?? '—',
      result: l.result === 'agrees' ? 'Agrees' : l.result === 'omitted' ? 'Omitted' : `Inaccurate${l.note ? ` · ${l.note}` : ''}`,
      differs: l.result !== 'agrees',
      source: l.source,
    })),
    totals: `${c.lines.length} lines · ${agree} agree${inaccurate ? ` · ${inaccurate} inaccurate` : ''}${omitted ? ` · ${omitted} omitted` : ''}. Counted against the targets ${personName(s, people.owner)} set in the job description.`,
    notes: c.notes.map((note) => ({ line: note.line, title: `Line ${note.line} · ${note.title}`, text: note.text })),
    traceId: c.traceId ?? null,
    flaggable: c.lines.findIndex((l) => l.result === 'inaccurate') + 1 || null,
  }
}
