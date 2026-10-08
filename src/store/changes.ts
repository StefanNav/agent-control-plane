import type { ChangeDef } from '../data/seed/catalogue'
import type { Change, ChangeCheck, DemoState } from '../data/types'
import { addDays, addMinutes, formatDate } from '../lib/clock'
import { raiseItem, resolveItems } from './onboarding'
import { personName } from './onboardingRules'

/** A change's id: 'chg-med-rec-v1-5-0'. */
export const changeId = (agentId: string, build: string) => `chg-${agentId}-${build.replace(/\./g, '-')}`

/** The checks in 9a's order, with who does each. */
export const CHECK_ORDER: ChangeCheck[] = ['replay', 'hardStop', 'systems']

/** "Replay matches or beats v1.3.0", "Approve HS-04 v3", "Sign off Epic sig read". */
export function checkLabel(c: Change, check: ChangeCheck) {
  if (check === 'replay') return `Replay matches or beats ${c.from.build}`
  if (check === 'hardStop') return `Approve ${c.hardStop?.code} v${c.hardStop?.to}`
  return c.systems?.check ?? 'Sign off the systems change'
}

/** Who does a check: the sponsor approves the hard stop; the owner replays and signs off (9a). */
export function checkPerson(s: DemoState, c: Change, check: ChangeCheck) {
  const agent = s.agents.find((a) => a.id === c.agentId)!
  return check === 'hardStop' ? agent.sponsorId : agent.ownerId
}

/** The checks this change needs, from the items it changes. */
export const checksOf = (c: Change) => CHECK_ORDER.filter((k) => c.items.some((i) => i.needs === k))

/** Checks still open, as "Approve HS-04 v3 · Priya". */
export function pendingChecks(s: DemoState, c: Change) {
  return checksOf(c)
    .filter((k) => !c.checks[k])
    .map((k) => `${checkLabel(c, k)} · ${personName(s, checkPerson(s, c, k))}`)
}

const REVALIDATE = 'Re-validation needed'
const hardStopItem = (c: Change) => `Review: ${c.hardStop?.code} v${c.hardStop?.to}`

/**
 * A new build reaches the gateway (9a): it is held, live traffic stays on the registered build, the
 * shadow scorecards restart on it, and the owner (copying the sponsor and the program lead) and the
 * sponsor are told. The open flags it fixes are listed from its reason (R12).
 */
export function applyDeploy(s: DemoState, def: ChangeDef, at: string, by: string): DemoState {
  const agent = s.agents.find((a) => a.id === def.agentId)
  if (!agent) return s
  const hs = s.hardStops.find((h) => h.agentId === agent.id && h.code === def.hardStop.code)
  const sop = agent.sop ?? ''
  const id = changeId(agent.id, def.build)
  const link = { label: 'Open changes', to: `/operations/agents/${agent.id}?tab=changes` }
  const told = addMinutes(at, 1)
  const deadline = addDays(at, 7)
  const lead = s.roles.find((r) => r.role === 'programLead')?.personId
  const item = raiseItem(s, {
    agentId: agent.id,
    type: REVALIDATE,
    reason: `${def.build} is held at the gateway. Live traffic stays on ${agent.version} until you re-validate.`,
    action: `re-validate ${def.build}`,
    actionSub: 'replay, sign-offs, then accept',
    ownerId: agent.ownerId,
    copied: [agent.sponsorId, ...(lead ? [lead] : [])],
    link,
    at: told,
    deadline,
  })
  if (hs) {
    raiseItem(s, {
      agentId: agent.id,
      type: `Review: ${hs.code} v${hs.version + 1}`,
      reason: `${personName(s, by)} changed ${hs.code} for ${def.build}: ${def.hardStop.heldSub}.`,
      action: `approve ${hs.code} v${hs.version + 1}`,
      actionSub: def.hardStop.blocked,
      ownerId: agent.sponsorId,
      copied: [agent.ownerId],
      link,
      at: told,
      deadline,
    })
  }
  // The board shows the agent waiting on its owner while the build is held (9a).
  if (agent.judgment.status === 'normal') agent.judgment = { status: 'review', label: REVALIDATE }
  const restarted = s.activities.filter((a) => a.agentId === agent.id && a.level === 'shadow').map((a) => a.id)
  for (const card of s.scorecards) if (restarted.includes(card.activityId)) card.restartedOn = { build: def.build, at }
  const change: Change = {
    id,
    agentId: agent.id,
    from: { build: agent.version, builtAt: def.liveBuiltAt, sop, sopAt: def.liveSopAt },
    to: { build: def.build, builtAt: def.builtAt, builtBy: def.builtBy, sop: def.sop },
    deployedAt: at,
    deployedBy: by,
    deadline,
    items: [
      { item: 'Agent build', live: agent.version, liveSub: `built ${formatDate(def.liveBuiltAt)}`, held: def.build, heldSub: `built ${formatDate(def.builtAt)} by ${personName(s, def.builtBy)}`, needs: 'replay' },
      { item: 'SOP', live: `SOP ${sop}`, liveSub: `signed ${formatDate(def.liveSopAt)}`, held: `SOP ${def.sop}`, heldSub: `${def.sopDiff.length} sections changed`, needs: 'replay' },
      ...(hs ? [{ item: 'Hard stop' as const, live: `${hs.code} v${hs.version}`, liveSub: hs.title, held: `${hs.code} v${hs.version + 1}`, heldSub: def.hardStop.heldSub, needs: 'hardStop' as const }] : []),
      { item: 'Systems', live: def.systems.live, liveSub: def.systems.liveSub, held: def.systems.held, heldSub: def.systems.heldSub, needs: 'systems' },
    ],
    sopDiff: def.sopDiff,
    ...(hs ? { hardStop: { code: hs.code, title: hs.title, from: hs.version, to: hs.version + 1, removed: hs.text, added: def.hardStop.added, blocked: def.hardStop.blocked } } : {}),
    systems: { system: def.systems.system, detail: def.systems.detail, check: def.systems.check },
    replay: { cases: def.replay.cases, estimate: def.replay.estimate, lines: def.replay.lines },
    checks: {},
    releaseNote: { by: def.builtBy, text: def.releaseNote },
    fixes: s.flags.filter((f) => f.agentId === agent.id && f.reason === def.fixesReason && (f.status === 'sent' || f.status === 'inProgress')).map((f) => f.id),
    timeline: [
      { at, title: `${def.build} deployed`, sub: `Build fingerprint differs from registered ${agent.version}` },
      { at, title: 'Held at the gateway', sub: `Traffic stays on ${agent.version}` },
      { at: told, title: `Told ${[agent.ownerId, agent.sponsorId, ...(lead ? [lead] : [])].map((p) => personName(s, p)).join(', ')}`, sub: item.code },
    ],
    restarted,
    status: 'held',
  }
  s.changes.push(change)
  return s
}

