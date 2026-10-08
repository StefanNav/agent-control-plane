import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TIER_RULES } from '../../data/seed/catalogue'
import type { Tier } from '../../data/types'
import { Button, Field, LinkButton, Notice, RadioCardGroup, Table, Textarea } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { onboardingContext, personName } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'
import { SideCard, StepCard } from '../onboarding/StepCard'
import { ReviewHeader } from './ReviewHeader'
import { selectRiskTier } from './selectors'
import onboarding from '../onboarding/onboarding.module.css'
import styles from './review.module.css'

const TIERS: Tier[] = [1, 2, 3, 4]

/** AIMS Review step 2: the tier, suggested from the job and the grid; changing it needs a reason (2b). */
export function RiskTierPage() {
  const { agentId = '' } = useParams()
  const state = useDemo((s) => s)
  const setRiskTier = useDemo((s) => s.setRiskTier)
  const navigate = useNavigate()
  const [chosen, setChosen] = useState<Tier | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const { record, people } = onboardingContext(state, agentId)
  const review = record?.review
  const pick = chosen ?? review?.tier ?? review?.suggestedTier ?? 2
  const view = selectRiskTier(state, agentId, pick)
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) return <NotFound />

  if (!record || !review || !view) {
    // No AIMS Review record: an agent onboarded before these records, or one still being onboarded.
    return (
      <>
        <ReviewHeader agentId={agentId} current="tier" crumb="AIMS Review" />
        <Split
          main={
            <StepCard number="02" title="Risk tier" meta={`Tier ${agent.riskTier} · ${TIER_RULES[agent.riskTier].label}`}>
              <Notice mark="lock" lead={record ? 'Not ready.' : `Tier ${agent.riskTier} · ${TIER_RULES[agent.riskTier].label}.`}>
                {record ? `The tier is set once ${personName(state, people.sponsor)} approves the set.` : 'Set before AIMS Review kept tier records for this agent.'}
              </Notice>
            </StepCard>
          }
          side={null}
        />
      </>
    )
  }
  const allowed = can(state, state.personaId, 'prepareGoLive', { agentId })
  const needsReason = pick !== view.suggested
  const set = view.set
  const submit = () => {
    const result = setRiskTier(agentId, { tier: pick, ...(reason.trim() ? { reason } : {}) })
    if (!result.ok) return setError(result.reason)
    navigate(pick >= 2 ? `/portfolio/reviews/${agentId}` : `/operations/agents/${agentId}?tab=scorecard`)
  }
  return (
    <>
      <ReviewHeader agentId={agentId} current="tier" chip={set ? null : 'Review: risk tier'} crumb="AIMS Review" />
      <Split
        main={
          <StepCard number="02" title="Risk tier" sub="Suggested from the job description and the systems grid. Change it if you know something the record doesn’t, and say why." meta={view.lead}>
            <section className={onboarding.section}>
              <h3 className={onboarding.caps}>Suggested · Tier {view.suggested}</h3>
              <Table
                ariaLabel="Risk factors"
                rows={view.factors}
                getRowId={(r) => r.factor}
                minRowHeight={56}
                columns={[
                  { id: 'factor', header: 'Factor', width: '150px', render: (r) => <span className={styles.factor}>{r.factor}</span> },
                  { id: 'finding', header: 'Finding', width: 'minmax(0, 1fr)', render: (r) => r.finding },
                  { id: 'from', header: 'From', width: '190px', render: (r) => <span className={styles.from}>{r.from}</span> },
                  { id: 'effect', header: 'Effect', width: '90px', render: (r) => r.effect },
                ]}
              />
            </section>
            {set ? (
              <Notice
                mark="none"
                lead={`Tier ${set.tier} · ${set.label}, set by ${set.by} · ${set.at}.`}
                actions={
                  set.tier >= 2 ? (
                    <LinkButton to={`/portfolio/reviews/${agentId}`}>Open the committee packet</LinkButton>
                  ) : (
                    <LinkButton to={`/operations/agents/${agentId}?tab=scorecard`}>Open the scorecard</LinkButton>
                  )
                }
              >
                {set.reason ? `“${set.reason}”` : 'As suggested.'}
              </Notice>
            ) : (
              <>
                <section className={onboarding.section}>
                  <h3 className={onboarding.caps}>Tier</h3>
                  <RadioCardGroup
                    name="tier"
                    aria-label="Tier"
                    columns={4}
                    value={String(pick)}
                    onChange={(v) => setChosen(Number(v) as Tier)}
                    options={TIERS.map((t) => ({
                      value: String(t),
                      title: `Tier ${t} · ${TIER_RULES[t].label}`,
                      description: t === view.suggested ? 'Suggested' : t === pick ? 'Your choice' : TIER_RULES[t].sub,
                      disabled: !allowed,
                    }))}
                  />
                </section>
                {needsReason ? (
                  <Field label="Reason for changing the suggested tier" htmlFor="tier-reason" hint="Required · goes in the packet">
                    <Textarea id="tier-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} readOnly={!allowed} />
                  </Field>
                ) : null}
                <div className={onboarding.foot}>
                  {!allowed ? (
                    <Button locked={lockReason('prepareGoLive', state.personaId)}>{view.button}</Button>
                  ) : needsReason && !reason.trim() ? (
                    <Button variant="blocked">{view.button}</Button>
                  ) : (
                    <Button variant="primary" onClick={submit}>
                      {view.button}
                    </Button>
                  )}
                  <span className={onboarding.monoMeta}>{error ?? `Logged as ${view.lead} · suggested tier stays on record`}</span>
                </div>
              </>
            )}
          </StepCard>
        }
        side={
          <SideCard label="What the tier sets" title="What the tier sets" sub={pick === view.suggested ? `${view.compare.head[0]}, as suggested` : `${view.compare.head[0]} against your ${view.compare.head[1]}`} foot={<span>{view.compare.note}</span>}>
            <div className={styles.compare}>
              <span className={styles.compareHead} />
              <span className={styles.compareHead}>{view.compare.head[0]}</span>
              <span className={styles.compareHead}>{view.compare.head[1]}</span>
              {view.compare.rows.flatMap(([k, a, b]) => [
                <span key={`${k}-k`}>{k}</span>,
                <span key={`${k}-a`}>{a}</span>,
                <span key={`${k}-b`} className={a !== b ? styles.changed : undefined}>
                  {b}
                </span>,
              ])}
            </div>
          </SideCard>
        }
      />
    </>
  )
}
