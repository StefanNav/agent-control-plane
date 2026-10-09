import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, LinkButton } from '../../design-system'
import { cx } from '../../lib/cx'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { can } from '../../store/permissions'
import { selectCase } from './selectors'
import styles from './golive.module.css'

/** A sample case: the agent's draft and the pharmacist's final list, line by line (3b). */
export function CasePage() {
  const { agentId = '', caseId = '' } = useParams()
  const state = useDemo((s) => s)
  const flagCaseLine = useDemo((s) => s.flagCaseLine)
  const view = useMemo(() => selectCase(state, agentId, caseId), [state, agentId, caseId])
  const [flagged, setFlagged] = useState(false)
  if (!view) return <NotFound />
  const base = `/operations/agents/${agentId}/cases`
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.admitted}
        idLine={view.ids}
        chips={<StatusChip status={view.agrees ? 'normal' : 'warn'} label={view.chip} />}
        actions={
          <>
            {view.prev ? <LinkButton to={`${base}/${view.prev}`}>Previous case</LinkButton> : <Button locked="This is the first case">Previous case</Button>}
            {view.next ? <LinkButton to={`${base}/${view.next}`}>Next case</LinkButton> : <Button locked="This is the last case">Next case</Button>}
          </>
        }
      />
      <div className={styles.layout}>
        <div className={styles.main}>
          <span className={styles.line}>{view.source}</span>
          <div className={styles.compare} role="table" aria-label="Agent draft and pharmacist’s final list">
            <div className={styles.compareHead} role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Agent draft</span>
              <span role="columnheader">Pharmacist’s final list</span>
              <span role="columnheader">Result</span>
              <span role="columnheader">Source the agent used</span>
            </div>
            {view.lines.map((l) => (
              <div key={l.n} role="row" className={cx(styles.compareRow, l.differs && styles.differs)}>
                <span role="cell" className={styles.num}>
                  {l.n}
                </span>
                <span role="cell" className={l.missing ? styles.missing : undefined}>
                  {l.agent}
                </span>
                <span role="cell">{l.pharmacist}</span>
                <span role="cell">
                  {l.result === 'Agrees' ? (
                    <span className={styles.agrees}>
                      <Icon name="check" size={12} color="var(--cs-meta)" />
                      Agrees
                    </span>
                  ) : (
                    <StatusChip status="warn" label={l.result} />
                  )}
                </span>
                <span role="cell" className={styles.src}>
                  {l.source}
                </span>
              </div>
            ))}
          </div>
          <span className={styles.line}>{view.totals}</span>
        </div>
        <section className={styles.side} aria-label="Why lines differ">
          {view.notes.length ? (
            view.notes.map((note, i) => (
              <div key={note.title} className={styles.note} style={i === 0 ? { borderTop: 0 } : undefined}>
                <strong>{note.title}</strong>
                <span>{note.text}</span>
              </div>
            ))
          ) : (
            <div className={styles.note} style={{ borderTop: 0 }}>
              <strong>Every line agrees</strong>
              <span>Nothing to explain in this case.</span>
            </div>
          )}
          <div className={styles.foot}>
            {view.traceId ? <LinkButton to={`/operations/actions/${view.traceId}`}>Open trace {view.traceId.toUpperCase()}</LinkButton> : null}
            {view.flaggable ? (
              can(state, state.personaId, 'editJobDescription', { agentId }) ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (flagCaseLine(caseId, view.flaggable!).ok) setFlagged(true)
                  }}
                >
                  {flagged ? 'Flagged for SOP' : 'Flag for SOP'}
                </Button>
              ) : null
            ) : null}
            {flagged ? <span>Logged; the technical owner is asked to check the SOP mapping.</span> : null}
          </div>
        </section>
      </div>
    </>
  )
}
