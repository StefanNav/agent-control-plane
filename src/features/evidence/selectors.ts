import {
  MAPPING_RULES,
  PSO_REPORT,
  RUAIH_BASE,
  RUAIH_CHIPS,
  RUAIH_DEFAULT,
  RUAIH_DEFAULT_CHIPS,
  RUAIH_ELEMENTS,
  RUAIH_FEATURED,
  RUAIH_GAPS,
  RUAIH_MAPPED_AT,
  SURVEY_OPENS,
} from '../../data/seed/evidence'
import type { Agent, DemoState, RuaihElement, RuaihGap } from '../../data/types'
import { dayGap, formatDate } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { onBoard } from '../board/selectors'

export type RuaihCell = { count: number } | { gap: RuaihGap }

const LEVELS = ['shadow', 'draft', 'supervised', 'autonomous'] as const

const inScope = (s: DemoState) => s.agents.filter(onBoard)
const gapsOf = (s: DemoState) => {
  const ids = new Set(inScope(s).map((a) => a.id))
  return RUAIH_GAPS.filter((g) => ids.has(g.agentId)).map((g, i) => ({ g, i })).sort((a, b) => a.g.due.localeCompare(b.g.due) || a.i - b.i).map(({ g }) => g)
}
const packets = (s: DemoState) => s.exports.filter((e) => e.format === 'packet')
const elementName = (n: RuaihElement) => RUAIH_ELEMENTS.find((e) => e.n === n)!.name

/** Records the state made since the mapping was taken: flags (5), accepted re-validations and step-downs (4) (R4). */
function liveRecords(s: DemoState, agentId: string, element: RuaihElement): number {
  if (element === 5) return s.flags.filter((f) => f.agentId === agentId && f.at >= RUAIH_MAPPED_AT).length
  if (element === 4)
    return (
      s.changes.filter((c) => c.agentId === agentId && c.status === 'accepted' && (c.closedAt ?? '') >= RUAIH_MAPPED_AT).length +
      s.stepDowns.filter((d) => d.agentId === agentId && d.at >= RUAIH_MAPPED_AT).length
    )
  return 0
}

/** One cell of 12a: an open gap, or the records mapped (the mapping's count plus what came since). */
export function ruaihCell(s: DemoState, agentId: string, element: RuaihElement): RuaihCell {
  const gap = RUAIH_GAPS.find((g) => g.agentId === agentId && g.element === element)
  if (gap) return { gap }
  const base = (RUAIH_BASE[agentId] ?? RUAIH_DEFAULT)[element - 1]!
  return { count: base + liveRecords(s, agentId, element) }
}

/** "Medications", or "Patient messages · Shadow" for an agent still in shadow (12a's rows). */
const divisionLine = (s: DemoState, a: Agent) => `${s.divisions.find((d) => d.id === a.divisionId)?.name ?? ''}${a.level === 'shadow' ? ' · Shadow' : ''}`

const row = (s: DemoState, a: Agent) => ({
  agentId: a.id,
  name: a.name,
  sub: divisionLine(s, a),
  cells: RUAIH_ELEMENTS.map((e) => ruaihCell(s, a.id, e.n)),
})

const gapView = (s: DemoState, g: RuaihGap) => ({
  agentId: g.agentId,
  element: `${g.element} · ${elementName(g.element)}`,
  due: formatDate(g.due),
  agent: s.agents.find((a) => a.id === g.agentId)?.name ?? g.agentId,
  text: g.text,
  owner: `Owner ${personName(s, g.ownerId)}`,
})

const exportView = (s: DemoState, e: DemoState['exports'][number]) => ({
  id: e.id,
  code: e.code,
  at: formatDate(e.at),
  scope: e.agentIds.length === 1 ? (s.agents.find((a) => a.id === e.agentIds[0])?.name ?? e.agentIds[0]!) : `${e.agentIds.length} agents`,
  note: e.note ?? 'Records export',
  by: personName(s, e.by),
})

