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
  /** When it was given (8b "since Mar 2026"). */
  since: string
}

/** Status-chip states: colour + shape + word. */
export type Status = 'normal' | 'review' | 'warn' | 'crit' | 'stale' | 'shadow' | 'paused'

/** Autonomy levels, lowest to highest. */
export type Level = 'shadow' | 'draft' | 'supervised' | 'autonomous'

/** Where an agent is in its life. */
export type Lifecycle = 'onboarding' | 'inReview' | 'live' | 'paused' | 'disabled' | 'retired'

/** Risk tier set in AIMS Review (2b): 1 Low, 2 Moderate, 3 High, 4 Critical. */
export type Tier = 1 | 2 | 3 | 4

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

/**
 * What happens when a privilege's review date passes (8a): the exception only; back to Shadow
 * after the grace period; back to Shadow at once; or pause the activity.
 */
export type LapsePolicy = 'nothing' | 'shadow' | 'shadowNow' | 'pause'

/** Who an unanswered exception reaches: `first` past its deadline, `then` too after `afterHours` more (8a). */
export interface EscalationChain {
  first: string
  then: string
  afterHours: number
}

/** A group of agents in one workflow, led by named humans. */
export interface Division {
  id: string
  name: string
  ownerId: string
  sponsorId: string
  lapsePolicy: LapsePolicy
  /** Days after the review date before `shadow` acts (8a "Grace period"). */
  graceDays: number
  escalation: EscalationChain
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
  riskTier: Tier
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
  /** Work in flight, for the pause impact preview (6b). Derived from `metrics.day` when absent. */
  queue?: { inProgress: number; awaitingReview: number; perHour: number }
  /** Set while paused by a person (6b–6e); `pausedBy`/`pausedAt` say who and when. */
  pause?: PauseDetail
  /** Disabled: access revoked, record live (6f). */
  disabled?: { at: string; by: string; reason: string }
  /** Retired for good: archived, off every board (6f). */
  retirement?: { at: string; by: string; code: string; reason: string }
}

/** What a pause covered and what to restore on resume. */
export interface PauseDetail {
  scope: 'activity' | 'agent' | 'division'
  /** For an activity-scope pause. */
  activityId?: string
  reason?: string
  /** Drafts in progress routed back to pharmacists. */
  routed: number
  /** The judgment to restore when both people approve a resume. */
  wasJudgment: Judgment
  /** What changed since the pause, for the approver (6e). */
  changes?: { title: string; sub: string; meta: string }[]
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
  /** Paused on its own while the rest of the agent keeps working (6b "This activity"). */
  paused?: boolean
}

/** Lifecycle of a privilege record. */
export type PrivilegeState = 'awaiting' | 'active' | 'due' | 'lapsed' | 'steppedDown' | 'closed'

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
  /** The sponsor's written reason when signing below target (3c). */
  signReason?: string
  /** When the division's lapse policy acted on it (8a): back to Shadow, or the activity paused. */
  lapsedAt?: string
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
  kind: 'review' | 'question' | 'notify' | 'incident' | 'flag'
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
  /** Where the work lives, for hand-offs that aren't about the agent's behaviour (onboarding, signatures). */
  link?: { label: string; to: string }
  outcome?: string
  outcomeSub?: string
  closedAt?: string
  /** Who resolved or dismissed it; absent on seed items, which the owner closed. */
  closedBy?: string
  dismissReason?: string
  escalatedTo?: string
  /** For items about a unit rather than an agent (11b): the division whose roles they follow. */
  divisionId?: string
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
  /** "7f3a·c210" (7b). */
  sopHash?: string
  actingFor: string
  /** Rule tag of the policy that blocked part of it, if any. */
  blockedBy?: string
  /** "Signed as is", "Edited 1 line, signed", "Waiting for review" */
  reviewerOutcome: string
  /** The rules in force when it ran, so the audit reads it as it happened (7a, 7b). */
  context?: { privilege: string; checks: number; conditions: string[] }
  steps: TraceStep[]
}

