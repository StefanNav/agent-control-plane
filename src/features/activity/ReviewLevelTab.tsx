import { useState } from 'react'
import { Button, Icon, Notice, Table } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { RulesModal } from './RulesModal'
import { selectReviewLevel } from './selectors'
import { TightenModal } from './TightenModal'
import styles from './activity.module.css'

type Row = ReturnType<typeof selectReviewLevel>['rows'][number]

/** 13a: the review level, the rules that move it, the last 90 days, and what happens at this level. */
export function ReviewLevelTab({ activityId }: { activityId: string }) {
  const state = useDemo((s) => s)
  const view = selectReviewLevel(state, activityId, state.personaId)
  const [modal, setModal] = useState<'rules' | 'tighten' | null>(null)
  return (
    <>
      <Split
        main={
          <>
            <section className={styles.section} aria-label="Review level">
              <h2 className={styles.caps}>Review level</h2>
              <div className={styles.levels} role="group" aria-label="Review level">
                {view.levels.map((l) => (
                  <div key={l.level} className={styles.level} data-current={l.current}>
                    <span className={styles.levelTop}>
                      <span>{l.title}</span>
                      {l.since ? <span className={styles.levelSince}>{l.since}</span> : null}
                    </span>
                    <span className={styles.rate}>{l.rate}</span>
                  </div>
                ))}
              </div>
              <p className={styles.help}>{view.help}</p>
            </section>
            <section className={styles.section} aria-label="Rules that move the level">
              <div className={styles.sectionHead}>
                <h2 className={styles.caps}>{view.rulesHead}</h2>
                {view.canEditRules ? (
                  <button type="button" className={styles.linkButton} onClick={() => setModal('rules')}>
                    Edit rules
                  </button>
                ) : (
                  <Button variant="ghost" size="sm" locked={lockReason('editReviewRules', state.personaId)}>
                    Edit rules
                  </Button>
                )}
              </div>
              <Table<Row>
                ariaLabel="Rules that move the level"
                rows={view.rows}
                getRowId={(r) => r.id}
                minRowHeight={69}
                columns={[
                  { id: 'move', header: 'Move', width: '150px', render: (r) => <span className={styles.move}>{r.move}</span> },
                  { id: 'rule', header: 'Rule', width: 'minmax(0, 1fr)', render: (r) => <span className={styles.rule}>{r.text}</span> },
                  {
                    id: 'now',
                    header: 'Now',
                    width: '120px',
                    render: (r) => (
                      <span className={styles.now} data-now={r.now}>
                        {r.now === 'fired' ? <Icon name="check" size={12} color="var(--cs-meta)" /> : null}
                        {r.nowLabel}
                      </span>
                    ),
                  },
                  { id: 'counts', header: '', width: '150px', render: (r) => (r.counts ? <span className={styles.counts}>{r.counts}</span> : null) },
                ]}
              />
            </section>
            <Notice
              mark="lock"
              lead="Loosening happens only by rule."
              actions={
                view.canTighten && !view.tightened ? (
                  <Button variant="ghost" size="sm" onClick={() => setModal('tighten')}>
                    Tighten now…
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" locked={view.tightened ? 'Already at Tightened' : lockReason('tightenReview', state.personaId)}>
                    Tighten now…
                  </Button>
                )
              }
            >
              You can tighten by hand at any time, with a reason; the rules then bring it back.
            </Notice>
            <section className={styles.section} aria-label="Last 90 days">
              <h2 className={styles.caps}>Last 90 days</h2>
              <div className={styles.bar}>
                {view.bar.map((b, i) => (
                  <div key={`${b.level}-${i}`} className={styles.segment} style={{ flex: `${b.share} 1 0` }}>
                    <span className={styles.segmentBar} data-level={b.level} />
                    <span className={styles.segmentText}>
                      <span>{b.label}</span>
                      <span className={styles.segmentDate}>{b.date}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        }
        side={
          <>
            <section className={styles.side} aria-label={view.at.title}>
              <div className={styles.sideHead}>
                <h2 className={styles.sideTitle}>{view.at.title}</h2>
                <span className={styles.sideSub}>{view.at.sub}</span>
              </div>
              <dl className={styles.facts}>
                {view.at.rows.map(([k, v]) => (
                  <div key={k} className={styles.fact}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.sideNote}>
                <strong>A defect</strong> is a signed output that’s wrong: the agent erred and the reviewer didn’t catch it.
              </p>
            </section>
            <section className={styles.side} aria-label="Level changes">
              <div className={styles.sideHead}>
                <h2 className={styles.sideTitle}>Level changes</h2>
                <span className={styles.sideSub}>{view.told}</span>
              </div>
              <ul className={styles.changes} aria-label="Level changes">
                {view.changes.map((c, i) => (
                  <li key={i} className={styles.change}>
                    <span className={styles.changeDate}>{c.date}</span>
                    <span className={styles.changeText}>
                      <span className={styles.changeTitle}>{c.title}</span>
                      <span className={styles.changeSub}>{c.sub}</span>
                    </span>
                  </li>
                ))}
                {view.changes.length ? null : <li className={styles.changeSub}>No changes yet.</li>}
              </ul>
            </section>
          </>
        }
      />
      {modal === 'tighten' ? <TightenModal activityId={activityId} activityName={view.activityName} onClose={() => setModal(null)} /> : null}
      {modal === 'rules' ? <RulesModal activityId={activityId} rules={view.rules} onClose={() => setModal(null)} /> : null}
    </>
  )
}
