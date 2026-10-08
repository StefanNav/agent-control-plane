import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, LinkButton, Notice, Table, Tabs } from '../../design-system'
import { Body } from '../../layout/layouts'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'
import { selectMyPrivileges } from './selectors'
import styles from './golive.module.css'

const TABS = ['all', 'overdue', 'due'] as const

/** My privileges (3d): every delegation the sponsor signed; an overdue review raises an exception. */
export function MyPrivilegesPage() {
  const state = useDemo((s) => s)
  const askForEvidence = useDemo((s) => s.askForEvidence)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'all'
  const view = useMemo(() => selectMyPrivileges(state, state.personaId, tab), [state, tab])
  const me = state.people.find((p) => p.id === state.personaId)
  const division = state.divisions.find((d) => state.roles.some((r) => r.personId === state.personaId && r.divisionId === d.id))
  const lapse = division?.lapsePolicy === 'shadow' ? 'the activity returns to Shadow' : 'the activity is paused'
  const overdueAgent = view.overdue ? state.privileges.find((p) => p.code.toLowerCase() === view.overdue!.code)?.agentId : undefined
  const evidenceAsked = view.overdue ? state.exceptions.some((e) => e.type === `Evidence for the ${view.overdue!.code.toUpperCase()} review` && e.state !== 'resolved') : false
  return (
    <>
      <PageHeader
        breadcrumb={`Portfolio / ${view.title}`}
        title={view.title}
        idLine={view.signer ? `${me?.name} · clinical sponsor · ${division?.name ?? ''}` : undefined}
        sub={view.signer ? `Every delegation you’ve signed. When a review date passes you get an exception; 14 days later ${lapse} (${division?.name} setting).` : 'Every privilege in force here, soonest review first.'}
        actions={<LinkButton to="/reports/export">Export</LinkButton>}
        tabs={
          <Tabs
            ariaLabel="Privileges"
            current={tab}
            items={[
              { id: 'all', label: `All · ${view.counts.all}`, to: '/portfolio/privileges' },
              { id: 'overdue', label: `Overdue · ${view.counts.overdue}`, to: '/portfolio/privileges?tab=overdue' },
              { id: 'due', label: `Due in 30 days · ${view.counts.due}`, to: '/portfolio/privileges?tab=due' },
            ]}
          />
        }
      />
      <Body>
        <Table
          ariaLabel="Privileges"
          rows={view.rows}
          getRowId={(r) => r.id}
          minRowHeight={56}
          columns={[
            { id: 'agent', header: 'Agent', width: '190px', render: (r) => <span className={styles.strong}>{r.agent}</span> },
            { id: 'activity', header: 'Activity', width: 'minmax(0, 1fr)', render: (r) => r.activity },
            { id: 'level', header: 'Level', width: '80px', render: (r) => r.level },
            { id: 'domain', header: 'Domain', width: '200px', render: (r) => r.domain },
            { id: 'signed', header: 'Signed', width: '72px', render: (r) => r.signed },
            { id: 'due', header: 'Review due', width: '96px', render: (r) => r.due },
            { id: 'status', header: 'Status', width: '190px', render: (r) => (r.overdue ? <StatusChip status="warn" label={r.status} /> : r.status) },
            {
              id: 'action',
              header: '',
              width: '96px',
              render: (r) => (
                <LinkButton to={`/inventory/privileges/${r.code.toLowerCase()}/sign`} variant={r.overdue ? 'primary' : 'ghost'}>
                  {r.action}
                </LinkButton>
              ),
            },
          ]}
        />
        <span className={styles.line}>{view.footer}</span>
        {view.overdue ? (
          <Notice
            mark="warn"
            actions={
              <>
                <Button variant="primary" onClick={() => navigate(`/inventory/privileges/${view.overdue!.code}/sign`)}>
                  Review now
                </Button>
                {overdueAgent && can(state, state.personaId, 'signPrivilege', { agentId: overdueAgent }) ? (
                  evidenceAsked ? (
                    <Button variant="blocked">Asked {personName(state, state.agents.find((a) => a.id === overdueAgent)?.ownerId)} for evidence</Button>
                  ) : (
                    <Button onClick={() => askForEvidence(view.overdue!.code)}>Ask {personName(state, state.agents.find((a) => a.id === overdueAgent)?.ownerId)} for evidence</Button>
                  )
                ) : null}
              </>
            }
          >
            {view.overdue.text}
          </Notice>
        ) : null}
      </Body>
    </>
  )
}
