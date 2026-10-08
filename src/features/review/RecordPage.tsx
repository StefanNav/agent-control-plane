import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'
import { StatusChip } from '../../components'
import { DefinitionList, LinkButton, Notice, Table } from '../../design-system'
import { formatDate } from '../../lib/clock'
import { Body, Split } from '../../layout/layouts'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { onboardingContext, openStep, personName } from '../../store/onboardingRules'
import { selectRecord } from '../inventory/selectors'
import { StepCard } from '../onboarding/StepCard'
import { DecisionLogged } from './DecisionLogged'
import { ReviewHeader } from './ReviewHeader'
import onboarding from '../onboarding/onboarding.module.css'

const LEVEL = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' } as const

/** The agent's governance record (2d): the AIMS Review rail and the step it's at; composed for agents without one. */
export function RecordPage() {
  const { agentId = '' } = useParams()
  const state = useDemo((s) => s)
  const facts = useMemo(() => selectRecord(state, agentId), [state, agentId])
  const { record, intake, people } = onboardingContext(state, agentId)
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent && intake && !intake.startedAt) return <Navigate to={`/inventory/agents/${agentId}/onboarding/intake`} replace />
  if (!agent) return <NotFound />
  if (agent.lifecycle === 'onboarding') return <Navigate to={`/inventory/agents/${agentId}/onboarding/${openStep(state, agentId)?.step ?? 'job'}`} replace />

  const review = record?.review
  if (record && review) {
    const chair = personName(state, state.roles.find((r) => r.role === 'committee')?.personId)
    return (
      <>
        <ReviewHeader agentId={agentId} current={review.decision ? 'decision' : review.tier ? 'decision' : 'tier'} chip={review.decision ? null : review.tier ? 'Review: committee decision' : 'Review: risk tier'} />
        {review.decision ? (
          <DecisionLogged agentId={agentId} />
        ) : (
          <Split
            main={
              review.tier ? (
                <StepCard number="04" title="Committee decision" meta={`${chair} · ${formatDate(review.meeting)}`}>
                  <Notice mark="review" lead={`Waiting on the committee · ${formatDate(review.meeting)}.`} actions={<LinkButton to={`/portfolio/reviews/${agentId}`}>Open the packet</LinkButton>}>
                    {chair} decides from the packet {personName(state, review.tierBy)} built on {formatDate(review.packetAt ?? review.tierAt!)}.
                  </Notice>
                </StepCard>
              ) : (
                <StepCard number="02" title="Risk tier" meta={personName(state, people.lead)}>
                  <Notice mark="review" lead={`${personName(state, people.lead)} sets the tier next.`} actions={<LinkButton to={`/inventory/agents/${agentId}/risk-tier`}>Open risk tier</LinkButton>}>
                    Suggested Tier {review.suggestedTier}. The committee packet is built when the tier is set.
                  </Notice>
                </StepCard>
              )
            }
            side={null}
          />
        )}
      </>
    )
  }

  // Composed: an agent whose onboarding predates AIMS Review records.
  const privileges = state.privileges.filter((p) => p.agentId === agentId && p.state !== 'closed')
  const division = state.divisions.find((d) => d.id === agent.divisionId)?.name ?? ''
  return (
    <>
      <PageHeader
        breadcrumb={`Inventory / Agents / ${agent.name}`}
        title={agent.name}
        status={agent.lifecycle === 'retired' ? 'Retired' : agent.lifecycle === 'disabled' ? 'Disabled' : agent.lifecycle === 'paused' ? 'Paused' : `Live · ${LEVEL[agent.level]}`}
        idLine={`${agent.code} · ${agent.version}`}
        chips={<StatusChip status={agent.judgment.status} label={agent.judgment.label} />}
        people={[
          { role: 'Owner', name: personName(state, agent.ownerId) },
          { role: 'Technical owner', name: personName(state, agent.techOwnerId) },
          { role: 'Sponsor', name: personName(state, agent.sponsorId) },
          { role: 'Division', name: division },
        ]}
        actions={<LinkButton to={`/operations/agents/${agentId}`}>Open operations view</LinkButton>}
      />
      <Body>
        <section className={onboarding.section}>
          <h2 className={onboarding.caps}>AIMS inventory</h2>
          <div className={onboarding.table}>{facts ? <DefinitionList items={facts.governance.map(([key, value]) => ({ key, value }))} /> : null}</div>
        </section>
        <section className={onboarding.section}>
          <h2 className={onboarding.caps}>Privileges</h2>
          {privileges.length ? (
            <Table
              ariaLabel="Privileges"
              rows={privileges}
              getRowId={(p) => p.id}
              columns={[
                { id: 'activity', header: 'Activity', width: 'minmax(0, 1fr)', render: (p) => state.activities.find((a) => a.id === p.activityId)?.name ?? p.activityId },
                { id: 'level', header: 'Level', width: '120px', render: (p) => LEVEL[p.level] },
                { id: 'domain', header: 'Domain', width: '260px', render: (p) => p.domain },
                { id: 'code', header: 'Record', width: '140px', render: (p) => `${p.code} v${p.version}` },
              ]}
            />
          ) : (
            <span className={onboarding.note}>No privileges are recorded for {agent.name}.</span>
          )}
        </section>
      </Body>
    </>
  )
}
