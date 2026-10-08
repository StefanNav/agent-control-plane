import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, FilterPill, LinkButton, ProgressBar, Table, Tabs, type Column } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { personName } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'
import { RetireDialog } from './RetireDialog'
import {
  selectInventory,
  selectRecord,
  type InventoryAgentRow,
  type InventoryTab,
} from './selectors'
import styles from './inventory.module.css'

const TABS: InventoryTab[] = ['agents', 'drafts', 'intake', 'retired']

const AGENT_COLUMNS: Column<InventoryAgentRow>[] = [
  {
    id: 'agent',
    header: 'Agent',
    width: 'minmax(168px, 1fr)',
    render: (r) => <span className={styles.name}>{r.name}</span>,
  },
  {
    id: 'division',
    header: 'Division',
    width: '122px',
    render: (r) => <span className={styles.text2}>{r.division}</span>,
  },
  {
    id: 'level',
    header: 'Level',
    width: '84px',
    render: (r) =>
      r.levelStatus ? <StatusChip status={r.levelStatus} label={r.level} /> : r.level,
  },
  {
    id: 'operations',
    header: 'Operations',
    width: '183px',
    render: (r) => <StatusChip status={r.status} label={r.label} />,
  },
  { id: 'sponsor', header: 'Sponsor', width: '96px', render: (r) => r.sponsor },
  { id: 'tier', header: 'Tier', width: '72px', render: (r) => r.tier },
  {
    id: 'review',
    header: 'Review',
    width: '84px',
    render: (r) => <span className={styles.mono}>{r.review}</span>,
  },
]

