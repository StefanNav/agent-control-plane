import { Button, Modal } from '../../design-system'
import styles from './evidence.module.css'

/** "Mapping rules" (12a, composed): which records count for each element, read only; the program lead owns them. */
export function MappingRulesModal({ rules, owner, onClose }: { rules: { element: string; records: string }[]; owner: string; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Mapping rules"
      description={`Which records count for each element. ${owner} owns them.`}
      actions={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className={styles.rules}>
        {rules.map((r) => (
          <li key={r.element}>
            <strong>{r.element}</strong>
            {r.records}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
