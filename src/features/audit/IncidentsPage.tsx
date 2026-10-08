import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { StatusChip } from '../../components'
import { Table, type Column } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { OperationsTabs } from '../board/BoardHeader'
import { selectInboxHeader } from '../inbox/selectors'
import { selectIncidents } from './selectors'
import styles from './audit.module.css'

type Row = ReturnType<typeof selectIncidents>[number]

const COLUMNS: Column<Row>[] = [
  {
    id: 'code',
    header: 'Incident',
    width: '110px',
    render: (r) => (
      <Link to={`/operations/incidents/${r.id}`} className={styles.code}>
        {r.code}
      </Link>
    ),
  },
  { id: 'title', header: 'What happened', width: 'minmax(260px, 1fr)', render: (r) => r.title },
  { id: 'agent', header: 'Agent', width: '200px', render: (r) => r.agent },
  {
    id: 'state',
    header: 'State',
    width: '150px',
    render: (r) => <StatusChip status={r.status} label={r.state} />,
  },
  { id: 'commander', header: 'Commander', width: '120px', render: (r) => r.commander },
  {
    id: 'opened',
    header: 'Opened',
    width: '120px',
    render: (r) => <span className={styles.monoInk}>{r.opened}</span>,
  },
  { id: 'linked', header: 'Linked', width: '70px', align: 'right', render: (r) => r.linked },
]

/** Incidents (composed): every incident record, open ones first. */
export function IncidentsPage() {
  const navigate = useNavigate()
  const state = useDemo((s) => s)
  const rows = useMemo(() => selectIncidents(state), [state])
  const scope = useDemo((s) => selectInboxHeader(s, s.personaId).status.split(' · ')[1])
  return (
    <>
      <PageHeader
        breadcrumb="Operations / Incidents"
        title="Incidents"
        status={scope}
        tabs={<OperationsTabs current="incidents" />}
      />
      <div className={styles.page}>
        <Table
          ariaLabel="Incidents"
          columns={COLUMNS}
          rows={rows}
          getRowId={(r) => r.id}
          onSelect={(id) => navigate(`/operations/incidents/${id}`)}
        />
        <p className={styles.note}>
          Anyone who can see the audit trail can open an incident from an action. The commander
          closes it when every correction is done.
        </p>
      </div>
    </>
  )
}
