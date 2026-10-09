import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AutonomyLadder, StatusChip } from '../../components'
import { Button, Checkbox, DefinitionList, Field, Icon, LinkButton, Notice, Table, Textarea } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { selectSignature } from './selectors'
import styles from './golive.module.css'
import onboarding from '../onboarding/onboarding.module.css'

/** Sign the privilege (3c): one target missed means a written reason; renewals (3d) re-sign at the same level. */
export function SignPage() {
  const { privilegeId = '' } = useParams()
  const state = useDemo((s) => s)
  const signPrivilege = useDemo((s) => s.signPrivilege)
  const returnPrivilegeRequest = useDemo((s) => s.returnPrivilegeRequest)
  const navigate = useNavigate()
  const view = useMemo(() => selectSignature(state, privilegeId), [state, privilegeId])
  const [reason, setReason] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [returning, setReturning] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  if (!view) return <NotFound />
  const allowed = can(state, state.personaId, 'signPrivilege', { agentId: view.agentId })
  const live = view.mode === 'sign' || view.mode === 'renew'
  const ready = accepted && (!view.belowTarget || reason.trim())
  const sign = () => {
    const result = signPrivilege(privilegeId, { reason, accepted })
    if (!result.ok) setError(result.reason)
  }
  const ladderState = (i: number) => (i === 0 ? (view.mode === 'sign' ? 'current' : 'passed') : i === 1 ? (view.mode === 'sign' ? 'proposed' : 'current') : 'locked')
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        idLine={view.idLine}
        chips={view.chip ? <StatusChip status={view.mode === 'renew' ? 'warn' : 'review'} label={view.chip} /> : undefined}
        sub={view.sub}
      />
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={onboarding.card} aria-label="The privilege">
            <AutonomyLadder variant="full" steps={view.ladder.map((step, i) => ({ level: step.level, state: ladderState(i), caption: step.caption }))} />
            <div className={onboarding.table}>
              <DefinitionList items={view.facts.map(([key, value]) => ({ key, value }))} keyWidth={160} />
            </div>
            {view.evidence ? (
              <section>
                <span className={styles.evidenceHead}>
                  <h2 className={styles.caps}>{view.evidence.head}</h2>
                  <LinkButton to={`/operations/agents/${view.agentId}?tab=scorecard&activity=${view.activityId}`} variant="ghost">
                    Open scorecard
                  </LinkButton>
                </span>
                <Table
                  ariaLabel="Shadow evidence"
                  rows={view.evidence.criteria}
                  getRowId={(c) => c.id}
                  columns={[
                    { id: 'c', header: 'Criterion', width: 'minmax(0, 1fr)', render: (c) => c.label },
                    { id: 't', header: 'Target', width: '96px', render: (c) => c.target },
                    { id: 'r', header: 'Result', width: '96px', render: (c) => <span className={styles.result}>{c.result}</span> },
                    {
                      id: 's',
                      header: 'Status',
                      width: '130px',
                      render: (c) =>
                        c.met ? (
                          <span className={styles.met}>
                            <Icon name="check" size={12} color="var(--cs-meta)" /> Met
                          </span>
                        ) : (
                          <StatusChip status="warn" label="Below target" />
                        ),
                    },
                  ]}
                />
              </section>
            ) : (
              <span className={styles.line}>Evidence: {view.evidenceLine}</span>
            )}
          </section>

          <section className={onboarding.card} aria-label="Your signature" data-story-target="sign-signature">
            <h2 className={onboarding.title}>Your signature</h2>
            {view.signed ? (
              <Notice mark="none" lead={`${view.signed.line}.`}>
                {view.signed.reason ? `“${view.signed.reason}”` : 'Signed with every target met.'}
              </Notice>
            ) : !live ? (
              <Notice mark="lock" lead="Closed.">
                This version is no longer in force.
              </Notice>
            ) : (
              <>
                {view.belowTarget ? (
                  <Notice mark="warn" lead={view.belowTarget.split('. ')[0] + '.'}>
                    {view.belowTarget.split('. ').slice(1).join('. ')}
                  </Notice>
                ) : null}
                {view.belowTarget ? (
                  <Field label="Reason for signing below target" htmlFor="sign-reason">
                    <Textarea id="sign-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} readOnly={!allowed} />
                  </Field>
                ) : null}
                <Checkbox checked={accepted} onChange={setAccepted} disabled={!allowed} label={view.accept} />
                <span className={onboarding.monoMeta}>{view.records}</span>
                {returning ? (
                  <div className={onboarding.replyForm}>
                    <Textarea aria-label="Note for the owner" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    <span className={onboarding.runRow}>
                      <Button
                        variant="primary"
                        onClick={() => {
                          const result = returnPrivilegeRequest(privilegeId, note)
                          if (result.ok) navigate(`/operations/agents/${view.agentId}?tab=scorecard&activity=${view.activityId}`)
                          else setError(result.reason)
                        }}
                      >
                        Send back
                      </Button>
                      <Button variant="ghost" onClick={() => setReturning(false)}>
                        Cancel
                      </Button>
                    </span>
                  </div>
                ) : (
                  <span className={onboarding.runRow}>
                    {!allowed ? (
                      <Button locked={lockReason('signPrivilege', state.personaId)}>{view.button}</Button>
                    ) : ready ? (
                      <Button variant="primary" onClick={sign}>
                        {view.button}
                      </Button>
                    ) : (
                      <Button variant="blocked">{view.button}</Button>
                    )}
                    {view.mode === 'sign' ? (
                      allowed ? (
                        <Button onClick={() => setReturning(true)}>Request changes</Button>
                      ) : (
                        <Button locked={lockReason('signPrivilege', state.personaId)}>Request changes</Button>
                      )
                    ) : null}
                    <LinkButton to={view.mode === 'renew' ? '/portfolio/privileges' : `/operations/agents/${view.agentId}?tab=scorecard&activity=${view.activityId}`} variant="ghost">
                      Cancel
                    </LinkButton>
                  </span>
                )}
                {error ? (
                  <span role="alert" className={onboarding.blocked}>
                    {error}
                  </span>
                ) : null}
              </>
            )}
          </section>
        </div>
        <div className={styles.main}>
          {view.mode === 'sign' ? (
            <section className={styles.side} aria-label="What changes when you sign">
              <div className={styles.sideHead}>
                <h2 className={styles.sideTitle}>What changes when you sign</h2>
              </div>
              <ul className={styles.lines}>
                {view.changes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {view.conditions?.rows.length ? (
            <section className={styles.side} aria-label="Conditions">
              <div className={styles.sideHead}>
                <h2 className={styles.sideTitle}>{view.conditions.head}</h2>
              </div>
              <ul className={styles.lines}>
                {view.conditions.rows.map((c) => (
                  <li key={c.id} className={styles.conditionLine}>
                    <span className={onboarding.monoMeta}>{c.id}</span>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  )
}
