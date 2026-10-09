import type { DemoState, Privilege } from '../../data/types'
import { addDays, formatClock, formatDate, minutesBetween } from '../../lib/clock'
import { latestByCode, latestPrivilege } from '../../store/onboarding'
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

const LEVEL_NAME = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' } as const
/** Whole calendar days from a's date to b's date. */
const dayGap = (a: string, b: string) => daysInclusive(a, b) - 1

/** My privileges (3d): every delegation the sponsor signed, soonest review first; others see their divisions'. */
export function selectMyPrivileges(s: DemoState, personaId: string, tab: 'all' | 'overdue' | 'due') {
  const signer = s.privileges.some((p) => p.grantedBy === personaId && p.level !== 'shadow')
  const divisions = new Set(s.roles.filter((r) => r.personId === personaId).map((r) => r.divisionId))
  const mine = s.privileges.filter((p) => {
    if (p.state === 'closed' || (p.state === 'awaiting' && p.proposedLevel)) return false
    const agent = s.agents.find((a) => a.id === p.agentId)
    if (!agent || agent.lifecycle === 'retired') return false
    return signer ? p.grantedBy === personaId && p.level !== 'shadow' : divisions.has('all') || divisions.has(agent.divisionId)
  })
  const all = mine
    .filter((p) => p.reviewDate)
    .sort((a, b) => a.reviewDate!.localeCompare(b.reviewDate!))
    .map((p) => {
      const agent = s.agents.find((a) => a.id === p.agentId)!
      const activity = s.activities.find((a) => a.id === p.activityId)
      // Shadow has no review cycle; only signed levels come due.
      const reviewed = p.level !== 'shadow'
      const overdue = reviewed && p.reviewDate! < s.now
      const days = overdue ? dayGap(p.reviewDate!, s.now) : dayGap(s.now, p.reviewDate!)
      const dueSoon = reviewed && !overdue && days <= 30
      const paused = agent.lifecycle === 'paused'
      const dayWord = (d: number) => `${d} ${d === 1 ? 'day' : 'days'}`
      return {
        id: p.id,
        code: p.code,
        agentId: agent.id,
        agent: agent.name,
        activity: activity?.name ?? p.activityId,
        level: LEVEL_NAME[p.level],
        domain: p.domain,
        signed: p.grantedAt ? formatDate(p.grantedAt) : '—',
        due: reviewed ? formatDate(p.reviewDate!) : '—',
        overdue,
        dueSoon,
        status: !reviewed ? 'Shadow · no review date' : overdue ? `Review overdue · ${dayWord(days)}` : dueSoon ? `Due in ${dayWord(days)}` : `In ${dayWord(days)}${paused ? ' · paused' : ''}`,
        action: overdue ? 'Review' : 'Open',
        // Review fix I7: an overdue review is signed (3c); otherwise "Open" goes to the activity's page (13a).
        to: overdue ? `/inventory/privileges/${p.code.toLowerCase()}/sign` : `/portfolio/activities/${p.activityId}`,
      }
    })
  const rows = tab === 'overdue' ? all.filter((r) => r.overdue) : tab === 'due' ? all.filter((r) => r.dueSoon) : all
  const first = all.find((r) => r.overdue)
  const exception = first ? s.exceptions.find((e) => e.agentId === first.agentId && e.type === 'Review overdue' && e.state !== 'resolved' && e.state !== 'dismissed') : undefined
  const division = s.divisions.find((d) => [...divisions].includes(d.id))
  const firstPrivilege = first ? s.privileges.find((p) => p.id === first.id) : undefined
  const copied = exception?.copied.map((id) => personName(s, id)) ?? []
  return {
    signer,
    title: signer ? 'My privileges' : `Privileges in ${division?.name ?? 'every division'}`,
    counts: { all: all.length, overdue: all.filter((r) => r.overdue).length, due: all.filter((r) => r.dueSoon).length },
    rows,
    footer: `Showing ${rows.length} of ${all.length}, soonest review first.`,
    overdue:
      first && exception
        ? {
            code: first.code.toLowerCase(),
            text: `${first.agent} passed its review date on ${formatDate(firstPrivilege!.reviewDate!)}. ${lapseConsequence(s, firstPrivilege!, first.activity, exception.deadline)}${copied.length ? ` ${copied.join(' and ')} ${copied.length === 1 ? 'is' : 'are'} copied.` : ''}`,
          }
        : null,
  }
}

