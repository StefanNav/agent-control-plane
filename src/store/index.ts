import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { buildScenario, type ScenarioId } from '../data/scenarios'
import { createSeed, SEED_VERSION } from '../data/seed'
import { PERSONA_IDS, type Condition, type DemoState, type FlagReason, type ReviewChange, type Incident, type JobDraft, type PersonaId, type ReviewDecision, type Tier, type Verb } from '../data/types'
import { formatClock } from '../lib/clock'
import { applyPause, applyResume, nextArchiveCode, nextIncidentCode } from './mutations'
import { applyAskEvidence, applyDecision, applyExtendShadow, applyFlagLine, applyGoLiveRequest, applyJobEdit, applyReply, applyRequestChanges, applyReturnRequest, applySend, applySetTier, applySignPrivilege, applySponsorSign, applyStart, applySystemsEdit, applyTest, DECISION_WORDS, latestByCode, latestPrivilege, signMode, testResult, type SystemsChange } from './onboarding'
import { criteriaStatus, FIELD_NAMES, JOB_KEY_FIELD, readyToSend, recordItems, shadowProgress } from './onboardingRules'
import { applyAccept, applyHardStopApproval, applyReplay, applySystemsSignOff, pendingChecks } from './changes'
import { applyFlag, applyFlagAnswer, applySeenFix, type FlagAnswer } from './feedback'
import { applyBlockCaller, applyDismissCaller, applyMessageOwner } from './gateway'
import { applyDeclineReviewChange, applyProposeReviewChange, applyShareFinding, applySignReviewChange, unitById } from './reviewers'
import { can, lockReason } from './permissions'
import { applyAddRole, applyCreateDivision, applyDivisionSettings, applyInvite, applyRemoveRole, applyReturnToShadow, diffDivision, divisionSlug, ROLE_LABEL, roleDivision, type DivisionPatch, type NewDivisionInput, type RoleInput } from './settings'
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
  /** Open an incident for an agent with the actions it concerns (7a, 7b); anyone who can view the audit may. */
  openIncident: (agentId: string, input: { title: string; actionIds: string[] }) => ActionResult
  /** Add a line to an incident's timeline (7c "Add an entry"). */
  addIncidentEntry: (incidentId: string, text: string) => ActionResult
  /** Mark a correction done: its owner, the commander or the program lead. */
  completeCorrection: (incidentId: string, correctionId: string) => ActionResult
  /** Close once every correction is done: the commander or the program lead (7c). */
  closeIncident: (incidentId: string, reason: string) => ActionResult
  /** Build a records export for a survey or audit; it is logged (7d). */
  buildExport: (input: { agentIds: string[]; from: string; to: string; format: 'packet' | 'csv'; masked: boolean }) => ActionResult
  /** Who answers for a division, what a lapsed review does, who unanswered items reach (8a). Program lead only. */
  updateDivisionSettings: (divisionId: string, patch: DivisionPatch) => ActionResult
  /** A new division, or a split of `from` with the agents that move (8a, composed). Program lead only. */
  createDivision: (input: NewDivisionInput, from?: string) => ActionResult
  /** Give a person a role in a division (8b "Add a role"). Program lead only. */
  addRole: (personId: string, input: RoleInput) => ActionResult
  /** Take a role away (composed "Remove"); never the last program lead or a division's named owner or sponsor. */
  removeRole: (personId: string, input: RoleInput) => ActionResult
  /** Add a person with one role (8b "Invite"). Program lead only. */
  invitePerson: (input: { name: string; title: string } & RoleInput) => ActionResult
  /** Flag a draft from Epic in one action (10a); it reaches the agent's owner. Frontline pharmacists only. */
  flagDraft: (draftId: string, input: { reason: FlagReason; note?: string }) => ActionResult
  /** Answer a pharmacist's flag (R14): a fix in progress, not a defect, or a reply. */
  answerFlag: (exceptionId: string, answer: FlagAnswer) => ActionResult
  /** Replay the last 30 days on a held build (9a); it finishes at once. Agent owner. */
  startReplay: (changeId: string) => ActionResult
  /** Sign off a held build's systems change (9a). Agent owner. */
  signOffSystems: (changeId: string) => ActionResult
  /** Approve a held build's new hard-stop version (9a). Clinical sponsor. */
  approveChangeHardStop: (changeId: string) => ActionResult
  /** Accept a held build once its checks are done: it starts serving (9a). Agent owner. */
  acceptChange: (changeId: string) => ActionResult
  /** Dismiss "Your flag led to a fix" (10b). The flag's own pharmacist only. */
  dismissFixNotice: (flagId: string) => ActionResult
  /** Block an unregistered caller at the gateway, with a reason (9b). Program lead. */
  blockCaller: (callerId: string, reason: string) => ActionResult
  /** Say an unregistered caller isn't an agent, with a reason (9b). Program lead. */
  dismissCaller: (callerId: string, reason: string) => ActionResult
  /** Message a caller's likely owner; logged on the caller (9b). Program lead. */
  messageCallerOwner: (callerId: string, text: string) => ActionResult
  /** Send a unit's sampling or review-level change to the sponsor for sign-off (11b). */
  proposeReviewChange: (unitId: string, option: ReviewChange['option']) => ActionResult
  /** The sponsor signs it; it runs 14 days (11b). */
  signReviewChange: (id: string) => ActionResult
  /** The sponsor declines it, with a reason. */
  declineReviewChange: (id: string, reason: string) => ActionResult
  /** "Share with Priya" (11a): an FYI in the log. */
  shareReviewerFinding: (unitId: string) => ActionResult
  /** Start onboarding from an approved intake with all four humans named (1a, 2a). */
  startOnboarding: (intakeId: string, people: { ownerId: string; techOwnerId: string }) => ActionResult
  /** Save part of the job description (1b); refused once the record is frozen at v1.0. */
  updateJob: (agentId: string, patch: Partial<JobDraft>) => ActionResult
  /** Tick a systems × verbs cell, or name the activity a grant serves (1c). Sign and Order stay locked. */
  updateSystems: (agentId: string, change: SystemsChange) => ActionResult
  /** Test a hard stop on the last 30 days, or on a named case set (1d, 1g); the technical owner's step. */
  testHardStop: (agentId: string, code: string, casesId?: string) => ActionResult
  /** Send the finished set to the sponsor for "Review: final set" (1d). */
  sendToSponsor: (agentId: string) => ActionResult
  /** The sponsor sends the set back to one person with a note; only what it's about reopens (1f). */
  requestSponsorChanges: (agentId: string, input: { to: string; about?: string; note: string }) => ActionResult
  /** The person it went back to replies to the sponsor (1g); optional. */
  replyToSponsor: (agentId: string, text: string) => ActionResult
  /** The sponsor approves and signs the set: frozen at v1.0 and with AIMS Review (1e → 1h). */
  approveAsSponsor: (agentId: string) => ActionResult
  /** Set the risk tier (2b); a tier other than the suggested one needs a reason. Tier 2+ builds the packet. */
  setRiskTier: (agentId: string, input: { tier: Tier; reason?: string }) => ActionResult
  /** The AI review board's decision from the packet, with a reason (2c); approval starts shadow (2d). */
  recordDecision: (agentId: string, input: { kind: ReviewDecision['kind']; conditions: Condition[]; reason: string }) => ActionResult
  /** The owner asks the sponsor to sign Shadow → Draft once shadow has run its minimum (3a). */
  requestGoLive: (activityId: string) => ActionResult
  /** Run shadow longer before asking (3a). */
  extendShadow: (activityId: string, days?: number) => ActionResult
  /** Flag a sample-case line for the SOP (3b). */
  flagCaseLine: (caseId: string, line: number) => ActionResult
  /** The sponsor signs a go-live proposal, or renews a due privilege (3c, 3d). Below target needs a reason. */
  signPrivilege: (code: string, input: { reason?: string; accepted: boolean }) => ActionResult
  /** The sponsor sends a go-live request back to the owner with a note (3c). */
  returnPrivilegeRequest: (code: string, note: string) => ActionResult
  /** The sponsor asks the owner for evidence before a review (3d). */
  askForEvidence: (code: string) => ActionResult
}

