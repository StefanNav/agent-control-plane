import { useState } from 'react'
import { Button } from '../../design-system'
import { formatClock, formatDate } from '../../lib/clock'
import { useDemo } from '../../store'
import { onboardingContext, personName, readyToSend } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'

/** "Send to Priya for approval" (1b–1d, 1g): blocked until every item but the sponsor's is done. */
export function SendToSponsor({ agentId, again = false }: { agentId: string; again?: boolean }) {
  const state = useDemo((s) => s)
  const sendToSponsor = useDemo((s) => s.sendToSponsor)
  const [error, setError] = useState<string>()
  const { record, people } = onboardingContext(state, agentId)
  const sponsor = personName(state, people.sponsor)
  const label = again ? `Send to ${sponsor} again` : `Send to ${sponsor} for approval`
  if (!record) return null
  if (record.sponsor.state === 'waiting' || record.sponsor.state === 'signed') {
    return (
      <Button variant="blocked">
        {record.sponsor.state === 'signed' ? `Signed by ${sponsor}` : `Sent · ${formatDate(record.sponsor.sentAt!)} ${formatClock(record.sponsor.sentAt!)}`}
      </Button>
    )
  }
  const allowed = can(state, state.personaId, 'editJobDescription', { agentId }) || can(state, state.personaId, 'configureTools', { agentId })
  if (!allowed) return <Button locked={lockReason('configureTools', state.personaId)}>{label}</Button>
  if (!readyToSend(state, agentId)) return <Button variant="blocked">{label}</Button>
  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          const result = sendToSponsor(agentId)
          if (!result.ok) setError(result.reason)
        }}
      >
        {label}
      </Button>
      {error ? <span role="alert">{error}</span> : null}
    </>
  )
}
