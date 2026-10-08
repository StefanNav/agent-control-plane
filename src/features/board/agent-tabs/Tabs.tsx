import { useMemo } from 'react'
import { AutonomyLadder, PrivilegeCard } from '../../../components'
import { LogRow, Notice, Table, Card } from '../../../design-system'
import { formatDate } from '../../../lib/clock'
import { useDemo } from '../../../store'
import { selectAgentHistory, selectAgentOverview, selectPrivilegeCards } from '../selectors'
import { RECENT_COLUMNS } from './columns'
import styles from './agent.module.css'

const LEVELS = ['shadow', 'draft', 'supervised', 'autonomous'] as const

/** Activities tab (composed): each activity on the full autonomy ladder. */
export function ActivitiesTab({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const activities = state.activities.filter((a) => a.agentId === agentId)
  return (
    <div className={styles.body}>
      {activities.map((act) => {
        const prv = state.privileges.find((p) => p.activityId === act.id)
        const current = LEVELS.indexOf(act.level)
        return (
          <section key={act.id} className={styles.section}>
            <h2 className={styles.label}>{act.name}</h2>
            <AutonomyLadder
              variant="full"
              steps={LEVELS.map((level, i) => ({
                level,
                state: i < current ? 'passed' : i === current ? 'current' : i === 1 ? 'available' : 'locked',
                caption: i === current ? `Current${prv?.grantedAt ? ` · since ${formatDate(prv.grantedAt)}` : ''}` : i < current ? 'Passed' : i === 1 ? 'Available' : i === 2 ? 'Locked · v2' : 'Locked',
                evidence: i === current ? prv?.evidence : i === 2 ? 'Favourable branches only' : i === 3 ? 'Administrative tasks only' : undefined,
              }))}
            />
          </section>
        )
      })}
    </div>
  )
}

/** Scorecard tab: the shadow scorecard arrives with onboarding (frame 3a). */
export function ScorecardTab() {
  return (
    <div className={styles.body}>
      <Notice mark="none" lead="Shadow scorecard.">
        Agreement with pharmacist work against each success criterion arrives in Phase 5 (frame 3a).
      </Notice>
    </div>
  )
}

/** Actions tab (composed): every action this agent took, newest first. */
export function ActionsTab({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const view = useMemo(() => selectAgentOverview(state, agentId), [state, agentId])
  return (
    <div className={styles.body}>
      <Table ariaLabel="Actions" columns={RECENT_COLUMNS} rows={view?.recent ?? []} getRowId={(r) => r.id} />
    </div>
  )
}

/** Privileges tab (composed): one card per activity. */
export function PrivilegesTab({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const cards = useMemo(() => selectPrivilegeCards(state, agentId), [state, agentId])
  return (
    <div className={styles.body}>
      <div className={styles.cards}>
        {cards.map((view) => (
          <PrivilegeCard key={view.code} view={view} />
        ))}
      </div>
    </div>
  )
}

/** History tab (composed): logged changes and routine events. */
export function HistoryTab({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const events = useMemo(() => selectAgentHistory(state, agentId), [state, agentId])
  return (
    <div className={styles.body}>
      <Card>
        {events.length ? (
          events.map((e) => (
            <LogRow key={e.id} time={e.time} sub={e.sub}>
              {e.text}
            </LogRow>
          ))
        ) : (
          <LogRow time="—">Nothing logged yet.</LogRow>
        )}
      </Card>
    </div>
  )
}
