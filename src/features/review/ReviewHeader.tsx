import { useNavigate } from 'react-router'
import { StatusChip } from '../../components'
import { WizardSteps } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { RecordHistory } from '../onboarding/RecordHistory'
import { selectOnboardingHeader } from '../onboarding/selectors'
import { reviewRail, type ReviewStepId } from './selectors'

/** The record header with the AIMS Review rail (2b, 2d). */
export function ReviewHeader({ agentId, current, chip, crumb }: { agentId: string; current: ReviewStepId; chip?: string | null; crumb?: string }) {
  const state = useDemo((s) => s)
  const navigate = useNavigate()
  const header = selectOnboardingHeader(state, agentId)
  const agent = state.agents.find((a) => a.id === agentId)
  if (!header || !agent) return null
  const rail = reviewRail(state, agentId)
  return (
    <PageHeader
      breadcrumb={crumb ? `${header.breadcrumb} / ${crumb}` : header.breadcrumb}
      title={header.title}
      status={header.status}
      idLine={`${agent.code} · v1.0`}
      chips={chip ? <StatusChip status="review" label={chip} /> : undefined}
      people={header.people}
      actions={<RecordHistory agentId={agentId} title={header.title} />}
      steps={<WizardSteps steps={rail.map((r) => ({ id: r.id, label: r.label, sub: r.sub, mark: r.mark }))} current={current} onSelect={(id) => navigate(rail.find((r) => r.id === id)!.to)} />}
    />
  )
}
