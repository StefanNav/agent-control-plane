import type { LadderStep } from '../../components'
import { PROMOTION_CONTENT } from '../../data/seed/autonomy'
import type { DemoState, Level, Status } from '../../data/types'
import { formatClock, formatDate } from '../../lib/clock'
import { reviewDateFrom } from '../../store/onboarding'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'
import { c4, criteria, daysAtLevel, needsBoard, nextMeeting, promotionContext, promotionOf } from '../../store/promotions'
import { nextVersion } from '../../store/mutations'
import { branchLevel, LEVEL_NAME, ladderAt } from '../activity/selectors'

const lower = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`
const year = (iso: string) => iso.slice(0, 4)

/** The promotion and everything around it, or null for an unknown id. */
function base(s: DemoState, id: string) {
  const p = promotionOf(s, id)
  const ctx = p && promotionContext(s, p)
  const content = p && PROMOTION_CONTENT[p.id]
  if (!p || !ctx || !content) return null
  const { activity, agent, branch } = ctx
  const division = s.divisions.find((d) => d.id === agent.divisionId)
  const pending = p.state === 'sponsor' || p.state === 'board' || p.state === 'returned'
  const version = pending ? nextVersion(s, p.privilegeCode) : (s.privileges.filter((x) => x.code === p.privilegeCode).sort((a, b) => b.version - a.version)[0]?.version ?? 1)
  const frozen = p.evidence
  return {
    p,
    content,
    activity,
    agent,
    branch,
    division,
    pending,
    version,
    sponsor: personName(s, agent.sponsorId),
    criteria: frozen?.criteria ?? criteria(s, p.id),
    days: frozen?.days ?? daysAtLevel(s, p),
    meeting: p.board?.meeting ?? nextMeeting(s.now),
    board: needsBoard(s, p),
  }
}

/** The promoted branch on the ladder: proposed while it waits, granted once approved. */
function promotedLadder(level: Level, to: Level, pending: boolean): LadderStep[] {
  return pending ? ladderAt(level, { proposed: to }) : ladderAt(level)
}

/** 14a: the sponsor signs one branch up a level, with the evidence in front of them. */
export function selectPromotion(s: DemoState, id: string, viewerId: string) {
  const b = base(s, id)
  if (!b) return null
  const { p, content, activity, agent, branch, pending } = b
  const isSponsor = viewerId === agent.sponsorId
  const chip: { status: Status; label: string } =
    p.state === 'sponsor'
      ? { status: 'review', label: isSponsor ? 'Review: your signature' : `Waiting for ${b.sponsor}` }
      : p.state === 'board'
        ? { status: 'review', label: 'With the board' }
        : p.state === 'returned'
          ? { status: 'review', label: `Returned to ${personName(s, p.requestedBy)}` }
          : { status: 'normal', label: p.state === 'approved' ? 'Approved' : 'Denied' }
  const until = reviewDateFrom(b.board ? b.meeting : s.now, agent.riskTier)
  const canSign = can(s, viewerId, 'signPrivilege', { agentId: agent.id })
  const met = b.criteria.every((c) => c.met)
  return {
    id: p.id,
    breadcrumb: `${b.division?.name ?? ''} / ${agent.name} / Privileges / ${p.privilegeCode}`,
    title: `Promote “${lower(branch.name)}” to ${LEVEL_NAME[p.to]}`,
    idLine: `${p.privilegeCode} v${b.version}${pending ? ' draft' : ''}`,
    chip,
    sub: content.summary,
    branchesTitle: `${activity.name} · ${activity.branches.length} branches`,
    branches: activity.branches.map((x) => {
      const level = branchLevel(activity, x.id)
      const promoted = x.id === branch.id
      return {
        id: x.id,
        name: x.name,
        sub: x.sub ?? null,
        selected: promoted,
        ladder: x.lockedBy ? ladderAt(level, { lockedBy: x.lockedBy }) : promoted ? promotedLadder(level, p.to, pending) : ladderAt(level),
        note: x.lockedBy ?? (promoted ? 'This promotion' : `Stays at ${LEVEL_NAME[level]}`),
        tag: Boolean(x.lockedBy),
      }
    }),
    evidenceHead: `Evidence · ${b.days} days at ${LEVEL_NAME[p.from]} · ${content.outputs}`,
    criteria: b.criteria,
    note: content.note,
    atLevelHead: `What changes at ${LEVEL_NAME[p.to]}`,
    atLevel: content.atLevel,
    who: [
      { n: 1, label: `${personName(s, p.requestedBy)} requested`, meta: formatDate(p.requestedAt), state: 'done' as const },
      { n: 2, label: isSponsor ? 'You sign as sponsor' : `${b.sponsor} signs as sponsor`, meta: p.sponsor ? formatDate(p.sponsor.at) : 'now', state: p.sponsor && p.state !== 'sponsor' ? ('done' as const) : p.state === 'sponsor' ? ('current' as const) : ('todo' as const) },
      ...(b.board
        ? [{ n: 3, label: 'AI review board decides', meta: `${formatDate(b.meeting)} · Tier ${agent.riskTier}`, state: p.decision && p.state !== 'sponsor' ? ('done' as const) : p.state === 'board' ? ('current' as const) : ('todo' as const) }]
        : []),
      { n: b.board ? 4 : 3, label: 'Takes effect at the gateway', meta: p.state === 'approved' ? formatDate(p.decision?.at ?? p.sponsor!.at) : 'on approval', state: p.state === 'approved' ? ('done' as const) : ('todo' as const) },
    ],
    tierNote: agent.riskTier > 2 ? { lead: 'Tier 2 and below:', text: 'the sponsor’s signature is enough. Set with the risk tier in AIMS Review.' } : null,
    signature: {
      mode: p.state === 'sponsor' ? (canSign ? ('sign' as const) : ('locked' as const)) : p.state === 'returned' ? ('returned' as const) : ('signed' as const),
      notice: b.board
        ? { lead: `Tier ${agent.riskTier}: this goes to the AI review board after you sign.`, text: `Nothing changes until the board approves. ${personName(s, s.roles.find((r) => r.role === 'committee')?.personId)} sees your reason and this evidence.` }
        : { lead: `Tier ${agent.riskTier}: your signature is enough.`, text: 'It takes effect at the gateway when you sign.' },
      accept: `I accept accountability for this branch at ${LEVEL_NAME[p.to]} until ${formatDate(until)} ${year(until)}, or until it steps down.`,
      button: b.board ? 'Sign and send to the board' : 'Sign and promote',
      met,
      question: p.returned && p.state === 'sponsor' ? { lead: `${personName(s, p.returned.by)} asked:`, text: p.returned.note } : null,
      returned: p.state === 'returned' && p.returned ? { lead: `${personName(s, p.returned.by)} asked for changes.`, text: p.returned.note, button: `Send to ${b.sponsor} again`, canResend: can(s, viewerId, 'requestGoLive', { agentId: agent.id }) } : null,
      signed: p.sponsor && p.state !== 'sponsor'
        ? {
            lead: `Signed by ${personName(s, p.sponsor.by)} · ${formatDate(p.sponsor.at)} ${formatClock(p.sponsor.at)}.`,
            text: p.state === 'board' ? `With the board on ${formatDate(b.meeting)}.` : p.state === 'approved' ? `${LEVEL_NAME[p.to]} since ${formatDate(p.decision?.at ?? p.sponsor.at)}.` : 'Denied by the board.',
            reason: p.sponsor.reason,
          }
        : null,
    },
  }
}

/** 14b: the board decides a Tier 3 promotion from what the sponsor signed. */
export function selectBoardDecision(s: DemoState, id: string, viewerId: string) {
  const b = base(s, id)
  if (!b) return null
  const { p, content, activity, agent, branch } = b
  const signed = p.sponsor && p.state !== 'sponsor' && p.state !== 'returned'
  const chair = s.roles.find((r) => r.role === 'committee')?.personId
  const canDecide = can(s, viewerId, 'approveGoLive', { agentId: agent.id })
  const by = (k: 'Signed as is' | 'Rejected by the pharmacist' | 'Defects in independent checks' | 'Days at Reduced review') => b.criteria.find((c) => c.label === k)!
  return {
    id: p.id,
    breadcrumb: `Portfolio / AI review board / ${formatDate(b.meeting)} ${year(b.meeting)} / Item ${content.agenda.item} of ${content.agenda.of}`,
    title: `Promotion · ${agent.name}`,
    status: signed ? `Tier ${agent.riskTier} · signed by ${personName(s, p.sponsor!.by)} ${formatDate(p.sponsor!.at)}` : `Tier ${agent.riskTier} · waiting for ${b.sponsor}’s signature`,
    idLine: `${p.privilegeCode} v${b.version}`,
    chip: p.state === 'board' && canDecide ? { status: 'review' as const, label: 'Review: your decision' } : null,
    paperTitle: `${branch.name} · ${LEVEL_NAME[p.from]} to ${LEVEL_NAME[p.to]}`,
    paperSub: `${activity.name} · ${b.division?.name ?? ''} · owner ${personName(s, agent.ownerId)} · sponsor ${b.sponsor}`,
    ladder: promotedLadder(p.state === 'approved' ? p.to : p.from, p.to, b.pending),
    evidenceHead: `Evidence · ${b.days} days · ${content.outputs}`,
    stats: [
      { label: 'Signed as is', value: by('Signed as is').value, sub: by('Signed as is').short },
      { label: 'Rejected', value: by('Rejected by the pharmacist').value, sub: by('Rejected by the pharmacist').short },
      { label: 'Check defects', value: by('Defects in independent checks').value, sub: by('Defects in independent checks').short },
      { label: 'At Reduced', value: by('Days at Reduced review').value, sub: by('Days at Reduced review').short },
    ],
    reasonHead: p.sponsor ? `${personName(s, p.sponsor.by)}’s reason · ${formatDate(p.sponsor.at)}` : null,
    reason: p.sponsor?.reason ?? null,
    staysTheSame: content.staysTheSame,
    stepDownHead: `Steps down to ${LEVEL_NAME[p.from]} on`,
    stepDownOn: content.stepDownOn,
    mode: p.state === 'board' ? (canDecide ? ('decide' as const) : ('locked' as const)) : p.decision ? ('logged' as const) : ('waiting' as const),
    sponsor: b.sponsor,
    from: LEVEL_NAME[p.from],
    proposed: [c4(s.now)],
    logged: `Logged as ${personName(s, viewerId)} · ${s.people.find((x) => x.id === viewerId)?.title ?? ''}`.replace('Chair, AI review board', 'AI review board chair'),
    decision: p.decision
      ? { kind: p.decision.kind, by: personName(s, p.decision.by ?? chair), at: `${formatDate(p.decision.at)} ${formatClock(p.decision.at)}`, reason: p.decision.reason, conditions: p.decision.conditions.map((c) => `${c.id} · ${c.text}`) }
      : null,
  }
}
