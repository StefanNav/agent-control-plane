import type { RadioCardOption } from '../../design-system'
import type { DemoState, Level, PersonaId, Verb } from '../../data/types'
import { formatClock } from '../../lib/clock'
import { queueOf } from '../../store/mutations'
import { onBoard, personName } from '../board/selectors'

export type PauseScope = 'activity' | 'agent' | 'division'

/** "Resuming needs Priya and you," from where the viewer stands. */
function resumeNeeds(s: DemoState, personaId: PersonaId, ownerId: string, sponsorId: string): string {
  const [owner, sponsor] = [personName(s, ownerId), personName(s, sponsorId)]
  if (personaId === ownerId) return `Resuming needs ${sponsor} and you,`
  if (personaId === sponsorId) return `Resuming needs ${owner} and you,`
  return `Resuming needs ${sponsor} and ${owner},`
}

/** The pause impact preview (6b): scopes, what happens to queued work, and how resuming works. */
export function selectPausePreview(s: DemoState, personaId: PersonaId, agentId: string, scope: PauseScope) {
  const agent = s.agents.find((a) => a.id === agentId)!
  const division = s.divisions.find((d) => d.id === agent.divisionId)
  const activities = s.activities.filter((a) => a.agentId === agentId)
  const main = activities.find((a) => a.level !== 'shadow') ?? activities[0]
  const inDivision = s.agents.filter((a) => onBoard(a) && a.divisionId === agent.divisionId)
  const atDraft = s.activities.filter((a) => a.level === 'draft' && inDivision.some((x) => x.id === a.agentId)).length
  // Agents already paused keep their pause; only the rest stop now.
  const covered = scope === 'division' ? inDivision.filter((a) => a.lifecycle !== 'paused') : [agent]
  const total = covered.map(queueOf).reduce((sum, q) => ({ inProgress: sum.inProgress + q.inProgress, awaitingReview: sum.awaitingReview + q.awaitingReview, perHour: sum.perHour + q.perHour }), {
    inProgress: 0,
    awaitingReview: 0,
    perHour: 0,
  })
  const medications = agent.divisionId === 'medications'
  const scopes: RadioCardOption<PauseScope>[] = [
    { value: 'activity', title: 'This activity', description: main?.name ?? '' },
    { value: 'agent', title: 'This agent', description: activities.length === 2 ? 'Both activities' : `All ${activities.length} activities` },
    { value: 'division', title: `Every agent in ${division?.name}`, description: `${inDivision.length} agents · ${atDraft} activities at Draft` },
  ]
  return {
    scopes,
    effects: [
      {
        value: String(total.inProgress),
        lead: 'drafts in progress go back to pharmacists',
        text: medications ? 'They appear in the 7 West and 8 East worklists within a minute.' : 'They appear in the team’s worklists within a minute.',
      },
      { value: String(total.awaitingReview), lead: 'drafts waiting for review stay', text: 'Pharmacists sign or reject them as usual.' },
      {
        value: `~${total.perHour}`,
        lead: medications ? 'admissions an hour reconciled by hand' : 'items an hour handled by hand',
        text: 'Until the agent resumes. Charge pharmacists are told.',
      },
    ],
    resumeRule: { lead: resumeNeeds(s, personaId, agent.ownerId, agent.sponsorId), text: 'both with a reason. Each activity returns to the level it had.' },
    audit: `Logs ${personName(s, personaId)} · ${formatClock(s.now)}`,
  }
}

/** "technical owner": the viewer's relation to this agent, for audit stamps like "Logs Sam · technical owner". */
export function roleOn(s: DemoState, personaId: PersonaId, agentId: string): string {
  const agent = s.agents.find((a) => a.id === agentId)
  if (agent?.ownerId === personaId) return 'agent owner'
  if (agent?.sponsorId === personaId) return 'clinical sponsor'
  if (agent?.techOwnerId === personaId) return 'technical owner'
  const role = s.roles.find((r) => r.personId === personaId)?.role
  return role === 'programLead' ? 'program lead' : (s.people.find((p) => p.id === personaId)?.title.toLowerCase() ?? '')
}

const LEVEL: Record<Level, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