/** Inventory (8c): every agent's governance record beside its live judgment; Drafts, Intake and Retired tabs. */
export function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const inventory = useMemo(() => selectInventory(state), [state])
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'agents'
  const selectedId = inventory.agents.some((r) => r.id === params.get('agent'))
    ? params.get('agent')!
    : inventory.agents[0]?.id
  const record = selectedId ? selectRecord(state, selectedId) : null
  const [retiring, setRetiring] = useState(false)
  const [draftFilter, setDraftFilter] = useState<'mine' | 'all' | null>(null)
  const allowed = selectedId
    ? can(state, state.personaId, 'retire', { agentId: selectedId })
    : false
  const select = (id: string) => {
    const p = new URLSearchParams(params)
    p.set('agent', id)
    setParams(p, { replace: true })
  }
  const counts = inventory.counts
  const mine = inventory.drafts.filter((r) => r.waitingOnId === state.personaId)
  const mineOnly = draftFilter === 'mine' || (draftFilter === null && mine.length > 0)
  const setMineOnly = (on: boolean) => setDraftFilter(on ? 'mine' : 'all')
  const programLead = personName(state, state.roles.find((r) => r.role === 'programLead')?.personId)
  return (
    <>
      <PageHeader
        breadcrumb="Inventory"
        title="Inventory"
        actions={
          tab === 'drafts' ? (
            <LinkButton to="/inventory?tab=intake">Approved intake · {counts.intake}</LinkButton>
          ) : (
            <LinkButton to="/reports/export">Export inventory</LinkButton>
          )
        }
        tabs={
          <Tabs
            ariaLabel="Inventory"
            current={tab}
            items={[
              { id: 'agents', label: `Agents · ${counts.agents}`, to: '/inventory' },
              { id: 'drafts', label: `Drafts · ${counts.drafts}`, to: '/inventory?tab=drafts' },
              { id: 'intake', label: `Intake · ${counts.intake}`, to: '/inventory?tab=intake' },
              { id: 'retired', label: `Retired · ${counts.retired}`, to: '/inventory?tab=retired' },
            ]}
          />
        }
      />
      {tab === 'agents' ? (
        <div className={styles.body}>
          <div className={styles.column}>
            <span className={styles.note}>
              Governance columns come from AIMS; Operations is the same record’s live judgment from
              the Command Board.
            </span>
            <Table
              ariaLabel="Agents"
              columns={AGENT_COLUMNS}
              rows={inventory.agents}
              getRowId={(r) => r.id}
              selectedId={selectedId}
              onSelect={select}
              minRowHeight={64}
            />
          </div>
          {record ? (
            <aside aria-label="Selected record" className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={styles.panelTitle}>{record.name}</span>
                <span className={styles.meta}>One record: governance and operations</span>
              </div>
              <div className={styles.block}>
                <span className={styles.label}>AIMS inventory</span>
                {record.governance.map(([k, v]) => (
                  <div key={k} className={styles.kv}>
                    <span>{k}</span>
                    <span className={styles.value}>{v}</span>
                  </div>
                ))}
              </div>
              <div className={styles.blockRuled}>
                <span className={styles.label}>Operations</span>
                <StatusChip status={record.operations.status} label={record.operations.label} />
                <div className={styles.kv}>
                  <span>Agent build</span>
                  <span className={styles.value}>{record.operations.build}</span>
                </div>
                <div className={styles.kv}>
                  <span>Last data</span>
                  <span className={styles.value}>{record.operations.lastData}</span>
                </div>
              </div>
              <div className={styles.foot}>
                <span className={styles.buttons}>
                  <LinkButton to={`/operations/agents/${record.id}`} variant="primary">
                    Open operations view
                  </LinkButton>
                  <LinkButton to={`/inventory/agents/${record.id}`}>Open record</LinkButton>
                </span>
                <Button
                  variant="ghost"
                  locked={allowed ? undefined : lockReason('retire', state.personaId)}
                  onClick={() => setRetiring(true)}
                >
                  Disable or retire…
                </Button>
                <span className={styles.text2}>
                  The operations view links back with Open in Inventory, so both stay one record.
                </span>
              </div>
            </aside>
          ) : null}
          {retiring && record ? (
            <RetireDialog
              agentId={record.id}
              initialMode="retire"
              onClose={() => setRetiring(false)}
            />
          ) : null}
        </div>
      ) : (
        <div className={styles.single}>
          {tab === 'drafts' ? (
            <div className={styles.draftsTab}>
              <div className={styles.tabHead}>
                <span className={styles.tabTitle}>
                  <h2 className={styles.tabName}>Drafts</h2>
                  <span className={styles.note}>Agents being onboarded · everything autosaves · reopening lands on the first missing item</span>
                </span>
                <span className={styles.pills}>
                  <FilterPill on={mineOnly} onClick={() => setMineOnly(true)}>
                    Waiting on me · {mine.length}
                  </FilterPill>
                  <FilterPill on={!mineOnly} onClick={() => setMineOnly(false)}>
                    All · {inventory.drafts.length}
                  </FilterPill>
                </span>
              </div>
              <Table
                ariaLabel="Drafts"
                rows={mineOnly ? mine : inventory.drafts}
                getRowId={(r) => r.id}
                minRowHeight={61}
                columns={[
                  {
                    id: 'agent',
                    header: 'Agent',
                    width: 'minmax(180px, 1fr)',
                    render: (r) => (
                      <span className={styles.stack}>
                        <span className={r.waitingOnId === state.personaId ? styles.name : styles.plain}>{r.name}</span>
                        <span className={styles.meta}>{r.division}</span>
                      </span>
                    ),
                  },
                  {
                    id: 'from',
                    header: 'From',
                    width: '108px',
                    render: (r) => <span className={styles.mono}>{r.request}</span>,
                  },
                  {
                    id: 'step',
                    header: 'Open step',
                    width: '250px',
                    render: (r) => (
                      <span className={styles.stack}>
                        <span>{r.step}</span>
                        {r.stepId === 'approval' ? null : <span className={styles.meta}>{r.stepSub}</span>}
                      </span>
                    ),
                  },
                  {
                    id: 'waiting',
                    header: 'Waiting on',
                    width: '205px',
                    render: (r) =>
                      r.stepId === 'approval' ? (
                        <StatusChip status="review" label={r.stepSub} />
                      ) : r.waitingOnId === state.personaId ? (
                        <span className={styles.name}>{r.waitingOn} · you</span>
                      ) : (
                        r.waitingOn
                      ),
                  },
                  {
                    id: 'progress',
                    header: 'Progress',
                    width: '132px',
                    render: (r) => (
                      <span className={styles.progress}>
                        <ProgressBar value={r.items.done / r.items.total} label={`${r.name} progress`} />
                        {r.progress}
                      </span>
                    ),
                  },
                  {
                    id: 'last',
                    header: 'Last change',
                    width: '128px',
                    render: (r) => <span className={styles.mono}>{r.lastChange}</span>,
                  },
                  {
                    id: 'action',
                    header: '',
                    width: '96px',
                    render: (r) => {
                      const to = `/inventory/agents/${r.agentId}/onboarding/${r.stepId}${r.field ? `?field=${r.field}` : ''}`
                      return r.waitingOnId === state.personaId ? (
                        <LinkButton to={to} variant="primary">
                          Continue
                        </LinkButton>
                      ) : (
                        <LinkButton to={to} variant="ghost">
                          Open
                        </LinkButton>
                      )
                    },
                  },
                ]}
              />
              <span className={styles.note}>
                Drafts can’t act. They leave this list when the committee approves them, or when {programLead} withdraws the intake.
              </span>
            </div>
          ) : tab === 'intake' ? (
            <Table
              ariaLabel="Intake"
              rows={inventory.intake}
              getRowId={(r) => r.id}
              columns={[
                {
                  id: 'code',
                  header: 'Request',
                  width: '110px',
                  render: (r) => <span className={styles.mono}>{r.code}</span>,
                },
                {
                  id: 'title',
                  header: 'What',
                  width: 'minmax(220px, 1fr)',
                  render: (r) => <span className={styles.name}>{r.title}</span>,
                },
                { id: 'division', header: 'Division', width: '160px', render: (r) => r.division },
                { id: 'by', header: 'Requested by', width: '140px', render: (r) => r.requestedBy },
                {
                  id: 'approved',
                  header: 'Approved',
                  width: '100px',
                  render: (r) => <span className={styles.mono}>{r.approved}</span>,
                },
                {
                  id: 'open',
                  header: '',
                  width: '90px',
                  render: (r) => (
                    <LinkButton to={`/inventory/agents/${r.agentId}/onboarding/intake`} variant="ghost">
                      Open
                    </LinkButton>
                  ),
                },
              ]}
            />
          ) : (
            <Table
              ariaLabel="Retired"
              rows={inventory.retired}
              getRowId={(r) => r.id}
              columns={[
                {
                  id: 'code',
                  header: 'Archive',
                  width: '90px',
                  render: (r) => <span className={styles.mono}>{r.code}</span>,
                },
                {
                  id: 'agent',
                  header: 'Agent',
                  width: 'minmax(200px, 1fr)',
                  render: (r) => (
                    <span className={styles.stack}>
                      <span className={styles.name}>{r.name}</span>
                      <span className={styles.meta}>{r.division}</span>
                    </span>
                  ),
                },
                {
                  id: 'reason',
                  header: 'Why',
                  width: 'minmax(240px, 2fr)',
                  render: (r) => <span className={styles.text2}>{r.reason}</span>,
                },
                { id: 'by', header: 'Retired by', width: '110px', render: (r) => r.by },
                {
                  id: 'at',
                  header: 'Retired',
                  width: '90px',
                  render: (r) => <span className={styles.mono}>{r.at}</span>,
                },
              ]}
            />
          )}
        </div>
      )}
    </>
  )
}
