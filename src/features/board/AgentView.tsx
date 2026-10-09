import { useMemo, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, LinkButton, Menu, Tabs } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { controlMenu, parseControl, type ControlId } from '../controls/controlMenu'
import { FixOneThing } from '../controls/FixOneThing'
import { PauseFlow } from '../controls/PauseFlow'
import { ResumePanel } from '../controls/ResumePanel'
import { RetireDialog } from '../inventory/RetireDialog'
import type { PauseScope } from '../controls/selectors'
import { ChangesTab } from '../changes/ChangesTab'
import { selectChanges } from '../changes/selectors'
import { ScorecardTab } from '../golive/ScorecardTab'
import { selectStepDown } from '../stepdown/selectors'
import { StepDownOverview } from '../stepdown/StepDownOverview'
import { ActionsTab, ActivitiesTab, HistoryTab, PrivilegesTab } from './agent-tabs/Tabs'
import { Overview } from './agent-tabs/Overview'
import { DraftAgentView } from './DraftAgentView'
import { selectAgentOverview } from './selectors'

const TABS = ['overview', 'activities', 'scorecard', 'actions', 'privileges', 'changes', 'history'] as const
type Tab = (typeof TABS)[number]
const LABELS: Record<Tab, string> = {
  overview: 'Overview',
  activities: 'Activities',
  scorecard: 'Scorecard',
  actions: 'Actions',
  privileges: 'Privileges',
  changes: 'Changes',
  history: 'History',
}

/** The pause controls and the scope each opens with (6b). */
const PAUSE_SCOPE: Partial<Record<ControlId, PauseScope>> = {
  'pause-activity': 'activity',
  'pause-agent': 'agent',
  'pause-division': 'division',
}

/** One agent: activities, privileges, metrics and recent actions in one place (4c). */
export function AgentView() {
  const { agentId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const view = useMemo(() => selectAgentOverview(state, agentId), [state, agentId])
  const draft = state.agents.find((a) => a.id === agentId && (a.lifecycle === 'onboarding' || a.lifecycle === 'inReview'))
  if (draft) return <DraftAgentView agentId={draft.id} />
  if (!view) return <NotFound />

  // 9a: the Changes tab exists only for an agent with a change record (R11).
  const changes = selectChanges(state, agentId, state.personaId)
  const tabs = TABS.filter((t) => t !== 'changes' || changes)
  const tab = (tabs.find((t) => t === params.get('tab')) ?? 'overview') as Tab
  const heldHeader = changes?.header ?? null
  // 15a: while an activity is stepped down on a threshold breach, the Overview says so (R13).
  const stepDown = selectStepDown(state, agentId, state.personaId)
  const control = parseControl(params.get('control'))
  const agent = state.agents.find((a) => a.id === agentId)
  /** Paused or retired: the header offers only "Open in Inventory" (6d). */
  const stopped = agent?.lifecycle === 'paused' || agent?.lifecycle === 'retired'
  /** Pause and narrow fixes apply only to a working agent (not paused, disabled or retired). */
  const live = agent?.lifecycle === 'live'
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
    overview: stepDown ? <StepDownOverview agentId={agentId} view={stepDown} /> : <Overview view={view} resume={<ResumePanel agentId={agentId} />} />,
    activities: <ActivitiesTab agentId={agentId} />,
    scorecard: <ScorecardTab agentId={agentId} />,
    actions: <ActionsTab agentId={agentId} />,
    privileges: <PrivilegesTab agentId={agentId} />,
    changes: <ChangesTab agentId={agentId} />,
    history: <HistoryTab agentId={agentId} />,
  }

  return (
    <>
      <PageHeader
        breadcrumb={`Operations / ${view.division} / ${view.name}`}
        title={view.name}
        status={heldHeader?.status ?? stepDown?.levelLine ?? view.levelLine}
        idLine={heldHeader?.idLine ?? view.idLine}
        chips={
          <>
            {heldHeader && view.judgment.label !== heldHeader.chip ? <StatusChip status="review" label={heldHeader.chip} size="header" /> : null}
            {view.judgment.status === 'normal' ? null : <StatusChip status={view.judgment.status} label={view.judgment.label} size="header" />}
          </>
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
            {tab === 'scorecard' ? <LinkButton to={`/reports/export?agent=${agentId}`}>Export scorecard</LinkButton> : null}
            {heldHeader ? <LinkButton to={`/operations/agents/${agentId}?tab=changes`}>Compare builds</LinkButton> : null}
            <LinkButton to={`/inventory/agents/${agentId}`}>Open in Inventory</LinkButton>
          </>
        }
        tabs={
          <Tabs
            ariaLabel="Agent sections"
            current={tab}
            items={tabs.map((t) => ({
              id: t,
              label: t === 'changes' && changes ? changes.tabLabel : LABELS[t],
              to:
                t === 'overview'
                  ? `/operations/agents/${agentId}`
                  : `/operations/agents/${agentId}?tab=${t}`,
            }))}
          />
        }
      />
      {control && PAUSE_SCOPE[control] && live ? (
        <PauseFlow
          agentId={agentId}
          agentName={view.name}
          initialScope={PAUSE_SCOPE[control]}
          onClose={() => setControl(null)}
        />
      ) : (control === 'shadow' || control === 'revoke') && live ? (
        <FixOneThing agentId={agentId} initialMode={control} onClose={() => setControl(null)} />
      ) : (control === 'disable' || control === 'retire') && agent?.lifecycle !== 'retired' ? (
        <RetireDialog agentId={agentId} initialMode={control} onClose={() => setControl(null)} />
      ) : null}
      {content[tab]}
    </>
  )
}
