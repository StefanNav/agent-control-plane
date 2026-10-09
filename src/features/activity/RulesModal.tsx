import { useId, useState } from 'react'
import type { ReviewRules } from '../../data/types'
import { Button, Field, Input, Modal, Textarea } from '../../design-system'
import { useDemo } from '../../store'
import { ruleText } from '../../store/levels'
import styles from './activity.module.css'

type Key = { [G in keyof ReviewRules]: [G, keyof ReviewRules[G] & string, string] }[keyof ReviewRules]

/** Each rule's numbers, with the words they fill in (13a "Edit rules", composed). */
const FIELDS: { rule: keyof ReviewRules; move: string; keys: Key[] }[] = [
  { rule: 'reduce', move: 'Normal → Reduced', keys: [['reduce', 'days', 'Days'], ['reduce', 'checks', 'Checks'], ['reduce', 'editRate', 'Edit rate %']] },
  { rule: 'restore', move: 'Reduced → Normal', keys: [['restore', 'editRate', 'Edit rate %'], ['restore', 'days', 'Days']] },
  { rule: 'tighten', move: 'Normal → Tightened', keys: [['tighten', 'defects', 'Defects'], ['tighten', 'batches', 'Batches']] },
  { rule: 'relax', move: 'Tightened → Normal', keys: [['relax', 'batches', 'Clean batches']] },
]

/** The sponsor rewrites the rules that move an activity's review level, with a reason. */
export function RulesModal({ activityId, rules, onClose }: { activityId: string; rules: ReviewRules; onClose: () => void }) {
  const update = useDemo((s) => s.updateReviewRules)
  const [draft, setDraft] = useState<ReviewRules>(structuredClone(rules))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const id = useId()
  const set = ([group, key]: Key, value: string) =>
    setDraft((prev) => ({ ...prev, [group]: { ...prev[group], [key]: Number(value) } }) as ReviewRules)
  const confirm = () => {
    const result = update(activityId, draft, reason)
    if (!result.ok) return setError(result.reason)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      width={640}
      title="Edit rules"
      description="Rules move the level on evidence. Changing them doesn’t move it now."
      footNote={error ? <span role="alert">{error}</span> : 'Logged with your reason.'}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm}>
            Save rules
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {FIELDS.map((f) => (
          <div key={f.rule} className={styles.section}>
            <span className={styles.move}>{f.move}</span>
            <span className={styles.help}>{ruleText(f.rule, draft)}</span>
            <div className={styles.rulesGrid}>
              <span />
              {f.keys.map((k) => (
                <Field key={k[1]} label={k[2]} htmlFor={`${id}-${k[0]}-${k[1]}`}>
                  <Input
                    id={`${id}-${k[0]}-${k[1]}`}
                    type="number"
                    min={1}
                    value={String((draft[k[0]] as Record<string, number>)[k[1]])}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}
        <Field label="Reason" htmlFor={`${id}-reason`} hint="Required">
          <Textarea id={`${id}-reason`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
