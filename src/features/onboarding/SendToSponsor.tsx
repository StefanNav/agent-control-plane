import { Button } from '../../design-system'
import { useDemo } from '../../store'
import { onboardingContext, personName } from '../../store/onboardingRules'

/** "Send to Priya for approval": blocked until every item but the sponsor's is done (1b–1d). */
export function SendToSponsor({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const { people } = onboardingContext(state, agentId)
  return <Button variant="blocked">Send to {personName(state, people.sponsor)} for approval</Button>
}
