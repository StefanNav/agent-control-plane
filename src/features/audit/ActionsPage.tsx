import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FilterPill, LinkButton, Menu, RuleTag, Table, type Column } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { OperationsTabs } from '../board/BoardHeader'
import { selectInboxHeader } from '../inbox/selectors'
import { ReadOnlyChip } from './ReadOnlyChip'
import { selectActions, type ActionFilters, type ActionRow } from './selectors'
import styles from './audit.module.css'

const COLUMNS: Column<ActionRow>[] = [
  {
    id: 'time',
    header: 'Time',
    width: '88px',
    render: (r) => <span className={styles.monoInk}>{r.time}</span>,
  },
  {
    id: 'action',
    header: 'Action',
    width: '110px',
    render: (r) => (
      <Link to={`/operations/actions/${r.id}`} className={styles.code}>
        {r.code}
      </Link>
    ),
  },
  { id: 'what', header: 'What', width: 'minmax(180px, 218px)', render: (r) => r.what },
  {
    id: 'version',
    header: 'Agent version',
    width: '198px',
    render: (r) => <span className={styles.monoStrong}>{r.version}</span>,
  },
  { id: 'for', header: 'Acting for', width: '179px', render: (r) => r.actingFor },
  {
    id: 'policy',
    header: 'Policy decisions',
    width: 'minmax(200px, 1fr)',
    render: (r) => (
      <span className={styles.policy}>
        {r.rule ? <RuleTag>{r.rule}</RuleTag> : null}
        {r.policy}
      </span>
    ),
  },
  { id: 'reviewer', header: 'Reviewer', width: '198px', render: (r) => r.reviewer },
]

const POLICY = { any: 'Policy: any', blocked: 'Policy: blocked', passed: 'Policy: passed' } as const
const REVIEWERS = ['Edited', 'Signed as is', 'Waiting for review']

/** The action list (7a): every action, read only, filtered by agent, policy and reviewer. */
export function ActionsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const state = useDemo((s) => s)
  const agentParam = params.get('agent')
  const policyParam = params.get('policy')
  const reviewerParam = params.get('reviewer')
  const filters: ActionFilters = useMemo(
    () => ({
      agentId: agentParam ?? undefined,
      policy: (['blocked', 'passed'] as const).find((p) => p === policyParam) ?? 'any',
      reviewer: REVIEWERS.find((r) => r === reviewerParam),
    }),
    [agentParam, policyParam, reviewerParam],
  )
  const list = useMemo(() => selectActions(state, filters), [state, filters])
  const scope = selectInboxHeader(state, state.personaId).status.split(' · ')[1]
  const set = (key: string, value: string | null) => {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }
  const agentsWithActions = state.agents.filter((a) =>
    state.actions.some((x) => x.agentId === a.id),
  )
  const agentName = agentsWithActions.find((a) => a.id === filters.agentId)?.name
  const isReadOnly = state.roles.some(
    (r) => r.personId === state.personaId && r.role === 'readOnly',
  )
  const viewer = state.people.find((p) => p.id === state.personaId)?.name

  return (
    <>
      <PageHeader
        breadcrumb="Operations / Actions"
        title="Actions"
        status={scope}
        chips={<ReadOnlyChip />}
        actions={
          <LinkButton
            to={`/reports/export${filters.agentId ? `?agent=${filters.agentId}` : ''}`}
          >{`Export these ${list.rows.length}`}</LinkButton>
        }
        tabs={<OperationsTabs current="actions" />}
      />
      <div className={styles.page}>
        <div className={styles.filters}>
          <Menu
            width={260}
            trigger={({ toggle, ref, open }) => (
              <FilterPill
                ref={ref}
                on={Boolean(agentName)}
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                Agent: {agentName ?? 'any'}
              </FilterPill>
            )}
            groups={[
              {
                items: [
                  {
                    id: 'any',
                    label: 'Any agent',
                    selected: !agentName,
                    onSelect: () => set('agent', null),
                  },
                  ...agentsWithActions.map((a) => ({
                    id: a.id,
                    label: a.name,
                    selected: a.id === filters.agentId,
                    onSelect: () => set('agent', a.id),
                  })),
                ],
              },
            ]}
          />
          <span className={styles.staticPill}>Today</span>
          <Menu
            width={220}
            trigger={({ toggle, ref, open }) => (
              <FilterPill
                ref={ref}
                on={filters.policy !== 'any'}
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                {POLICY[filters.policy ?? 'any']}
              </FilterPill>
            )}
            groups={[
              {
                items: (['any', 'blocked', 'passed'] as const).map((p) => ({
                  id: p,
                  label: POLICY[p].replace('Policy: ', ''),
                  selected: p === filters.policy,
                  onSelect: () => set('policy', p === 'any' ? null : p),
                })),
              },
            ]}
          />
          <Menu
            width={220}
            trigger={({ toggle, ref, open }) => (
              <FilterPill
                ref={ref}
                on={Boolean(filters.reviewer)}
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                Reviewer: {filters.reviewer?.toLowerCase() ?? 'any'}
              </FilterPill>
            )}
            groups={[
              {
                items: [
                  {
                    id: 'any',
                    label: 'Any outcome',
                    selected: !filters.reviewer,
                    onSelect: () => set('reviewer', null),
                  },
                  ...REVIEWERS.map((r) => ({
                    id: r,
                    label: r,
                    selected: r === filters.reviewer,
                    onSelect: () => set('reviewer', r),
                  })),
                ],
              },
            ]}
          />
          <span className={styles.summary}>{list.summary}</span>
        </div>
        <Table
          ariaLabel="Actions"
          columns={COLUMNS}
          rows={list.rows}
          getRowId={(r) => r.id}
          onSelect={(id) => navigate(`/operations/actions/${id}`)}
          minRowHeight={64}
        />
        <p className={styles.note}>
          {isReadOnly
            ? `Read only: ${viewer} can open anything on any board and replay any action, but has no controls. Opening an incident is the one thing ${viewer} can create. Every view is logged.`
            : 'Open any action to replay it step by step. Every view is logged.'}
        </p>
      </div>
    </>
  )
}