/**
 * What the division's lapse policy does, or did, to an overdue privilege (3d, review fix I1):
 * the notice never threatens a return to Shadow the policy won't make.
 */
function lapseConsequence(s: DemoState, p: Privilege, activity: string, deadline: string): string {
  const Act = activity.charAt(0).toUpperCase() + activity.slice(1)
  const act = activity.charAt(0).toLowerCase() + activity.slice(1)
  const policy = s.divisions.find((d) => d.id === s.agents.find((a) => a.id === p.agentId)?.divisionId)?.lapsePolicy
  if (p.state === 'lapsed') return `${Act} returned to Shadow on ${formatDate(p.lapsedAt ?? s.now)}; re-sign it to bring it back.`
  if (p.lapsedAt) return `${Act} was paused on ${formatDate(p.lapsedAt)}; pending work went to pharmacists.`
  if (policy === 'nothing') return `${Act} keeps its level until someone acts.`
  const by = deadline.slice(0, 10) === s.now.slice(0, 10) ? `${formatDate(deadline)} ${formatClock(deadline)}` : formatDate(deadline)
  return `If you don’t review it by ${by}, ${act} ${policy === 'pause' ? 'is paused' : 'returns to Shadow'} and its ${/^flag/i.test(activity) ? 'flags' : 'drafts'} stop reaching pharmacists.`
}