/** A draft as the pharmacist sees it in Epic (E10, the neutral stand-in). */
export interface EpicDraft {
  /** 'DR-88412' */
  id: string
  agentId: string
  build: string
  draftedAt: string
  patient: { name: string; age: number; sex: 'F' | 'M'; mrn: string; unit: string; bed: string; allergy: string; admittedAt: string }
  lines: {
    /** 'Metoprolol tartrate 25 mg'; `form` is shown after it ('tab'). */
    med: string
    form: string
    dose: string
    route: string
    frequency: string
    lastTaken: string
    /** 'Outside fill' with `sourceAt`, or 'Admission interview'. */
    source: string
    sourceAt?: string
    edit?: { field: 'frequency' | 'dose'; from: string; to: string; by: string }
  }[]
  sources: string
  did: string
  /** The agent's trace for this draft. */
  actionId: string
}

export type FlagReason = 'frequency' | 'dose' | 'missed' | 'duplicate' | 'other'

/** A pharmacist's flag on a draft, sent from Epic to the agent's owner (E10). */
export interface Flag {
  id: string
  /** 'FB-2291' */
  code: string
  draftId: string
  agentId: string
  /** A persona who flagged it; other pharmacists are named only. */
  byId?: string
  byName: string
  unit: string
  at: string
  reason: FlagReason
  title: string
  note?: string
  edit?: { med: string; field: string; from: string; to: string }
  status: 'sent' | 'inProgress' | 'fixed' | 'notDefect'
  progress?: string
  notDefect?: string
  fixedIn?: string
  fixedAt?: string
  reply?: { by: string; text: string; at: string }
  /** When the pharmacist dismissed "Your flag led to a fix" (10b). */
  seenFixAt?: string
  exceptionId?: string
}

/** A caller seen at the gateway using hospital credentials with no registry record (E9.2, 9b). */
export interface GatewayCaller {
  id: string
  name: string
  /** "Entra app · client 7f3a…c21", "API key · issued to Emergency". */
  credential: string
  firstSeen: string
  lastCall: string
  calls7d: number
  reaches: string[]
  likelyOwner: { name: string; sub: string } | null
  /** What it does, read from its traffic. */
  does?: string
  patientData?: { flag: string; note: string }
  registeredBy?: string
  /** An approved intake it looks like. */
  intakeId?: string
  /** Who may rely on it, for the caution next to "Block at the gateway". */
  reliance?: string
  group: 'unregistered' | 'lowVolume' | 'dismissed'
  decision?: { kind: 'blocked' | 'notAgent' | 'onboarding'; reason?: string; by: string; at: string; agentId?: string }
  messages: { by: string; text: string; at: string }[]
}

/** A sampling or review-level change for a unit, proposed by the owner and signed by the sponsor (11b). */
export interface ReviewChange {
  id: string
  unitId: string
  option: 'sampling' | 'tighten' | 'minTime'
  by: string
  at: string
  state: 'waiting' | 'signed' | 'declined'
  decidedBy?: string
  decidedAt?: string
  reason?: string
  /** Signed changes run 14 days. */
  until?: string
}

