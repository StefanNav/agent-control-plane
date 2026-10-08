import { useMemo } from 'react'
import { RuleTag, Table } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { SideCard, StepCard } from '../onboarding/StepCard'
import { selectDecision } from './selectors'
import onboarding from '../onboarding/onboarding.module.css'
import styles from './review.module.css'

/** 2d: the committee's decision; its conditions now sit on every privilege they apply to. */
export function DecisionLogged({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const view = useMemo(() => selectDecision(state, agentId), [state, agentId])
  if (!view) return null
  return (
    <Split
      main={
        <StepCard number="04" title="Committee decision" sub={`Recorded by ${view.by}. The conditions now sit on every privilege for this agent, and the gateway enforces the ones it can.`} meta={view.meta}>
          <div className={styles.decisionCard}>
            <strong>{view.label}</strong>
            <span className={styles.quote}>“{view.reason}”</span>
          </div>
          {view.conditions.length ? (
            <section className={onboarding.section}>
              <h3 className={onboarding.caps}>Conditions on the privilege record</h3>
              <Table
                ariaLabel="Conditions"
                rows={view.conditions}
                getRowId={(c) => c.id}
                minRowHeight={56}
                columns={[
                  { id: 'id', header: '', width: '56px', render: (c) => <RuleTag>{c.id}</RuleTag> },
                  { id: 'condition', header: 'Condition', width: 'minmax(0, 1fr)', render: (c) => c.text },
                  { id: 'applies', header: 'Applies to', width: '200px', render: (c) => c.appliesTo },
                  { id: 'checked', header: 'Checked by', width: '170px', render: (c) => c.checkedBy },
                ]}
              />
            </section>
          ) : null}
          {view.privileges.length ? (
            <section className={onboarding.section}>
              <h3 className={onboarding.caps}>Privileges</h3>
              <Table
                ariaLabel="Privileges"
                rows={view.privileges}
                getRowId={(p) => p.id}
                minRowHeight={56}
                columns={[
                  { id: 'activity', header: 'Activity', width: 'minmax(0, 1fr)', render: (p) => <span className={styles.factor}>{p.activity}</span> },
                  { id: 'level', header: 'Level', width: '190px', render: (p) => p.level },
                  { id: 'domain', header: 'Domain', width: '220px', render: (p) => p.domain },
                  {
                    id: 'conditions',
                    header: 'Conditions',
                    width: '120px',
                    render: (p) => (
                      <span className={onboarding.chips}>
                        {p.conditions.map((c) => (
                          <RuleTag key={c}>{c}</RuleTag>
                        ))}
                      </span>
                    ),
                  },
                ]}
              />
            </section>
          ) : null}
        </StepCard>
      }
      side={
        <SideCard label="Decision log" title="Decision log" sub="Every decision and its reason, newest first" foot={view.next ? <span>{view.next}</span> : undefined}>
          <ol className={styles.log}>
            {view.log.map((entry) => (
              <li key={`${entry.date}-${entry.text}`}>
                <span className={onboarding.monoMeta}>{entry.date}</span>
                <span>
                  {entry.text}
                  {entry.sub ? <small>{entry.sub}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        </SideCard>
      }
    />
  )
}