/** 12a: every agent on the boards against the seven elements, the open gaps and the last export. */
export function selectCoverage(s: DemoState, viewerId: string) {
  const agents = inScope(s)
  const featured = RUAIH_FEATURED.map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => Boolean(a))
  const rest = agents.filter((a) => !RUAIH_FEATURED.includes(a.id))
  const gaps = gapsOf(s)
  const divisions = new Set(agents.map((a) => a.divisionId)).size
  const total = agents.length * RUAIH_ELEMENTS.length
  const last = [...packets(s)].sort((a, b) => b.at.localeCompare(a.at))[0]
  const owners = new Set(gaps.map((g) => g.ownerId)).size
  const lead = s.roles.find((r) => r.role === 'programLead')?.personId
  return {
    viewerId,
    breadcrumb: 'Reports / RUAIH evidence',
    title: 'RUAIH evidence',
    status: `Survey window opens ${formatDate(SURVEY_OPENS)} · ${dayGap(s.now, SURVEY_OPENS)} days`,
    sub: 'Each agent’s records mapped to the seven elements of the Joint Commission and CHAI guidance on the Responsible Use of AI in Healthcare.',
    stats: [
      { label: 'Agents in scope', value: String(agents.length), sub: `${divisions} divisions` },
      { label: 'Elements covered', value: `${total - gaps.length} of ${total}`, sub: `${RUAIH_ELEMENTS.length} elements × ${agents.length} agents` },
      { label: 'Open gaps', value: String(gaps.length), sub: `${owners} owners, all dated` },
      { label: 'Last export', value: last ? formatDate(last.at) : '—', sub: last ? (last.note ?? `By ${personName(s, last.by)}`) : 'None yet' },
    ],
    elements: RUAIH_ELEMENTS,
    rows: featured.map((a) => row(s, a)),
    more: { count: rest.length, rows: rest.map((a) => row(s, a)) },
    gaps: gaps.map((g) => gapView(s, g)),
    foot: `RUAIH is voluntary guidance, not a scored accreditation standard. Lakeshore’s mapping rules decide which records count for each element; ${personName(s, lead)} owns them.`,
    tabs: { gaps: gaps.length, exports: packets(s).length },
    exports: [...packets(s)].sort((a, b) => b.at.localeCompare(a.at)).map((e) => exportView(s, e)),
    rules: MAPPING_RULES.map((r) => ({ element: `${r.element} · ${elementName(r.element)}`, records: r.records })),
  }
}

/** The privilege in force for the agent's highest activity: "PRV-0142 v3". */
function privilegeChip(s: DemoState, agentId: string): string | null {
  const live = s.privileges.filter((p) => p.agentId === agentId && p.state !== 'closed' && p.state !== 'awaiting')
  const top = [...live].sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || a.code.localeCompare(b.code) || b.version - a.version)[0]
  return top ? `${top.code} v${top.version}` : null
}

/** 12b's records for one element: the mapping's own, then what the state holds (R5). */
function chips(s: DemoState, a: Agent, element: RuaihElement): string[] {
  const own = (RUAIH_CHIPS[a.id] ?? RUAIH_DEFAULT_CHIPS)[element] ?? []
  switch (element) {
    case 1: {
      const jd = own.length ? own : a.judgment.ruleTag?.startsWith('JD ') ? [a.judgment.ruleTag] : []
      const decision = s.onboardings.find((r) => r.agentId === a.id)?.review?.decision
      return [...jd, privilegeChip(s, a.id), decision ? `Board minutes ${formatDate(decision.at)}` : null].filter((c): c is string => Boolean(c))
    }
    case 4:
      return [
        'Weekly scorecard',
        ...s.stepDowns.filter((d) => d.agentId === a.id).map((d) => `Step-down ${formatDate(d.at)}`),
        ...s.changes.filter((c) => c.agentId === a.id && c.status === 'accepted').map((c) => `Re-validation ${c.to.build}`),
      ]
    case 5: {
      const flags = s.flags.filter((f) => f.agentId === a.id).sort((x, y) => x.code.localeCompare(y.code))
      const latest = flags.at(-1)
      const fired = s.hardStops.filter((h) => h.agentId === a.id && h.firedToday > 0).map((h) => `${h.code} fired × ${h.firedToday}`)
      return [...(latest ? [flags.length > 1 ? `${latest.code} + ${flags.length - 1} flags` : latest.code] : []), ...fired, PSO_REPORT]
    }
    case 6:
      return [`Risk tier ${a.riskTier}`, ...own]
    default:
      return own
  }
}

/** 12b: one agent's packet, element by element, with any gap listed rather than hidden. */
export function selectAgentEvidence(s: DemoState, agentId: string) {
  const a = s.agents.find((x) => x.id === agentId)
  if (!a || !onBoard(a)) return null
  const rows = RUAIH_ELEMENTS.map((e) => {
    const cell = ruaihCell(s, a.id, e.n)
    const gap = 'gap' in cell ? cell.gap : null
    return {
      n: e.n,
      name: e.name,
      chips: chips(s, a, e.n),
      ...(gap ? { gapLine: `${gap.short ?? gap.text} · ${personName(s, gap.ownerId)} · due ${formatDate(gap.due)}` } : {}),
      status: gap ? ('gap' as const) : ('covered' as const),
    }
  })
  const division = s.divisions.find((d) => d.id === a.divisionId)
  const mine = packets(s).filter((e) => e.agentIds.includes(a.id))
  return {
    agentId: a.id,
    divisionId: a.divisionId,
    breadcrumb: `Reports / RUAIH evidence / ${a.name}`,
    title: a.name,
    status: `${rows.filter((r) => r.status === 'covered').length} of ${rows.length} elements covered`,
    idLine: `${a.code} · ${division?.name ?? ''}`,
    rows,
    exports: mine.length,
    exportRows: [...mine].sort((x, y) => y.at.localeCompare(x.at)).map((e) => exportView(s, e)),
  }
}

/** About how long and how big a packet is: an invented formula that gives Med Rec's 214 pages over 12 months (R7). */
export function packetEstimate(agents: number, months: number) {
  const pages = agents * Math.round(40 + 14.5 * months)
  return { pages, minutes: Math.max(1, Math.round(pages / 100)) }
}
