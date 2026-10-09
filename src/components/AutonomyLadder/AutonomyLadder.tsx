import type { ReactNode } from 'react'
import { Icon } from '../../design-system'
import type { Level } from '../../data/types'
import { cx } from '../../lib/cx'
import styles from './AutonomyLadder.module.css'

/** `held`: the level held until a step-down (15a, 14a's legend). */
export type LadderState = 'passed' | 'current' | 'proposed' | 'available' | 'locked' | 'held'

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
  /** Compact only: `row` (8×8 segments), `panel` (28×6), or `wide` (fills its container, 10 high; 14a). */
  size?: 'row' | 'panel' | 'wide'
  /** Wide only: level names under the segments; current and proposed in bold, locked with a lock. */
  labels?: boolean
  steps: LadderStep[]
}

const NAMES: Record<Level, string> = {
  shadow: 'Shadow',
  draft: 'Draft',
  supervised: 'Supervised',
  autonomous: 'Autonomous',
}

/** Shadow, Draft, Supervised, Autonomous with the current step and the evidence behind it (component 05). */
export function AutonomyLadder({ variant, size = 'row', labels = false, steps }: AutonomyLadderProps) {
  if (variant === 'compact' && size === 'wide') {
    return (
      <span className={styles.wide} aria-label={describe(steps)} role="img">
        {steps.map((step) => (
          <span key={step.level} data-state={step.state} className={cx(styles.bar, styles[`bar_${step.state}`])} />
        ))}
        {labels
          ? steps.map((step) => (
              <span
                key={`${step.level}-label`}
                aria-hidden="true"
                data-label
                data-strong={String(step.state === 'current' || step.state === 'proposed')}
                className={cx(styles.barLabel, (step.state === 'current' || step.state === 'proposed') && styles.barLabelStrong)}
              >
                {step.state === 'locked' ? <Icon name="lock" size={12} color="var(--cs-meta)" /> : null}
                {NAMES[step.level]}
              </span>
            ))
          : null}
      </span>
    )
  }
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

/** Screen-reader text for the compact ladder, e.g. "Shadow current, Draft proposed" or "Shadow current, Draft held". */
function describe(steps: LadderStep[]): string {
  // A branch locked by policy has no current step; it still needs a name.
  if (steps.every((step) => step.state === 'locked')) return 'Locked by policy'
  return steps
    .filter((step) => step.state === 'current' || step.state === 'proposed' || step.state === 'held')
    .map((step) => `${NAMES[step.level]} ${step.state}`)
    .join(', ')
}

const LEGEND: [LadderState, string][] = [
  ['current', 'Granted · current level in bold'],
  ['passed', 'Granted before'],
  ['held', 'Held until a step-down'],
  ['proposed', 'Proposed · needs signatures'],
  ['available', 'Allowed, not requested'],
  ['locked', 'Locked by policy'],
]

/** What each segment of the wide ladder means (14a "Ladder legend"). */
export function LadderLegend() {
  return (
    <ul className={styles.legend}>
      {LEGEND.map(([state, text]) => (
        <li key={state} className={styles.legendRow}>
          <span aria-hidden="true" className={cx(styles.swatch, styles[`bar_${state}`])} />
          {text}
        </li>
      ))}
    </ul>
  )
}
