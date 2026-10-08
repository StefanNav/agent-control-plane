import type { Change, ChangeCheck, DemoState } from '../../data/types'
import { formatClock, formatDate } from '../../lib/clock'
import { checkLabel, checkPerson, checksOf, pendingChecks } from '../../store/changes'
import { personName } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'

const NEEDS: Record<ChangeCheck, string> = { replay: 'Replay', hardStop: 'Approval', systems: 'Sign-off' }
const LEVEL: Record<string, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

const stamp = (iso: string) => `${formatDate(iso)} ${formatClock(iso)}`

/** The agent's change to show: a held one first, else the latest. */
export function currentChange(s: DemoState, agentId: string): Change | undefined {
  const mine = s.changes.filter((c) => c.agentId === agentId)
  return mine.find((c) => c.status === 'held') ?? mine.at(-1)
}

/** 9a: the Changes tab and the agent header while a new build is held at the gateway. */
export function selectChanges(s: DemoState, agentId: string, viewerId: string) {
  const c = currentChange(s, agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!c || !agent) return null
  const name = (id: string | undefined) => personName(s, id)
  const held = c.status === 'held'
  const { build: from } = c.from
  const { build: to } = c.to
  const today = c.deployedAt.slice(0, 10) === s.now.slice(0, 10)
  const owner = can(s, viewerId, 'revalidateChange', { agentId })
  const pending = pendingChecks(s, c)
  // The release note names the newest flag it fixes, then counts the rest by unit (9a).
  const fixes = s.flags.filter((f) => c.fixes.includes(f.id)).sort((a, b) => b.at.localeCompare(a.at))
  const others = fixes.slice(1)
  const units = [...new Set(others.map((f) => f.unit))].sort()
  return {
    changeId: c.id,
    status: c.status,
    tabLabel: held ? `Changes · ${c.items.length}` : 'Changes',
    header: held ? { status: `${to} held at the gateway`, idLine: `${from} live · ${agent.code}`, chip: 'Re-validation needed' } : null,
    notice: held
      ? {
          lead: `${to} is held at the gateway.`,
          text: `${name(c.deployedBy)} deployed it at ${formatClock(c.deployedAt)} ${today ? 'today' : `on ${formatDate(c.deployedAt)}`}. Live traffic stays on ${from} until you re-validate, so nothing from ${to} reaches pharmacists before then.`,
        }
      : c.status === 'accepted'
        ? { lead: `${to} accepted by ${name(c.closedBy)} on ${stamp(c.closedAt!)}.`, text: `Every activity runs ${to}.` }
        : { lead: `${to} was withdrawn on ${formatDate(c.closedAt!)}.`, text: `It wasn’t accepted in 7 days; ${from} kept running.` },
    tableHead: `What changed · ${from} → ${to}`,
    columns: ['Item', `${from} · live`, `${to} · held`, 'Needs'],
    rows: c.items.map((i) => ({ ...i, needs: `${NEEDS[i.needs]} · ${name(checkPerson(s, c, i.needs))}` })),
    sop: { head: `SOP ${c.from.sop} → ${c.to.sop}`, count: `${c.sopDiff.length} sections`, sections: c.sopDiff },
    hardStop: c.hardStop
      ? {
          code: c.hardStop.code,
          title: c.hardStop.title,
          chip: c.checks.hardStop ? `Approved · ${name(c.checks.hardStop.by)}` : `Waiting for ${name(agent.sponsorId)}`,
          approved: Boolean(c.checks.hardStop),
          from: `v${c.hardStop.from}`,
          to: `v${c.hardStop.to}`,
          removed: c.hardStop.removed,
          added: c.hardStop.added,
          foot: `Enforced at the gateway · owner ${name(agent.techOwnerId)} · approver ${name(agent.sponsorId)} · ${c.hardStop.blocked}`,
        }
      : null,
    revalidate: {
      title: `Re-validate ${to}`,
      sub: `Replay the last 30 days on ${to} and compare every result with ${from}.`,
      cases: c.replay.cases.toLocaleString('en-US'),
      estimate: c.replay.estimate,
    },
    checks: checksOf(c).map((k) => {
      const person = checkPerson(s, c, k)
      const done = c.checks[k]
      const allowed = k === 'hardStop' ? can(s, viewerId, 'approveTools', { agentId }) : owner
      return {
        id: k,
        label: checkLabel(c, k),
        who: name(person),
        done: Boolean(done),
        doneLine: done ? `${name(done.by)} · ${stamp(done.at)}` : null,
        // The replay ticks itself through "Start replay"; the others are their person's button.
        action: held && !done && k !== 'replay' && allowed ? (k === 'hardStop' ? 'Approve' : 'Sign off') : null,
      }
    }),
    canReplay: held && !c.checks.replay && owner,
    replayLocked: owner ? null : lockReason('revalidateChange', viewerId),
    replayResult: c.replay.result?.lines ?? null,
    acceptLabel: `Accept ${to}`,
    accept: held
      ? pending.length
        ? { allowed: false, reason: `Waiting for: ${pending.join(', ')}` }
        : owner
          ? { allowed: true, reason: null }
          : { allowed: false, reason: lockReason('revalidateChange', viewerId) }
      : { allowed: false, reason: `${to} is no longer held` },
    withdraw: held ? { lead: 'Withdrawn after 7 days.', text: `If ${to} isn’t accepted by ${formatDate(c.deadline)}, it’s removed and ${from} keeps running.` } : null,
    effects: s.activities
      .filter((a) => a.agentId === agentId)
      .map((a) => [
        a.name,
        held ? (c.restarted.includes(a.id) ? `Shadow · scorecard restarts on ${to}` : `${LEVEL[a.level]} · stays on ${from}`) : `${LEVEL[a.level]} · runs ${c.status === 'accepted' ? to : from}`,
      ] as [string, string]),
    release: {
      head: `${name(c.releaseNote.by)}’s release note`,
      text: c.releaseNote.text,
      flag: fixes[0]?.code ?? null,
      more: others.length ? `and ${others.length} more ${others.length === 1 ? 'flag' : 'flags'} from ${units.join(' and ')}` : null,
    },
    timeline: c.timeline.map((t) => ({ at: formatClock(t.at), title: t.title, sub: t.sub })),
  }
}
