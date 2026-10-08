import { useState } from 'react'
import { Button, Textarea } from '../../design-system'
import { useDemo } from '../../store'
import { selectReturned } from './selectors'
import styles from './onboarding.module.css'

/** The sponsor's note on a returned step, and the optional reply (1g). */
export function ReturnedNote({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const replyToSponsor = useDemo((s) => s.replyToSponsor)
  const view = selectReturned(state, agentId, state.personaId)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  if (!view) return null
  return (
    <div className={styles.quote} role="note" aria-label={`${view.sponsor} sent this back`}>
      <div className={styles.quoteHead}>
        <strong>{view.sponsor} sent this back</strong>
        <span className={styles.monoMeta}>{view.head}</span>
      </div>
      <p className={styles.quoteText}>“{view.note}”</p>
      {view.reply ? (
        <p className={styles.reply}>
          <strong>{view.toName} replied · {view.reply.at}:</strong> {view.reply.text}
        </p>
      ) : view.canReply && open ? (
        <div className={styles.replyForm}>
          <Textarea aria-label={`Reply to ${view.sponsor}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          <span className={styles.inline}>
            <Button
              variant="primary"
              onClick={() => {
                if (replyToSponsor(agentId, text).ok) setOpen(false)
              }}
            >
              Send reply
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </span>
        </div>
      ) : view.canReply ? (
        <span>
          <Button onClick={() => setOpen(true)}>Reply to {view.sponsor}</Button>
        </span>
      ) : null}
    </div>
  )
}
