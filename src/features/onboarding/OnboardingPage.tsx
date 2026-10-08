import { useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Button, LogRow, Modal, Notice } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { Split } from '../../layout/layouts'
import { StatusChip } from '../../components'
import { formatClock, formatDate } from '../../lib/clock'
import { useDemo } from '../../store'
import { onboardingContext, personName, STEP_NAMES, STEP_ORDER, type StepId } from '../../store/onboardingRules'
import { IntakeStep } from './IntakeStep'
import { JobStep } from './JobStep'
import { SystemsStep } from './SystemsStep'
import { ToolsStep } from './ToolsStep'
import { Rail } from './Rail'
import { selectOnboardingHeader } from './selectors'
import { StepCard } from './StepCard'
import styles from './onboarding.module.css'

const isStep = (step: string): step is StepId => (STEP_ORDER as string[]).includes(step)

/** Onboarding an agent, intake to "ready for review" (E1, 2a): one record, six steps. */
export function OnboardingPage() {
  const { agentId = '', step = '' } = useParams()
  const state = useDemo((s) => s)
  const header = useMemo(() => selectOnboardingHeader(state, agentId), [state, agentId])
  const [history, setHistory] = useState(false)
  if (!header || !isStep(step)) return <NotFound />
  const { record, intake, people } = onboardingContext(state, agentId)

  const number = `0${STEP_ORDER.indexOf(step) + 1}`
  let content: ReactNode
  if (step === 'intake') content = <IntakeStep agentId={agentId} />
  else if (record && step === 'job') content = <JobStep agentId={agentId} />
  else if (record && step === 'systems') content = <SystemsStep agentId={agentId} />
  else if (record && step === 'tools') content = <ToolsStep agentId={agentId} />
  else if (!record) {
    content = (
      <Split
        main={
          <StepCard number={number} title={STEP_NAMES[step]}>
            <Notice mark="lock" lead="Not started.">
              Starts when {personName(state, people.lead)} starts onboarding.
            </Notice>
          </StepCard>
        }
        side={null}
      />
    )
  } else {
    content = (
      <Split
        main={
          <StepCard number={number} title={STEP_NAMES[step]}>
            <Notice mark="none">This step is being built.</Notice>
          </StepCard>
        }
        side={null}
      />
    )
  }

  const events = record
    ? record.history
    : intake
      ? [{ at: intake.approvedAt, by: intake.requestedBy, text: `${intake.code} approved`, sub: `Requested by ${personName(state, intake.requestedBy)}` }]
      : []
  return (
    <>
      <PageHeader
        breadcrumb={header.breadcrumb}
        title={header.title}
        status={header.status}
        idLine={header.idLine}
        chips={header.chip ? <StatusChip status="review" label={header.chip} /> : undefined}
        people={header.people}
        actions={
          <span className={styles.headRight}>
            {header.saved ? <span className={styles.saved}>Autosaved {formatClock(header.saved)}</span> : null}
            <Button variant="ghost" onClick={() => setHistory(true)}>
              History
            </Button>
          </span>
        }
        steps={<Rail agentId={agentId} current={step} />}
      />
      {content}
      <Modal
        open={history}
        onClose={() => setHistory(false)}
        title="History"
        description={`Everything logged on ${header.title}, oldest first.`}
        actions={<Button onClick={() => setHistory(false)}>Close</Button>}
      >
        <div className={styles.history}>
          {events.map((e) => (
            <LogRow key={`${e.at}-${e.text}`} time={`${formatDate(e.at)} ${formatClock(e.at)}`} sub={e.sub}>
              {e.text}
            </LogRow>
          ))}
        </div>
      </Modal>
    </>
  )
}