/** Fix one thing (6c): return one activity to Shadow, or revoke one tool grant. */
export function selectFixOneThing(s: DemoState, personaId: PersonaId, agentId: string) {
  const agent = s.agents.find((a) => a.id === agentId)!
  const sponsor = personName(s, agent.sponsorId)
  const current = (activityId: string) => s.privileges.find((p) => p.activityId === activityId && p.state !== 'closed')
  const activities: RadioCardOption<string>[] = s.activities
    .filter((a) => a.agentId === agentId)
    .map((a) => {
      const prv = current(a.id)
      return a.level === 'shadow'
        ? { value: a.id, title: a.name, description: 'Already in Shadow', disabled: true }
        : { value: a.id, title: a.name, description: `${LEVEL[a.level]}${prv ? ` · signed by ${personName(s, prv.grantedBy)} · ${prv.code} v${prv.version}` : ''}` }
    })
  const grants = s.grants
    .filter((g) => g.agentId === agentId)
    .flatMap((g) =>
      (Object.entries(g.cells) as [Verb, string][])
        .filter(([, cell]) => cell === 'granted' || cell === 'changed')
        .map(([verb]) => ({ value: `${g.system}|${verb}`, system: g.system, verb, title: `${g.system} · ${verb}`, description: g.detail })),
    )
  return {
    description: `Change one tool or one activity. The rest of ${agent.name} keeps working.`,
    audit: `Logs ${personName(s, personaId)} · ${roleOn(s, personaId, agentId)}`,
    activities,
    shadowEffects: [
      `Drafts stop reaching pharmacists; ${queueOf(agent).inProgress} in progress go to the worklists.`,
      'The agent keeps running in shadow, so evidence keeps coming.',
      'The scorecard restarts against the same targets.',
    ],
    shadowRule: (activityId: string) => {
      const prv = current(activityId)
      return {
        lead: `Back to Draft needs ${sponsor}’s signature again.`,
        text: prv ? `${prv.code} v${prv.version} closes; a new version is drafted for ${sponsor} to sign.` : `A new privilege is drafted for ${sponsor} to sign.`,
      }
    },
    grants,
    revokeEffects: (title: string) => [`${agent.name} loses ${title} at the gateway.`, 'Everything else keeps working.', 'Granting it again goes back through tool approval.'],
  }
}

export interface ResumePanelView {
  /** `request`: the owner or sponsor may ask; `waiting`: the requester waits (6d); `approve`: the other person decides (6e); `readonly`: everyone else. */
  mode: 'request' | 'waiting' | 'approve' | 'readonly'
  title: string
  stamp: string
  needs: { who: string; status: string; done: boolean; current: boolean }[]
  returnsTo: { activity: string; level: string; status: 'normal' | 'shadow' }[]
  reasonLabel: string
  quote: string | null
  changes: { title: string; sub: string; meta: string }[]
  statusLine: string
}

/** The resume panel on a paused agent (6d, 6e). Null when the agent isn't paused. */
export function selectResumePanel(s: DemoState, personaId: PersonaId, agentId: string): ResumePanelView | null {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent || agent.lifecycle !== 'paused' || !agent.pausedAt) return null
  const request = s.resumeRequests.find((r) => r.agentId === agentId)
  const people = [
    { id: agent.ownerId, role: 'agent owner' },
    { id: agent.sponsorId, role: 'clinical sponsor' },
  ]
  const isParty = people.some((p) => p.id === personaId)
  const approvedAt = (id: string) => request?.approvals.find((a) => a.personId === id)?.at
  const pending = people.find((p) => !approvedAt(p.id))
  const requester = request ? personName(s, request.requestedBy) : ''
  const mode: ResumePanelView['mode'] = !request
    ? isParty
      ? 'request'
      : 'readonly'
    : approvedAt(personaId)
      ? 'waiting'
      : isParty
        ? 'approve'
        : 'readonly'
  const needs = people.map((p) => {
    const at = approvedAt(p.id)
    const you = p.id === personaId
    return {
      who: `${personName(s, p.id)} · ${p.role}`,
      status: at
        ? `${request?.requestedBy === p.id ? 'requested' : 'approved'} ${formatClock(at)}`
        : request
          ? you
            ? 'you · deciding now'
            : `approval pending · told ${formatClock(request.requestedAt)}`
          : you
            ? 'you · asking now'
            : 'told when you ask',
      done: Boolean(at),
      current: !at && (request ? true : you),
    }
  })
  const incident = s.incidents.find((i) => i.agentId === agentId && i.state !== 'closed')
  const changes = [...(agent.pause?.changes ?? [])]
  if (incident && !changes.some((c) => c.title.includes(incident.code))) {
    const open = incident.corrections.filter((c) => !c.done).length
    changes.push({ title: `Incident ${incident.code}`, sub: `${incident.rootCause ? 'Root cause recorded' : 'Root cause pending'} · ${open} ${open === 1 ? 'correction' : 'corrections'} open`, meta: personName(s, incident.commanderId) })
  }
  return {
    mode,
    title: mode === 'approve' ? `${requester} asks to resume ${agent.name}` : 'Request to resume',
    stamp: request ? (mode === 'approve' ? `Requested ${formatClock(request.requestedAt)} · paused ${formatClock(agent.pausedAt)}` : `Requested ${formatClock(request.requestedAt)}`) : `Paused ${formatClock(agent.pausedAt)}`,
    needs,
    returnsTo: s.activities
      .filter((a) => a.agentId === agentId)
      .map((a) => ({ activity: a.name, level: LEVEL[a.level], status: a.level === 'shadow' ? ('shadow' as const) : ('normal' as const) })),
    reasonLabel: mode === 'approve' ? `${requester}’s reason` : request ? `Reason · ${requester}` : 'Reason',
    quote: request ? `“${request.reason}”` : null,
    changes,
    statusLine: request
      ? `Stays paused until ${pending ? personName(s, pending.id) : 'both'} ${pending ? 'approves' : 'approve'}. Both of you see this request.`
      : `Resuming needs ${personName(s, agent.sponsorId)} and ${personName(s, agent.ownerId)}, both with a reason.`,
  }
}
