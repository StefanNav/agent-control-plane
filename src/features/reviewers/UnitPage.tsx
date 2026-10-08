import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import type { ReviewChange } from '../../data/types'
import { Button, LinkButton, Notice, RadioCardGroup, RuleTag, Table, Textarea } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { Split } from '../../layout/layouts'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { DivisionTabs } from '../board/DivisionTabs'
import { selectUnit } from './selectors'
import styles from './reviewers.module.css'

const OPTIONS: ReviewChange['option'][] = ['sampling', 'tighten', 'minTime']

/** 11b: one unit by shift; the misses the independent check found; the response Priya signs. */
export function UnitPage() {
  const { unitId = '' } = useParams()
  const [params] = useSearchParams()
  const state = useDemo((s) => s)
  const respond = params.get('respond')
  const view = selectUnit(state, unitId, state.personaId, OPTIONS.find((o) => o === respond) ?? null)
  if (!view) return <NotFound />
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.sub}
        actions={<LinkButton to={`/operations/reviewers?division=${view.divisionId}`}>All units</LinkButton>}
        tabs={<DivisionTabs divisionId={view.divisionId} current="reviewers" />}
      />
      <Split
        main={
          <>
            {view.note ? (
              <Notice mark="warn" lead={view.note.lead}>
                {view.note.text}
              </Notice>
            ) : null}
            <section className={styles.section} aria-label="By shift">
              <h2 className={styles.caps}>By shift · last 4 weeks</h2>
              <Table
                ariaLabel="By shift"
                rows={view.shifts}
                getRowId={(r) => r.name}
                minRowHeight={56}
                columns={[
                  {
                    id: 'shift',
                    header: 'Shift',
                    width: 'minmax(0, 1fr)',
                    render: (r) => (
                      <span className={styles.pair}>
                        <strong className={styles.strong}>{r.name}</strong>
                        <span className={styles.meta}>{r.hours}</span>
                      </span>
                    ),
                  },
                  { id: 'approved', header: 'Approved', width: '96px', render: (r) => <span className={styles.number}>{r.approved}</span> },
                  { id: 'time', header: 'Time to approve', width: '130px', render: (r) => <span className={r.worst ? styles.numberStrong : styles.number}>{r.time}</span> },
                  { id: 'edit', header: 'Edit rate', width: '96px', render: (r) => <span className={styles.number}>{r.edit}</span> },
                  { id: 'misses', header: 'Independent misses', width: '150px', render: (r) => <span className={r.worst ? styles.numberStrong : styles.number}>{r.misses}</span> },
                ]}
              />
            </section>
            <section className={styles.section} aria-label={view.missesHead}>
              <span className={styles.sectionHead}>
                <h2 className={styles.caps}>{view.missesHead}</h2>
                <span className={styles.meta}>{view.missesNote}</span>
              </span>
              {view.misses.length ? (
                <Table
                  ariaLabel="Misses found by the independent check"
                  rows={view.misses}
                  getRowId={(r) => r.draft}
                  minRowHeight={52}
                  columns={[
                    { id: 'draft', header: 'Draft', width: '100px', render: (r) => <span className={styles.mono}>{r.draft}</span> },
                    { id: 'agent', header: 'Agent', width: '170px', render: (r) => r.agent },
                    { id: 'in', header: 'Approved in', width: '96px', render: (r) => <span className={styles.number}>{r.approvedIn}</span> },
                    { id: 'shift', header: 'Shift', width: '80px', render: (r) => r.shift },
                    { id: 'found', header: 'What the check found', width: 'minmax(0, 1fr)', render: (r) => <span className={styles.inline}>{r.found}{r.flag ? <RuleTag>{r.flag}</RuleTag> : null}</span> },
                  ]}
                />
              ) : null}
            </section>
          </>
        }
        side={<Respond key={view.unitId} view={view} />}
      />
    </>
  )
}

/** "Respond" (11b): pick one; the sponsor signs sampling and review-level changes. */
function Respond({ view }: { view: NonNullable<ReturnType<typeof selectUnit>> }) {
  const state = useDemo((s) => s)
  const propose = useDemo((s) => s.proposeReviewChange)
  const sign = useDemo((s) => s.signReviewChange)
  const decline = useDemo((s) => s.declineReviewChange)
  const [option, setOption] = useState<ReviewChange['option']>(view.preselect)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const r = view.respond
  const sponsor = state.people.find((p) => p.id === state.divisions.find((d) => d.id === view.divisionId)?.sponsorId)?.name ?? 'the sponsor'
  const run = (result: { ok: boolean; reason?: string }) => setError(result.ok ? undefined : result.reason)
  const chosen = r.mode === 'propose' ? option : r.option
  return (
    <section className={styles.side} aria-label="Respond">
      <h2 className={styles.sideTitle}>Respond</h2>
      <span className={styles.sub}>Pick one. {sponsor} signs sampling and review-level changes.</span>
      <RadioCardGroup<ReviewChange['option']>
        name="respond"
        aria-label="Respond"
        value={chosen}
        onChange={setOption}
        options={view.options.map((o) => ({ ...o, disabled: r.mode !== 'propose' || !r.allowed }))}
      />
      {r.mode === 'propose' ? (
        <>
          {r.declined ? <span className={styles.meta}>{r.declined}</span> : null}
          {r.allowed ? (
            <Button variant="primary" className={styles.wide} onClick={() => run(propose(view.unitId, option))}>
              {r.button}
            </Button>
          ) : (
            <Button locked={lockReason('proposeReviewChange', state.personaId)} className={styles.wide}>
              {r.button}
            </Button>
          )}
        </>
      ) : r.mode === 'sign' ? (
        <>
          <span className={styles.sub}>{r.line}</span>
          {declining ? (
            <>
              <Textarea aria-label="Why you’re declining" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              <span className={styles.inline}>
                <Button variant="primary" onClick={() => run(decline(r.id, reason))}>
                  Decline
                </Button>
                <Button variant="ghost" onClick={() => setDeclining(false)}>
                  Cancel
                </Button>
              </span>
            </>
          ) : (
            <span className={styles.inline}>
              <Button variant="primary" onClick={() => run(sign(r.id))}>
                Sign
              </Button>
              <Button onClick={() => setDeclining(true)}>Decline…</Button>
            </span>
          )}
        </>
      ) : (
        <Notice mark={r.mode === 'waiting' ? 'review' : 'none'}>{r.line}</Notice>
      )}
      {error ? (
        <span role="alert" className={styles.meta}>
          {error}
        </span>
      ) : null}
      <span className={styles.sub}>
        <strong className={styles.strong}>No one is named.</strong> The night charge pharmacist is told what changed and why.
      </span>
    </section>
  )
}