/** An informational event: kept in the log, never sent to anyone. */
export interface LogEvent {
  id: string
  at: string
  agentId?: string
  text: string
  sub?: string
  /** People this was sent to, for FYIs ("Priya told"). */
  to?: string[]
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

/** An incident record (7c): who runs it, what happened, why, and what is being fixed. */
export interface Incident {
  id: string
  code: string
  title: string
  agentId: string
  state: 'open' | 'corrections' | 'closed'
  openedAt: string
  openedBy: string
  commanderId: string
  harm: string
  summary: string
  linkedActionIds: string[]
  rootCause?: { text: string; by: string }
  corrections: { id: string; text: string; sub?: string; ownerId: string; done: boolean; status: string }[]
  timeline: { at: string; title: string; sub?: string; by?: string }[]
  closedAt?: string
}

/** Where an agent may work: units, patients and hours (1a, 1b). */
export interface Domain {
  units: string[]
  patients: string
  hours: string
}

/**
 * An approved request for a new agent (Inventory → Intake). Approval reserves the agent's id
 * and code; starting onboarding creates that agent and carries the request's fields over (1a).
 */
export interface IntakeRequest {
  id: string
  code: string
  title: string
  divisionId: string
  requestedBy: string
  approvedAt: string
  agentId: string
  agentCode: string
  agentName: string
  /** The clinical sponsor named on the request. */
  sponsorId: string
  purpose: string
  domain: Domain
  /** A condition the committee set when it approved the intake. */
  condition?: { text: string; at: string }
  /** Risk-tier findings that only the request knows (2b). */
  patientImpact: string
  volume: string
  startedAt?: string
}

/** The job description being written (1b). Targets are keyed by the template's criterion ids. */
export interface JobDraft {
  purpose: string
  /** `short` names the activity in a privilege title, e.g. "admission med rec" (3c). */
  activities: { id: string; name: string; branch: string; short?: string }[]
  /** What the agent must never do, in plain words; the ORG-POL-02 line is implicit. */
  never: string[]
  actingFor: string | null
  escalation: string[]
  targets: Record<string, number | null>
  domain: Domain
}

/** What a grant serves: one activity's id, every activity, or escalation messages. */
export type GrantPurpose = string

/** One ticked cell of the systems grid during onboarding (1c), with the activity it serves. */
export interface OnboardingGrant {
  system: string
  verb: Verb
  /** null until Marcus names the activity it serves (1c "choose activity"). */
  activity: GrantPurpose | null
  why: string
  added: string
}

/** A test of a hard stop on past traffic (1d, 1g). */
export interface LimitTest {
  at: string
  by: string
  blocked: number
  of: number
  /** A named case set from the catalogue (the 1g re-test); absent = the last 30 days. */
  casesId?: string
  examples: { date: string; unit: string; text: string; trace: string }[]
}

/** A hard stop drawn from the never list, enforced at the gateway once approved (1d). */
export interface Limit {
  code: string
  version: number
  title: string
  text: string
  /** The never-list item it came from. */
  from: string
  /** A library rule id; absent = written in plain language. */
  library?: string
  ownerId: string
  test?: LimitTest
  /** The test before the latest one (1g "Last result"). */
  previousTest?: LimitTest
  /** Sent back by the sponsor for another look (1f, 1g). */
  reopened?: { by: string; at: string }
}

/** The clinical sponsor's review of the final set (1e–1g). */
export interface SponsorReview {
  state: 'notSent' | 'waiting' | 'returned' | 'signed'
  /** How many times the set has been sent. */
  round: number
  sentAt?: string
  sentBy?: string
  /** While returned: who it went back to, about what, and why. */
  returned?: { to: string; about?: string; note: string; at: string; reply?: { text: string; at: string } }
  signedAt?: string
  /** Earlier rounds: changes asked for and resets, for the record (1h). */
  earlier: { at: string; kind: 'returned' | 'reset'; to?: string; about?: string; note: string; casesId?: string }[]
}

/** A condition the committee puts on every privilege it applies to (2c, 2d). */
export interface Condition {
  id: string
  text: string
  appliesTo: string
  /** The activities it binds; empty = every activity. */
  activityIds: string[]
  checkedBy: string
  /** Added to a privilege's domain, e.g. "excluding dialysis (C3)". */
  domainNote?: string
}

/** The AI review board's decision (2c), logged with its reason (2d). */
export interface ReviewDecision {
  kind: 'approve' | 'approveWithConditions' | 'reReview' | 'deny'
  conditions: Condition[]
  reason: string
  by: string
  at: string
  /** "5 of 7 board members present". */
  present?: string
}

/** AIMS Review after onboarding: tier, packet, decision and shadow (E2). */
export interface AimsReview {
  suggestedTier: Tier
  tier?: Tier
  tierReason?: string
  tierAt?: string
  tierBy?: string
  packetAt?: string
  /** The board meeting that decides it. */
  meeting: string
  agendaItem?: { item: number; of: number }
  proposedConditions: Condition[]
  decision?: ReviewDecision
  shadowFrom?: string
  shadowDays: number
}

/** One agent's onboarding record, intake to "ready for review", then AIMS Review (E1, E2). */
export interface Onboarding {
  agentId: string
  intakeId: string
  startedAt: string
  startedBy: string
  /** Minor version: every saved edit adds one; the sponsor's signature makes it 10 (v1.0). */
  version: number
  savedAt: string
  /** Set when the sponsor signs; the record no longer changes. */
  frozenAt?: string
  job: JobDraft
  grants: OnboardingGrant[]
  limits: Limit[]
  sponsor: SponsorReview
  review?: AimsReview
  /** When each owner's part was finished, and by whom. */
  done: Partial<Record<'intake' | 'job' | 'systems' | 'tools', { at: string; by: string }>>
  /** Who did what; `decision` entries form the decision log (2d). */
  history: { at: string; by: string; text: string; sub?: string; decision?: boolean }[]
}

/** Shadow results for one activity against the job's success criteria (3a). */
export interface Scorecard {
  activityId: string
  from: string
  to: string
  cases: number
  /** By criterion id: the result over the period and its daily values, oldest first. */
  results: Record<string, { value: number; trend: number[] }>
  /** `fix`: what extending shadow would fix first, e.g. "the name mapping" (3a). */
  causes: { label: string; count: number; example: string; fix?: string }[]
  hardStopNote?: string
  sampleCaseIds: string[]
  extendedDays?: number
  /** A new build restarted this shadow scorecard (9a, R10). */
  restartedOn?: { build: string; at: string }
}

/** What a change needs before it serves: a replay, the sponsor's hard-stop approval, the owner's systems sign-off. */
export type ChangeCheck = 'replay' | 'hardStop' | 'systems'

/** A new build held at the gateway until its owner re-validates it (E9.1, 9a). */
export interface Change {
  id: string
  agentId: string
  from: { build: string; builtAt: string; sop: string; sopAt: string }
  to: { build: string; builtAt: string; builtBy: string; sop: string }
  deployedAt: string
  deployedBy: string
  /** Withdrawn if not accepted by then (deploy + 7 days). */
  deadline: string
  items: { item: 'Agent build' | 'SOP' | 'Hard stop' | 'Systems'; live: string; liveSub: string; held: string; heldSub: string; needs: ChangeCheck }[]
  sopDiff: { section: string; title: string; removed?: string; kept?: string; added: string }[]
  hardStop?: { code: string; title: string; from: number; to: number; removed: string; added: string; blocked: string }
  systems?: { system: string; detail: string; check: string }
  /** The result lines are the build's; the demo clock doesn't run, so the replay finishes at once (R10). */
  replay: { cases: number; estimate: string; lines: string[]; result?: { at: string; by: string; lines: string[] } }
  checks: Partial<Record<ChangeCheck, { at: string; by: string }>>
  releaseNote: { by: string; text: string }
  /** Flag ids this build fixes. */
  fixes: string[]
  timeline: { at: string; title: string; sub: string }[]
  /** Shadow activities whose scorecards restarted on the held build. */
  restarted: string[]
  status: 'held' | 'accepted' | 'withdrawn'
  closedAt?: string
  closedBy?: string
}

/** One shadow case compared line by line with the pharmacist's final list (3b). */
export interface SampleCase {
  id: string
  encounter: string
  agentId: string
  activityId: string
  unit: string
  admittedAt: string
  mrn: string
  age: number
  draftAt: string
  finalBy: string
  finalAt: string
  traceId?: string
  lines: { agent: string | null; pharmacist: string | null; result: 'agrees' | 'inaccurate' | 'omitted'; note?: string; source: string }[]
  notes: { line: number; title: string; text: string }[]
}

/** A records export built for a survey or audit (7d). */
export interface ExportRecord {
  id: string
  code: string
  agentIds: string[]
  from: string
  to: string
  format: 'packet' | 'csv'
  masked: boolean
  by: string
  at: string
  /** What it was for: "Mock survey", "RUAIH evidence packet" (12a, 12b). */
  note?: string
}

/** The seven elements of the Joint Commission and CHAI RUAIH guidance, by number (E12). */
export type RuaihElement = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** An element an agent's records don't cover yet, with an owner and a due date (12a). */
export interface RuaihGap {
  agentId: string
  element: RuaihElement
  /** 12a's line, e.g. "No patient-facing notice that an agent drafts the medication list". */
  text: string
  /** 12b's shorter line, e.g. "No patient-facing notice yet"; defaults to `text`. */
  short?: string
  ownerId: string
  due: string
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
  incidents: Incident[]
  intakeRequests: IntakeRequest[]
  onboardings: Onboarding[]
  scorecards: Scorecard[]
  sampleCases: SampleCase[]
  exports: ExportRecord[]
  /** Drafts in the Epic stand-in (E10). */
  epicDrafts: EpicDraft[]
  /** Pharmacists' flags from Epic (E10). */
  flags: Flag[]
  /** New builds held at the gateway, and their outcome (E9.1). */
  changes: Change[]
  /** Callers seen at the gateway without a registry record (E9.2). */
  callers: GatewayCaller[]
  /** Sampling and review-level changes proposed for units (11b). */
  reviewChanges: ReviewChange[]
  /** Hospital-wide counts before today's activity (4f "Last 24 hours"); `actionsToday` for 7a. */
  stats24h: {
    closedEarlier: number
    medianCloseMin: number
    lastHour: { hardStops: number; pauses: number; pages: number }
    actionsToday: number
  }
  audit: AuditEntry[]
}
