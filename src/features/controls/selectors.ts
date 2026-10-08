import type { RadioCardOption } from '../../design-system'
import type { DemoState, PersonaId } from '../../data/types'
import { formatClock } from '../../lib/clock'
import { queueOf } from '../../store/mutations'
import { onBoard, personName } from '../board/selectors'

export type PauseScope = 'activity' | 'agent' | 'division'

/** "Resuming needs Priya and you," from where the viewer stands. */
function resumeNeeds(s: DemoState, personaId: PersonaId, ownerId: string, sponsorId: string): string {
  const [owner, sponsor] = [personName(s, ownerId), personName(s, sponsorId)]
  if (personaId === ownerId) return `Resuming needs ${sponsor} and you,`
  if (personaId === sponsorId) return `Resuming needs ${owner} and you,`
  return `Resuming needs ${sponsor} and ${owner},`
}

/** The pause impact preview (6b): scopes, what happens to queued work, and how resuming works. */
export function selectPausePreview(s: DemoState, personaId: PersonaId, agentId: string, scope: PauseScope) {
  const agent = s.agents.find((a) => a.id === agentId)!
  const division = s.divisions.find((d) => d.id === agent.divisionId)
  const activities = s.activities.filter((a) => a.agentId === agentId)
  const main = activities.find((a) => a.level !== 'shadow') ?? activities[0]
  const inDivision = s.agents.filter((a) => onBoard(a) && a.divisionId === agent.divisionId)
  const atDraft = s.activities.filter((a) => a.level === 'draft' && inDivision.some((x) => x.id === a.agentId)).length
  // Agents already paused keep their pause; only the rest stop now.
  const covered = scope === 'division' ? inDivision.filter((a) => a.lifecycle !== 'paused') : [agent]
  const total = covered.map(queueOf).reduce((sum, q) => ({ inProgress: sum.inProgress + q.inProgress, awaitingReview: sum.awaitingReview + q.awaitingReview, perHour: sum.perHour + q.perHour }), {
    inProgress: 0,
    awaitingReview: 0,
    perHour: 0,
  })
  const medications = agent.divisionId === 'medications'
  const scopes: RadioCardOption<PauseScope>[] = [
    { value: 'activity', title: 'This activity', description: main?.name ?? '' },
    { value: 'agent', title: 'This agent', description: activities.length === 2 ? 'Both activities' : `All ${activities.length} activities` },
    { value: 'division', title: `Every agent in ${division?.name}`, description: `${inDivision.length} agents · ${atDraft} activities at Draft` },
  ]
  return {
    scopes,
    effects: [
      {
        value: String(total.inProgress),
        lead: 'drafts in progress go back to pharmacists',
        text: medications ? 'They appear in the 7 West and 8 East worklists within a minute.' : 'They appear in the team’s worklists within a minute.',
      },
      { value: String(total.awaitingReview), lead: 'drafts waiting for review stay', text: 'Pharmacists sign or reject them as usual.' },
      {
        value: `~${total.perHour}`,
        lead: medications ? 'admissions an hour reconciled by hand' : 'items an hour handled by hand',
        text: 'Until the agent resumes. Charge pharmacists are told.',
      },
    ],
    resumeRule: { lead: resumeNeeds(s, personaId, agent.ownerId, agent.sponsorId), text: 'both with a reason. Each activity returns to the level it had.' },
    audit: `Logs ${personName(s, personaId)} · ${formatClock(s.now)}`,
  }
}
