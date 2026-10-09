import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, Notice, Table, Tabs } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { ExportsTable } from './EvidencePage'
import { ExportPacketModal } from './ExportPacketModal'
import { selectAgentEvidence } from './selectors'
import styles from './evidence.module.css'

type Row = NonNullable<ReturnType<typeof selectAgentEvidence>>['rows'][number]

/** 12b: one agent's records mapped to the seven elements; a gap is listed rather than hidden. */
export function AgentEvidencePage() {
  const { agentId = '' } = useParams()
  const [params] = useSearchParams()
  const state = useDemo((s) => s)
  const view = selectAgentEvidence(state, agentId)
  const [exporting, setExporting] = useState(params.get('export') === '1')
  const [built, setBuilt] = useState<{ code: string; pages: number } | null>(null)
  if (!view) return <NotFound />
  const tab = params.get('tab') === 'exports' ? 'exports' : 'coverage'
  const base = `/reports/evidence/${view.agentId}`

  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.status}
        idLine={view.idLine}
        actions={
          <Button variant="primary" onClick={() => setExporting(true)}>
            Export packet
          </Button>
        }
        tabs={
          <Tabs
            ariaLabel="Packet sections"
            current={tab}
            items={[
              { id: 'coverage', label: 'Coverage', to: base },
              { id: 'exports', label: `Exports · ${view.exports}`, to: `${base}?tab=exports` },
            ]}
          />
        }
      />
      <div className={styles.body}>
        {built ? <Notice mark="none">{`${built.code} · RUAIH evidence packet · ${built.pages.toLocaleString('en-US')} pages. Logged.`}</Notice> : null}
        {tab === 'coverage' ? (
          <Table<Row>
            ariaLabel="Elements"
            rows={view.rows}
            getRowId={(r) => String(r.n)}
            minRowHeight={73}
            columnGap={16}
            columns={[
              { id: 'n', header: '', hiddenHeader: 'Number', width: '28px', render: (r) => <span className={styles.number}>{r.n}</span> },
              { id: 'element', header: 'Element', width: '190px', render: (r) => <span className={styles.name}>{r.name}</span> },
              {
                id: 'records',
                header: 'Records mapped',
                width: 'minmax(0, 1fr)',
                render: (r) => (
                  <span className={styles.records}>
                    <span className={styles.chips}>
                      {r.chips.map((c) => (
                        <span key={c} className={styles.chip}>
                          {c}
                        </span>
                      ))}
                    </span>
                    {r.gapLine ? <span className={styles.gapLine}>{r.gapLine}</span> : null}
                  </span>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                width: '100px',
                render: (r) =>
                  r.status === 'gap' ? (
                    <StatusChip status="warn" label="Gap" />
                  ) : (
                    <span className={styles.covered}>
                      <Icon name="check" size={12} color="var(--cs-meta)" />
                      Covered
                    </span>
                  ),
              },
            ]}
          />
        ) : (
          <ExportsTable rows={view.exportRows} />
        )}
      </div>
      {exporting ? <ExportPacketModal agentId={view.agentId} divisionId={view.divisionId} onClose={() => setExporting(false)} onBuilt={setBuilt} /> : null}
    </>
  )
}
