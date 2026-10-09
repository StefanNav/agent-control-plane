import { TIER_RULES } from '../../data/seed/catalogue'
import type { DemoState, Level, Status } from '../../data/types'
import { formatAgo, formatClock, formatDate } from '../../lib/clock'
import { nextArchiveCode } from '../../store/mutations'
import { conditionRange, firstMissingField, openStep, recordItems } from '../../store/onboardingRules'
import { onBoard, personName, recordLabel, selectAgentRows, selectDivisionSummaries } from '../board/selectors'

const LEVEL: Record<Level, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

export type InventoryTab = 'agents' | 'drafts' | 'intake' | 'retired'

export interface InventoryAgentRow {
  id: string
  name: string
  division: string
  level: string
  /** Paused or disabled agents show their level as a chip (8c: Prior Auth "Paused"). */
  levelStatus: Status | null
  status: Status
  label: string
  sponsor: string
  tier: string
  review: string
}

/** Inventory (8c, 1i): governance records, the board's live judgment on the same row. */
export function selectInventory(s: DemoState) {
  const byId = new Map(s.agents.map((a) => [a.id, a]))
  const divisionName = (id: string) => s.divisions.find((d) => d.id === id)?.name ?? ''
  // Same order as the board: divisions needing a human first, agents judgment first.
  const agents: InventoryAgentRow[] = selectDivisionSummaries(s).flatMap((d) =>
    selectAgentRows(s, d.id).map((row) => {
      const a = byId.get(row.id)!
      const stopped = a.lifecycle === 'paused' || a.lifecycle === 'disabled'
      return {
        id: a.id,
        name: a.name,
        division: d.name,
        level: a.lifecycle === 'disabled' ? 'Disabled' : a.lifecycle === 'paused' ? 'Paused' : LEVEL[a.level],
        levelStatus: stopped ? 'paused' : null,
        status: a.judgment.status,
        label: recordLabel(a.judgment.label),
        sponsor: personName(s, a.sponsorId),
        tier: `Tier ${a.riskTier}`,
        review: formatDate(a.reviewDate),
      }
    }),
  )
  const retired = s.agents
    .filter((a) => a.retirement)
    .sort((a, b) => b.retirement!.at.localeCompare(a.retirement!.at))
    .map((a) => ({ id: a.id, code: a.retirement!.code, name: a.name, division: divisionName(a.divisionId), at: formatDate(a.retirement!.at), by: personName(s, a.retirement!.by), reason: a.retirement!.reason }))
  // Drafts are onboarding records still in progress (1i); a record leaves when the sponsor signs.
  const drafts = s.onboardings
    .filter((r) => !r.frozenAt)
    .flatMap((r) => {
      const agent = byId.get(r.agentId)
      const open = openStep(s, r.agentId)
      const intake = s.intakeRequests.find((i) => i.id === r.intakeId)
      if (!agent || !open) return []
      const items = recordItems(s, r.agentId)
      return [
        {
          id: r.agentId,
          agentId: r.agentId,
          name: agent.name,
          division: divisionName(agent.divisionId),
          request: intake?.code ?? '',
          step: `${open.number} · ${open.name}`,
          stepSub: open.missing.join(', '),
          waitingOn: personName(s, open.waitingOn),
          waitingOnId: open.waitingOn,
          progress: `${items.done} of ${items.total}`,
          items,
          lastChange: `${formatDate(r.savedAt)} ${formatClock(r.savedAt)}`,
          field: open.step === 'job' ? firstMissingField(s, r.agentId) : null,
          stepId: open.step,
        },
      ]
    })
  const intake = s.intakeRequests.filter((r) => !r.startedAt).map((r) => ({ id: r.id, agentId: r.agentId, code: r.code, title: r.title, division: divisionName(r.divisionId), requestedBy: personName(s, r.requestedBy), approved: formatDate(r.approvedAt) }))
  return {
    counts: { agents: s.agents.filter(onBoard).length, drafts: drafts.length, intake: intake.length, retired: retired.length },
    agents,
    drafts,
    intake,
    retired,
  }
}

/** The board's decision on the record, e.g. "Approved with C1–C3 · 14 Oct" (8c). */
function committeeLine(s: DemoState, agentId: string): string {
  const decision = s.onboardings.find((r) => r.agentId === agentId)?.review?.decision
  if (!decision) return '—'
  const label = { approve: 'Approved', approveWithConditions: `Approved with ${conditionRange(decision.conditions.map((c) => c.id))}`, reReview: 'Re-review', deny: 'Denied' }[decision.kind]
  return `${label} · ${formatDate(decision.at)}`
}

/** "One record: governance and operations" (8c). */
export function selectRecord(s: DemoState, agentId: string) {
  const a = s.agents.find((x) => x.id === agentId)
  if (!a) return null
  const active = s.privileges.filter((p) => p.agentId === agentId && p.state !== 'closed')
  const levels = (['autonomous', 'supervised', 'draft', 'shadow'] as Level[])
    .map((l) => [l, active.filter((p) => p.level === l).length] as const)
    .filter(([, n]) => n)
    .map(([l, n]) => `${n} ${LEVEL[l]}`)
  const main = active.find((p) => p.level === a.level && p.reviewDate) ?? active.find((p) => p.reviewDate)
  return {
    id: a.id,
    name: a.name,
    lifecycle: a.lifecycle,
    governance: [
      ['Record', `${a.code} · v1.0`],
      ['Risk tier', `Tier ${a.riskTier} · ${TIER_RULES[a.riskTier].label}`],
      ['Committee', committeeLine(s, a.id)],
      ['Privileges', levels.length ? levels.join(' · ') : 'None active'],
      ['Next review', main?.reviewDate ? `${formatDate(main.reviewDate)} ${main.reviewDate.slice(0, 4)}` : '—'],
    ] as [string, string][],
    operations: {
      status: a.judgment.status,
      label: recordLabel(a.judgment.label),
      build: `${a.version}${a.sop ? ` · SOP ${a.sop}` : ''}`,
      lastData: `${formatClock(a.monitor.lastSeen)} · ${formatAgo(a.monitor.lastSeen, s.now)}`,
    },
  }
}

/** What disabling or retiring does (6f), counted from the record. */
export function selectRetirePreview(s: DemoState, agentId: string) {
  const grants = s.grants.filter((g) => g.agentId === agentId).flatMap((g) => Object.values(g.cells)).filter((c) => c === 'granted' || c === 'changed').length
  const active = s.privileges.filter((p) => p.agentId === agentId && p.state !== 'closed')
  const tools = grants ? `Revokes ${grants} gateway tools and the agent’s credentials` : 'Revokes the agent’s gateway credentials; it has no tool grants'
  const privileges = active.length
    ? `Closes ${active.length} ${active.length === 1 ? 'privilege' : 'privileges'}, ${active.map((p) => `${p.code} (${LEVEL[p.level]})`).join(', ')}`
    : 'Closes no privileges; none are active'
  return {
    lines: [tools, privileges, `Archives the record under ${nextArchiveCode(s)}; still searchable in audit and exports`, 'Moves it to Inventory → Retired; it leaves every board'],
    disableLines: [tools, `Keeps ${active.length} ${active.length === 1 ? 'privilege' : 'privileges'} and the record; restoring access goes back through tool approval`, 'Stays on the boards, marked Disabled'],
  }
}
