import type { ReactNode } from 'react'
import { Button, Icon, RuleTag } from '../../design-system'
import type { TraceStepKind } from '../../data/types'
import { cx } from '../../lib/cx'
import styles from './ActionTrace.module.css'

export interface TraceStepView {
  /** "09:38:04.512" */
  at: string
  kind: TraceStepKind
  title: string
  ruleTag?: string
  detail?: string
  meta?: string
}

export interface ActionTraceView {
  title: string
  code: string
  agent: string
  version: string
  sop: string
  actingFor: string
  steps: TraceStepView[]
}

export interface ActionTraceProps {
  view: ActionTraceView
  onExport?: () => void
  /** `card`: component sheet 09, with its own head and a rail. `rows`: the trace page (7b), ruled rows only. */
  layout?: 'card' | 'rows'
}

/** 7b's step labels. */
const ROW_LABEL: Record<TraceStepKind, string> = {
  input: 'Input',
  tool: 'Tool call',
  policyPassed: 'Policy · passed',
  policyBlocked: 'Policy · blocked',
  output: 'Output',
  reviewer: 'Reviewer outcome',
}

const KIND_LABEL: Record<TraceStepKind, string> = {
  input: 'Input',
  tool: 'Tool call',
  policyPassed: 'Policy check · passed',
  policyBlocked: 'Policy check · blocked',
  output: 'Output',
  reviewer: 'Reviewer outcome',
}

const MARKER: Record<TraceStepKind, ReactNode> = {
  input: <span className={styles.inputMark} />,
  tool: <span className={styles.toolMark} />,
  policyPassed: <Icon name="check" color="var(--cs-text2)" className={styles.iconMark} />,
  policyBlocked: <Icon name="triangle" color="var(--cs-crit)" className={styles.iconMark} />,
  output: <span className={styles.outputMark} />,
  reviewer: <span className={styles.reviewerMark} />,
}

/** Every action replayable, start to finish, to the millisecond (component 09). */
export function ActionTrace({ view, onExport, layout = 'card' }: ActionTraceProps) {
  if (layout === 'rows') {
    return (
      <ol className={styles.rowList}>
        {view.steps.map((step, i) => {
          const blocked = step.kind === 'policyBlocked'
          return (
            <li key={`${step.at}-${i}`} className={cx(styles.row, blocked && styles.rowBlocked)}>
              <span className={styles.rowTime}>{step.at}</span>
              <span className={cx(styles.rowKind, blocked && styles.blockedKind)}>{ROW_LABEL[step.kind]}</span>
              <span className={styles.rowBody}>
                <span className={cx(styles.rowTitle, step.kind === 'tool' && styles.monoTitle, (blocked || step.kind === 'reviewer') && styles.strongTitle)}>
                  {step.ruleTag ? <RuleTag>{step.ruleTag}</RuleTag> : null}
                  {step.title}
                </span>
                {step.detail ? <span className={styles.rowDetail}>{step.detail}</span> : null}
                {step.meta ? <span className={styles.mono}>{step.meta}</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
    )
  }
  return (
    <div className={styles.trace}>
      <div className={styles.head}>
        <span className={styles.heading}>
          <span className={styles.titleRow}>
            <span className={styles.title}>{view.title}</span>
            <span className={styles.code}>{view.code}</span>
          </span>
          <span className={styles.meta}>
            {view.agent} <span className={styles.mono}>{view.version}</span> · SOP <span className={styles.mono}>{view.sop}</span> · acting for{' '}
            {view.actingFor}
          </span>
        </span>
        {onExport ? (
          <Button size="sm" onClick={onExport}>
            Export for surveyor
          </Button>
        ) : null}
      </div>
      <ol className={styles.steps}>
        {view.steps.map((step, i) => {
          const blocked = step.kind === 'policyBlocked'
          const last = i === view.steps.length - 1
          return (
            <li key={`${step.at}-${i}`} className={styles.step}>
              <span className={styles.time}>{step.at}</span>
              <span className={styles.rail}>
                {MARKER[step.kind]}
                {last ? null : <span className={styles.line} />}
              </span>
              <div className={styles.content}>
                <span className={cx(styles.kind, blocked && styles.blockedKind)}>{KIND_LABEL[step.kind]}</span>
                <span className={cx(styles.stepTitle, step.kind === 'tool' && styles.monoTitle, (blocked || step.kind === 'reviewer') && styles.strongTitle)}>
                  {step.ruleTag ? <RuleTag>{step.ruleTag}</RuleTag> : null}
                  {step.title}
                </span>
                {blocked && (step.detail || step.meta) ? (
                  <div className={styles.decision}>
                    {step.detail ? <span className={styles.decisionText}>{step.detail}</span> : null}
                    {step.meta ? <span className={styles.mono}>{step.meta}</span> : null}
                  </div>
                ) : step.detail ? (
                  <span className={styles.detail}>{step.detail}</span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
