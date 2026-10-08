import type { ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './WizardSteps.module.css'

/** `none` = not started yet: no mark, muted label. */
export type StepMark = 'done' | 'todo' | 'locked' | 'review' | 'none'

export interface WizardStep {
  id: string
  label: ReactNode
  sub: ReactNode
  mark: StepMark
}

export interface WizardStepsProps {
  steps: WizardStep[]
  current: string
  onSelect?: (id: string) => void
}

// Sizes and colours as drawn in the E1 step cells.
const MARKS: Record<StepMark, ReactNode> = {
  done: <Icon name="check" size={14} color="var(--cs-text2)" />,
  todo: <span className={styles.box} />,
  locked: <Icon name="lock" color="var(--cs-meta)" />,
  review: <Icon name="ring" size={14} color="var(--cs-rev)" />,
  none: null,
}

export function WizardSteps({ steps, current, onSelect }: WizardStepsProps) {
  return (
    <ol className={styles.steps} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step) => {
        const isCurrent = step.id === current
        const content = (
          <>
            <span className={cx(styles.label, (step.mark === 'locked' || step.mark === 'none') && styles.muted)}>
              {MARKS[step.mark]}
              {step.label}
            </span>
            <span className={styles.sub}>{step.sub}</span>
          </>
        )
        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className={cx(styles.step, isCurrent && styles.current)}
          >
            {onSelect ? (
              <button type="button" className={styles.button} onClick={() => onSelect(step.id)}>
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}