export interface PauseInput {
  scope: 'activity' | 'agent' | 'division'
  /** Activity scope; defaults to the agent's main (non-Shadow) activity. */
  activityId?: string
  reason?: string
}

export type DemoStore = DemoState & DemoActions

const DATA_KEYS = Object.keys(createSeed()) as Array<keyof DemoState>

/** Paused as a whole, or one of its activities paused while it keeps working (never disabled or retired). */
const isPaused = (agent: DemoState['agents'][number]) => agent.lifecycle === 'paused' || (agent.lifecycle === 'live' && agent.pause?.scope === 'activity')

/** Drop a pause and its resume request: disabling or retiring supersedes them. */
function clearPause(draft: DemoState, agentId: string) {
  const agent = draft.agents.find((a) => a.id === agentId)!
  delete agent.pause
  delete agent.pausedBy
  delete agent.pausedAt
  for (const activity of draft.activities) if (activity.agentId === agentId) delete activity.paused
  draft.resumeRequests = draft.resumeRequests.filter((r) => r.agentId !== agentId)
}

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
        /** The sponsor signs (reason null) or declines a unit's review change, once (11b). */
        const reviewDecision = (id: string, reason: string | null): ActionResult => {
          const change = get().reviewChanges.find((c) => c.id === id)
          const unit = change ? unitById(change.unitId) : undefined
          if (!change || !unit) return { ok: false, reason: 'Not found' }
          if (change.state !== 'waiting') return { ok: false, reason: 'Already decided' }
          const why = reason?.trim() ?? ''
          if (reason !== null && !why) return { ok: false, reason: 'Say why' }
          return act({
            action: 'signReviewChange',
            ctx: { divisionId: unit.divisionId },
            audit: { action: reason === null ? 'Signed review change' : 'Declined review change', target: unit.name, ...(why ? { reason: why } : {}) },
            mutate: (draft) => {
              if (reason === null) applySignReviewChange(draft, id, draft.personaId, draft.now)
              else applyDeclineReviewChange(draft, id, why, draft.personaId, draft.now)
            },
          })
        }
        /** Block a caller or dismiss it (9b): once, with a reason, by the program lead. */
        const decideCaller = (
          callerId: string,
          reason: string,
          audit: string,
          apply: (s: DemoState, id: string, reason: string, by: string, at: string) => DemoState,
        ): ActionResult => {
          const caller = get().callers.find((c) => c.id === callerId)
          if (!caller) return { ok: false, reason: 'Not found' }
          if (caller.decision) return { ok: false, reason: 'Already decided' }
          const why = reason.trim()
          if (!why) return { ok: false, reason: 'Give a reason. Every choice is logged with a reason.' }
          return act({
            action: 'decideCaller',
            audit: { action: audit, target: caller.name, reason: why },
            mutate: (draft) => {
              apply(draft, callerId, why, draft.personaId, draft.now)
            },
          })
        }
        /** One of a held build's checks (9a): its person, once, while the build is held. */
        const changeStep = (
          changeId: string,
          check: 'replay' | 'systems' | 'hardStop',
          action: 'revalidateChange' | 'approveTools',
          audit: string,
          apply: (s: DemoState, id: string, by: string, at: string) => DemoState,
        ): ActionResult => {
          const s = get()
          const change = s.changes.find((c) => c.id === changeId)
          const agent = s.agents.find((a) => a.id === change?.agentId)
          if (!change || !agent) return { ok: false, reason: 'Not found' }
          if (change.status !== 'held') return { ok: false, reason: `${change.to.build} is no longer held` }
          if (change.checks[check]) return { ok: false, reason: 'Already done' }
          return act({
            action,
            ctx: { agentId: agent.id },
            audit: { action: audit, target: `${agent.code} ${change.to.build}` },
            mutate: (draft) => {
              apply(draft, changeId, draft.personaId, draft.now)
            },
          })
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
            if (agent.lifecycle === 'disabled') return { ok: false, reason: 'Disabled agents can’t be paused' }
            const activities = s.activities.filter((a) => a.agentId === agentId)
            const activity = activityId ?? (activities.find((a) => a.level !== 'shadow') ?? activities[0])?.id
            const targets =
              scope === 'division'
                ? s.agents.filter((a) => a.divisionId === agent.divisionId && a.lifecycle === 'live').map((a) => a.id)
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
                applyReturnToShadow(draft, activityId, draft.personaId, why)
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
            if (!isPaused(agent)) return { ok: false, reason: 'Not paused' }
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
            if (!isPaused(agent)) return { ok: false, reason: 'Not paused' }
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
                clearPause(draft, agentId)
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
                clearPause(draft, agentId)
                target.retirement = { at: draft.now, by: draft.personaId, code: nextArchiveCode(draft), reason: why }
                target.lifecycle = 'retired'
                target.judgment = { status: 'normal', label: 'Retired' }
                revokeAll(draft, agentId)
                for (const p of draft.privileges) if (p.agentId === agentId) p.state = 'closed'
                for (const e of draft.exceptions)
                  if (e.agentId === agentId && e.state !== 'resolved' && e.state !== 'dismissed')
                    Object.assign(e, { state: 'resolved', outcome: 'Closed: agent retired', closedAt: draft.now, closedBy: draft.personaId })
              },
            })
          },
          openIncident: (agentId, { title, actionIds }) => {
            const s = get()
            const agent = s.agents.find((a) => a.id === agentId)
            if (!agent) return { ok: false, reason: 'Not found' }
            const what = title.trim()
            if (!what) return { ok: false, reason: 'A title is required' }
            const code = nextIncidentCode(s)
            return act({
              action: 'openIncident',
              ctx: { agentId },
              audit: { action: 'Opened incident', target: code, reason: what },
              mutate: (draft) => {
                const name = (id: string) => draft.people.find((p) => p.id === id)?.name ?? id
                const linked = draft.actions.filter((a) => actionIds.includes(a.id)).sort((a, b) => a.at.localeCompare(b.at))
                const timeline: Incident['timeline'] = linked.map((a, i) => ({
                  at: a.at,
                  title: a.blockedBy ? (i === 0 ? 'First dose change blocked' : 'Blocked again') : i === 0 ? 'First linked action' : 'Linked action',
                  sub: `${a.code} · ${a.title.replace('encounter ', 'enc ').replace(/^Draft med list · /, '')}`,
                }))
                const target = draft.agents.find((a) => a.id === agentId)!
                if (target.pausedAt && target.pausedBy)
                  timeline.push({ at: target.pausedAt, title: `${name(target.pausedBy)} paused ${target.pause?.scope === 'activity' ? 'one activity' : 'the agent'}`, sub: target.pause ? `${target.pause.routed} drafts to pharmacists` : undefined, by: target.pausedBy })
                timeline.push({ at: draft.now, title: `${name(draft.personaId)} opened this incident`, sub: `Linked ${linked.length} ${linked.length === 1 ? 'action' : 'actions'}`, by: draft.personaId })
                timeline.sort((a, b) => a.at.localeCompare(b.at))
                draft.incidents.push({
                  id: code.toLowerCase(),
                  code,
                  title: what,
                  agentId,
                  state: 'open',
                  openedAt: draft.now,
                  openedBy: draft.personaId,
                  commanderId: target.ownerId,
                  harm: 'Under review',
                  summary: linked.length
                    ? `${target.name}: ${linked.length} ${linked.length === 1 ? 'action' : 'actions'} linked${linked[0]?.blockedBy ? `, blocked by ${linked[0].blockedBy}` : ''}, between ${linked[0]!.at.slice(11, 16)} and ${linked.at(-1)!.at.slice(11, 16)}.`
                    : `${target.name}: opened without linked actions.`,
                  linkedActionIds: actionIds.filter((id) => linked.some((a) => a.id === id)),
                  corrections: [],
                  timeline,
                })
              },
            })
          },
          addIncidentEntry: (incidentId, text) => {
            const s = get()
            const incident = s.incidents.find((i) => i.id === incidentId)
            if (!incident) return { ok: false, reason: 'Not found' }
            const what = text.trim()
            if (!what) return { ok: false, reason: 'An entry needs text' }
            return act({
              action: 'openIncident',
              ctx: { agentId: incident.agentId },
              audit: { action: 'Added incident entry', target: incident.code, reason: what },
              mutate: (draft) => {
                const name = draft.people.find((p) => p.id === draft.personaId)?.name ?? draft.personaId
                draft.incidents.find((i) => i.id === incidentId)!.timeline.push({ at: draft.now, title: what, sub: name, by: draft.personaId })
              },
            })
          },
          completeCorrection: (incidentId, correctionId) => {
            const s = get()
            const incident = s.incidents.find((i) => i.id === incidentId)
            const correction = incident?.corrections.find((c) => c.id === correctionId)
            if (!incident || !correction) return { ok: false, reason: 'Not found' }
            if (correction.done) return { ok: false, reason: 'Already done' }
            const lead = s.roles.some((r) => r.personId === s.personaId && r.role === 'programLead')
            if (s.personaId !== correction.ownerId && s.personaId !== incident.commanderId && !lead) {
              const owner = s.people.find((p) => p.id === correction.ownerId)?.name ?? 'its owner'
              return { ok: false, reason: `Only ${owner} or the commander can mark it done` }
            }
            return act({
              action: 'openIncident',
              ctx: { agentId: incident.agentId },
              audit: { action: 'Completed correction', target: incident.code, reason: correction.text },
              mutate: (draft) => {
                const target = draft.incidents.find((i) => i.id === incidentId)!.corrections.find((c) => c.id === correctionId)!
                target.done = true
                target.status = `Done ${formatClock(draft.now)}`
              },
            })
          },
          closeIncident: (incidentId, reason) => {
            const s = get()
            const incident = s.incidents.find((i) => i.id === incidentId)
            if (!incident) return { ok: false, reason: 'Not found' }
            if (incident.state === 'closed') return { ok: false, reason: 'Already closed' }
            const lead = s.roles.some((r) => r.personId === s.personaId && r.role === 'programLead')
            if (s.personaId !== incident.commanderId && !lead) {
              const commander = s.people.find((p) => p.id === incident.commanderId)?.name ?? 'The commander'
              return { ok: false, reason: `Only ${commander} (commander) or the program lead can close it` }
            }
            const open = incident.corrections.filter((c) => !c.done).length
            if (open) return { ok: false, reason: `Corrections still open (${open})` }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            return act({
              action: 'openIncident',
              ctx: { agentId: incident.agentId },
              audit: { action: 'Closed incident', target: incident.code, reason: why },
              mutate: (draft) => {
                const target = draft.incidents.find((i) => i.id === incidentId)!
                const name = draft.people.find((p) => p.id === draft.personaId)?.name ?? draft.personaId
                target.state = 'closed'
                target.closedAt = draft.now
                target.timeline.push({ at: draft.now, title: 'Incident closed', sub: name, by: draft.personaId })
              },
            })
          },
          buildExport: (input) => {
            const s = get()
            if (!input.agentIds.length) return { ok: false, reason: 'Choose at least one agent' }
            // Every agent in the export must be one whose audit trail this person may see.
            const hidden = input.agentIds.find((agentId) => !can(s, s.personaId, 'viewAudit', { agentId }))
            if (hidden) return { ok: false, reason: lockReason('viewAudit', s.personaId) }
            const code = `EXP-${String(s.exports.length + 1).padStart(4, '0')}`
            return act({
              action: 'viewAudit',
              ctx: input.agentIds.length === 1 ? { agentId: input.agentIds[0] } : undefined,
              audit: { action: 'Built export', target: code, reason: `${input.format === 'packet' ? 'PDF packet and CSV' : 'CSV'}${input.masked ? ' · identifiers masked' : ''}` },
              mutate: (draft) => {
                draft.exports.push({ id: code.toLowerCase(), code, ...input, by: draft.personaId, at: draft.now })
              },
            })
          },
          updateDivisionSettings: (divisionId, patch) => {
            const s = get()
            const division = s.divisions.find((d) => d.id === divisionId)
            if (!division) return { ok: false, reason: 'Division not found' }
            const changes = diffDivision(division, patch)
            if (!changes.length) return { ok: false, reason: 'Nothing to save' }
            const known = (id?: string) => id === undefined || s.people.some((p) => p.id === id)
            if (!known(patch.ownerId) || !known(patch.sponsorId) || !known(patch.escalation?.first) || !known(patch.escalation?.then)) return { ok: false, reason: 'Choose someone from People and roles' }
            if (patch.graceDays !== undefined && patch.graceDays < 1) return { ok: false, reason: 'The grace period is at least a day' }
            return act({
              action: 'manageDivisions',
              ctx: { divisionId },
              audit: { action: 'Changed division settings', target: division.name, reason: changes.join(' · ') },
              mutate: (draft) => {
                applyDivisionSettings(draft, divisionId, patch, draft.personaId, draft.now)
              },
            })
          },
          createDivision: (input, from) => {
            const s = get()
            const name = input.name.trim()
            const parent = from ? s.divisions.find((d) => d.id === from) : undefined
            if (from && !parent) return { ok: false, reason: 'Division not found' }
            if (!name) return { ok: false, reason: 'Name the division' }
            if (s.divisions.some((d) => d.name.toLowerCase() === name.toLowerCase() || d.id === divisionSlug(name))) return { ok: false, reason: 'A division with that name exists' }
            if (!s.people.some((p) => p.id === input.ownerId)) return { ok: false, reason: 'Choose an owner' }
            if (!s.people.some((p) => p.id === input.sponsorId)) return { ok: false, reason: 'Choose a clinical sponsor' }
            if (parent && !input.agentIds.length) return { ok: false, reason: 'Choose the agents to move' }
            if (input.agentIds.some((id) => s.agents.find((a) => a.id === id)?.divisionId !== parent?.id)) return { ok: false, reason: 'Only agents in this division can move' }
            return act({
              action: 'manageDivisions',
              audit: { action: 'Created division', target: name, ...(parent ? { reason: `Split from ${parent.name} · ${input.agentIds.length} ${input.agentIds.length === 1 ? 'agent' : 'agents'}` } : {}) },
              mutate: (draft) => {
                applyCreateDivision(draft, { ...input, name }, from ?? null, draft.personaId, draft.now)
              },
            })
          },
          addRole: (personId, input) => {
            const s = get()
            const person = s.people.find((p) => p.id === personId)
            if (!person) return { ok: false, reason: 'Person not found' }
            const divisionId = roleDivision(input)
            const division = s.divisions.find((d) => d.id === divisionId)
            if (divisionId !== 'all' && !division) return { ok: false, reason: 'Choose a division' }
            const where = division?.name ?? 'all divisions'
            if (s.roles.some((r) => r.personId === personId && r.divisionId === divisionId && r.role === input.role)) return { ok: false, reason: `${person.name} already has that role in ${where}` }
            return act({
              action: 'manageDivisions',
              audit: { action: 'Added role', target: person.name, reason: `${ROLE_LABEL[input.role]} · ${division?.name ?? 'All divisions'}` },
              mutate: (draft) => {
                applyAddRole(draft, personId, input, draft.now)
              },
            })
          },
          removeRole: (personId, input) => {
            const s = get()
            const person = s.people.find((p) => p.id === personId)
            if (!person) return { ok: false, reason: 'Person not found' }
            const divisionId = roleDivision(input)
            if (!s.roles.some((r) => r.personId === personId && r.divisionId === divisionId && r.role === input.role)) return { ok: false, reason: `${person.name} doesn’t have that role` }
            if (input.role === 'programLead' && s.roles.filter((r) => r.role === 'programLead').length === 1) return { ok: false, reason: 'Lakeshore needs a program lead' }
            const division = s.divisions.find((d) => d.id === divisionId)
            const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`)
            if (division && input.role === 'owner' && division.ownerId === personId)
              return { ok: false, reason: `${person.name} is ${possessive(division.name)} division owner. Choose another owner in Division settings first.` }
            if (division && input.role === 'sponsor' && division.sponsorId === personId)
              return { ok: false, reason: `${person.name} is ${possessive(division.name)} clinical sponsor. Choose another sponsor in Division settings first.` }
            return act({
              action: 'manageDivisions',
              audit: { action: 'Removed role', target: person.name, reason: `${ROLE_LABEL[input.role]} · ${division?.name ?? 'All divisions'}` },
              mutate: (draft) => {
                applyRemoveRole(draft, personId, input)
              },
            })
          },
          invitePerson: (input) => {
            const s = get()
            const name = input.name.trim()
            if (!name) return { ok: false, reason: 'Name the person' }
            const divisionId = roleDivision(input)
            if (divisionId !== 'all' && !s.divisions.some((d) => d.id === divisionId)) return { ok: false, reason: 'Choose a division' }
            return act({
              action: 'manageDivisions',
              audit: { action: 'Invited', target: name, reason: `${ROLE_LABEL[input.role]} · ${s.divisions.find((d) => d.id === divisionId)?.name ?? 'All divisions'}` },
              mutate: (draft) => {
                applyInvite(draft, input, draft.now)
              },
            })
          },
          flagDraft: (draftId, input) => {
            const s = get()
            const draft = s.epicDrafts.find((d) => d.id === draftId)
            if (!draft) return { ok: false, reason: 'Draft not found' }
            if (s.flags.some((f) => f.draftId === draftId && f.byId === s.personaId)) return { ok: false, reason: 'You already flagged this draft' }
            const code = `FB-${String(Math.max(0, ...s.flags.map((f) => Number(f.code.slice(3)) || 0)) + 1).padStart(4, '0')}`
            return act({
              action: 'flagDraft',
              ctx: { agentId: draft.agentId },
              audit: { action: 'Flagged from Epic', target: code, ...(input.note?.trim() ? { reason: input.note.trim() } : {}) },
              mutate: (draft) => {
                applyFlag(draft, { draftId, ...input }, draft.personaId, draft.now)
              },
            })
          },
          answerFlag: (exceptionId, answer) => {
            const { exception, error } = openException(exceptionId)
            if (!exception) return error
            const flag = get().flags.find((f) => f.exceptionId === exceptionId)
            if (!flag) return { ok: false, reason: 'Not a flag' }
            const text = answer.text.trim()
            if (!text) return { ok: false, reason: answer.kind === 'notDefect' ? 'Say why it isn’t a defect' : `Write a note for ${flag.byName}` }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: answer.kind === 'reply' ? 'Replied to flag' : answer.kind === 'inProgress' ? 'Working on a fix' : 'Not a defect', target: flag.code, reason: text },
              mutate: (draft) => {
                applyFlagAnswer(draft, exceptionId, answer, draft.personaId, draft.now)
              },
            })
          },
          startReplay: (changeId) => changeStep(changeId, 'replay', 'revalidateChange', 'Replayed build', applyReplay),
          signOffSystems: (changeId) => changeStep(changeId, 'systems', 'revalidateChange', 'Signed off systems', applySystemsSignOff),
          approveChangeHardStop: (changeId) => changeStep(changeId, 'hardStop', 'approveTools', 'Approved hard stop', applyHardStopApproval),
          acceptChange: (changeId) => {
            const s = get()
            const change = s.changes.find((c) => c.id === changeId)
            const agent = s.agents.find((a) => a.id === change?.agentId)
            if (!change || !agent) return { ok: false, reason: 'Not found' }
            if (change.status !== 'held') return { ok: false, reason: `${change.to.build} is no longer held` }
            const pending = pendingChecks(s, change)
            if (pending.length) return { ok: false, reason: `Waiting for: ${pending.join(', ')}` }
            return act({
              action: 'revalidateChange',
              ctx: { agentId: agent.id },
              audit: { action: 'Accepted build', target: `${agent.code} ${change.to.build}` },
              mutate: (draft) => {
                applyAccept(draft, changeId, draft.personaId, draft.now)
              },
            })
          },
          dismissFixNotice: (flagId) => {
            const s = get()
            const flag = s.flags.find((f) => f.id === flagId)
            if (!flag) return { ok: false, reason: 'Not found' }
            if (flag.byId !== s.personaId) return { ok: false, reason: 'Only the pharmacist who flagged it can dismiss this' }
            if (flag.status !== 'fixed' || flag.seenFixAt) return { ok: false, reason: 'Nothing to dismiss' }
            return act({
              action: 'flagDraft',
              ctx: { agentId: flag.agentId },
              audit: { action: 'Dismissed fix notice', target: flag.code },
              mutate: (draft) => {
                applySeenFix(draft, flagId, draft.now)
              },
            })
          },
          blockCaller: (callerId, reason) => decideCaller(callerId, reason, 'Blocked at the gateway', applyBlockCaller),
          dismissCaller: (callerId, reason) => decideCaller(callerId, reason, 'Not an agent', applyDismissCaller),
          messageCallerOwner: (callerId, text) => {
            const s = get()
            const caller = s.callers.find((c) => c.id === callerId)
            if (!caller) return { ok: false, reason: 'Not found' }
            if (!caller.likelyOwner) return { ok: false, reason: 'No owner to message' }
            const body = text.trim()
            if (!body) return { ok: false, reason: 'Write the message' }
            return act({
              action: 'decideCaller',
              audit: { action: 'Messaged owner', target: caller.name, reason: `${caller.likelyOwner.name} · ${body}` },
              mutate: (draft) => {
                applyMessageOwner(draft, callerId, body, draft.personaId, draft.now)
              },
            })
          },
          proposeReviewChange: (unitId, option) => {
            const s = get()
            const unit = unitById(unitId)
            if (!unit) return { ok: false, reason: 'Not found' }
            if (s.reviewChanges.some((c) => c.unitId === unitId && c.state === 'waiting'))
              return { ok: false, reason: `A change for ${unit.name} is waiting for ${s.people.find((p) => p.id === s.divisions.find((d) => d.id === unit.divisionId)?.sponsorId)?.name ?? 'the sponsor'}` }
            return act({
              action: 'proposeReviewChange',
              ctx: { divisionId: unit.divisionId },
              audit: { action: 'Proposed review change', target: unit.name, reason: option },
              mutate: (draft) => {
                applyProposeReviewChange(draft, unitId, option, draft.personaId, draft.now)
              },
            })
          },
          signReviewChange: (id) => reviewDecision(id, null),
          declineReviewChange: (id, reason) => reviewDecision(id, reason),
          shareReviewerFinding: (unitId) => {
            const unit = unitById(unitId)
            if (!unit) return { ok: false, reason: 'Not found' }
            return act({
              action: 'proposeReviewChange',
              ctx: { divisionId: unit.divisionId },
              audit: { action: 'Shared finding', target: unit.name },
              mutate: (draft) => {
                applyShareFinding(draft, unitId, draft.personaId, draft.now)
              },
            })
          },
          startOnboarding: (intakeId, { ownerId, techOwnerId }) => {
            const s = get()
            const intake = s.intakeRequests.find((r) => r.id === intakeId)
            if (!intake) return { ok: false, reason: 'Not found' }
            if (intake.startedAt || s.agents.some((a) => a.id === intake.agentId)) return { ok: false, reason: 'Already started' }
            if (!ownerId) return { ok: false, reason: 'Choose an agent owner' }
            if (!techOwnerId) return { ok: false, reason: 'Choose a technical owner' }
            return act({
              action: 'startOnboarding',
              ctx: { divisionId: intake.divisionId },
              audit: { action: 'Started onboarding', target: intake.agentCode, reason: `From ${intake.code}` },
              mutate: (draft) => {
                applyStart(draft, intakeId, { ownerId, techOwnerId }, draft.personaId, draft.now)
              },
            })
          },
          updateJob: (agentId, patch) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not onboarding' }
            if (record.frozenAt) return { ok: false, reason: 'Frozen at v1.0 · with AIMS Review' }
            const fields = (Object.keys(FIELD_NAMES) as Array<keyof typeof FIELD_NAMES>).filter((f) => Object.keys(patch).some((k) => JOB_KEY_FIELD[k] === f))
            return act({
              action: 'editJobDescription',
              ctx: { agentId },
              audit: { action: 'Edited job description', target: agent.code, reason: fields.map((f) => FIELD_NAMES[f]).join(', ') },
              mutate: (draft) => {
                applyJobEdit(draft, agentId, patch, draft.personaId, draft.now)
              },
            })
          },
          updateSystems: (agentId, change) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not onboarding' }
            if (record.frozenAt) return { ok: false, reason: 'Frozen at v1.0 · with AIMS Review' }
            if (change.verb === 'sign' || change.verb === 'order') return { ok: false, reason: 'Locked for every agent by ORG-POL-02' }
            if (change.kind === 'reason' && !record.grants.some((g) => g.system === change.system && g.verb === change.verb)) return { ok: false, reason: 'Not granted' }
            return act({
              action: 'editJobDescription',
              ctx: { agentId },
              audit: { action: 'Edited systems and verbs', target: agent.code, reason: `${change.system} · ${change.verb}${change.kind === 'grant' ? (change.on ? ' granted' : ' removed') : ' activity named'}` },
              mutate: (draft) => {
                applySystemsEdit(draft, agentId, change, draft.personaId, draft.now)
              },
            })
          },
          testHardStop: (agentId, code, casesId) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not onboarding' }
            if (record.frozenAt) return { ok: false, reason: 'Frozen at v1.0 · with AIMS Review' }
            if (!record.limits.some((l) => l.code === code)) return { ok: false, reason: 'Not found' }
            const result = testResult(s, agentId, code, casesId)
            return act({
              action: 'configureTools',
              ctx: { agentId },
              audit: { action: 'Tested hard stop', target: agent.code, reason: `${code} · would have blocked ${result.blocked} of ${result.of.toLocaleString('en-US')}` },
              mutate: (draft) => {
                applyTest(draft, agentId, code, casesId, draft.personaId, draft.now)
              },
            })
          },
          sendToSponsor: (agentId) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not onboarding' }
            if (record.sponsor.state === 'waiting') return { ok: false, reason: 'Already with the sponsor' }
            if (record.sponsor.state === 'signed') return { ok: false, reason: 'Already signed' }
            const builder = can(s, s.personaId, 'editJobDescription', { agentId })
            if (!builder && !can(s, s.personaId, 'configureTools', { agentId })) return { ok: false, reason: lockReason('configureTools', s.personaId) }
            if (!readyToSend(s, agentId)) {
              const items = recordItems(s, agentId)
              return { ok: false, reason: `${items.total - items.done - 1} items left` }
            }
            return act({
              action: builder ? 'editJobDescription' : 'configureTools',
              ctx: { agentId },
              audit: { action: 'Sent to sponsor', target: agent.code, reason: `Review: final set · v0.${record.version}` },
              mutate: (draft) => {
                applySend(draft, agentId, draft.personaId, draft.now)
              },
            })
          },
          requestSponsorChanges: (agentId, { to, about, note }) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not onboarding' }
            if (record.sponsor.state !== 'waiting') return { ok: false, reason: 'Not waiting for you' }
            const why = note.trim()
            if (!why) return { ok: false, reason: 'A note is required' }
            if (about && !record.limits.some((l) => l.code === about)) return { ok: false, reason: 'Not found' }
            // Back to the technical owner means one hard stop to re-test (1f); back to the owner means the job and reach.
            if (to === agent.techOwnerId && !about) return { ok: false, reason: 'Choose the hard stop to re-test' }
            if (to !== agent.techOwnerId && to !== agent.ownerId) return { ok: false, reason: 'Send it back to the owner or the technical owner' }
            return act({
              action: 'approveTools',
              ctx: { agentId },
              audit: { action: 'Requested changes', target: agent.code, reason: `${about ?? 'Job and reach'} · ${why}` },
              mutate: (draft) => {
                applyRequestChanges(draft, agentId, { to, ...(about ? { about } : {}), note: why }, draft.personaId, draft.now)
              },
            })
          },
          replyToSponsor: (agentId, text) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            const returned = record?.sponsor.returned
            if (!record || !agent || record.sponsor.state !== 'returned' || !returned) return { ok: false, reason: 'Nothing to reply to' }
            const what = text.trim()
            if (!what) return { ok: false, reason: 'A reply needs text' }
            if (s.personaId !== returned.to) return { ok: false, reason: `Only ${s.people.find((p) => p.id === returned.to)?.name ?? 'the person it went to'} can reply` }
            return act({
              action: returned.to === agent.techOwnerId ? 'configureTools' : 'editJobDescription',
              ctx: { agentId },
              audit: { action: 'Replied to sponsor', target: agent.code, reason: what },
              mutate: (draft) => {
                applyReply(draft, agentId, what, draft.personaId, draft.now)
              },
            })
          },
          approveAsSponsor: (agentId) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not onboarding' }
            if (record.sponsor.state !== 'waiting') return { ok: false, reason: 'Not waiting for you' }
            if (!readyToSend(s, agentId)) {
              const items = recordItems(s, agentId)
              return { ok: false, reason: `${items.total - items.done - 1} items left` }
            }
            return act({
              action: 'approveTools',
              ctx: { agentId },
              audit: { action: 'Approved as sponsor', target: agent.code, reason: `${agent.code} v1.0 · job, reach and limits` },
              mutate: (draft) => {
                applySponsorSign(draft, agentId, draft.personaId, draft.now)
              },
            })
          },
          setRiskTier: (agentId, { tier, reason }) => {
            const s = get()
            const record = s.onboardings.find((r) => r.agentId === agentId)
            const agent = s.agents.find((a) => a.id === agentId)
            if (!record || !agent) return { ok: false, reason: 'Not found' }
            if (!record.frozenAt || !record.review || record.review.tier) return { ok: false, reason: 'Not ready for a tier' }
            const why = reason?.trim() ?? ''
            if (tier !== record.review.suggestedTier && !why) return { ok: false, reason: 'A reason is required' }
            return act({
              action: 'prepareGoLive',
              ctx: { agentId },
              audit: { action: 'Set risk tier', target: agent.code, reason: `Tier ${tier}${why ? ` · ${why}` : ''}` },
              mutate: (draft) => {
                applySetTier(draft, agentId, { tier, ...(why ? { reason: why } : {}) }, draft.personaId, draft.now)
              },
            })
          },
          recordDecision: (agentId, { kind, conditions, reason }) => {
            const s = get()
            const review = s.onboardings.find((r) => r.agentId === agentId)?.review
            const agent = s.agents.find((a) => a.id === agentId)
            if (!review || !agent) return { ok: false, reason: 'Not found' }
            if (!review.packetAt || review.decision) return { ok: false, reason: 'No packet yet' }
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            if (kind === 'approveWithConditions' && !conditions.length) return { ok: false, reason: 'Add at least one condition' }
            return act({
              action: 'approveGoLive',
              ctx: { agentId },
              audit: { action: 'Recorded committee decision', target: agent.code, reason: `${DECISION_WORDS[kind]} · ${why}` },
              mutate: (draft) => {
                applyDecision(draft, agentId, { kind, conditions, reason: why }, draft.personaId, draft.now)
              },
            })
          },
          requestGoLive: (activityId) => {
            const s = get()
            const activity = s.activities.find((a) => a.id === activityId)
            const agent = s.agents.find((a) => a.id === activity?.agentId)
            if (!activity || !agent) return { ok: false, reason: 'Not found' }
            if (activity.level !== 'shadow') return { ok: false, reason: 'Not in Shadow' }
            const current = latestPrivilege(s, activityId)
            if (current?.state === 'awaiting' && current.proposedLevel) return { ok: false, reason: 'Already requested' }
            const progress = shadowProgress(s, activityId)
            if (!progress || !current) return { ok: false, reason: 'No shadow evidence yet' }
            if (!progress.done) return { ok: false, reason: 'Shadow isn’t finished' }
            return act({
              action: 'requestGoLive',
              ctx: { agentId: agent.id },
              audit: { action: 'Requested go-live', target: agent.code, reason: `${activity.name} · Shadow → Draft · ${current.code} v${current.version + 1}` },
              mutate: (draft) => {
                applyGoLiveRequest(draft, activityId, draft.personaId, draft.now)
              },
            })
          },
          extendShadow: (activityId, days = 7) => {
            const s = get()
            const activity = s.activities.find((a) => a.id === activityId)
            const agent = s.agents.find((a) => a.id === activity?.agentId)
            if (!activity || !agent || !s.scorecards.some((c) => c.activityId === activityId)) return { ok: false, reason: 'Not found' }
            const current = latestPrivilege(s, activityId)
            if (current?.state === 'awaiting' && current.proposedLevel) return { ok: false, reason: 'A go-live request is open' }
            return act({
              action: 'requestGoLive',
              ctx: { agentId: agent.id },
              audit: { action: 'Extended shadow', target: agent.code, reason: `${activity.name} · ${days} days` },
              mutate: (draft) => {
                applyExtendShadow(draft, activityId, days, draft.personaId, draft.now)
              },
            })
          },
          flagCaseLine: (caseId, line) => {
            const s = get()
            const c = s.sampleCases.find((x) => x.id === caseId)
            const agent = s.agents.find((a) => a.id === c?.agentId)
            if (!c || !agent || !c.lines[line - 1]) return { ok: false, reason: 'Not found' }
            return act({
              action: 'editJobDescription',
              ctx: { agentId: agent.id },
              audit: { action: 'Flagged for SOP', target: agent.code, reason: `Encounter ${c.encounter} · line ${line}` },
              mutate: (draft) => {
                applyFlagLine(draft, caseId, line, draft.personaId, draft.now)
              },
            })
          },
          signPrivilege: (code, { reason, accepted }) => {
            const s = get()
            const latest = latestByCode(s, code)
            const agent = s.agents.find((a) => a.id === latest?.agentId)
            if (!latest || !agent) return { ok: false, reason: 'Not found' }
            const mode = signMode(s, code)
            if (!mode) return { ok: false, reason: 'Nothing to sign' }
            if (!accepted) return { ok: false, reason: 'Tick the accountability statement' }
            const why = reason?.trim() ?? ''
            if (mode === 'sign' && criteriaStatus(s, latest.activityId).some((c) => !c.met) && !why) return { ok: false, reason: 'A written reason is required' }
            return act({
              action: 'signPrivilege',
              ctx: { agentId: agent.id },
              audit: { action: mode === 'sign' ? 'Signed privilege' : 'Renewed privilege', target: `${latest.code} v${mode === 'sign' ? latest.version : latest.version + 1}`, ...(why ? { reason: why } : {}) },
              mutate: (draft) => {
                applySignPrivilege(draft, code, why ? { reason: why } : {}, draft.personaId, draft.now)
              },
            })
          },
          returnPrivilegeRequest: (code, note) => {
            const s = get()
            const latest = latestByCode(s, code)
            const agent = s.agents.find((a) => a.id === latest?.agentId)
            if (!latest || !agent) return { ok: false, reason: 'Not found' }
            if (signMode(s, code) !== 'sign') return { ok: false, reason: 'Nothing to send back' }
            const why = note.trim()
            if (!why) return { ok: false, reason: 'A note is required' }
            return act({
              action: 'signPrivilege',
              ctx: { agentId: agent.id },
              audit: { action: 'Returned go-live request', target: `${latest.code} v${latest.version}`, reason: why },
              mutate: (draft) => {
                applyReturnRequest(draft, code, why, draft.personaId, draft.now)
              },
            })
          },
          askForEvidence: (code) => {
            const s = get()
            const latest = latestByCode(s, code)
            const agent = s.agents.find((a) => a.id === latest?.agentId)
            if (!latest || !agent) return { ok: false, reason: 'Not found' }
            if (s.exceptions.some((e) => e.type === `Evidence for the ${latest.code} review` && e.state !== 'resolved' && e.state !== 'dismissed')) return { ok: false, reason: 'Already asked' }
            return act({
              action: 'signPrivilege',
              ctx: { agentId: agent.id },
              audit: { action: 'Asked for evidence', target: latest.code },
              mutate: (draft) => {
                applyAskEvidence(draft, code, draft.personaId, draft.now)
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
