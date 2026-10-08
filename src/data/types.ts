/**
 * Domain model for the mock hospital (spec §6.1). Later phases append their own
 * types here and to `DemoState`, bumping SEED_VERSION in src/data/seed/index.ts.
 * Times are local, timezone-free ISO strings, e.g. '2026-12-08T09:52:00'.
 */

/** The seven personas a visitor can view the prototype as. */
export type PersonaId = 'dana' | 'priya' | 'marcus' | 'sam' | 'drlee' | 'ana' | 'jordan'

/** Every PersonaId, for validating saved state. */
export const PERSONA_IDS: readonly PersonaId[] = ['dana', 'priya', 'marcus', 'sam', 'drlee', 'ana', 'jordan']

/** Roles from the PRD permission matrix; assigned per division. */
export type Role = 'programLead' | 'sponsor' | 'owner' | 'techOwner' | 'committee' | 'readOnly' | 'frontline'

/** A named human. Personas use their PersonaId as id; other people use lowercase ids. */
export interface Person {
  id: string
  name: string
  initial: string
  title: string
}

/** One role held by one person, in one division or across all of them. */
export interface RoleAssignment {
  personId: string
  divisionId: string | 'all'
  role: Role
}

/** Status-chip states: colour + shape + word. */
export type Status = 'normal' | 'review' | 'warn' | 'crit' | 'stale' | 'shadow' | 'paused'

/** Autonomy levels, lowest to highest. */
export type Level = 'shadow' | 'draft' | 'supervised' | 'autonomous'

/** Where an agent is in its life. */
export type Lifecycle = 'onboarding' | 'inReview' | 'live' | 'paused' | 'disabled' | 'retired'

/** The board's judgment of an agent against its job description. */
export interface Judgment {
  status: Status
  label: string
  ruleTag?: string
}

/** Seed for the design's 7-day sparkline (see src/lib/trend.ts). */
export interface Trend {
  end: number
  drift: number
}

/** Last-24h quality and volume. `null` renders as "—" (withdrawn when monitoring is stale). */
export interface AgentMetrics {
  day: number | null
  signedAsIs: number | null
  edited: number | null
  blocked: number | null
  trend: Trend
  /** Rejected share; when absent, derived as 100 − signed − edited. */
  rejected?: number
  /** Actions in the last 7 days; when absent, derived from `day`. */
  weekActions?: number
}

/** When monitoring last heard from an agent and how often it should. */
export interface MonitorState {
  lastSeen: string
  expectedIntervalMin: number
}

/** A group of agents in one workflow, led by named humans. */
export interface Division {
  id: string
  name: string
  ownerId: string
  sponsorId: string
  lapsePolicy: 'nothing' | 'shadow' | 'pause'
  monitor: { state: 'live' | 'delayed' | 'stale'; lastAt: string }
  /** Open exceptions per day over the last 7 days, oldest first (the board's "7 days" column). */
  exceptionsByDay: number[]
  /** Exceptions closed this week, for quiet divisions ("1 closed this week"). */
  closedThisWeek?: number
  /** Last page sent for this division (4a). */
  page?: { at: string; ackAt?: string; who: string }
  incidentId?: string
  /** One-line consequence shown on the board, e.g. "9 drafts went to the auth team". */
  note?: string
  /** Who must co-sign a resume, e.g. ['Tom', 'Nina']. */
  resumeNeeds?: string[]
}

/** An AI agent registered in AIMS. */
export interface Agent {
  id: string
  code: string
  name: string
  version: string
  sop?: string
  platform: string
  divisionId: string
  ownerId: string
  techOwnerId: string
  sponsorId: string
  riskTier: 1 | 2 | 3
  lifecycle: Lifecycle
  /** Level of its main activity, as shown in board rows. */
  level: Level
  grantorId: string
  reviewDate: string
  judgment: Judgment
  metrics: AgentMetrics
  monitor: MonitorState
  pausedBy?: string
  pausedAt?: string
  /** Gateway node the agent's traffic passes through. */
  gateway?: string
  /** Today so far, for the agent view (4c). */
  today?: { drafts: number; expected: number }
  /** When the board last judged the agent. */
  judgedAt?: string
}

/** One distinct job an agent does; autonomy is granted per activity. */
export interface Activity {
  id: string
  agentId: string
  name: string
  level: Level
  reviewLevel: 'tightened' | 'normal' | 'reduced'
  branches: { id: string; name: string; favourable: boolean }[]
  /** Today's volume line, e.g. "96 drafts" or "41 in shadow". */
  today?: string
}

/** Lifecycle of a privilege record. */
export type PrivilegeState = 'awaiting' | 'active' | 'due' | 'lapsed' | 'steppedDown'

/** A signed grant for one activity at one level, in one domain. */
export interface Privilege {
  id: string
  code: string
  version: number
  activityId: string
  agentId: string
  level: Level
  proposedLevel?: Level
  domain: string
  conditions: string[]
  evidence: string
  grantedBy?: string
  grantedAt?: string
  /** Absent for Shadow privileges, which have no review date. */
  reviewDate?: string
  state: PrivilegeState
  stepDownTriggers: string[]
  movedBy?: string
  trigger?: string
}

