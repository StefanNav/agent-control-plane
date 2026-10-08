import { useDemo } from '../../store'

/** 2d: the committee's decision and the conditions it put on the privileges (Task 5.9). */
export function DecisionLogged({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const decision = state.onboardings.find((r) => r.agentId === agentId)?.review?.decision
  return <p>{decision?.reason}</p>
}
