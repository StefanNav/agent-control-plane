import { PROMOTION_CONTENT, STEP_DOWN_MED_REC } from '../../data/seed/autonomy'
import type { DemoState } from '../../data/types'
import { addDays, formatClock, formatDate } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'
import { LOWER, replayDone, sinceText, STEPPED_DOWN } from '../../store/stepdowns'
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
  // Review fix I3: while paused, the 6d layout and its resume panel come first.
  if (agent.lifecycle === 'paused' || agent.pause) return null
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

const stamp = (iso: string) => `${formatDate(iso)} ${formatClock(iso)}`

/** 15b: a branch's history of levels, the re-validation after a version step-down, and its triggers. */
export function selectBranchHistory(s: DemoState, activityId: string, branchId: string, viewerId: string) {
  const activity = s.activities.find((a) => a.id === activityId)
  const agent = s.agents.find((a) => a.id === activity?.agentId)
  const branch = activity?.branches.find((b) => b.id === branchId)
  if (!activity || !agent || !branch) return null
  const steps = s.stepDowns.filter((d) => d.activityId === activityId && d.branchId === branchId)
  const open = steps.find((d) => !d.restoredAt)
  const promotion = [...s.promotions].reverse().find((p) => p.activityId === activityId && p.branchId === branchId)
  const versions = s.privileges.filter((p) => p.activityId === activityId && p.grantedAt).sort((a, b) => a.version - b.version)
  const firstDraft = versions.find((p) => p.level === 'draft' && p.state !== 'steppedDown')

  const rows: { at: string; date: string; title: string; sub: string; ladder: ReturnType<typeof ladderAt> }[] = []
  if (firstDraft) rows.push({ at: firstDraft.grantedAt!, date: formatDate(firstDraft.grantedAt!), title: LEVEL_NAME.draft, sub: `${personName(s, firstDraft.grantedBy)} signed ${firstDraft.code} v${firstDraft.version}`, ladder: ladderAt('draft') })
  if (promotion?.sponsor) {
    rows.push({ at: promotion.sponsor.at, date: formatDate(promotion.sponsor.at), title: `${personName(s, promotion.sponsor.by)} signed the promotion`, sub: promotion.board ? 'Sent to the board' : 'Takes effect at the gateway', ladder: ladderAt(promotion.from, { proposed: promotion.to }) })
  }
  if (promotion?.state === 'approved' || (promotion?.decision && promotion.decision.kind.startsWith('approve'))) {
    const at = promotion.decision?.at ?? promotion.sponsor!.at
    const ids = promotion.decision?.conditions.map((c) => c.id) ?? []
    rows.push({ at, date: formatDate(at), title: `Promoted to ${LEVEL_NAME[promotion.to]}`, sub: promotion.decision ? `Board approved${ids.length ? ` with ${ids.join(', ')}` : ''} · ${personName(s, promotion.decision.by)}` : `${personName(s, promotion.sponsor!.by)} signed · no board at this tier`, ladder: ladderAt(promotion.to) })
  }
  for (const d of steps) {
    rows.push({ at: d.at, date: stamp(d.at), title: `Stepped down to ${LEVEL_NAME[d.to]}`, sub: d.build ? `New agent version ${d.build.to}, deployed by ${personName(s, d.build.by)}` : (d.detail ?? d.trigger), ladder: ladderAt(d.to, { held: d.from }) })
    if (d.restoredAt) {
      const signed = versions.find((p) => p.grantedAt === d.restoredAt)
      rows.push({ at: d.restoredAt, date: stamp(d.restoredAt), title: `Restored to ${LEVEL_NAME[d.from]}`, sub: `${personName(s, d.restoredBy)} signed ${signed ? `${signed.code} v${signed.version}` : 'again'}`, ladder: ladderAt(d.from) })
    }
  }
  rows.sort((a, b) => b.at.localeCompare(a.at))

  const r = open?.revalidation
  const done = open ? replayDone(s, open) : false
  const canSign = can(s, viewerId, 'signPrivilege', { agentId: agent.id })
  const triggerFrom = promotion?.from ?? LOWER[branch.level ?? activity.level] ?? 'shadow'
  const triggers = promotion ? (PROMOTION_CONTENT[promotion.id]?.triggers ?? []) : (versions.at(-1)?.stepDownTriggers ?? [])
  return {
    notice: open?.build
      ? {
          lead: `Stepped down to ${LEVEL_NAME[open.to]} when ${agent.name} ${open.build.to} was deployed.`,
          text: `Any new agent or SOP version re-earns ${LEVEL_NAME[open.from]}. Until then pharmacists sign each add again; nothing was lost.`,
        }
      : open
        ? // Review fix I4: a defect or an incident (composed): re-earned by a new promotion, not restored.
          { lead: `Stepped down to ${LEVEL_NAME[open.to]}: ${open.detail ?? open.trigger}.`, text: `Nothing steps back up by itself: a new promotion re-earns ${LEVEL_NAME[open.from]}.` }
        : null,
    revalidation:
      open?.build && r
        ? {
            head: `Re-validation · replay of the last 30 days on ${open.build.to}`,
            progress: `${(done ? r.cases : r.replayed).toLocaleString('en-US')} of ${r.cases.toLocaleString('en-US')} adds replayed`,
            left: done ? 'Finished' : r.left,
            ratio: done ? 1 : r.replayed / r.cases,
            stats: [
              { label: `Same result as ${open.build.from}`, value: `${r.same} %` },
              { label: 'Different, and better', value: `${r.better} %` },
              { label: 'Different, and worse', value: `${r.worse} % · ${r.worseCount} adds` },
            ],
          }
        : null,
    rows,
    restore: open?.cause === 'version'
      ? {
          id: open.id,
          label: `Sign to restore ${LEVEL_NAME[open.from]}`,
          locked: !canSign ? lockReason('signPrivilege', viewerId) : !done ? 'Opens when the replay finishes' : r?.meets ? null : 'The replay doesn’t meet every criterion',
          lead: 'Opens when the replay finishes',
          text: `and meets every criterion. Returning to a level already approved needs your signature, not the board (BR-07).`,
        }
      : null,
    triggersSub: 'Armed at every level above Shadow',
    triggers: triggers.map((text) => {
      const fired = steps.filter((d) => d.trigger === text).at(-1)
      return { text, fired: fired ? `fired ${formatDate(fired.at)}` : null, to: `to ${LEVEL_NAME[triggerFrom]}` }
    }),
  }
}
