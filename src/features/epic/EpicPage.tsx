import { useState } from 'react'
import { useDemo } from '../../store'
import { AgentPanel } from './AgentPanel'
import { selectEpic } from './selectors'
import styles from './epic.module.css'

/** What the stand-in's own buttons say: they belong to Epic, not to the prototype (R13). */
const STAND_IN = 'Stand-in for Epic. Only the panel on the right is part of the prototype.'

/**
 * E10: the pharmacist's verification screen in Epic, drawn as a neutral stand-in. Only the
 * right-hand Med Rec Agent panel is ours (10a, 10b).
 */
export function EpicPage() {
  const state = useDemo((s) => s)
  const view = selectEpic(state, state.personaId)
  const [note, setNote] = useState(false)
  if (!view) {
    return (
      <div className={styles.ehr}>
        <div className={styles.bar}>
          <strong>EHR · Pharmacist verification</strong>
          <span>Neutral stand-in for Epic, not its real interface</span>
        </div>
        <p className={styles.empty}>No drafts to verify.</p>
      </div>
    )
  }
  return (
    <div className={styles.ehr}>
      <div className={styles.bar}>
        <strong>EHR · Pharmacist verification</strong>
        <span>Neutral stand-in for Epic, not its real interface</span>
      </div>
      <div className={styles.band}>
        <h1 className={styles.patient}>{view.patient.name}</h1>
        {view.patient.facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
      <div className={styles.body}>
        <main className={styles.main}>
          <div className={styles.listHead}>
            <div>
              <h2 className={styles.listTitle}>Home medications · prior to admission</h2>
              <span className={styles.listSub}>{view.subline}</span>
            </div>
            <div className={styles.ehrButtons}>
              {['Add medication', 'Mark reviewed', 'Verify list'].map((b) => (
                <button key={b} type="button" className={styles.ehrButton} onClick={() => setNote(true)}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          {note ? (
            <p role="status" className={styles.standIn}>
              {STAND_IN}
            </p>
          ) : null}
          <table className={styles.table} aria-label="Home medications">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dose</th>
                <th>Route</th>
                <th>Frequency</th>
                <th>Last taken</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((r) => (
                <tr key={r.med} className={r.was ? styles.edited : undefined}>
                  <td>{r.med}</td>
                  <td>{r.dose}</td>
                  <td>{r.route}</td>
                  <td>
                    {r.was ? (
                      <span className={styles.editCell}>
                        <s>{r.was}</s>
                        <span>
                          {r.frequency} {r.editedByYou ? <em>edited by you</em> : null}
                        </span>
                      </span>
                    ) : (
                      r.frequency
                    )}
                  </td>
                  <td>{r.lastTaken}</td>
                  <td>{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
        <AgentPanel view={view} />
      </div>
    </div>
  )
}
