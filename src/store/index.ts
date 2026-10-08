import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { buildScenario, type ScenarioId } from '../data/scenarios'
import { createSeed, SEED_VERSION } from '../data/seed'
import { PERSONA_IDS, type DemoState, type PersonaId, type Verb } from '../data/types'
import { formatClock } from '../lib/clock'
import { applyPause, applyResume, nextArchiveCode } from './mutations'
import { runAction, type ActionResult } from './runAction'
import { safeStorage } from './storage'

export type { ActionResult } from './runAction'

/** Why an exception was dismissed (5b); the category tunes the rule that raised it. */
export type DismissCategory = 'expected' | 'duplicate' | 'noisy' | 'other'

export const DISMISS_LABELS: Record<DismissCategory, string> = {
  expected: 'Expected change',
  duplicate: 'Duplicate',
  noisy: 'Rule is too noisy',
  other: 'Other',
}

export interface DismissInput {
  category: DismissCategory
  reason: string
  /** A rule change to propose alongside, e.g. "Raise the MR-12 threshold … until 11 Dec". */
  tune?: string
}

export interface DemoActions {
  setPersona: (id: PersonaId) => void
  /** Restore the seed: data, clock and persona. */
  reset: () => void
  /** Replace the data with a named scenario, keeping who you are viewing as. */
  loadScenario: (id: ScenarioId) => void
  /** Take ownership of an exception (state → claimed, stamped with the demo clock). */
  claimException: (id: string) => ActionResult
  /** Hide an exception from the inbox until `until`; the deadline still stands. */
  snoozeException: (id: string, until: string) => ActionResult
  /** Close an exception without acting on it. A reason is required; it is logged. */
  dismissException: (id: string, input: DismissInput) => ActionResult
  /** Hand an exception to someone else; the previous owner and you stay copied. */
  assignException: (id: string, personId: string) => ActionResult
  /** Answer a question from a person (5a): closes it with the answer. */
  answerQuestion: (id: string, answer: 'yes' | 'no') => ActionResult
  /** Stop an activity, an agent, or every agent in its division at the gateway (6b). */
  pauseAgent: (agentId: string, input: PauseInput) => ActionResult
  /** One activity back to Shadow; its privilege closes and a new version waits for the sponsor (6c). */
  returnToShadow: (activityId: string, reason: string) => ActionResult
  /** Remove one tool grant, a system × verb cell (6c). */
  revokeTool: (agentId: string, grant: { system: string; verb: Verb }, reason: string) => ActionResult
  /** Ask to resume a paused agent; the owner and the sponsor must both agree, each with a reason (6d). */
  requestResume: (agentId: string, reason: string) => ActionResult
  /** The second person's approval; with both, the agent resumes at the gateway (6e). */
  approveResume: (agentId: string, reason: string) => ActionResult
  declineResume: (agentId: string, reason: string) => ActionResult
  withdrawResume: (agentId: string) => ActionResult
  /** Revoke access now; the record stays live and on the boards (6f). */
  disableAgent: (agentId: string, reason: string) => ActionResult
  /** Archive for good after typing the agent's exact name; it leaves every board (6f). */
  retireAgent: (agentId: string, input: { typedName: string; reason: string }) => ActionResult
}

export interface PauseInput {
  scope: 'activity' | 'agent' | 'division'
  /** Activity scope; defaults to the agent's main (non-Shadow) activity. */
  activityId?: string
  reason?: string
}

export type DemoStore = DemoState & DemoActions

const DATA_KEYS = Object.keys(createSeed()) as Array<keyof DemoState>

/** Every tool grant to none: the agent loses gateway access (disable, retire). */
function revokeAll(draft: DemoState, agentId: string) {
  for (const g of draft.grants) {
    if (g.agentId !== agentId) continue
    for (const verb of Object.keys(g.cells) as Array<keyof typeof g.cells>) if (g.cells[verb] === 'granted' || g.cells[verb] === 'changed') g.cells[verb] = 'none'
  }
}

/** Add a line to the agent's open incident timeline, if it has one (7c). */
function incidentEntry(draft: DemoState, agentId: string, title: string) {
  const incident = draft.incidents.find((i) => i.agentId === agentId && i.state !== 'closed')
  const name = draft.people.find((p) => p.id === draft.personaId)?.name ?? draft.personaId
  incident?.timeline.push({ at: draft.now, title, sub: name, by: draft.personaId })
}

