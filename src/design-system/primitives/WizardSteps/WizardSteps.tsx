import type { ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './WizardSteps.module.css'

export type StepMark = 'done' | 'todo' | 'locked' | 'review'

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

const MARKS: Record<StepMark, ReactNode> = {
  done: <Icon name="check" color="var(--cs-meta)" />,
  todo: <span className={styles.box} />,
  locked: <Icon name="lock" color="var(--cs-meta)" />,
  review: <Icon name="ring" color="var(--cs-rev)" />,
}

export function WizardSteps({ steps, current, onSelect }: WizardStepsProps) {
  return (
    <ol className={styles.steps} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step) => {
        const isCurrent = step.id === current
        const content = (
          <>
            <span className={cx(styles.label, step.mark === 'locked' && styles.muted)}>
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
