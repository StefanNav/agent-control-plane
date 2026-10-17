import type { DemoState, Incident } from '../data/types'
import { addDays, formatClock, formatDate } from '../lib/clock'
import { raiseItem, resolveItems } from './onboarding'
import { personName } from './onboardingRules'

/**
 * Hand-offs (Phase 12, R9 product-wide): when one person's action makes another named person
 * responsible for the next step, that person gets an inbox item. Information goes to the log.
 */

/** 17:00 on `at`'s day, or the next day's 17:00 from 15:00 on: for hand-offs that shouldn't wait days. */
export function endOfDayDeadline(at: string): string {
  const day = Number(at.slice(11, 13)) >= 15 ? addDays(at, 1) : at
  return `${day.slice(0, 10)}T17:00:00`
}

/** An FYI: a log event addressed to the people told ("Priya told"); never an inbox item (E5). */
export function tell(s: DemoState, e: { at: string; agentId?: string; text: string; sub: string; to: string[] }): void {
  s.logEvents.push({ id: `log-tell-${s.logEvents.length + 1}`, at: e.at, ...(e.agentId ? { agentId: e.agentId } : {}), text: e.text, sub: e.sub, to: e.to })
}

/** A resume request waits for the other of the owner and the sponsor (6d, 6e; Phase 12 H2). */
export const RESUME_ITEM = 'Review: resume'

/** When a pause happened, as the item reads it: the time today, the day and time before. */
const pausedWhen = (pausedAt: string, at: string) => (pausedAt.slice(0, 10) === at.slice(0, 10) ? formatClock(pausedAt) : `${formatDate(pausedAt)} ${formatClock(pausedAt)}`)

/** The requester's counterpart gets the request; it waits until they approve or decline. */
export function raiseResumeItem(s: DemoState, agentId: string, requestedBy: string, at: string): void {
  const agent = s.agents.find((a) => a.id === agentId)
  const other = agent && [agent.ownerId, agent.sponsorId].find((p) => p !== requestedBy)
  if (!agent || !other) return
  const paused = agent.pausedBy && agent.pausedAt ? ` Paused by ${personName(s, agent.pausedBy)} at ${pausedWhen(agent.pausedAt, at)}.` : ''
  raiseItem(s, {
    agentId,
    type: RESUME_ITEM,
    reason: `${personName(s, requestedBy)} asks to resume ${agent.name}.${paused}`,
    action: 'approve or decline the resume',
    actionSub: 'It stays paused until you agree',
    ownerId: other,
    copied: [requestedBy],
    link: { label: 'Open the resume request', to: `/operations/agents/${agentId}` },
    at,
    deadline: endOfDayDeadline(at),
  })
}

/** The request is answered, withdrawn, or gone with the pause. */
export function closeResumeItem(s: DemoState, agentId: string, by: string, at: string, outcome: string): void {
  resolveItems(s, agentId, RESUME_ITEM, by, at, outcome)
}

/** Opening an incident makes the agent's owner its commander (7c; Phase 12 H3). */
export const commanderItem = (code: string) => `Commander: ${code}`

/** The commander runs the incident from its record; nothing is raised when they opened it themselves. */
export function raiseCommanderItem(s: DemoState, incident: Incident, openedBy: string, at: string): void {
  if (incident.commanderId === openedBy) return
  raiseItem(s, {
    agentId: incident.agentId,
    type: commanderItem(incident.code),
    reason: `${personName(s, openedBy)} opened ${incident.code}: ${incident.title}`,
    action: 'run the incident',
    actionSub: 'Root cause and corrections, each with an owner',
    ownerId: incident.commanderId,
    copied: [openedBy],
    link: { label: `Open ${incident.code}`, to: `/operations/incidents/${incident.id}` },
    at,
    deadline: endOfDayDeadline(at),
  })
}
