import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { Level } from '../../data/types'
import { cx } from '../../lib/cx'
import styles from './AutonomyLadder.module.css'

export type LadderState = 'passed' | 'current' | 'proposed' | 'available' | 'locked'

export interface LadderStep {
  level: Level
  state: LadderState
  /** Full ladder: line above the level, e.g. "Current · since 15 Sep". */
  caption?: ReactNode
  /** Full ladder: evidence line under the level. */
  evidence?: ReactNode
}

export interface AutonomyLadderProps {
  variant: 'full' | 'compact'
  /** Compact only: `row` (8×8 segments) or `panel` (28×6). */
  size?: 'row' | 'panel'
  steps: LadderStep[]
}

const NAMES: Record<Level, string> = {
  shadow: 'Shadow',
  draft: 'Draft',
  supervised: 'Supervised',
  autonomous: 'Autonomous',
}

/** Shadow, Draft, Supervised, Autonomous with the current step and the evidence behind it (component 05). */
export function AutonomyLadder({ variant, size = 'row', steps }: AutonomyLadderProps) {
  if (variant === 'compact') {
    return (
      <span className={cx(styles.compact, styles[size])} aria-label={describe(steps)} role="img">
        {steps.map((step) => (
          <span key={step.level} data-state={step.state} className={cx(styles.segment, styles[step.state])} />
        ))}
      </span>
    )
  }
  return (
    <div className={styles.full}>
      {steps.map((step) => (
        <div key={step.level} data-state={step.state} className={cx(styles.cell, styles[`cell_${step.state}`])}>
          <span className={styles.caption}>
            {step.state === 'passed' ? <Icon name="check" color="var(--cs-meta)" /> : null}
            {step.state === 'locked' ? <Icon name="lock" color="var(--cs-meta)" /> : null}
            {step.caption}
          </span>
          <span className={styles.level}>{NAMES[step.level]}</span>
          {step.evidence ? <span className={styles.evidence}>{step.evidence}</span> : null}
        </div>
      ))}
    </div>
  )
}

/** Screen-reader text for the compact ladder, e.g. "Shadow current, Draft proposed". */
function describe(steps: LadderStep[]): string {
  return steps
    .filter((step) => step.state === 'current' || step.state === 'proposed')
    .map((step) => `${NAMES[step.level]} ${step.state}`)
    .join(', ')
}
