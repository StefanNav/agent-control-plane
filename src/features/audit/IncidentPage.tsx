import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Field, Icon, Modal, RuleTag, Textarea } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { selectIncident } from './selectors'
import styles from './incident.module.css'

/** The incident record (7c): commander, timeline, root cause and corrections; closes when corrections are done. */
export function IncidentPage() {
  const { incidentId = '' } = useParams()
  const state = useDemo((s) => s)
  const { addIncidentEntry, completeCorrection, closeIncident } = useDemo.getState()
  const inc = selectIncident(state, state.personaId, incidentId)
  const [entry, setEntry] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [reason, setReason] = useState('')
  if (!inc) return <NotFound />
  return (
    <>
      <PageHeader
        breadcrumb={`Operations / Incidents / ${inc.code}`}
        title={inc.title}
        status={inc.statusLine}
        idLine={inc.code}
        chips={<StatusChip status={inc.chip.status} label={inc.chip.label} size="header" />}
        people={inc.people}
      />
      <div className={styles.split}>
        <div className={styles.record}>
          <section className={styles.section}>
            <h2 className={styles.label}>Summary</h2>
            <p className={styles.prose}>{inc.summary}</p>
          </section>
          {inc.linked.length ? (
            <section className={styles.section}>
              <h2 className={styles.label}>Linked actions</h2>
              <table className={styles.table} aria-label="Linked actions">
                <tbody>
                  {inc.linked.map((a) => (
                    <tr key={a.id}>
                      <td className={styles.code}>
                        <Link to={`/operations/actions/${a.id}`}>{a.code}</Link>
                      </td>
                      <td>{a.what}</td>
                      <td>
                        {a.rule ? (
                          <span className={styles.policy}>
                            <RuleTag>{a.rule}</RuleTag> blocked
                          </span>
                        ) : (
                          a.policy
                        )}
                      </td>
                      <td>{a.reviewer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {inc.rootCause ? (
            <section className={styles.section}>
              <h2 className={styles.label}>Root cause · {inc.rootCauseBy}</h2>
              <p className={styles.prose}>{inc.rootCause}</p>
            </section>
          ) : null}
          {inc.corrections.length ? (
            <section className={styles.section} data-story-target="incident-corrections">
              <h2 className={styles.label}>Corrections</h2>
              <table className={styles.table} aria-label="Corrections">
                <tbody>
                  {inc.corrections.map((c) => (
                    <tr key={c.id}>
                      <td className={styles.mark}>
                        {c.done ? (
                          <Icon name="check" size={12} color="var(--cs-ink)" />
                        ) : (
                          <span className={styles.box} aria-label="Open" />
                        )}
                      </td>
                      <td className={styles.correction}>
                        <span>{c.text}</span>
                        {c.sub ? <span className={styles.sub}>{c.sub}</span> : null}
                      </td>
                      <td>{c.owner}</td>
                      <td className={styles.status}>
                        {c.status}
                        {c.canComplete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => completeCorrection(inc.id, c.id)}
                          >
                            Mark done
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {inc.close ? (
            <div className={styles.foot}>
              <Button
                variant={inc.close.allowed ? 'secondary' : 'blocked'}
                aria-disabled={!inc.close.allowed}
                aria-describedby="incident-close"
                onClick={() => setClosing(true)}
              >
                Close incident
              </Button>
              <span id="incident-close" className={styles.footText}>
                <strong>{inc.close.lead}</strong> {inc.close.text}
              </span>
            </div>
          ) : null}
        </div>
        <aside aria-label="Timeline" className={styles.timelineCard}>
          <div className={styles.timelineHead}>
            <span className={styles.timelineTitle}>Timeline</span>
            <span className={styles.timelineSub}>{inc.timelineSub}</span>
          </div>
          <ol className={styles.timeline}>
            {inc.timeline.map((t, i) => (
              <li key={`${t.at}-${i}`}>
                <span className={styles.at}>{t.at}</span>
                <span className={styles.what}>
                  <span>{t.title}</span>
                  {t.sub ? <span className={styles.sub}>{t.sub}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          <div className={styles.timelineFoot}>
            {entry === null ? (
              <Button variant="ghost" onClick={() => setEntry('')}>
                Add an entry
              </Button>
            ) : (
              <div className={styles.entry}>
                <Field label="Entry" htmlFor="incident-entry">
                  <Textarea
                    id="incident-entry"
                    rows={2}
                    value={entry}
                    onChange={(event) => setEntry(event.target.value)}
                  />
                </Field>
                <span className={styles.entryButtons}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => addIncidentEntry(inc.id, entry).ok && setEntry(null)}
                  >
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEntry(null)}>
                    Cancel
                  </Button>
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
      {closing ? (
        <Modal
          open
          onClose={() => setClosing(false)}
          title={`Close ${inc.code}?`}
          description="Every correction is done. The sponsor is told."
          actions={
            <>
              <Button variant="ghost" onClick={() => setClosing(false)}>
                Cancel
              </Button>
              <Button
                variant={reason.trim() ? 'primary' : 'blocked'}
                aria-disabled={!reason.trim()}
                onClick={() => closeIncident(inc.id, reason).ok && setClosing(false)}
              >
                Close incident
              </Button>
            </>
          }
        >
          <Field label="Reason" htmlFor="incident-close-reason" hint="Required">
            <Textarea
              id="incident-close-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </Modal>
      ) : null}
    </>
  )
}
