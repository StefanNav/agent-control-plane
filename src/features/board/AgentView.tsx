import { useMemo, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, LinkButton, Menu, Notice, Tabs } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { controlMenu, parseControl, type ControlId } from '../controls/controlMenu'
import { FixOneThing } from '../controls/FixOneThing'
import { PauseFlow } from '../controls/PauseFlow'
import { ResumePanel } from '../controls/ResumePanel'
import { RetireDialog } from '../inventory/RetireDialog'
import type { PauseScope } from '../controls/selectors'
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

/** The pause controls and the scope each opens with (6b). */
const PAUSE_SCOPE: Partial<Record<ControlId, PauseScope>> = {
  'pause-activity': 'activity',
  'pause-agent': 'agent',
  'pause-division': 'division',
}

/** Pending-control copy until each dialog lands (Tasks 4.4–4.6). */
const CONTROL_LEAD: Record<ControlId, string> = {
  'pause-activity': 'Pause one activity of',
  'pause-agent': 'Pause',
  'pause-division': 'Pause every agent alongside',
  shadow: 'Return one activity to Shadow on',
  revoke: 'Revoke a tool from',
  disable: 'Disable',
  retire: 'Retire',
}

/** One agent: activities, privileges, metrics and recent actions in one place (4c). */
export function AgentView() {
  const { agentId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const view = useMemo(() => selectAgentOverview(state, agentId), [state, agentId])
  if (!view) return <NotFound />

  const tab = (TABS.find((t) => t === params.get('tab')) ?? 'overview') as Tab
  const control = parseControl(params.get('control'))
  const agent = state.agents.find((a) => a.id === agentId)
  /** Paused or retired: the header offers only "Open in Inventory" (6d). */
  const stopped = agent?.lifecycle === 'paused' || agent?.lifecycle === 'retired'
  const setControl = (next: ControlId | null) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('control', next)
        else p.delete('control')
        return p
      },
      { replace: true },
    )

  const content: Record<Tab, ReactNode> = {
    overview: <Overview view={view} resume={<ResumePanel agentId={agentId} />} />,
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
            {stopped ? null : (
              <Menu
                align="right"
                width={302}
                trigger={({ toggle, ref, open }) => (
                  <Button ref={ref} onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                    Controls
                    <Icon name="chevron" size={10} />
                  </Button>
                )}
                groups={controlMenu(state, state.personaId, agentId).map((group) => ({
                  label: group.label,
                  items: group.items.map((item) => ({
                    ...item,
                    onSelect: () => setControl(item.control),
                  })),
                }))}
              />
            )}
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
      {control && PAUSE_SCOPE[control] && !stopped ? (
        <PauseFlow
          agentId={agentId}
          agentName={view.name}
          initialScope={PAUSE_SCOPE[control]}
          onClose={() => setControl(null)}
        />
      ) : (control === 'shadow' || control === 'revoke') && !stopped ? (
        <FixOneThing agentId={agentId} initialMode={control} onClose={() => setControl(null)} />
      ) : (control === 'disable' || control === 'retire') && agent?.lifecycle !== 'retired' ? (
        <RetireDialog agentId={agentId} initialMode={control} onClose={() => setControl(null)} />
      ) : control &&
        !PAUSE_SCOPE[control] &&
        control !== 'shadow' &&
        control !== 'revoke' &&
        control !== 'disable' &&
        control !== 'retire' ? (
        <section aria-label="Pending control" className={styles.pending}>
          <Notice
            lead={`${CONTROL_LEAD[control]} ${view.name}`}
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
