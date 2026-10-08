import type { ReactNode } from 'react'
import { Button, Icon, type ButtonVariant } from '../../design-system'
import type { PrivilegeState } from '../../data/types'
import { cx } from '../../lib/cx'
import { AutonomyLadder, type LadderState } from '../AutonomyLadder/AutonomyLadder'
import styles from './PrivilegeCard.module.css'

const LEVELS = ['shadow', 'draft', 'supervised', 'autonomous'] as const

/** One privilege record as a card. Text arrives ready to show. */
export interface PrivilegeCardView {
  state: PrivilegeState
  statusLabel: string
  /** "PRV-0142 v3" */
  code: string
  title: string
  scope: string
  ladder: LadderState[]
  ladderCaption: string
  rows: { key: string; value: ReactNode }[]
  footnote: ReactNode
  actionLabel: string
}

export interface PrivilegeCardProps {
  view: PrivilegeCardView
  onAction?: () => void
}

/** Status mark and the weight of the next step, per state (component sheet 04). */
const STATES: Record<PrivilegeState, { mark: ReactNode; tone: string; action: ButtonVariant }> = {
  awaiting: { mark: <Icon name="ring" color="var(--cs-rev)" />, tone: styles.review!, action: 'primary' },
  active: { mark: null, tone: styles.plain!, action: 'ghost' },
  due: { mark: <Icon name="diamond" color="var(--cs-warn)" />, tone: styles.warn!, action: 'secondary' },
  lapsed: { mark: <Icon name="shadow" color="var(--cs-icon)" />, tone: styles.plain!, action: 'secondary' },
  steppedDown: { mark: <Icon name="diamond" color="var(--cs-warn)" />, tone: styles.warn!, action: 'ghost' },
}

/** Activity, domain, level, grantor, evidence and review date (component 04). */
export function PrivilegeCard({ view, onAction }: PrivilegeCardProps) {
  const state = STATES[view.state]
  return (
    <div className={styles.card} data-state={view.state}>
      <div className={styles.head}>
        <div className={styles.statusRow}>
          <span className={styles.status}>
            {state.mark}
            <span className={cx(styles.statusLabel, state.tone)}>{view.statusLabel}</span>
          </span>
          <span className={styles.code}>{view.code}</span>
        </div>
        <span className={styles.title}>{view.title}</span>
        <span className={styles.scope}>{view.scope}</span>
        <div className={styles.ladderRow}>
          <AutonomyLadder
            variant="compact"
            steps={LEVELS.map((level, i) => ({ level, state: view.ladder[i] ?? 'locked' }))}
          />
          <span className={styles.ladderCaption}>{view.ladderCaption}</span>
        </div>
      </div>
      {view.rows.map((row) => (
        <div key={row.key} className={styles.row}>
          <span className={styles.key}>{row.key}</span>
          <span>{row.value}</span>
        </div>
      ))}
      <div className={styles.foot}>
        <span className={styles.footnote}>{view.footnote}</span>
        <Button variant={state.action} size="sm" onClick={onAction}>
          {view.actionLabel}
        </Button>
      </div>
    </div>
  )
}
