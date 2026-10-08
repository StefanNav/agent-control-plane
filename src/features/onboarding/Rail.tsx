import { useNavigate } from 'react-router'
import { WizardSteps } from '../../design-system'
import { useDemo } from '../../store'
import { stepStates, type StepId } from '../../store/onboardingRules'

/** The six onboarding steps with marks derived from the record (1a–1h). */
export function Rail({ agentId, current, override }: { agentId: string; current: StepId; override?: Partial<Record<StepId, string>> }) {
  const state = useDemo((s) => s)
  const navigate = useNavigate()
  const steps = stepStates(state, agentId).map((st) => ({ id: st.id, label: st.label, sub: override?.[st.id] ?? st.sub, mark: st.mark }))
  return <WizardSteps steps={steps} current={current} onSelect={(id) => navigate(`/inventory/agents/${agentId}/onboarding/${id}`)} />
}