const held = (s: DemoState, id: string) => s.changes.find((c) => c.id === id && c.status === 'held')

/** "Start replay": the demo clock doesn't run, so the replay finishes at once with its result (R10). */
export function applyReplay(s: DemoState, id: string, by: string, at: string): DemoState {
  const c = held(s, id)
  if (!c) return s
  c.replay.result = { at, by, lines: c.replay.lines }
  c.checks.replay = { at, by }
  return s
}

/** The owner signs off the systems change. */
export function applySystemsSignOff(s: DemoState, id: string, by: string, at: string): DemoState {
  const c = held(s, id)
  if (c) c.checks.systems = { at, by }
  return s
}

/** The sponsor approves the new hard-stop version; her review item closes. */
export function applyHardStopApproval(s: DemoState, id: string, by: string, at: string): DemoState {
  const c = held(s, id)
  if (!c) return s
  c.checks.hardStop = { at, by }
  resolveItems(s, c.agentId, hardStopItem(c), by, at, 'Approved')
  return s
}

/**
 * Accepting is the re-validation (R10): the agent runs the new build and SOP, the hard stop moves to
 * its new version, the systems grant widens, the flags the build fixes are fixed, and the items close.
 */
export function applyAccept(s: DemoState, id: string, by: string, at: string): DemoState {
  const c = held(s, id)
  const agent = s.agents.find((a) => a.id === c?.agentId)
  if (!c || !agent) return s
  agent.version = c.to.build
  agent.sop = c.to.sop
  if (c.hardStop) {
    const hs = s.hardStops.find((h) => h.agentId === agent.id && h.code === c.hardStop!.code)
    if (hs) Object.assign(hs, { version: c.hardStop.to, text: c.hardStop.added, approvedBy: c.checks.hardStop?.by ?? hs.approvedBy, approvedAt: c.checks.hardStop?.at ?? at })
  }
  if (c.systems) {
    const grant = s.grants.find((g) => g.agentId === agent.id && g.system === c.systems!.system)
    if (grant) grant.detail = c.systems.detail
  }
  for (const f of s.flags) if (c.fixes.includes(f.id)) Object.assign(f, { status: 'fixed', fixedIn: c.to.build, fixedAt: at })
  Object.assign(c, { status: 'accepted', closedAt: at, closedBy: by })
  c.timeline.push({ at, title: `${c.to.build} accepted`, sub: `${personName(s, by)} · every activity runs ${c.to.build}` })
  resolveItems(s, agent.id, REVALIDATE, by, at, `Accepted ${c.to.build}`)
  resolveItems(s, agent.id, hardStopItem(c), by, at, `Accepted ${c.to.build}`)
  clearRevalidation(s, agent.id)
  return s
}

/** Once a held build is accepted or withdrawn, the agent no longer waits on re-validation. */
function clearRevalidation(s: DemoState, agentId: string) {
  const agent = s.agents.find((a) => a.id === agentId)
  if (agent?.judgment.label === REVALIDATE) agent.judgment = { status: 'normal', label: 'Within scope' }
}

/** A held build not accepted within 7 days is removed; the live build keeps running (9a). Idempotent. */
export function withdrawExpiredChanges(s: DemoState): DemoState {
  for (const c of s.changes) {
    if (c.status !== 'held' || c.deadline > s.now) continue
    Object.assign(c, { status: 'withdrawn', closedAt: c.deadline })
    c.timeline.push({ at: c.deadline, title: `${c.to.build} withdrawn`, sub: `Not accepted in 7 days · ${c.from.build} keeps running` })
    resolveItems(s, c.agentId, REVALIDATE, 'gateway', c.deadline, 'Withdrawn')
    resolveItems(s, c.agentId, hardStopItem(c), 'gateway', c.deadline, 'Withdrawn')
    clearRevalidation(s, c.agentId)
    for (const card of s.scorecards) if (c.restarted.includes(card.activityId)) delete card.restartedOn
  }
  return s
}