/** A rule enforced at the gateway, outside the model. */
export interface HardStop {
  id: string
  code: string
  version: number
  title: string
  text: string
  ownerId: string
  approvedBy: string
  approvedAt: string
  agentId: string
  blocks30d: number
  actions30d: number
  firedToday: number
}

/** Advisory text in the agent's prompt; never safety-critical. */
export interface Instruction {
  id: string
  agentId: string
  text: string
  ownerId: string
  editedAt: string
  sopVersion: string
}

/** What an agent may do in a system. */
export type Verb = 'read' | 'draft' | 'write' | 'submit' | 'sign' | 'order'

/** State of one systems × verbs cell. */
export type GrantCell = 'granted' | 'none' | 'changed' | 'locked'

/** One row of the systems × verbs grid. */
export interface SystemGrant {
  agentId: string
  system: string
  detail: string
  cells: Record<Verb, GrantCell>
}

/** Lifecycle of an exception in the inbox. */
export type ExceptionState = 'new' | 'claimed' | 'overdue' | 'resolved' | 'dismissed'

/** The richer content behind an exception in the inbox detail (5a, 5d). */
export interface ExceptionDetail {
  headline: string
  trendLabel?: string
  /** Daily values, oldest first. */
  trend?: number[]
  target?: number
  breakdownLabel?: string
  breakdown?: { label: string; count: number }[]
  cause?: string
  timeline?: { at: string; title: string; sub?: string }[]
  silence?: string
  /** A rule change the dismiss dialog offers alongside (5b). */
  tune?: { label: string; help: string }
}

/** Anything that needs a person: an action, an owner and a deadline. */
export interface AgentException {
  id: string
  code: string
  status: Status
  /** PRD exception types. */
  kind: 'review' | 'question' | 'notify' | 'incident'
  type: string
  reason: string
  /** Board phrasing, e.g. "3 drafts held by HS-04 v2". */
  short?: string
  /** The hospital exception list's reason when it differs from the inbox (4f). */
  boardReason?: string
  /** The wall display's trimmed phrasing (4e), e.g. "edit rate 19.2 %". */
  wallShort?: string
  agentId: string
  ruleTag?: string
  /** Who raised a question, if a person did. */
  from?: string
  raisedAt: string
  action: string
  actionSub: string
  ownerId: string
  /** People kept informed; it shows under their "Waiting on others". */
  copied: string[]
  claimedAt?: string
  /** When someone handed it to a new owner; an assigned item is no longer escalated. */
  assignedAt?: string
  deadline: string
  state: ExceptionState
  snoozedUntil?: string
  incidentId?: string
  detail?: ExceptionDetail
  route: 'page' | 'inbox' | 'digest' | 'log'
  outcome?: string
  outcomeSub?: string
  closedAt?: string
  /** Who resolved or dismissed it; absent on seed items, which the owner closed. */
  closedBy?: string
  dismissReason?: string
  escalatedTo?: string
}

/** Kinds of step on an action trace. */
export type TraceStepKind = 'input' | 'tool' | 'policyPassed' | 'policyBlocked' | 'output' | 'reviewer'

/** One step of an action, timestamped to the millisecond. */
export interface TraceStep {
  at: string
  kind: TraceStepKind
  title: string
  ruleTag?: string
  detail?: string
  meta?: string
}

/** One thing an agent did or tried, replayable step by step. */
export interface AgentAction {
  id: string
  code: string
  /** When it happened. */
  at: string
  title: string
  agentId: string
  agentVersion: string
  sop: string
  actingFor: string
  /** Rule tag of the policy that blocked part of it, if any. */
  blockedBy?: string
  /** "Signed as is", "Edited 1 line, signed", "Waiting for review" */
  reviewerOutcome: string
  steps: TraceStep[]
}

/** An informational event: kept in the log, never sent to anyone. */
export interface LogEvent {
  id: string
  at: string
  agentId?: string
  text: string
  sub?: string
}

/** A change from yesterday, summarised in the daily digest. */
export interface ChangeEvent {
  id: string
  at: string
  text: string
  sub: string
}

/** A request to resume a paused agent; needs owner and sponsor. */
export interface ResumeRequest {
  agentId: string
  requestedBy: string
  requestedAt: string
  reason: string
  approvals: { personId: string; reason: string; at: string }[]
}

/** One logged change: who, what, when, and why. */
export interface AuditEntry {
  id: string
  at: string
  who: PersonaId
  action: string
  target: string
  reason?: string
}

/** Everything the prototype knows. Persisted, versioned, replaceable by scenarios. */
export interface DemoState {
  version: number
  now: string
  personaId: PersonaId
  people: Person[]
  roles: RoleAssignment[]
  divisions: Division[]
  agents: Agent[]
  activities: Activity[]
  privileges: Privilege[]
  hardStops: HardStop[]
  instructions: Instruction[]
  grants: SystemGrant[]
  exceptions: AgentException[]
  actions: AgentAction[]
  resumeRequests: ResumeRequest[]
  logEvents: LogEvent[]
  changeEvents: ChangeEvent[]
  /** Hospital-wide counts before today's activity (4f "Last 24 hours"). */
  stats24h: { closedEarlier: number; medianCloseMin: number; lastHour: { hardStops: number; pauses: number; pages: number } }
  audit: AuditEntry[]
}