/**
 * Saved state is used only if it is a full snapshot of the current seed version with a known
 * persona; anything else (no version, missing collections, a stray persona) starts from the seed.
 */
function isCurrentSnapshot(saved: unknown): saved is DemoState {
  if (!saved || typeof saved !== 'object') return false
  const s = saved as Record<string, unknown>
  const seed = createSeed() as unknown as Record<string, unknown>
  return (
    s.version === SEED_VERSION &&
    PERSONA_IDS.includes(s.personaId as PersonaId) &&
    DATA_KEYS.every((key) => typeof s[key] === typeof seed[key] && Array.isArray(s[key]) === Array.isArray(seed[key]))
  )
}

/** Just the data, without the action functions. */
export function dataOf(store: DemoState): DemoState {
  return Object.fromEntries(DATA_KEYS.map((key) => [key, store[key]])) as unknown as DemoState
}

/** A demo store persisted to `storage` under a versioned key. Tests pass their own storage. */
export function createDemoStore(storage: StateStorage = safeStorage) {
  return create<DemoStore>()(
    persist<DemoStore, [], [], DemoState>(
      (set, get) => {
        const act = (spec: Parameters<typeof runAction>[1]): ActionResult => {
          const { state, result } = runAction(dataOf(get()), spec)
          if (result.ok) set(state)
          return result
        }
        /** An open exception, or the reason it can't be acted on. */
        const openException = (id: string) => {
          const exception = get().exceptions.find((e) => e.id === id)
          if (!exception) return { error: { ok: false, reason: 'Not found' } as ActionResult }
          if (exception.state === 'resolved' || exception.state === 'dismissed') return { error: { ok: false, reason: 'Already resolved' } as ActionResult }
          return { exception }
        }
        return {
          ...createSeed(),
          setPersona: (id) => set({ personaId: id }),
          reset: () => set(createSeed()),
          loadScenario: (id) => set({ ...buildScenario(id), personaId: get().personaId }),
          claimException: (id) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            if (exception.claimedAt) return { ok: false, reason: 'Already claimed' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Claimed', target: exception.code },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                target.claimedAt = draft.now
                target.ownerId = draft.personaId
                if (target.state === 'new') target.state = 'claimed'
              },
            })
          },
          snoozeException: (id, until) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Snoozed', target: exception.code, reason: `until ${formatClock(until)}` },
              mutate: (draft) => {
                draft.exceptions.find((e) => e.id === id)!.snoozedUntil = until
              },
            })
          },
          assignException: (id, personId) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            const person = get().people.find((p) => p.id === personId)
            if (!person) return { ok: false, reason: 'Unknown person' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Assigned', target: exception.code, reason: `to ${person.name}` },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                const keep = [target.ownerId, draft.personaId].filter((p) => p !== personId)
                target.copied = [...new Set([...target.copied.filter((p) => p !== personId), ...keep])]
                target.ownerId = personId
                target.assignedAt = draft.now
              },
            })
          },
          pauseAgent: (agentId, { scope, activityId, reason }) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            if (agent.lifecycle === 'retired') return { ok: false, reason: 'Retired agents can’t be paused' }
            const activities = s.activities.filter((a) => a.agentId === agentId)
            const activity = activityId ?? (activities.find((a) => a.level !== 'shadow') ?? activities[0])?.id
            const targets =
              scope === 'division'
                ? s.agents.filter((a) => a.divisionId === agent.divisionId && a.lifecycle !== 'retired' && a.lifecycle !== 'paused').map((a) => a.id)
                : agent.lifecycle === 'paused' || (scope === 'activity' && s.activities.find((a) => a.id === activity)?.paused)
                  ? []
                  : [agentId]
            if (!targets.length) return { ok: false, reason: 'Already paused' }
            const why = reason?.trim() || undefined
            const division = s.divisions.find((d) => d.id === agent.divisionId)
            return act({
              action: 'pause',
              ctx: scope === 'division' ? { divisionId: agent.divisionId } : { agentId },
              audit: {
                action: 'Paused',
                target: scope === 'division' ? `${division?.name} · ${targets.length} agents` : agent.code,
                ...(why ? { reason: why } : {}),
              },
              mutate: (draft) => {
                applyPause(draft, targets, { scope, ...(scope === 'activity' && activity ? { activityId: activity } : {}), ...(why ? { reason: why } : {}) }, draft.personaId)
              },
            })
          },
          returnToShadow: (activityId, reason) => {
            const s = get()
            const activity = s.activities.find((a) => a.id === activityId)
            if (!activity) return { ok: false, reason: 'Not found' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            if (activity.level === 'shadow') return { ok: false, reason: 'Already in Shadow' }
            const agent = s.agents.find((a) => a.id === activity.agentId)!
            return act({
              action: 'returnToShadow',
              ctx: { agentId: agent.id },
              audit: { action: 'Returned to Shadow', target: agent.code, reason: `${activity.name} · ${why}` },
              mutate: (draft) => {
                const target = draft.activities.find((a) => a.id === activityId)!
                const was = target.level
                target.level = 'shadow'
                const owner = draft.agents.find((a) => a.id === agent.id)!
                const main = draft.activities.filter((a) => a.agentId === agent.id).find((a) => a.level !== 'shadow')
                owner.level = main?.level ?? 'shadow'
                const current = draft.privileges.find((p) => p.activityId === activityId && p.state !== 'closed')
                if (!current) return
                current.state = 'closed'
                draft.privileges.push({
                  ...current,
                  id: `${current.id}-v${current.version + 1}`,
                  version: current.version + 1,
                  level: 'shadow',
                  proposedLevel: was,
                  state: 'awaiting',
                  grantedBy: undefined,
                  grantedAt: undefined,
                  movedBy: draft.personaId,
                  trigger: why,
                })
              },
            })
          },
          revokeTool: (agentId, { system, verb }, reason) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            const cell = s.grants.find((g) => g.agentId === agentId && g.system === system)?.cells[verb]
            if (cell !== 'granted' && cell !== 'changed') return { ok: false, reason: 'Not granted' }
            return act({
              action: 'revokeTool',
              ctx: { agentId },
              audit: { action: 'Revoked tool', target: agent.code, reason: `${system} · ${verb} · ${why}` },
              mutate: (draft) => {
                draft.grants.find((g) => g.agentId === agentId && g.system === system)!.cells[verb] = 'none'
              },
            })
          },
          requestResume: (agentId, reason) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            if (agent.lifecycle !== 'paused' && !agent.pause) return { ok: false, reason: 'Not paused' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            if (s.resumeRequests.some((r) => r.agentId === agentId)) return { ok: false, reason: 'A resume request is already open' }
            return act({
              action: 'resume',
              ctx: { agentId },
              audit: { action: 'Requested resume', target: agent.code, reason: why },
              mutate: (draft) => {
                draft.resumeRequests.push({ agentId, requestedBy: draft.personaId, requestedAt: draft.now, reason: why, approvals: [{ personId: draft.personaId, reason: why, at: draft.now }] })
                incidentEntry(draft, agentId, 'Resume requested')
              },
            })
          },
          approveResume: (agentId, reason) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            const request = s.resumeRequests.find((r) => r.agentId === agentId)
            if (!request) return { ok: false, reason: 'No resume request' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            if (request.approvals.some((a) => a.personId === s.personaId)) return { ok: false, reason: 'You already approved; the other person must' }
            const needed = [agent.ownerId, agent.sponsorId]
            const approved = new Set([...request.approvals.map((a) => a.personId), s.personaId])
            const complete = needed.every((p) => approved.has(p))
            return act({
              action: 'resume',
              ctx: { agentId },
              audit: { action: complete ? 'Resumed' : 'Approved resume', target: agent.code, reason: why },
              mutate: (draft) => {
                draft.resumeRequests.find((r) => r.agentId === agentId)!.approvals.push({ personId: draft.personaId, reason: why, at: draft.now })
                if (complete) applyResume(draft, agentId, draft.personaId)
              },
            })
          },
          declineResume: (agentId, reason) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            const request = s.resumeRequests.find((r) => r.agentId === agentId)
            if (!agent || !request) return { ok: false, reason: 'No resume request' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            if (request.requestedBy === s.personaId) return { ok: false, reason: 'Withdraw your own request instead' }
            return act({
              action: 'resume',
              ctx: { agentId },
              audit: { action: 'Declined resume', target: agent.code, reason: why },
              mutate: (draft) => {
                draft.resumeRequests = draft.resumeRequests.filter((r) => r.agentId !== agentId)
                incidentEntry(draft, agentId, 'Resume declined')
              },
            })
          },
          withdrawResume: (agentId) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            const request = s.resumeRequests.find((r) => r.agentId === agentId)
            if (!agent || !request) return { ok: false, reason: 'No resume request' }
            if (request.requestedBy !== s.personaId) {
              const name = s.people.find((p) => p.id === request.requestedBy)?.name ?? 'the requester'
              return { ok: false, reason: `Only ${name} can withdraw this request` }
            }
            return act({
              action: 'resume',
              ctx: { agentId },
              audit: { action: 'Withdrew resume request', target: agent.code },
              mutate: (draft) => {
                draft.resumeRequests = draft.resumeRequests.filter((r) => r.agentId !== agentId)
              },
            })
          },
          disableAgent: (agentId, reason) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            if (agent.lifecycle === 'retired') return { ok: false, reason: 'Already retired' }
            if (agent.lifecycle === 'disabled') return { ok: false, reason: 'Already disabled' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            return act({
              action: 'disable',
              ctx: { agentId },
              audit: { action: 'Disabled', target: agent.code, reason: why },
              mutate: (draft) => {
                const target = draft.agents.find((a) => a.id === agentId)!
                const name = draft.people.find((p) => p.id === draft.personaId)?.name ?? draft.personaId
                target.lifecycle = 'disabled'
                target.disabled = { at: draft.now, by: draft.personaId, reason: why }
                target.judgment = { status: 'paused', label: `Disabled by ${name}` }
                revokeAll(draft, agentId)
              },
            })
          },
          retireAgent: (agentId, { typedName, reason }) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            if (agent.lifecycle === 'retired') return { ok: false, reason: 'Already retired' }
            if (typedName.trim() !== agent.name) return { ok: false, reason: 'Type the agent’s name exactly' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            return act({
              action: 'retire',
              ctx: { agentId },
              audit: { action: 'Retired', target: agent.code, reason: why },
              mutate: (draft) => {
                const target = draft.agents.find((a) => a.id === agentId)!
                target.retirement = { at: draft.now, by: draft.personaId, code: nextArchiveCode(draft), reason: why }
                target.lifecycle = 'retired'
                revokeAll(draft, agentId)
                for (const p of draft.privileges) if (p.agentId === agentId) p.state = 'closed'
                for (const e of draft.exceptions)
                  if (e.agentId === agentId && e.state !== 'resolved' && e.state !== 'dismissed')
                    Object.assign(e, { state: 'resolved', outcome: 'Closed: agent retired', closedAt: draft.now, closedBy: draft.personaId })
              },
            })
          },
          answerQuestion: (id, answer) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            if (exception.kind !== 'question') return { ok: false, reason: 'Not a question' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Answered', target: exception.code, reason: answer === 'yes' ? 'Yes' : 'No' },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                Object.assign(target, { state: 'resolved', outcome: `Answered ${answer}`, closedAt: draft.now, closedBy: draft.personaId })
              },
            })
          },
          dismissException: (id, { category, reason, tune }) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Dismissed', target: exception.code, reason: `${DISMISS_LABELS[category]} · ${why}` },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                target.state = 'dismissed'
                target.dismissReason = why
                target.closedAt = draft.now
                target.closedBy = draft.personaId
                if (!tune) return
                const agent = draft.agents.find((a) => a.id === exception.agentId)
                const name = (personId?: string) => draft.people.find((p) => p.id === personId)?.name ?? 'the technical owner'
                draft.logEvents.push({
                  id: `log-tune-${draft.logEvents.length + 1}`,
                  at: draft.now,
                  agentId: exception.agentId,
                  text: tune,
                  sub: `Requested by ${name(draft.personaId)} · ${name(agent?.techOwnerId)} is asked to confirm`,
                })
              },
            })
          },
        }
      },
      {
        name: 'acp-demo',
        version: SEED_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: dataOf,
        // Any saved state from another seed version is replaced by a fresh seed (Review focus 1).
        migrate: () => createSeed(),
        merge: (saved, current) => (isCurrentSnapshot(saved) ? { ...current, ...saved } : current),
      },
    ),
  )
}

/** The app's store. */
export const useDemo = createDemoStore()
