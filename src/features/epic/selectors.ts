import type { DemoState, Flag } from '../../data/types'
import { addDays, formatClock, formatDate } from '../../lib/clock'
import { FLAG_REASONS, reasonFromEdit, shortName } from '../../store/feedback'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'

/** Whose Epic the stand-in shows: the viewer if they're a pharmacist, else Ana's (R13). */
const PHARMACIST = 'ana'

const STATUS_RANK: Record<Flag['status'], number> = { fixed: 0, inProgress: 1, sent: 2, notDefect: 3 }

const when = (iso: string) => `${formatDate(iso)} ${formatClock(iso)}`

/**
 * The Epic stand-in (10a, 10b): today's draft as Epic shows it, and our panel on the right with the
 * agent's draft, the pharmacist's edits, the flag form and their flags.
 */
export function selectEpic(s: DemoState, viewerId: string) {
  const draft = s.epicDrafts.filter((d) => d.draftedAt <= s.now).sort((a, b) => b.draftedAt.localeCompare(a.draftedAt))[0]
  const agent = s.agents.find((a) => a.id === draft?.agentId)
  if (!draft || !agent) return null
  const canFlag = can(s, viewerId, 'flagDraft', { agentId: agent.id })
  const pharmacistId = canFlag ? viewerId : PHARMACIST
  const owner = personName(s, agent.ownerId)
  const p = draft.patient
  const edited = draft.lines.filter((l) => l.edit)
  const mine = edited.find((l) => l.edit!.by === pharmacistId)
  const flagOf = (f: Flag) => ({
    code: f.code,
    title: f.title,
    status: f.status === 'fixed' ? `Fixed in ${f.fixedIn}` : f.status === 'inProgress' ? `In progress · ${owner}` : f.status === 'sent' ? `Sent · ${owner}` : 'Not a defect',
    note: f.status === 'inProgress' ? f.progress : f.status === 'notDefect' ? f.notDefect : undefined,
    mark: f.status,
  })
  const since = addDays(s.now, -30)
  const flags = s.flags
    .filter((f) => f.byId === pharmacistId && f.at >= since)
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.at.localeCompare(a.at))
  const flagged = s.flags.find((f) => f.draftId === draft.id && f.byId === pharmacistId)
  const action = s.actions.find((a) => a.id === draft.actionId)
  // A build accepted in the last 30 days is named on the draft (10b "Drafted by Med Rec Agent v1.5.0").
  const recent = s.changes.some((c) => c.agentId === agent.id && c.status === 'accepted' && c.closedAt && c.closedAt >= since)
  // "Your flag led to a fix" (10b): the newest fixed flag the pharmacist hasn't dismissed.
  const fixed = flags.filter((f) => f.status === 'fixed' && !f.seenFixAt).sort((a, b) => (b.fixedAt ?? '').localeCompare(a.fixedAt ?? ''))[0]
  const change = fixed ? s.changes.find((c) => c.fixes.includes(fixed.id)) : undefined
  const others = change ? new Set(s.flags.filter((f) => change.fixes.includes(f.id) && f.byName !== fixed!.byName).map((f) => f.byName)).size : 0
  const live = change?.closedAt ?? fixed?.fixedAt
  const mineEdited = draft.lines.some((l) => l.edit?.by === pharmacistId)
  return {
    draftId: draft.id,
    patient: {
      name: p.name,
      facts: [`${p.age} y · ${p.sex}`, `MRN ${p.mrn}`, `${p.unit} · ${p.bed}`, `Allergy: ${p.allergy}`, `Admitted ${when(p.admittedAt)}`],
    },
    subline: `Drafted by ${agent.name}${recent ? ` ${draft.build}` : ''} at ${formatClock(draft.draftedAt)} · review each line before you verify`,
    rows: draft.lines.map((l) => ({
      med: `${l.med} ${l.form}`,
      dose: l.dose,
      route: l.route,
      frequency: l.edit?.field === 'frequency' ? l.edit.to : l.frequency,
      was: l.edit?.from,
      editedByYou: Boolean(l.edit && l.edit.by === pharmacistId),
      lastTaken: when(l.lastTaken),
      source: l.sourceAt ? `${l.source} ${formatDate(l.sourceAt)}` : l.source,
    })),
    panel: {
      agent: agent.name,
      build: draft.build,
      sub: `Draft for this admission · ${draft.id} · ${formatClock(draft.draftedAt)}`,
      sources: draft.sources,
      did: draft.did,
      edits: edited.length ? `${edited.length} · ${edited.map((l) => `${l.med.split(' ')[0]!.toLowerCase()} ${l.edit!.field}`).join(', ')}` : 'None',
    },
    form: {
      to: `Flag this draft to ${owner}`,
      edit: mine ? { title: `${mine.med} · ${mine.edit!.field}`, from: mine.edit!.from, to: mine.edit!.to } : null,
      reason: reasonFromEdit(mine?.edit),
      footer: `Sends the draft, your edit and the agent’s trace to ${owner}’s inbox. You stay in Epic.`,
    },
    reasons: Object.entries(FLAG_REASONS).map(([value, label]) => ({ value: value as keyof typeof FLAG_REASONS, label })),
    flags: { head: `Your flags · ${flags.length}`, items: flags.map(flagOf) },
    fix: fixed
      ? {
          flagId: fixed.id,
          code: fixed.code,
          title: fixed.title,
          line: `Fixed in ${fixed.fixedIn}${live ? `, live since ${formatDate(live)}` : ''}.${others ? ` ${others} other ${others === 1 ? 'pharmacist' : 'pharmacists'} flagged the same thing.` : ''}`,
          quote: fixed.reply ? `${personName(s, fixed.reply.by)}: “${fixed.reply.text}”` : null,
          changed: change ? [change.releaseNote.text, ...change.sopDiff.map((d) => `SOP ${change.to.sop} ${d.section}: ${d.added}`)] : [],
        }
      : null,
    /** 10b: a draft the pharmacist hasn't edited is summarised instead of its sources and edits. */
    thisDraft: mineEdited ? null : `Drafted by ${draft.build} · ${draft.lines.length} medications · no edits yet`,
    flagged: flagged ? { code: flagged.code, confirm: `Flag ${flagged.code} sent to ${owner}. You’ll see here when it leads to a fix.` } : null,
    canFlag,
    readOnlyNote: canFlag ? null : `Viewing ${shortName(personName(s, PHARMACIST))}’s Epic stand-in. Only pharmacists flag drafts here.`,
    trace: (action?.steps ?? []).map((t) => ({ at: t.at.slice(11, 19), title: t.title, detail: t.detail, ruleTag: t.ruleTag })),
  }
}
