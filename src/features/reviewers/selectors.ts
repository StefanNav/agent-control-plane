import { INDEPENDENT_CHECK_PERCENT, REVIEWER_STATS, type UnitStats } from '../../data/seed/catalogue'
import type { DemoState, ReviewChange } from '../../data/types'
import { addDays, formatClock, formatDate } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'
import { readUnit, type Read } from '../../store/reviewers'

const pct = (n: number) => `${n.toFixed(1)} %`
const n = (v: number) => v.toLocaleString('en-US')

/** The 2×2 of 11a's "How to read it", in the frame's order. */
const GRID: Read[] = ['Agent improved', 'Reviewers checking less', 'Agent drifting, reviewers catching it', 'Both slipping']

/** The division whose reviewers to show: the one asked for, else the persona's own, else Medications. */
export function reviewerDivision(s: DemoState, requested: string | null, viewerId: string) {
  if (requested && s.divisions.some((d) => d.id === requested)) return requested
  return s.roles.find((r) => r.personId === viewerId && r.divisionId !== 'all')?.divisionId ?? 'medications'
}

/** A signed change still running for a unit, in words for 11a's check card (e.g. "6 North: 20 % until 22 Dec"). */
function running(s: DemoState, unitId: string) {
  return s.reviewChanges.find((c) => c.unitId === unitId && c.state === 'signed' && c.until && c.until > s.now)
}

const RUNNING_LINE: Record<ReviewChange['option'], (unit: string, until: string) => string> = {
  sampling: (u, until) => `${u}: ${INDEPENDENT_CHECK_PERCENT * 2} % until ${until}`,
  tighten: (u, until) => `${u}: Tightened until ${until}`,
  minTime: (u, until) => `${u}: minimum review time until ${until}`,
}

/** 11a: reviewer behaviour for a division, over 4 or 8 weeks. */
export function selectReviewers(s: DemoState, divisionId: string, weeks: 4 | 8, viewerId: string) {
  const division = s.divisions.find((d) => d.id === divisionId)
  if (!division) return null
  const units = REVIEWER_STATS.filter((u) => u.divisionId === division.id)
  const from = addDays(s.now, -7 * (weeks - 1))
  const flagged = units.find((u) => readUnit(u) === 'Reviewers checking less')
  const slice = <T,>(xs: T[]) => xs.slice(-weeks)
  const weekly = flagged?.weekly
    ? (() => {
        const median = slice(flagged.weekly.median)
        const edit = slice(flagged.weekly.edit)
        const miss = slice(flagged.weekly.missRate)
        const card = (label: string, values: number[], fmt: (v: number) => string, note?: string) => ({
          label,
          value: fmt(values.at(-1)!),
          was: `was ${fmt(values[0]!)}`,
          values,
          from: formatDate(from),
          to: formatDate(s.now),
          ...(note ? { note } : {}),
        })
        return {
          unitId: flagged.id,
          head: `${flagged.name} · weekly`,
          cards: [
            card('Median time to approve', median, (v) => `${v} s`),
            card('Edit rate', edit, pct),
            card('Independent check · misses in approved lists', miss, pct, `${flagged.misses.found} of ${flagged.misses.sampled} sampled · small numbers, so confirm first`),
          ],
          first: { median: median[0]!, miss: miss[0]! },
        }
      })()
    : null
  const changes = units.map((u) => running(s, u.id)).filter((c): c is ReviewChange => Boolean(c))
  return {
    divisionId: division.id,
    breadcrumb: `Operations / ${division.name}`,
    sub: `All agents in ${division.name} · ${formatDate(from)} to ${formatDate(s.now)}`,
    empty: units.length ? null : `No independent check runs in ${division.name} yet.`,
    insight:
      flagged && weekly
        ? {
            unitId: flagged.id,
            lead: `Approvals on ${flagged.name} got faster while the independent check found more misses.`,
            text: `Median time to approve fell from ${weekly.first.median} s to ${flagged.medianSec} s and edits fell to ${pct(flagged.editRate)}, but second-pharmacist checks found errors in ${pct(flagged.missRate)} of approved lists, up from ${pct(weekly.first.miss)}. That points to reviewers checking less, not the agent getting better.`,
          }
        : null,
    weekly,
    rows: units.map((u) => {
      const read = readUnit(u)
      const arrow = u.editRate <= u.wasEditRate - 0.5 ? ' ↓' : u.editRate >= u.wasEditRate + 0.5 ? ' ↑' : ''
      return {
        id: u.id,
        unit: u.name,
        approved: n(u.approved),
        time: Math.abs(u.medianSec - u.wasMedianSec) >= 10 ? `${u.medianSec} s · was ${u.wasMedianSec}` : `${u.medianSec} s`,
        edit: `${pct(u.editRate)}${arrow}`,
        misses: `${pct(u.missRate)} · ${u.misses.found} of ${u.misses.sampled}`,
        read: read === 'Reviewers checking less' ? 'Checking less?' : read,
        flag: read === 'Reviewers checking less',
      }
    }),
    grid: units.length
      ? GRID.map((read) => {
          const here = units.filter((u) => readUnit(u) === read).map((u) => u.name)
          return { read, units: here.length ? here.join(', ') : 'None', current: read === 'Reviewers checking less' && here.length > 0 }
        })
      : [],
    check: `A second pharmacist re-checks a random ${INDEPENDENT_CHECK_PERCENT} % of approved lists, blind to the first review.`,
    running: changes.map((c) => RUNNING_LINE[c.option](REVIEWER_STATS.find((u) => u.id === c.unitId)!.name, formatDate(c.until!))),
    shared: flagged ? s.logEvents.find((e) => e.id.startsWith(`log-share-${flagged.id}-`)) : undefined,
    canShare: can(s, viewerId, 'proposeReviewChange', { divisionId: division.id }),
  }
}

