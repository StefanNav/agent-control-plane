import { Link, useNavigate, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, LinkButton, Notice, Select, Sparkline, Table } from '../../design-system'
import { Split } from '../../layout/layouts'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { DivisionTabs } from '../board/DivisionTabs'
import { reviewerDivision, selectReviewers } from './selectors'
import styles from './reviewers.module.css'

/** 11a: speed and edit rate next to a blind independent check, by unit, never by name. */
export function ReviewersPage() {
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const share = useDemo((s) => s.shareReviewerFinding)
  const navigate = useNavigate()
  const divisionId = reviewerDivision(state, params.get('division'), state.personaId)
  const weeks = params.get('weeks') === '4' ? 4 : 8
  const view = selectReviewers(state, divisionId, weeks, state.personaId)!
  const setWeeks = (w: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (w === '8') p.delete('weeks')
        else p.set('weeks', w)
        return p
      },
      { replace: true },
    )
  const unitLink = (id: string, respond?: boolean) => `/operations/reviewers/${id}${respond ? '?respond=sampling' : ''}`
  const sponsor = state.people.find((p) => p.id === state.divisions.find((d) => d.id === view.divisionId)?.sponsorId)?.name ?? 'the sponsor'

  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title="Reviewer behaviour"
        status={view.sub}
        actions={
          <>
            <Select aria-label="Period" value={String(weeks)} onChange={setWeeks} options={[{ value: '8', label: '8 weeks' }, { value: '4', label: '4 weeks' }]} />
            <span className={styles.scope}>All agents</span>
          </>
        }
        tabs={<DivisionTabs divisionId={view.divisionId} current="reviewers" />}
      />
      {view.empty ? (
        <div className={styles.body}>
          <Notice mark="none">{view.empty}</Notice>
        </div>
      ) : (
        <Split
          main={
            <>
              {view.insight ? (
                <div data-story-target="reviewers-finding">
                  <Notice
                    mark="warn"
                    lead={view.insight.lead}
                    actions={
                      <>
                        <LinkButton to={unitLink(view.insight.unitId)} variant="ghost">
                          Open {view.rows.find((r) => r.id === view.insight!.unitId)!.unit}
                        </LinkButton>
                        <LinkButton to={unitLink(view.insight.unitId, true)} variant="ghost">
                          Raise sampling
                        </LinkButton>
                      </>
                    }
                  >
                    {view.insight.text}
                  </Notice>
                </div>
              ) : (
                <Notice mark="none">No unit shows reviewers checking less.</Notice>
              )}
              {view.weekly ? (
                <section className={styles.section} aria-label={view.weekly.head}>
                  <h2 className={styles.caps}>{view.weekly.head}</h2>
                  <div className={styles.cards}>
                    {view.weekly.cards.map((c) => (
                      <div key={c.label} className={styles.card}>
                        <span className={styles.meta}>{c.label}</span>
                        <span className={styles.value}>
                          {c.value} <span className={styles.meta}>{c.was}</span>
                        </span>
                        <Sparkline values={c.values} width={240} height={44} color="var(--cs-ink)" />
                        <span className={styles.axis}>
                          <span>{c.from}</span>
                          <span>{c.to}</span>
                        </span>
                        {c.note ? <span className={styles.meta}>{c.note}</span> : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className={styles.section} aria-label="By unit">
                <span className={styles.sectionHead}>
                  <h2 className={styles.caps}>By unit · last 4 weeks</h2>
                  {view.stepDown ? (
                    <Link className={styles.meta} to={view.stepDown.to}>
                      {view.stepDown.text}
                    </Link>
                  ) : null}
                </span>
                <Table
                  ariaLabel="By unit"
                  rows={view.rows}
                  getRowId={(r) => r.id}
                  onOpen={(id) => navigate(unitLink(id))}
                  minRowHeight={52}
                  columns={[
                    { id: 'unit', header: 'Unit', width: 'minmax(0, 1fr)', render: (r) => <Link className={styles.unit} to={unitLink(r.id)}>{r.unit}</Link> },
                    { id: 'approved', header: 'Approved', width: '90px', render: (r) => <span className={styles.number}>{r.approved}</span> },
                    { id: 'time', header: 'Time to approve', width: '120px', render: (r) => <span className={styles.number}>{r.time}</span> },
                    { id: 'edit', header: 'Edit rate', width: '96px', render: (r) => <span className={styles.number}>{r.edit}</span> },
                    { id: 'misses', header: 'Independent misses', width: '150px', render: (r) => <span className={styles.number}>{r.misses}</span> },
                    { id: 'read', header: 'Read', width: 'minmax(0, 1.4fr)', render: (r) => (r.flag ? <StatusChip status="warn" label={r.read} /> : r.read) },
                  ]}
                />
              </section>
            </>
          }
          side={
            <>
              <section className={styles.side} aria-label="How to read it">
                <h2 className={styles.sideTitle}>How to read it</h2>
                <span className={styles.sub}>Edit rate alone can’t tell the two stories apart. The independent check can.</span>
                <div className={styles.grid} role="group" aria-label="Edits against the independent check">
                  <span />
                  <span className={styles.axisHead}>Check steady</span>
                  <span className={styles.axisHead}>Check worse</span>
                  <span className={styles.axisHead}>Edits falling</span>
                  {view.grid.slice(0, 2).map((g) => (
                    <Cell key={g.read} {...g} />
                  ))}
                  <span className={styles.axisHead}>Edits rising</span>
                  {view.grid.slice(2).map((g) => (
                    <Cell key={g.read} {...g} />
                  ))}
                </div>
              </section>
              <section className={styles.side} aria-label="Independent check">
                <h2 className={styles.sideTitle}>Independent check</h2>
                <span className={styles.sub}>{view.check}</span>
                {view.running.map((r) => (
                  <span key={r} className={styles.sub}>
                    {r}
                  </span>
                ))}
                <span className={styles.sub}>
                  <strong className={styles.strong}>By unit and shift, never by name.</strong> This is about workload and habits, not blame.
                </span>
                <span className={styles.inline}>
                  {view.insight ? (
                    <LinkButton to={unitLink(view.insight.unitId)} variant="primary">
                      Open {view.rows.find((r) => r.id === view.insight!.unitId)!.unit}
                    </LinkButton>
                  ) : null}
                  {view.insight ? (
                    view.shared ? (
                      <span className={styles.meta}>Shared with {view.shared.to?.map((id) => state.people.find((p) => p.id === id)?.name).join(', ')}</span>
                    ) : view.canShare ? (
                      <Button onClick={() => share(view.insight!.unitId)}>Share with {sponsor}</Button>
                    ) : (
                      <Button locked={lockReason('proposeReviewChange', state.personaId)}>Share with {sponsor}</Button>
                    )
                  ) : null}
                </span>
              </section>
            </>
          }
        />
      )}
    </>
  )
}

function Cell({ read, units, current }: { read: string; units: string; current: boolean }) {
  return (
    <span className={current ? styles.cellCurrent : styles.cell}>
      <strong>{read}</strong>
      <span className={styles.meta}>{units}</span>
    </span>
  )
}
