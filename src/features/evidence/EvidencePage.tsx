import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, Notice, StatStrip, Table, Tabs } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { personName } from '../../store/onboardingRules'
import { ExportPacketModal } from './ExportPacketModal'
import { MappingRulesModal } from './MappingRulesModal'
import { selectCoverage, type RuaihCell } from './selectors'
import styles from './evidence.module.css'

const TABS = ['coverage', 'gaps', 'exports'] as const
type Tab = (typeof TABS)[number]
type Row = ReturnType<typeof selectCoverage>['rows'][number]
type MoreRow = { agentId: 'more'; open: boolean; count: number }

/** A covered element shows its records count; an open gap is an amber chip (12a). */
export function Cell({ cell }: { cell: RuaihCell }) {
  if ('gap' in cell) return <StatusChip status="warn" label="Gap" />
  return (
    <span className={styles.count}>
      <Icon name="check" size={12} color="var(--cs-meta)" />
      {cell.count}
    </span>
  )
}

/** 12a: every agent on the boards against the seven RUAIH elements; gaps have owners and due dates. */
export function EvidencePage() {
  const [params] = useSearchParams()
  const state = useDemo((s) => s)
  const view = selectCoverage(state, state.personaId)
  const tab = (TABS.find((t) => t === params.get('tab')) ?? 'coverage') as Tab
  const [modal, setModal] = useState<'rules' | 'export' | null>(null)
  const [allGaps, setAllGaps] = useState(false)
  const [allAgents, setAllAgents] = useState(false)
  const [built, setBuilt] = useState<{ code: string; pages: number } | null>(null)
  const more: MoreRow = { agentId: 'more', open: allAgents, count: view.more.count }
  const rows: Array<Row | MoreRow> = [...view.rows, ...(allAgents ? view.more.rows : []), ...(view.more.count ? [more] : [])]
  const isMore = (r: Row | MoreRow): r is MoreRow => r.agentId === 'more'

  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.status}
        sub={view.sub}
        actions={
          <>
            <Button onClick={() => setModal('rules')}>Mapping rules</Button>
            <Button variant="primary" onClick={() => setModal('export')}>
              Export packet
            </Button>
          </>
        }
        tabs={
          <Tabs
            ariaLabel="Evidence sections"
            current={tab}
            items={[
              { id: 'coverage', label: 'Coverage', to: '/reports/evidence' },
              { id: 'gaps', label: `Gaps · ${view.tabs.gaps}`, to: '/reports/evidence?tab=gaps' },
              { id: 'exports', label: `Exports · ${view.tabs.exports}`, to: '/reports/evidence?tab=exports' },
            ]}
          />
        }
      />
      {tab === 'coverage' ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            {built ? <Notice mark="none">{`${built.code} · RUAIH evidence packet · ${built.pages.toLocaleString('en-US')} pages. Logged.`}</Notice> : null}
            <StatStrip stats={view.stats} />
            <section className={styles.section} aria-label="Coverage">
              <h2 className={styles.caps}>Coverage · numbers are records mapped</h2>
              <Table<Row | MoreRow>
                ariaLabel="Coverage"
                rows={rows}
                getRowId={(r) => r.agentId}
                minRowHeight={61}
                headHeight={74}
                columnGap={10}
                columns={[
                  {
                    id: 'agent',
                    header: 'Agent',
                    width: '190px',
                    render: (r) =>
                      isMore(r) ? (
                        <span className={styles.more}>
                          <button type="button" className={styles.moreButton} aria-expanded={r.open} onClick={() => setAllAgents((v) => !v)}>
                            {r.open ? 'Show fewer' : `${r.count} more agents`}
                          </button>
                          {r.open ? null : <span>All 7 elements covered</span>}
                        </span>
                      ) : (
                        <span className={styles.pair}>
                          <Link className={styles.agent} to={`/reports/evidence/${r.agentId}`}>
                            {r.name}
                          </Link>
                          <span className={styles.meta}>{r.sub}</span>
                        </span>
                      ),
                  },
                  ...view.elements.map((e, i) => ({
                    id: `e${e.n}`,
                    header: (
                      <span className={styles.element}>
                        <span>{e.n}</span>
                        <strong>{e.name}</strong>
                      </span>
                    ),
                    width: 'minmax(0, 1fr)',
                    render: (r: Row | MoreRow) => (isMore(r) ? null : <Cell cell={r.cells[i]!} />),
                  })),
                ]}
              />
            </section>
            <p className={styles.foot}>{view.foot}</p>
          </div>
          <aside className={styles.side} aria-label="Open gaps">
            <div className={styles.sideHead}>
              <h2 className={styles.sideTitle}>Open gaps · {view.gaps.length}</h2>
              <span className={styles.sub}>Sorted by due date</span>
            </div>
            {(allGaps ? view.gaps : view.gaps.slice(0, 5)).map((g) => (
              <div key={`${g.agentId}-${g.element}`} className={styles.gap}>
                <span className={styles.gapTop}>
                  <span>{g.element}</span>
                  <span className={styles.due}>{g.due}</span>
                </span>
                <span className={styles.gapAgent}>{g.agent}</span>
                <span className={styles.gapText}>{g.text}</span>
                <span className={styles.owner}>{g.owner}</span>
              </div>
            ))}
            {view.gaps.length > 5 ? (
              <div className={styles.sideFoot}>
                <Button variant="ghost" onClick={() => setAllGaps((v) => !v)}>
                  {allGaps ? 'Show fewer' : `Show ${view.gaps.length - 5} more`}
                </Button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : tab === 'gaps' ? (
        <div className={styles.body}>
          <Table
            ariaLabel="Open gaps"
            rows={view.gaps}
            getRowId={(g) => `${g.agentId}-${g.element}`}
            minRowHeight={52}
            columns={[
              { id: 'due', header: 'Due', width: '80px', render: (g) => <span className={styles.due}>{g.due}</span> },
              { id: 'element', header: 'Element', width: '220px', render: (g) => g.element },
              { id: 'agent', header: 'Agent', width: '220px', render: (g) => <Link className={styles.agent} to={`/reports/evidence/${g.agentId}`}>{g.agent}</Link> },
              { id: 'gap', header: 'Gap', width: 'minmax(0, 1fr)', render: (g) => g.text },
              { id: 'owner', header: 'Owner', width: '140px', render: (g) => g.owner.replace(/^Owner /, '') },
            ]}
          />
        </div>
      ) : (
        <div className={styles.body}>
          <ExportsTable rows={view.exports} />
        </div>
      )}
      {modal === 'rules' ? (
        <MappingRulesModal rules={view.rules} owner={personName(state, state.roles.find((r) => r.role === 'programLead')?.personId)} onClose={() => setModal(null)} />
      ) : null}
      {modal === 'export' ? <ExportPacketModal onClose={() => setModal(null)} onBuilt={setBuilt} /> : null}
    </>
  )
}

/** Packet exports, newest first (12a and 12b "Exports", composed). */
export function ExportsTable({ rows }: { rows: ReturnType<typeof selectCoverage>['exports'] }) {
  return (
    <Table
      ariaLabel="Exports"
      rows={rows}
      getRowId={(e) => e.id}
      minRowHeight={52}
      columns={[
        { id: 'code', header: 'Export', width: '120px', render: (e) => <span className={styles.mono}>{e.code}</span> },
        { id: 'at', header: 'Date', width: '90px', render: (e) => e.at },
        { id: 'scope', header: 'Scope', width: 'minmax(0, 1fr)', render: (e) => e.scope },
        { id: 'note', header: 'For', width: 'minmax(0, 1fr)', render: (e) => e.note },
        { id: 'by', header: 'By', width: '120px', render: (e) => e.by },
      ]}
    />
  )
}
