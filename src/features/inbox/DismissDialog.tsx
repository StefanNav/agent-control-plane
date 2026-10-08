import { useState } from 'react'
import { Button, Checkbox, Field, Modal, RadioCardGroup, Textarea } from '../../design-system'
import { DISMISS_LABELS, type DismissCategory, type DismissInput } from '../../store'
import type { ExceptionDetailView } from './selectors'
import styles from './inbox.module.css'

export interface DismissDialogProps {
  detail: ExceptionDetailView
  /** "Marcus": who the dismissal is logged as. */
  actorName: string
  onClose: () => void
  onConfirm: (input: DismissInput) => void
}

const DESCRIPTIONS: Record<DismissCategory, string | undefined> = {
  expected: 'Something planned explains it',
  duplicate: 'Another exception covers this',
  noisy: 'Fires when nothing is wrong',
  other: undefined,
}

/** Dismiss with a reason (5b). Mounted only while open, so each opening starts clean. */
export function DismissDialog({ detail, actorName, onClose, onConfirm }: DismissDialogProps) {
  const [category, setCategory] = useState<DismissCategory>('expected')
  const [reason, setReason] = useState('')
  const [tune, setTune] = useState(false)
  const ready = reason.trim().length > 0
  return (
    <Modal
      open
      onClose={onClose}
      title={`Dismiss “${detail.type}”?`}
      description={`A reason is required. ${detail.ruleName ? `Dismissals feed the tuning of ${detail.ruleName} for every agent that uses it.` : 'It is logged with your name.'}`}
      audit={`Logged as ${actorName} · ${detail.code}`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={ready ? 'primary' : 'blocked'}
            aria-disabled={!ready}
            onClick={() =>
              onConfirm({
                category,
                reason,
                tune: tune && detail.tune ? detail.tune.label : undefined,
              })
            }
          >
            Dismiss with reason
          </Button>
        </>
      }
    >
      <div className={styles.dialogBody}>
        <RadioCardGroup
          name="dismiss-category"
          aria-label="Why"
          value={category}
          onChange={setCategory}
          options={(Object.keys(DISMISS_LABELS) as DismissCategory[]).map((value) => ({
            value,
            title: DISMISS_LABELS[value],
            description: DESCRIPTIONS[value],
          }))}
        />
        <Field label="Reason" htmlFor="dismiss-reason" hint="Required">
          <Textarea
            id="dismiss-reason"
            rows={3}
            className={styles.reasonBox}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What explains it? Name the change, ticket or person."
          />
        </Field>
        {detail.tune ? (
          <Checkbox
            checked={tune}
            onChange={setTune}
            label={detail.tune.label}
            description={detail.tune.help}
          />
        ) : null}
      </div>
    </Modal>
  )
}
