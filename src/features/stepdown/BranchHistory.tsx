import { AutonomyLadder } from '../../components'
import { Button, Notice, ProgressBar, Table } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { selectBranchHistory } from './selectors'
import styles from './stepdown.module.css'

type Row = NonNullable<ReturnType<typeof selectBranchHistory>>['rows'][number]

/** 15b: a branch's levels over time, the re-validation after a new build, and the way back up. */
export function BranchHistory({ activityId, branchId }: { activityId: string; branchId: string }) {
  const state = useDemo((s) => s)
  const restore = useDemo((s) => s.restoreLevel)
  const view = selectBranchHistory(state, activityId, branchId, state.personaId)
  if (!view) return null
  const first = view.rows[0]
  return (
    <Split
      main={
        <>
          {view.notice ? <Notice lead={view.notice.lead}>{view.notice.text}</Notice> : null}
          {view.revalidation ? (
            <section className={styles.section} aria-label="Re-validation">
              <h2 className={styles.caps}>{view.revalidation.head}</h2>
              <div className={styles.card}>
                <span className={styles.progressHead}>
                  <strong>{view.revalidation.progress}</strong>
                  <span className={styles.meta}>{view.revalidation.left}</span>
                </span>
                <ProgressBar value={view.revalidation.ratio} label={view.revalidation.progress} width={880} />
                <div className={styles.stats}>
                  {view.revalidation.stats.map((x) => (
                    <span key={x.label} className={styles.stat}>
                      <span className={styles.meta}>{x.label}</span>
                      <span className={styles.statValue}>{x.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
          <section className={styles.section} aria-label="History">
            <h2 className={styles.caps}>History</h2>
            <Table<Row>
              ariaLabel="History"
              rows={view.rows}
              getRowId={(r) => r.at}
              selectedId={first?.at ?? null}
              minRowHeight={68}
              columns={[
                { id: 'date', header: 'When', width: '120px', render: (r) => <span className={styles.date}>{r.date}</span> },
                {
                  id: 'what',
                  header: 'What',
                  width: 'minmax(0, 1fr)',
                  render: (r) => (
                    <span className={styles.pair}>
                      <span className={styles.title}>{r.title}</span>
                      <span className={styles.meta}>{r.sub}</span>
                    </span>
                  ),
                },
                {
                  id: 'level',
                  header: 'Level',
                  width: '320px',
                  render: (r) => (
                    <span className={styles.ladder}>
                      <AutonomyLadder variant="compact" size="wide" labels={r === first} steps={r.ladder} />
                    </span>
                  ),
                },
              ]}
              hideHeader
            />
          </section>
          {view.restore ? (
            <div className={styles.restore} data-story-target="branch-restore">
              {view.restore.locked ? (
                <Button locked={view.restore.locked}>{view.restore.label}</Button>
              ) : (
                <Button variant="primary" onClick={() => restore(view.restore!.id)}>
                  {view.restore.label}
                </Button>
              )}
              <span>
                <strong>{view.restore.lead}</strong> {view.restore.text}
              </span>
            </div>
          ) : null}
        </>
      }
      side={
        <section className={styles.side} aria-label="Step-down triggers on this branch">
          <div className={styles.pair}>
            <h2 className={styles.sideTitle}>Step-down triggers on this branch</h2>
            <span className={styles.sideSub}>{view.triggersSub}</span>
          </div>
          <ul className={styles.triggers}>
            {view.triggers.map((t) => (
              <li key={t.text} className={styles.trigger} data-fired={Boolean(t.fired)}>
                <span className={styles.pair}>
                  <span className={styles.triggerText}>{t.text}</span>
                  {t.fired ? <span className={styles.meta}>{t.fired}</span> : null}
                </span>
                <span className={styles.triggerTo}>{t.to}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            <strong>One level at a time.</strong> Supervised drops to Draft, Draft to Shadow. Nothing steps up by itself.
          </p>
        </section>
      }
    />
  )
}
