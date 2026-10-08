import { useId, useState } from 'react'
import { StatusChip } from '../../components'
import { Button, Field, Icon, Notice, Textarea } from '../../design-system'
import { cx } from '../../lib/cx'
import { useDemo } from '../../store'
import { selectResumePanel } from './selectors'
import styles from './resume.module.css'

/** Two-person resume on a paused agent (6d, 6e): ask, wait, or decide, each with a reason. */
export function ResumePanel({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const { requestResume, approveResume, declineResume, withdrawResume } = useDemo.getState()
  const view = selectResumePanel(state, state.personaId, agentId)
  const [reason, setReason] = useState('')
  const [refused, setRefused] = useState<string | null>(null)
  const statusId = useId()
  if (!view) return null
  const ready = reason.trim().length > 0
  const run = (result: { ok: boolean; reason?: string }) => {
    if (result.ok) {
      setReason('')
      setRefused(null)
    } else setRefused(result.reason ?? 'Not allowed')
  }

  return (
    <section aria-label="Resume" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{view.title}</h2>
        <span className={styles.stamp}>{view.stamp}</span>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Needs both</span>
        <div className={styles.needs}>
          {view.needs.map((n) => (
            <div key={n.who} className={cx(styles.need, n.current && styles.needCurrent)}>
              {n.done ? <Icon name="check" size={14} color="var(--cs-ink)" /> : <span className={styles.box} aria-hidden="true" />}
              <span className={styles.needText}>
                <span className={styles.needWho}>{n.who}</span>
                <span className={styles.needStatus}>{n.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {view.mode !== 'approve' ? (
        <div className={styles.section}>
          <span className={styles.label}>Returns to</span>
          <table className={styles.table}>
            <tbody>
              {view.returnsTo.map((r) => (
                <tr key={r.activity}>
                  <th scope="row">{r.activity}</th>
                  <td>{r.status === 'shadow' ? <StatusChip status="shadow" label={r.level} /> : r.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view.quote ? (
        <div className={styles.section}>
          <span className={styles.label}>{view.reasonLabel}</span>
          <p className={styles.quote}>{view.quote}</p>
        </div>
      ) : null}

      {view.mode === 'approve' ? (
        <div className={styles.section}>
          <span className={styles.label}>What changed since the pause</span>
          {view.changes.length ? (
            <table className={styles.table}>
              <tbody>
                {view.changes.map((c) => (
                  <tr key={c.title}>
                    <th scope="row">{c.title}</th>
                    <td className={styles.sub}>{c.sub}</td>
                    <td className={styles.sub}>{c.meta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>Nothing recorded since the pause.</p>
          )}
        </div>
      ) : null}

      {view.mode === 'request' || view.mode === 'approve' ? (
        <Field label={view.mode === 'approve' ? 'Your reason' : 'Reason'} htmlFor={`${statusId}-reason`} hint="Required">
          <Textarea id={`${statusId}-reason`} rows={2} className={styles.reason} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      ) : null}

      {refused ? (
        <Notice mark="crit" lead="Not done.">
          {refused}
        </Notice>
      ) : null}

      <div className={styles.foot}>
        <span className={styles.buttons}>
          {view.mode === 'waiting' ? (
            <>
              <Button variant="blocked" aria-describedby={statusId}>
                Resume
              </Button>
              <span id={statusId} className={styles.status}>
                {view.statusLine}
              </span>
            </>
          ) : view.mode === 'approve' ? (
            <>
              <Button variant={ready ? 'primary' : 'blocked'} aria-disabled={!ready} onClick={() => run(approveResume(agentId, reason))}>
                Approve and resume
              </Button>
              <Button variant={ready ? 'secondary' : 'blocked'} aria-disabled={!ready} onClick={() => run(declineResume(agentId, reason))}>
                Decline
              </Button>
            </>
          ) : view.mode === 'request' ? (
            <>
              <Button variant={ready ? 'primary' : 'blocked'} aria-disabled={!ready} onClick={() => run(requestResume(agentId, reason))}>
                Request resume
              </Button>
              <span className={styles.status}>{view.statusLine}</span>
            </>
          ) : (
            <span className={styles.status}>{view.statusLine}</span>
          )}
        </span>
        {view.mode === 'waiting' ? (
          <Button variant="ghost" onClick={() => run(withdrawResume(agentId))}>
            Withdraw request
          </Button>
        ) : view.mode === 'approve' ? (
          <span className={styles.stamp}>Resumes at the gateway within seconds</span>
        ) : null}
      </div>
    </section>
  )
}
