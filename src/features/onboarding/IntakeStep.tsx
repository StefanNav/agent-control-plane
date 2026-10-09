import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, DefinitionList, Field, LinkButton, Notice, Select } from '../../design-system'
import { formatClock, formatDate } from '../../lib/clock'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { onboardingContext, personName } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'
import { selectIntakeStep, selectSpan } from './selectors'
import { SideCard, StepCard } from './StepCard'
import styles from './onboarding.module.css'

/** Step 1: start from the approved intake and name the humans (1a, 2a; ruling R3). */
export function IntakeStep({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const startOnboarding = useDemo((s) => s.startOnboarding)
  const navigate = useNavigate()
  const step = useMemo(() => selectIntakeStep(state, agentId), [state, agentId])
  const { record, agent, people } = onboardingContext(state, agentId)
  const [ownerId, setOwnerId] = useState(step?.defaultOwner ?? '')
  const [techOwnerId, setTechOwnerId] = useState('')
  const [error, setError] = useState<string>()
  const ownerField = useId()
  const techField = useId()
  const sponsorField = useId()
  const span = useMemo(() => (ownerId ? selectSpan(state, ownerId, agentId) : null), [state, ownerId, agentId])
  if (!step) return null
  const lead = personName(state, people.lead)
  const carried = (
    <section className={styles.section} data-story-target="intake-carried">
      <h3 className={styles.caps}>Carried over from {step.code}</h3>
      <div className={styles.table}>
        <DefinitionList
          items={step.carried.map(([key, value]) => ({
            key,
            value:
              key === 'Committee condition' ? (
                <>
                  {value}
                  <span className={styles.monoMeta}>{step.conditionDate}</span>
                </>
              ) : (
                value
              ),
          }))}
        />
      </div>
      <span className={styles.note}>
        {personName(state, record ? agent?.ownerId : ownerId) || 'The agent owner'} can refine purpose and domain in the job description. Changes are shown against the request.
      </span>
    </section>
  )

  // After start: who started it, and who was named.
  if (record && agent) {
    const started = record.done.intake ?? { at: record.startedAt, by: record.startedBy }
    return (
      <Split
        main={
          <StepCard
            number="01"
            title="Start onboarding"
            sub="Starting created the agent record. What the committee approved carried over, and each owner was asked for their part."
            meta={`${personName(state, started.by)} · done ${formatDate(started.at)}`}
          >
            {carried}
            <section className={styles.section} data-story-target="intake-owners">
              <h3 className={styles.caps}>Owners</h3>
              <div className={styles.table}>
                <DefinitionList
                  items={[
                    { key: 'Agent owner', value: personName(state, agent.ownerId) },
                    { key: 'Technical owner', value: personName(state, agent.techOwnerId) },
                    { key: 'Clinical sponsor', value: personName(state, agent.sponsorId) },
                    { key: 'Program lead', value: lead },
                  ]}
                />
              </div>
            </section>
            <div className={styles.foot}>
              <LinkButton to={`/inventory/agents/${agentId}/onboarding/job`} variant="primary">
                Open job description
              </LinkButton>
              <span className={styles.monoMeta}>
                Started by {personName(state, started.by)} · {formatDate(started.at)} {formatClock(started.at)} · created {agent.code}
              </span>
            </div>
          </StepCard>
        }
        side={
          <SideCard title="What starting did" sub={`${agent.code} is a draft. Nothing runs yet.`}>
            <ol className={styles.steps}>
              {step.starting(agent.ownerId, agent.techOwnerId).map((line, i) => (
                <li key={line} className={styles.stepRow}>
                  <span>{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </SideCard>
        }
      />
    )
  }

  const allowed = can(state, state.personaId, 'startOnboarding', { divisionId: step.intake.divisionId })
  const named = 2 + (ownerId ? 1 : 0) + (techOwnerId ? 1 : 0)
  const blocked = !ownerId ? 'agent owner not set' : !techOwnerId ? 'technical owner not set' : null
  const owner = step.owners.find((o) => o.id === ownerId)
  const tech = step.techOwners.find((o) => o.id === techOwnerId)
  const start = () => {
    const result = startOnboarding(step.intake.id, { ownerId, techOwnerId })
    if (result.ok) navigate(`/inventory/agents/${agentId}/onboarding/job`)
    else setError(result.reason)
  }
  return (
    <Split
      main={
        <StepCard
          number="01"
          title="Start onboarding"
          sub="Starting creates the agent record. What the committee approved carries over, and each owner is asked for their part."
          meta={`${lead} · ${named} of 4`}
        >
          {carried}
          <section className={styles.sectionWide} data-story-target="intake-owners">
            <h3 className={styles.caps}>Owners</h3>
            <span className={styles.note}>No agent goes live without four named people. Division and sponsor come from the intake; you choose the owner and the technical owner.</span>
            <Field label="Agent owner" htmlFor={ownerField} hint="Job description · systems and verbs" help={owner?.sub}>
              <Select
                id={ownerField}
                value={ownerId}
                onChange={setOwnerId}
                locked={!allowed}
                options={[{ value: '', label: 'Choose an agent owner' }, ...step.owners.map((o) => ({ value: o.id, label: o.label }))]}
              />
            </Field>
            {span?.over ? (
              <Notice
                mark="warn"
                lead={`${span.name} would directly supervise ${span.total} agent activities.`}
                actions={
                  <>
                    <LinkButton to={`/settings/divisions/${step.intake.divisionId}`} variant="ghost">
                      Suggest a split
                    </LinkButton>
                    <Button variant="ghost" onClick={() => document.getElementById(ownerField)?.focus()}>
                      Choose another owner
                    </Button>
                  </>
                }
              >
                The guideline is {span.guideline}: past that, exceptions wait. Choose another owner, or split {step.division} so each owner stays within span. You can still continue.
              </Notice>
            ) : null}
            <Field label="Technical owner" htmlFor={techField} hint="Tools and hard stops" help={tech?.sub}>
              <Select
                id={techField}
                value={techOwnerId}
                onChange={setTechOwnerId}
                locked={!allowed}
                options={[{ value: '', label: 'Choose a technical owner' }, ...step.techOwners.map((o) => ({ value: o.id, label: o.label }))]}
              />
            </Field>
            <Field label="Clinical sponsor" htmlFor={sponsorField} hint="Approves the set">
              <Select id={sponsorField} value={step.sponsor.id} onChange={() => undefined} locked options={[{ value: step.sponsor.id, label: `${personName(state, step.sponsor.id)} · from ${step.sponsor.from}` }]} />
            </Field>
          </section>
          <div className={styles.foot}>
            {!allowed ? (
              <Button locked={lockReason('startOnboarding', state.personaId)}>Start onboarding</Button>
            ) : blocked ? (
              <Button variant="blocked">Start onboarding</Button>
            ) : (
              <Button variant="primary" onClick={start}>
                Start onboarding
              </Button>
            )}
            {blocked && allowed ? (
              <span className={styles.blocked}>
                <strong>Blocked:</strong> {blocked}.
              </span>
            ) : (
              <span className={styles.monoMeta}>{error ?? `Creates ${step.intake.agentCode} · v0.1 draft`}</span>
            )}
          </div>
        </StepCard>
      }
      side={
        <>
          {span?.over ? (
            <SideCard label={`${span.name}’s span`} title={`${span.name}’s span`} sub={`${span.total} activities if ${span.name} owns ${step.intake.agentName} · guideline ${span.guideline}`} foot={<span><strong>Splitting</strong> creates a second owner inside {step.division}, for example Inpatient and Transitions. Agents, privileges and sponsors stay as they are.</span>}>
              <div>
                {span.rows.map((row) => (
                  <div key={row.name} className={styles.spanRow}>
                    <span className={row.name.endsWith('· new') ? styles.spanNew : undefined}>{row.name}</span>
                    <span>
                      {row.activities} {row.activities === 1 ? 'activity' : 'activities'}
                    </span>
                  </div>
                ))}
                {span.more ? (
                  <div className={styles.spanRow}>
                    <span>
                      and {span.more.agents} more agents
                    </span>
                    <span>{span.more.activities} activities</span>
                  </div>
                ) : null}
              </div>
            </SideCard>
          ) : null}
          <SideCard
            label="What starting does"
            title="What starting does"
            sub="Nothing runs yet"
            foot={
              <span>
                <strong>The agent can’t act.</strong> It stays a draft until AIMS Review and a signed privilege. Owners can work in any order once you start.
              </span>
            }
          >
            <ol className={styles.steps}>
              {step.starting(ownerId, techOwnerId).map((line, i) => (
                <li key={line} className={styles.stepRow}>
                  <span>{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </SideCard>
        </>
      }
    />
  )
}
