import type { AgentAction, DemoState, EpicDraft, Flag, FlagReason } from '../data/types'
import { addDays } from '../lib/clock'
import { nextCode, nextExceptionCode } from './mutations'
import { personName } from './onboardingRules'

/** 10a's "What went wrong" chips. */
export const FLAG_REASONS: Record<FlagReason, string> = {
  frequency: 'Frequency wrong',
  dose: 'Wrong dose',
  missed: 'Missed medication',
  duplicate: 'Duplicate',
  other: 'Other',
}

/** "Picked from your edit" (10a): a frequency edit means the frequency was wrong, and so on. */
export function reasonFromEdit(edit: { field: string } | undefined): FlagReason {
  if (edit?.field === 'frequency') return 'frequency'
  if (edit?.field === 'dose') return 'dose'
  return 'other'
}

/** A flag's title: the pharmacist's note when they wrote one, else the reason and the medication (R13). */
export const flagTitle = (reason: FlagReason, med: string | undefined, note?: string) =>
  note?.trim() || [FLAG_REASONS[reason], med].filter(Boolean).join(' · ')

/** Flag codes continue from the highest one ever used (FB-2290 → FB-2291, R2). */
export const nextFlagCode = (s: DemoState) => nextCode(s.flags.map((f) => f.code), 'FB-', 4)

/** "Ana R." from "Ana R., PharmD": pharmacists sign flags without their credential. */
export const shortName = (name: string) => name.split(',')[0]!.trim()

/** The edit this person made to the draft, if any, as a flag carries it. */
export function editBy(draft: EpicDraft, personId: string) {
  const line = draft.lines.find((l) => l.edit?.by === personId)
  return line?.edit ? { med: line.med, field: line.edit.field, from: line.edit.from, to: line.edit.to } : undefined
}

/**
 * Ana flags a draft from Epic in one action (10a): the flag carries her edit and goes to the agent's
 * owner as an inbox item with the draft and the trace (R14).
 */
export function applyFlag(s: DemoState, input: { draftId: string; reason: FlagReason; note?: string }, byId: string, at: string): DemoState {
  const draft = s.epicDrafts.find((d) => d.id === input.draftId)
  const agent = s.agents.find((a) => a.id === draft?.agentId)
  if (!draft || !agent) return s
  const code = nextFlagCode(s)
  const edit = editBy(draft, byId)
  const byName = shortName(personName(s, byId))
  const note = input.note?.trim() || undefined
  const title = flagTitle(input.reason, edit?.med, note)
  const exceptionCode = nextExceptionCode(s)
  const what = [FLAG_REASONS[input.reason], edit?.med, edit ? `${edit.from} → ${edit.to}` : null, note].filter(Boolean).join(' · ')
  s.exceptions.push({
    id: exceptionCode.toLowerCase(),
    code: exceptionCode,
    status: 'review',
    kind: 'flag',
    type: 'Flag from Epic',
    reason: `${byName} flagged ${draft.id}: ${what}`,
    short: 'flag from Epic',
    agentId: agent.id,
    ruleTag: code,
    from: byName,
    raisedAt: at,
    action: `answer ${byName}’s flag`,
    actionSub: `${draft.id} · ${draft.patient.unit}`,
    ownerId: agent.ownerId,
    copied: [],
    deadline: `${addDays(at, 1).slice(0, 10)}T17:00:00`,
    state: 'new',
    route: 'inbox',
    detail: {
      headline: `${byName} flagged ${draft.id} from Epic`,
      timeline: [{ at, title: 'Flagged from Epic', sub: `${byName} · ${draft.patient.unit}` }],
    },
  })
  const flag: Flag = {
    id: code.toLowerCase(),
    code,
    draftId: draft.id,
    agentId: agent.id,
    byId,
    byName,
    unit: draft.patient.unit,
    at,
    reason: input.reason,
    title,
    ...(note ? { note } : {}),
    ...(edit ? { edit } : {}),
    status: 'sent',
    exceptionId: exceptionCode.toLowerCase(),
  }
  s.flags.push(flag)
  return s
}

export type FlagAnswer = { kind: 'inProgress' | 'notDefect' | 'reply'; text: string }

/** The owner answers a flag (R14): a fix in progress or not a defect closes the item; a reply doesn't. */
export function applyFlagAnswer(s: DemoState, exceptionId: string, answer: FlagAnswer, by: string, at: string): DemoState {
  const item = s.exceptions.find((e) => e.id === exceptionId)
  const flag = s.flags.find((f) => f.exceptionId === exceptionId)
  if (!item || !flag) return s
  const text = answer.text.trim()
  if (answer.kind === 'reply') {
    flag.reply = { by, text, at }
    return s
  }
  if (answer.kind === 'inProgress') Object.assign(flag, { status: 'inProgress', progress: text })
  else Object.assign(flag, { status: 'notDefect', notDefect: text })
  Object.assign(item, { state: 'resolved', outcome: answer.kind === 'inProgress' ? 'Working on a fix' : 'Not a defect', outcomeSub: text, closedAt: at, closedBy: by })
  return s
}

/** A new draft reaches the pharmacist's worklist (10b, scenario only), with its trace. */
export function applyAddEpicDraft(s: DemoState, draft: EpicDraft, action?: AgentAction): DemoState {
  if (!s.epicDrafts.some((d) => d.id === draft.id)) s.epicDrafts.push(structuredClone(draft))
  if (action && !s.actions.some((a) => a.id === action.id)) s.actions.push(structuredClone(action))
  return s
}

/** The pharmacist dismisses "Your flag led to a fix" (10b); the flag stays in their list. */
export function applySeenFix(s: DemoState, flagId: string, at: string): DemoState {
  const flag = s.flags.find((f) => f.id === flagId)
  if (flag) flag.seenFixAt = at
  return s
}
