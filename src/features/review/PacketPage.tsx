import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { StatusChip, SystemsVerbsGrid } from '../../components'
import type { Condition, ReviewDecision } from '../../data/types'
import { Button, Input, LinkButton, Notice, RadioCardGroup, RuleTag, Textarea } from '../../design-system'
import { Split } from '../../layout/layouts'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { DECISION_WORDS } from '../../store/onboarding'
import { conditionRange } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'
import { selectFinalSet, selectSystemsStep } from '../onboarding/selectors'
import { SideCard } from '../onboarding/StepCard'
import { selectPacket } from './selectors'
import onboarding from '../onboarding/onboarding.module.css'
import styles from './review.module.css'

const KINDS: { value: ReviewDecision['kind']; title: string; description: string }[] = [
  { value: 'approve', title: 'Approve', description: 'Shadow can start' },
  { value: 'approveWithConditions', title: 'Approve with conditions', description: 'Shadow can start; conditions bind every privilege' },
  { value: 'reReview', title: 'Re-review', description: 'Back to Dana with questions, next meeting' },
  { value: 'deny', title: 'Deny', description: 'Intake closes; the record is archived' },
]

/** The committee packet: one page to decide from (2c). */
export function PacketPage() {
  const { reviewId = '' } = useParams()
  const state = useDemo((s) => s)
  const recordDecision = useDemo((s) => s.recordDecision)
  const navigate = useNavigate()
  const view = useMemo(() => selectPacket(state, reviewId), [state, reviewId])
  const set = useMemo(() => selectFinalSet(state, reviewId), [state, reviewId])
  const grid = useMemo(() => selectSystemsStep(state, reviewId), [state, reviewId])
  const [kind, setKind] = useState<ReviewDecision['kind']>('approveWithConditions')
  const [conditions, setConditions] = useState<Condition[] | null>(null)
  const [adding, setAdding] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  if (!view || !set || !grid) return <NotFound />
  const allowed = can(state, state.personaId, 'approveGoLive', { agentId: reviewId })
  const list = conditions ?? view.proposed
  const addCondition = () => {
    const text = adding.trim()
    if (!text) return
    const id = `C${Math.max(0, ...list.map((c) => Number(c.id.slice(1)))) + 1}`
    setConditions([...list, { id, text, appliesTo: 'Every activity', activityIds: [], checkedBy: `${view.people[1]![1]} · sponsor` }])
    setAdding('')
  }
  const record = () => {
    const result = recordDecision(reviewId, { kind, conditions: kind === 'approveWithConditions' ? list : [], reason })
    if (!result.ok) return setError(result.reason)
    navigate(kind === 'reReview' ? `/inventory/agents/${reviewId}/risk-tier` : `/inventory/agents/${reviewId}`)
  }
  const decided = view.decision

  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.status}
        idLine={view.idLine}
        chips={view.state === 'open' ? <StatusChip status="review" label="Review: your decision" /> : undefined}
        actions={<LinkButton to={`/reports/export?agent=${reviewId}`}>Download PDF</LinkButton>}
      />
      <Split
        main={
          <section className={onboarding.card} aria-label="Review packet">
            <div className={styles.peopleRow}>
              {view.people.map(([k, v]) => (
                <span key={k}>
                  <span className={onboarding.monoMeta}>{k}</span>
                  <strong>{v}</strong>
                </span>
              ))}
            </div>
            <section className={onboarding.setGroup}>
              <h2 className={onboarding.caps}>Job description · {view.owner}</h2>
              <div>
                <div className={onboarding.setRow}>
                  <span className={onboarding.setKey}>Purpose</span>
                  <span className={onboarding.setValue}>{set.job.purpose}</span>
                  <span />
                </div>
                <div className={onboarding.setRow}>
                  <span className={onboarding.setKey}>Does</span>
                  <span className={onboarding.setValue}>
                    {set.job.does.map((a) => (
                      <span key={a.id} className={onboarding.doesLine}>
                        {a.name}
                        <span className={onboarding.setKey}>Shadow first</span>
                      </span>
                    ))}
                  </span>
                  <span />
                </div>
                <div className={onboarding.setRow}>
                  <span className={onboarding.setKey}>Never</span>
                  <span className={onboarding.setValue}>
                    {view.never.map((n) => (
                      <span key={n.code} className={onboarding.doesLine}>
                        {n.text}
                        <RuleTag>{n.code}</RuleTag>
                      </span>
                    ))}
                  </span>
                  <span />
                </div>
                <div className={onboarding.setRow}>
                  <span className={onboarding.setKey}>Hands off when</span>
                  <span className={onboarding.setValue}>{view.handsOff}</span>
                  <span />
                </div>
                <div className={onboarding.setRow}>
                  <span className={onboarding.setKey}>Acts for</span>
                  <span className={onboarding.setValue}>{set.job.actsFor}</span>
                  <span />
                </div>
              </div>
            </section>
            <section className={onboarding.setGroup}>
              <h2 className={onboarding.caps}>Systems · {view.owner}</h2>
              <SystemsVerbsGrid rows={grid.rows.map((r) => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells).map(([v, c]) => [v, c === 'changed' ? 'granted' : c])) as typeof r.cells }))} policyId="ORG-POL-02" />
            </section>
            <section className={onboarding.setGroup} data-story-target="packet-hardstops">
              <h2 className={onboarding.caps}>Hard stops · tested on the last 30 days · {view.tech}</h2>
              <div className={onboarding.list}>
                {set.limits.rows.map((l) => (
                  <div key={l.code} className={onboarding.limitPick}>
                    <RuleTag>{l.label}</RuleTag>
                    <span className={onboarding.setValue}>
                      {l.title}
                      {l.retest ? <span className={onboarding.listSub}>{l.retest}</span> : null}
                    </span>
                    <span className={onboarding.setRight}>{l.shortResult}</span>
                  </div>
                ))}
              </div>
            </section>
            <div className={styles.twoCol}>
              <section className={onboarding.setGroup}>
                <h2 className={onboarding.caps}>Success criteria</h2>
                {set.job.goesLive.map((c) => (
                  <span key={c.id}>{c.short}</span>
                ))}
              </section>
              <section className={onboarding.setGroup}>
                <h2 className={onboarding.caps}>Rollout domain</h2>
                <span>{set.job.worksOn}</span>
              </section>
            </div>
            {view.tier ? (
              <section className={onboarding.setGroup}>
                <h2 className={onboarding.caps}>Risk tier · {view.lead}</h2>
                <span>{view.tier}</span>
              </section>
            ) : null}
          </section>
        }
        side={
          view.state === 'notNeeded' ? (
            <SideCard storyTarget="packet-decision" label="Your decision" title="No board for Tier 1" sub={`${view.lead} set Tier 1 · Low, so no committee decides.`}>
              <div className={onboarding.form}>
                <Notice mark="none" lead={`Shadow started ${view.shadowFrom ?? ''}.`}>
                  The sponsor’s approval and the tier were enough. The packet stays on the record.
                </Notice>
              </div>
            </SideCard>
          ) : view.state === 'notBuilt' ? (
            <SideCard storyTarget="packet-decision" label="Your decision" title="Your decision" sub="Not on the agenda yet">
              <div className={onboarding.form}>
                <Notice mark="lock" lead="No packet yet.">
                  The packet is built when {view.lead} sets the risk tier.
                </Notice>
              </div>
            </SideCard>
          ) : decided ? (
            <SideCard storyTarget="packet-decision" label="Decision" title={DECISION_WORDS[decided.kind].replace(/^./, (c) => c.toUpperCase())} sub={`${view.chair} · ${view.meeting}`}>
              <div className={onboarding.form}>
                <p className={styles.quote}>“{decided.reason}”</p>
                {decided.conditions.length ? <span className={onboarding.note}>Conditions {conditionRange(decided.conditions.map((c) => c.id))} sit on every privilege they apply to.</span> : null}
                <span>
                  <LinkButton to={`/inventory/agents/${reviewId}`}>Open the decision</LinkButton>
                </span>
              </div>
            </SideCard>
          ) : !allowed ? (
            <SideCard storyTarget="packet-decision" label="Your decision" title="The board decides" sub={`${view.chair} records the decision at the ${view.meeting} meeting.`}>
              <div className={onboarding.form}>
                <Button locked={lockReason('approveGoLive', state.personaId)}>Record decision</Button>
              </div>
            </SideCard>
          ) : (
            <SideCard storyTarget="packet-decision" label="Your decision" title="Your decision" sub="Logged with your reason. Conditions carry onto every privilege for this agent.">
              <div className={onboarding.form}>
                <RadioCardGroup
                  name="decision"
                  aria-label="Decision"
                  value={kind}
                  onChange={setKind}
                  options={KINDS.map((k) => ({
                    ...k,
                    // The tour clicks this option; a click on its title reaches the card.
                    title: k.value === 'approveWithConditions' ? <span data-story-target="packet-approve-conditions">{k.title}</span> : k.title,
                    description: k.value === 'reReview' ? `Back to ${view.lead} with questions, next meeting` : k.description,
                  }))}
                />
                {kind === 'approveWithConditions' ? (
                  <section className={onboarding.setGroup}>
                    <h3 className={onboarding.caps}>Conditions</h3>
                    {list.map((c) => (
                      <span key={c.id} className={styles.condition}>
                        <span className={onboarding.monoMeta}>{c.id}</span>
                        <span>{c.text}</span>
                        <Button variant="ghost" aria-label={`Remove ${c.id}`} onClick={() => setConditions(list.filter((x) => x.id !== c.id))}>
                          Remove
                        </Button>
                      </span>
                    ))}
                    <span className={onboarding.inline}>
                      <Input aria-label="Add condition" placeholder="Add condition" value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCondition()} />
                      <Button onClick={addCondition}>Add</Button>
                    </span>
                  </section>
                ) : null}
                <label className={onboarding.caps} htmlFor="decision-reason">
                  Reason
                </label>
                <Textarea id="decision-reason" data-story-target="packet-reason" rows={5} value={reason} onChange={(e) => setReason(e.target.value)} />
                {error ? <span role="alert">{error}</span> : null}
                <span className={onboarding.runRow}>
                  {reason.trim() ? (
                    <Button variant="primary" onClick={record} data-story-target="packet-record">
                      Record decision
                    </Button>
                  ) : (
                    <Button variant="blocked">Record decision</Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setReason('')
                      setConditions(null)
                      setKind('approveWithConditions')
                    }}
                  >
                    Cancel
                  </Button>
                </span>
                <span className={onboarding.monoMeta}>Logged as {view.chair} · AI review board chair</span>
              </div>
            </SideCard>
          )
        }
      />
    </>
  )
}
