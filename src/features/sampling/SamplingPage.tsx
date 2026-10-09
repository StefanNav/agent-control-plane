import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { SamplingDraw } from '../../data/types'
import { Button, Field, Icon, Notice, RadioCardGroup, Table, Tabs, Textarea } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { OPTIONS, selectSampling, type SamplingTab } from './selectors'
import styles from './sampling.module.css'

type Result = NonNullable<SamplingDraw['result']>
type View = ReturnType<typeof selectSampling>

/** 13b: Marcus checks a random sample instead of everything; each result counts toward the rules. */
export function SamplingPage() {
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const tab = (['today', 'week', 'rules'].find((t) => t === params.get('tab')) ?? 'today') as SamplingTab
  const view = selectSampling(state, state.personaId, tab, params.get('draw'))
  const select = (id: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('draw', id)
        return p
      },
      { replace: true },
    )
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.status}
        tabs={<Tabs ariaLabel="Sampling sections" current={tab} items={view.tabs} />}
      />
      {tab === 'today' ? (
        <div className={styles.layout}>
          <nav className={styles.list} aria-label="Drawn today">
            <div className={styles.listHead}>
              <h2 className={styles.caps}>{view.head}</h2>
              <span>{view.drawnAt}</span>
            </div>
            {view.groups.map((g) => (
              <div key={g.activityId}>
                <div className={styles.group}>
                  <span className={styles.groupTitle}>{g.title}</span>
                  <span className={styles.meta}>{g.sub}</span>
                </div>
                {g.rows.map((r) => (
                  <button key={r.id} type="button" className={styles.row} aria-current={r.id === view.detail?.id} onClick={() => select(r.id)}>
                    {r.checked ? <Icon name="check" size={12} color="var(--cs-meta)" /> : <span className={styles.box} aria-label="To check" />}
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>
                        <span className={styles.code}>{r.title.split(' · ')[0]}</span> · {r.title.split(' · ')[1]}
                      </span>
                      <span className={styles.meta}>{r.sub}</span>
                    </span>
                    <span className={styles.time}>{r.time}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          {view.detail ? <Check key={view.detail.id} detail={view.detail} onDone={(next) => next && select(next)} /> : null}
        </div>
      ) : tab === 'week' ? (
        <div className={styles.body}>
          <Table
            ariaLabel="Checked this week"
            rows={view.week.rows}
            getRowId={(r) => r.id}
            columns={[
              { id: 'code', header: 'Action', width: '120px', render: (r) => <span className={styles.mono}>{r.code}</span> },
              { id: 'activity', header: 'Activity', width: 'minmax(0, 1fr)', render: (r) => r.activity },
              { id: 'result', header: 'Result', width: '200px', render: (r) => r.result },
              { id: 'by', header: 'By', width: '120px', render: (r) => r.by },
              { id: 'time', header: 'Time', width: '80px', render: (r) => <span className={styles.mono}>{r.time}</span> },
            ]}
          />
          <span className={styles.meta}>{view.week.earlier}</span>
        </div>
      ) : (
        <div className={styles.body}>
          <Table
            ariaLabel="Activities off Normal review"
            rows={view.rules}
            getRowId={(r) => r.id}
            columns={[
              { id: 'activity', header: 'Activity', width: 'minmax(0, 1fr)', render: (r) => <Link className={styles.link} to={r.to}>{r.activity}</Link> },
              { id: 'level', header: 'Review level', width: '200px', render: (r) => r.level },
            ]}
          />
          {view.units.length ? (
            <Notice mark="none" lead="Unit checks running.">
              {view.units.join(' · ')}
            </Notice>
          ) : null}
        </div>
      )}
    </>
  )
}

/** One drawn output: what was signed, its sources, and the independent check (13b's right side). */
function Check({ detail, onDone }: { detail: NonNullable<View['detail']>; onDone: (next: string | null) => void }) {
  const state = useDemo((s) => s)
  const record = useDemo((s) => s.recordCheck)
  const [result, setResult] = useState<Result>('right')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const id = useId()
  const save = () => {
    const outcome = record(detail.id, { result, note })
    if (!outcome.ok) return setError(outcome.reason)
    onDone(detail.next)
  }
  return (
    <section className={styles.detail} aria-label={detail.title}>
      <div className={styles.detailHead}>
        <span className={styles.mono}>{detail.meta}</span>
        <h2 className={styles.title}>{detail.title}</h2>
      </div>
      <Table
        ariaLabel="Agent output and sources"
        rows={detail.lines}
        getRowId={(l) => l.output}
        minRowHeight={69}
        columns={[
          {
            id: 'output',
            header: 'Agent output, signed as is',
            width: 'minmax(0, 2fr)',
            render: (l) => (
              <span className={styles.pair}>
                <span className={styles.output}>{l.output}</span>
                <span className={styles.meta}>{l.outputSub}</span>
              </span>
            ),
          },
          { id: 'source', header: 'Source', width: 'minmax(0, 1.5fr)', render: (l) => <span className={styles.source}>{l.source}</span> },
          { id: 'chart', header: 'In the chart now', width: 'minmax(0, 1fr)', render: (l) => <span className={styles.chart}>{l.chart}</span> },
        ]}
      />
      {detail.result ? (
        <Notice mark="none" lead={`${detail.result.label}.`}>
          {`Checked by ${detail.result.by} at ${detail.result.at}.${detail.result.note ? ` ${detail.result.note}` : ''}`}
        </Notice>
      ) : (
        <>
          <div className={styles.question} data-story-target="sampling-check">
            <div className={styles.questionHead}>
              <strong>Was this right as signed?</strong>
              <span>{detail.independent}</span>
            </div>
            <RadioCardGroup<Result>
              name="check"
              aria-label="Was this right as signed?"
              value={result}
              onChange={setResult}
              options={OPTIONS.map((o) => ({ ...o, disabled: !detail.canRecord }))}
            />
          </div>
          <Field label="Note" htmlFor={id} hint="Optional">
            <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Notice mark="none" lead={detail.notice.lead}>
            {detail.notice.text}
          </Notice>
        </>
      )}
      <div className={styles.foot}>
        {detail.result ? null : detail.canRecord ? (
          <Button variant="primary" onClick={save}>
            Record check
          </Button>
        ) : (
          <Button locked={lockReason('recordCheck', state.personaId)}>Record check</Button>
        )}
        {detail.next ? (
          <Button variant="ghost" onClick={() => onDone(detail.next)}>
            {detail.result ? 'Next' : 'Skip'}
          </Button>
        ) : null}
        {error ? (
          <span role="alert" className={styles.meta}>
            {error}
          </span>
        ) : null}
        <span className={styles.footNote}>{detail.foot}</span>
      </div>
    </section>
  )
}
