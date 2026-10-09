import { useState } from 'react'
import { StatusChip } from '../../components'
import { Button, Icon, Notice, RuleTag, Table } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { selectChanges } from './selectors'
import styles from './changes.module.css'

type ChangesView = NonNullable<ReturnType<typeof selectChanges>>

/** 9a: what changed in a held build, and how its owner re-validates it before it serves. */
export function ChangesTab({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const view = selectChanges(state, agentId, state.personaId)
  if (!view) return null
  return (
    <Split
      main={
        <>
          <Notice mark={view.status === 'held' ? 'review' : 'none'} lead={view.notice.lead}>
            {view.notice.text}
          </Notice>
          <section className={styles.section} aria-label={view.tableHead}>
            <h2 className={styles.caps}>{view.tableHead}</h2>
            <Table
              ariaLabel={view.tableHead}
              rows={view.rows}
              getRowId={(r) => r.item}
              minRowHeight={60}
              columns={[
                { id: 'item', header: view.columns[0]!, width: '170px', render: (r) => <span className={styles.strong}>{r.item}</span> },
                { id: 'live', header: view.columns[1]!, width: 'minmax(0, 1fr)', render: (r) => <Pair main={r.live} sub={r.liveSub} /> },
                { id: 'held', header: view.columns[2]!, width: 'minmax(0, 1fr)', render: (r) => <Pair main={r.held} sub={r.heldSub} /> },
                { id: 'needs', header: view.columns[3]!, width: '170px', render: (r) => r.needs },
              ]}
            />
          </section>
          <section className={styles.section} aria-label={view.sop.head}>
            <span className={styles.sectionHead}>
              <h2 className={styles.caps}>{view.sop.head}</h2>
              <span className={styles.meta}>{view.sop.count}</span>
            </span>
            <div className={styles.card}>
              {view.sop.sections.map((sec) => (
                <div key={sec.section} className={styles.diffBlock}>
                  <span className={styles.diffTitle}>
                    <span className={styles.mono}>{sec.section}</span> <strong>{sec.title}</strong>
                  </span>
                  {sec.removed ? <DiffLine kind="removed">{sec.removed}</DiffLine> : null}
                  {sec.kept ? <DiffLine kind="kept">{sec.kept}</DiffLine> : null}
                  <DiffLine kind="added">{sec.added}</DiffLine>
                </div>
              ))}
            </div>
          </section>
          {view.hardStop ? (
            <section className={styles.section} aria-label="Hard stop">
              <h2 className={styles.caps}>Hard stop</h2>
              <div className={styles.card}>
                <div className={styles.hsHead}>
                  <Icon name="lock" color="var(--cs-ink)" />
                  <span className={styles.mono}>{view.hardStop.code}</span>
                  <strong>{view.hardStop.title}</strong>
                  <span className={styles.push}>
                    {view.hardStop.approved ? <span className={styles.meta}>{view.hardStop.chip}</span> : <StatusChip status="review" label={view.hardStop.chip} />}
                  </span>
                </div>
                <div className={styles.diffBlock}>
                  <DiffLine kind="removed">{`${view.hardStop.from} · ${view.hardStop.removed}`}</DiffLine>
                  <DiffLine kind="added">{`${view.hardStop.to} · ${view.hardStop.added}`}</DiffLine>
                </div>
                <span className={styles.hsFoot}>{view.hardStop.foot}</span>
              </div>
            </section>
          ) : null}
        </>
      }
      side={<Revalidate view={view} />}
    />
  )
}

function Pair({ main, sub }: { main: string; sub: string }) {
  return (
    <span className={styles.pair}>
      <span>{main}</span>
      <span className={styles.meta}>{sub}</span>
    </span>
  )
}

function DiffLine({ kind, children }: { kind: 'removed' | 'kept' | 'added'; children: string }) {
  return (
    <span className={styles[kind]}>
      <span className={styles.sign} aria-hidden="true">
        {kind === 'removed' ? '−' : kind === 'added' ? '+' : ''}
      </span>
      {kind === 'removed' ? <s>{children}</s> : <span>{children}</span>}
      <span className={styles.srOnly}>{kind === 'removed' ? ' (removed)' : kind === 'added' ? ' (added)' : ''}</span>
    </span>
  )
}

/** The side panel: the checks, replay and accept; what it does to the activities; the release note; the timeline. */
function Revalidate({ view }: { view: ChangesView }) {
  const startReplay = useDemo((s) => s.startReplay)
  const signOffSystems = useDemo((s) => s.signOffSystems)
  const approveChangeHardStop = useDemo((s) => s.approveChangeHardStop)
  const acceptChange = useDemo((s) => s.acceptChange)
  const [error, setError] = useState<string>()
  const run = (fn: (id: string) => { ok: boolean; reason?: string }) => {
    const result = fn(view.changeId)
    setError(result.ok ? undefined : result.reason)
  }
  return (
    <>
      <section className={styles.side} aria-label={view.revalidate.title} data-story-target="changes-revalidate">
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>{view.revalidate.title}</h2>
          <span className={styles.sub}>{view.revalidate.sub}</span>
        </div>
        <div className={styles.sideBlock}>
          <span className={styles.fact}>
            <span>Cases to replay</span>
            <span>{view.revalidate.cases}</span>
          </span>
          <span className={styles.fact}>
            <span>Estimated time</span>
            <span>{view.revalidate.estimate}</span>
          </span>
        </div>
        <ul className={styles.checks} aria-label="Checks">
          {view.checks.map((c) => (
            <li key={c.id} className={styles.check}>
              <span className={c.done ? styles.boxDone : styles.box} aria-hidden="true">
                {c.done ? <Icon name="check" size={10} color="var(--cs-on-acc)" /> : null}
              </span>
              <span className={styles.checkLabel}>
                {c.label}
                {c.doneLine ? <span className={styles.meta}>{c.doneLine}</span> : null}
              </span>
              {c.action ? (
                <Button onClick={() => run(c.id === 'hardStop' ? approveChangeHardStop : signOffSystems)}>{c.action}</Button>
              ) : (
                <span className={styles.who}>{c.who}</span>
              )}
            </li>
          ))}
        </ul>
        {view.replayResult ? (
          <ul className={styles.result} aria-label="Replay result">
            {view.replayResult.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}
        {view.status === 'held' ? (
          <div className={styles.sideBlock}>
            <span className={styles.actions}>
              {view.canReplay ? (
                <Button variant="primary" onClick={() => run(startReplay)}>
                  Start replay
                </Button>
              ) : view.replayResult ? null : (
                <Button locked={view.replayLocked ?? 'Already done'}>Start replay</Button>
              )}
              {view.accept.allowed ? (
                <Button variant={view.canReplay ? undefined : 'primary'} onClick={() => run(acceptChange)}>
                  {view.acceptLabel}
                </Button>
              ) : (
                <Button locked={view.accept.reason!}>{view.acceptLabel}</Button>
              )}
            </span>
            {error ? (
              <span role="alert" className={styles.meta}>
                {error}
              </span>
            ) : null}
            {view.withdraw ? (
              <span className={styles.sub}>
                <strong className={styles.strong}>{view.withdraw.lead}</strong> {view.withdraw.text}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={styles.side} aria-label="Effect on activities">
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>Effect on activities</h2>
        </div>
        <div className={styles.sideBlock}>
          {view.effects.map(([name, effect]) => (
            <span key={name} className={styles.fact}>
              <span>{name}</span>
              <span className={styles.meta}>{effect}</span>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.side} aria-label={view.release.head}>
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>{view.release.head}</h2>
        </div>
        <div className={styles.sideBlock}>
          <span className={styles.sub}>{view.release.text}</span>
          {view.release.flag ? (
            <span className={styles.sub}>
              <RuleTag>{view.release.flag}</RuleTag> {view.release.more}
            </span>
          ) : null}
        </div>
      </section>

      <section className={styles.side} aria-label="Timeline">
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>Timeline</h2>
        </div>
        <ol className={styles.timeline}>
          {view.timeline.map((t) => (
            <li key={`${t.at}-${t.title}`}>
              <span className={styles.mono}>{t.at}</span>
              <span className={styles.pair}>
                <span>{t.title}</span>
                <span className={styles.meta}>{t.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
