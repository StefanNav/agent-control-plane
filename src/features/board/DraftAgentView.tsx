import { LinkButton, Notice } from '../../design-system'
import { Body } from '../../layout/layouts'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { openStep } from '../../store/onboardingRules'

/** An agent still being onboarded or in AIMS Review has no operations yet (ruling R19, composed). */
export function DraftAgentView({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const agent = state.agents.find((a) => a.id === agentId)!
  const division = state.divisions.find((d) => d.id === agent.divisionId)?.name ?? ''
  const inReview = agent.lifecycle === 'inReview'
  const step = openStep(state, agentId)?.step ?? 'review'
  return (
    <>
      <PageHeader breadcrumb={`Operations / ${division} / ${agent.name}`} title={agent.name} status={inReview ? 'In review' : 'Onboarding · draft'} idLine={agent.code} />
      <Body>
        <Notice
          mark="lock"
          lead={inReview ? 'In review.' : 'Onboarding · draft.'}
          actions={
            <LinkButton to={inReview ? `/inventory/agents/${agentId}` : `/inventory/agents/${agentId}/onboarding/${step}`} variant="primary">
              {inReview ? 'Open record' : 'Open onboarding'}
            </LinkButton>
          }
        >
          It can’t act until AIMS Review approves it and a privilege is signed.
        </Notice>
      </Body>
    </>
  )
}