/** Sign the privilege (3c): what is being signed, the evidence, and what the signature records. */
export function selectSignature(s: DemoState, code: string) {
  const p = latestByCode(s, code)
  if (!p) return null
  const agent = s.agents.find((a) => a.id === p.agentId)
  const activity = s.activities.find((a) => a.id === p.activityId)
  if (!agent || !activity) return null
  const record = recordOfActivity(s, activity.id)
  const { people } = onboardingContext(s, agent.id)
  const sponsor = s.people.find((x) => x.id === agent.sponsorId)
  const short = record?.job.activities.find((a) => a.id === activity.id)?.short ?? `${activity.name.charAt(0).toLowerCase()}${activity.name.slice(1)}`
  const proposal = p.state === 'awaiting' && p.proposedLevel
  const due = p.state === 'due' || (p.state === 'active' && p.reviewDate !== undefined && p.reviewDate < s.now && p.level !== 'shadow')
  const mode = proposal ? ('sign' as const) : due ? ('renew' as const) : p.state === 'active' ? ('signed' as const) : ('closed' as const)
  const target = proposal ? p.proposedLevel! : p.level
  const tierDays = { 1: 365, 2: 180, 3: 90, 4: 30 }[agent.riskTier]
  const reviewIso = mode === 'sign' || mode === 'renew' ? `${addDays(s.now, tierDays + 1).slice(0, 10)}T00:00:00` : (p.reviewDate ?? '')
  const criteria = criteriaStatus(s, activity.id)
  const below = criteria.filter((c) => !c.met).length
  const card = s.scorecards.find((c) => c.activityId === activity.id)
  const decision = record?.review?.decision
  const shadowFrom = record?.review?.shadowFrom
  const pharmacist = /pharmacist/i.test(record?.job.actingFor ?? '')
  const volume = Number(/About (\d+)/.exec(s.intakeRequests.find((i) => i.id === record?.intakeId)?.volume ?? '')?.[1] ?? 0)
  const units = record?.job.domain.units.join(' and ') ?? ''
  const reviewYear = reviewIso.slice(0, 4)
  const stamp = `${s.now.slice(0, 10)} ${s.now.slice(11, 16)}`
  const hardStops = s.hardStops.filter((h) => h.agentId === agent.id)
  return {
    mode,
    code: p.code,
    version: p.version,
    agentId: agent.id,
    activityId: activity.id,
    sponsorId: agent.sponsorId,
    breadcrumb: `${s.divisions.find((d) => d.id === agent.divisionId)?.name ?? ''} / ${agent.name} / Privileges`,
    title: mode === 'renew' ? `Renew ${short} at ${LEVEL_NAME[p.level]}` : `Move ${short} to ${LEVEL_NAME[target]}`,
    idLine: `${p.code} · v${p.version}${proposal ? ' draft' : ''}`,
    chip: proposal ? 'Review: your signature' : mode === 'renew' ? 'Review overdue' : null,
    sub:
      mode === 'renew'
        ? `You’re renewing as clinical sponsor for ${s.divisions.find((d) => d.id === agent.divisionId)?.name}. The activity stays at ${LEVEL_NAME[p.level]}; its next review is a full cycle from today.`
        : `You’re signing as clinical sponsor for ${s.divisions.find((d) => d.id === agent.divisionId)?.name}. At ${LEVEL_NAME[target]}, every ${pharmacist ? 'med list the agent prepares is signed by a pharmacist before it reaches the chart' : 'output is signed by a person before it is used'}.`,
    ladder: [
      { level: 'shadow' as const, caption: target === 'shadow' ? 'Current' : `Current · since ${formatDate(shadowFrom ?? p.grantedAt ?? s.now)}` },
      { level: 'draft' as const, caption: proposal ? 'Proposed · your signature' : p.level === 'draft' ? 'Current' : 'Available' },
      { level: 'supervised' as const, caption: 'Locked · v2' },
      { level: 'autonomous' as const, caption: 'Locked · admin tasks only' },
    ],
    facts: [
      ['Activity', activity.name],
      ['Agent', `${agent.name} · ${agent.version}${agent.sop ? ` · SOP ${agent.sop}` : ''}`],
      ['Domain', p.domain],
      ['Hard stops', hardStops.map((h) => `${h.code} v${h.version} ${h.title}`).join(' · ') || '—'],
      ['Review date', reviewIso ? `${formatDate(reviewIso)} ${reviewYear} · in ${dayGap(s.now, reviewIso)} days · a lapse sends the activity back to Shadow` : '—'],
      ['Step-down triggers', 'Edit rate above 15 % for 3 days · any wrong-patient draft · any new agent version'],
    ] as [string, string][],
    /** The facts' hard stops again, as tag and name (3c draws each as a rule tag). */
    hardStops: hardStops.map((h) => ({ tag: `${h.code} v${h.version}`, title: h.title })),
    review: reviewIso ? `${formatDate(reviewIso)} ${reviewYear} · in ${dayGap(s.now, reviewIso)} days · a lapse sends the activity back to Shadow` : '',
    evidence: card && mode !== 'renew' ? { head: `Shadow evidence · ${daysInclusive(card.from, card.to)} days · ${n(card.cases)} cases`, criteria: criteria.map((c) => ({ id: c.id, label: c.label, target: `${c.direction === 'atLeast' ? '≥' : '≤'} ${pct(c.target)}`, result: pct(c.result), met: c.met })) } : null,
    evidenceLine: p.evidence,
    belowTarget: below && mode === 'sign' ? `${below} of ${criteria.length} criteria ${below === 1 ? 'is' : 'are'} below target. A written reason is required and stays on the privilege record.` : null,
    accept: `I accept accountability for this delegation until ${formatDate(reviewIso)} ${reviewYear}, or until a step-down trigger fires.`,
    records: `Records: ${sponsor?.name ?? ''} · ${sponsor?.title ?? ''} · ${stamp} · ${p.code} v${mode === 'renew' ? p.version + 1 : p.version} · under ORG-SIGN-01`,
    button: mode === 'renew' ? `Renew for ${tierDays} days` : `Sign and move to ${LEVEL_NAME[target]}`,
    changes: [
      `Drafts start reaching pharmacists’ worklists on ${units}.`,
      ...(volume ? [`About ${volume} drafts a day, from the moment you sign.`] : []),
      'Shadow comparison stops; quality is measured on pharmacist edits.',
      `Anyone authorised can pause it in one action. Resuming needs you and ${personName(s, people.owner)}.`,
    ],
    conditions: decision
      ? { head: `Conditions · ${personName(s, decision.by)} · ${formatDate(decision.at)}`, rows: decision.conditions.filter((c) => p.conditions.includes(c.id)).map((c) => ({ id: c.id, text: c.text.split(/;| until /)[0]! })) }
      : null,
    signed: (mode === 'signed' || mode === 'closed') && p.grantedBy && p.grantedAt ? { line: `Signed by ${personName(s, p.grantedBy)} · ${formatDate(p.grantedAt)} ${p.grantedAt.slice(0, 4)} ${p.grantedAt.slice(11, 16)}`, reason: p.signReason ?? null } : null,
  }
}
