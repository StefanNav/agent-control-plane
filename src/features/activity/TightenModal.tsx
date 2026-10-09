import { useId, useState } from 'react'
import { Button, Field, Modal, Textarea } from '../../design-system'
import { useDemo } from '../../store'

/** "Tighten now…" (13a, composed): every signed output is checked until the rules bring it back. */
export function TightenModal({ activityId, activityName, onClose }: { activityId: string; activityName: string; onClose: () => void }) {
  const tighten = useDemo((s) => s.tightenReviewLevel)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const id = useId()
  const confirm = () => {
    const result = tighten(activityId, reason)
    if (!result.ok) return setError(result.reason)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Tighten review level"
      description={`Every signed output of ${activityName.charAt(0).toLowerCase()}${activityName.slice(1)} is checked until the rules bring it back. The sponsor and owner are told.`}
      footNote={error ? <span role="alert">{error}</span> : 'Logged with your reason.'}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm}>
            Tighten
          </Button>
        </>
      }
    >
      <Field label="Reason" htmlFor={id} hint="Required">
        <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  )
}
