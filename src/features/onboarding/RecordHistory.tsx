import { useState } from 'react'
import { Button, LogRow, Modal } from '../../design-system'
import { formatClock, formatDate } from '../../lib/clock'
import { useDemo } from '../../store'
import { onboardingContext, personName } from '../../store/onboardingRules'
import styles from './onboarding.module.css'

/** "History": everything logged on the record, oldest first (E1, E2 headers). */
export function RecordHistory({ agentId, title }: { agentId: string; title: string }) {
  const state = useDemo((s) => s)
  const [open, setOpen] = useState(false)
  const { record, intake } = onboardingContext(state, agentId)
  const events = record
    ? record.history
    : intake
      ? [{ at: intake.approvedAt, by: intake.requestedBy, text: `${intake.code} approved`, sub: `Requested by ${personName(state, intake.requestedBy)}` }]
      : []
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        History
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="History" description={`Everything logged on ${title}, oldest first.`} actions={<Button onClick={() => setOpen(false)}>Close</Button>}>
        <div className={styles.history}>
          {events.length ? (
            events.map((e) => (
              <LogRow key={`${e.at}-${e.text}`} time={`${formatDate(e.at)} ${formatClock(e.at)}`} sub={e.sub}>
                {e.text}
              </LogRow>
            ))
          ) : (
            <LogRow time="—">Nothing logged yet.</LogRow>
          )}
        </div>
      </Modal>
    </>
  )
}
