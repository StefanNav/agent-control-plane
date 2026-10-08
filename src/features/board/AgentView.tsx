import { useMemo, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, LinkButton, Menu, Notice, Tabs } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import {
  ActionsTab,
  ActivitiesTab,
  HistoryTab,
  PrivilegesTab,
  ScorecardTab,
} from './agent-tabs/Tabs'
import { Overview } from './agent-tabs/Overview'
import styles from './agent-tabs/agent.module.css'
import { selectAgentOverview } from './selectors'

const TABS = ['overview', 'activities', 'scorecard', 'actions', 'privileges', 'history'] as const
type Tab = (typeof TABS)[number]
const LABELS: Record<Tab, string> = {
  overview: 'Overview',
  activities: 'Activities',
  scorecard: 'Scorecard',
  actions: 'Actions',
  privileges: 'Privileges',
  history: 'History',
}

/** The agent controls. Their dialogs (impact preview, then confirm) arrive in Phase 4. */
const CONTROLS = {
  pause: 'Pause',
  shadow: 'Return one activity to Shadow on',
  revoke: 'Revoke a tool from',
  disable: 'Disable',
  retire: 'Retire',
} as const
type Control = keyof typeof CONTROLS

/** One agent: activities, privileges, metrics and recent actions in one place (4c). */
export function AgentView() {
  const { agentId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const view = useMemo(() => selectAgentOverview(state, agentId), [state, agentId])
  if (!view) return <NotFound />

  const tab = (TABS.find((t) => t === params.get('tab')) ?? 'overview') as Tab
  const control = (Object.keys(CONTROLS) as Control[]).find((c) => c === params.get('control'))
  const setControl = (next: Control | null) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('control', next)
        else p.delete('control')
        return p
      },
      { replace: true },
    )
  const allowed = (action: Parameters<typeof can>[2]) =>
    can(state, state.personaId, action, { agentId })
  const lock = (action: Parameters<typeof can>[2]) =>
    allowed(action) ? undefined : lockReason(action, state.personaId)

  const content: Record<Tab, ReactNode> = {
    overview: <Overview view={view} />,
    activities: <ActivitiesTab agentId={agentId} />,
    scorecard: <ScorecardTab />,
    actions: <ActionsTab agentId={agentId} />,
    privileges: <PrivilegesTab agentId={agentId} />,
    history: <HistoryTab agentId={agentId} />,
  }

  return (
    <>
      <PageHeader
        breadcrumb={`Operations / ${view.division} / ${view.name}`}
        title={view.name}
        status={view.levelLine}
        idLine={view.idLine}
        chips={
          view.judgment.status === 'normal' ? null : (
            <StatusChip status={view.judgment.status} label={view.judgment.label} size="header" />
          )
        }
        actions={
          <>
            <Menu
              align="right"
              trigger={({ toggle, ref, open }) => (
                <Button ref={ref} onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                  Controls
                  <Icon name="chevron" size={10} />
                </Button>
              )}
              groups={[
                {
                  label: 'Scope first',
                  items: [
                    {
                      id: 'pause',
                      onSelect: () => setControl('pause'),
                      label: 'Pause agent',
                      sub: lock('pause') ?? 'Takes effect at the gateway within seconds',
                      locked: !allowed('pause'),
                    },
                    {
                      id: 'shadow',
                      onSelect: () => setControl('shadow'),
                      label: 'Return one activity to Shadow',
                      sub: lock('returnToShadow') ?? 'The rest of the agent keeps working',
                      locked: !allowed('returnToShadow'),
                    },
                    {
                      id: 'revoke',
                      onSelect: () => setControl('revoke'),
                      label: 'Revoke a tool',
                      sub: lock('revokeTool') ?? 'Remove one tool grant',
                      locked: !allowed('revokeTool'),
                    },
                  ],
                },
                {
                  label: 'Program lead',
                  items: [
                    {
                      id: 'disable',
                      onSelect: () => setControl('disable'),
                      label: 'Disable agent',
                      sub: lock('disable') ?? 'Revokes access; records kept',
                      locked: !allowed('disable'),
                    },
                    {
                      id: 'retire',
                      onSelect: () => setControl('retire'),
                      label: 'Retire agent',
                      sub: lock('retire') ?? 'Permanent; needs typed confirmation',
                      locked: !allowed('retire'),
                    },
                  ],
                },
              ]}
            />
            <LinkButton to={`/inventory/agents/${agentId}`}>Open in Inventory</LinkButton>
          </>
        }
        tabs={
          <Tabs
            ariaLabel="Agent sections"
            current={tab}
            items={TABS.map((t) => ({
              id: t,
              label: LABELS[t],
              to:
                t === 'overview'
                  ? `/operations/agents/${agentId}`
                  : `/operations/agents/${agentId}?tab=${t}`,
            }))}
          />
        }
      />
      {control ? (
        <section aria-label="Pending control" className={styles.pending}>
          <Notice
            lead={`${CONTROLS[control]} ${view.name}`}
            actions={
              <Button variant="ghost" size="sm" onClick={() => setControl(null)}>
                Close
              </Button>
            }
          >
            opens an impact preview first: what stops, what keeps running and who is told, then asks
            you to confirm. That flow is built in Phase 4 of this prototype.
          </Notice>
        </section>
      ) : null}
      {content[tab]}
    </>
  )
}