/** The three responses 11b offers, verbatim; "about 240 more checks" comes from the unit's volume. */
function options(u: UnitStats) {
  const more = Math.round(((u.approved / 28) * 14 * 0.4) / 10) * 10
  return [
    { value: 'sampling' as const, title: `Raise sampling to ${INDEPENDENT_CHECK_PERCENT * 2} % on ${u.name}`, description: `For 14 days · about ${n(more)} more checks · confirms or clears the signal` },
    { value: 'tighten' as const, title: `Tighten review level on ${u.name}`, description: 'Every draft gets a full review with a reason for each change (E13)' },
    { value: 'minTime' as const, title: 'Set a minimum review time', description: 'Not recommended: timers get gamed and slow honest reviews' },
  ]
}

const SIGNED_LINE: Record<ReviewChange['option'], (unit: string, until: string) => string> = {
  sampling: (u, until) => `Sampling on ${u} is ${INDEPENDENT_CHECK_PERCENT * 2} % until ${until}.`,
  tighten: (u, until) => `Every draft on ${u} gets a full review, with a reason for each change, until ${until}.`,
  minTime: (u, until) => `A minimum review time applies on ${u} until ${until}.`,
}

/** 11b: one unit by shift, the misses the independent check found, and the response. */
export function selectUnit(s: DemoState, unitId: string, viewerId: string, preselect: ReviewChange['option'] | null) {
  const u = REVIEWER_STATS.find((x) => x.id === unitId)
  const division = s.divisions.find((d) => d.id === u?.divisionId)
  if (!u || !division) return null
  const sponsor = personName(s, division.sponsorId)
  const latest = s.reviewChanges.filter((c) => c.unitId === u.id).at(-1)
  const agentName = (id: string) => s.agents.find((a) => a.id === id)?.name ?? id
  const stamp = (iso: string) => `${formatDate(iso)} ${formatClock(iso)}`
  return {
    unitId: u.id,
    divisionId: division.id,
    breadcrumb: `Operations / ${division.name} / Reviewer behaviour`,
    title: u.name,
    sub: `Approvals and the independent check · ${formatDate(u.windowFrom)} to ${formatDate(s.now)}`,
    note: u.note ?? null,
    shifts: u.shifts.map((r) => ({
      name: r.name,
      hours: r.hours,
      approved: n(r.approved),
      time: `${r.medianSec} s`,
      edit: pct(r.editRate),
      misses: `${r.misses.found} of ${r.misses.sampled}`,
      worst: r.misses.found === Math.max(...u.shifts.map((x) => x.misses.found)) && r.misses.found > 0,
    })),
    missesHead: `Misses found by the independent check · ${u.missList.length}`,
    missesNote: u.missList.length ? `All ${u.missList.length} corrected before discharge` : 'None in the last 4 weeks',
    misses: u.missList.map((m) => ({ draft: m.draft, agent: agentName(m.agentId), approvedIn: `${m.approvedSec} s`, shift: m.shift, found: m.found, flag: m.flagCode ?? null })),
    options: options(u),
    preselect: preselect ?? 'sampling',
    respond:
      latest?.state === 'waiting'
        ? can(s, viewerId, 'signReviewChange', { divisionId: division.id })
          ? { mode: 'sign' as const, id: latest.id, option: latest.option, line: `${personName(s, latest.by)} sent this on ${stamp(latest.at)}.` }
          : { mode: 'waiting' as const, id: latest.id, option: latest.option, line: `Waiting for ${sponsor}.` }
        : latest?.state === 'signed' && latest.until && latest.until > s.now
          ? { mode: 'signed' as const, id: latest.id, option: latest.option, line: `Signed by ${personName(s, latest.decidedBy)} · ${stamp(latest.decidedAt!)}. ${SIGNED_LINE[latest.option](u.name, formatDate(latest.until))}` }
          : {
              mode: 'propose' as const,
              button: `Send to ${sponsor} for sign-off`,
              allowed: can(s, viewerId, 'proposeReviewChange', { divisionId: division.id }),
              declined: latest?.state === 'declined' ? `${personName(s, latest.decidedBy)} declined the last one: “${latest.reason}”` : null,
            },
  }
}
