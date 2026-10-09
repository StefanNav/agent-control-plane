import { useState } from 'react'
import { SURVEY_OPENS } from '../../data/seed/evidence'
import { Button, Checkbox, Modal, RadioCardGroup, Segmented } from '../../design-system'
import { addDays, dayGap, formatDate } from '../../lib/clock'
import { useDemo } from '../../store'
import { onBoard } from '../board/selectors'
import { packetEstimate } from './selectors'
import styles from './evidence.module.css'

type Scope = 'agent' | 'division' | 'all'
type Period = '3' | '12' | 'live'

const INCLUDE = ['Summary mapped to the 7 elements', 'Source records as PDFs', 'Sample of 50 action traces'] as const

/**
 * "Export evidence packet" (12b): the agent, its division or every agent, over a period. Open gaps
 * are always in the packet, listed as open (R7); the export is logged like any other (7d).
 */
export function ExportPacketModal({
  agentId,
  divisionId = 'medications',
  onClose,
  onBuilt,
}: {
  agentId?: string
  divisionId?: string
  onClose: () => void
  onBuilt: (built: { code: string; pages: number }) => void
}) {
  const state = useDemo((s) => s)
  const buildExport = useDemo((s) => s.buildExport)
  const [scope, setScope] = useState<Scope>(agentId ? 'agent' : 'all')
  const [period, setPeriod] = useState<Period>('12')
  const [include, setInclude] = useState<boolean[]>([true, true, true])
  const [error, setError] = useState<string>()
  const agents = state.agents.filter(onBoard)
  const agent = agents.find((a) => a.id === agentId)
  const division = state.divisions.find((d) => d.id === (agent?.divisionId ?? divisionId))
  const inDivision = agents.filter((a) => a.divisionId === division?.id)
  const chosen = scope === 'agent' && agent ? [agent] : scope === 'division' ? inDivision : agents
  const live = state.privileges
    .filter((p) => chosen.some((a) => a.id === p.agentId) && p.level !== 'shadow' && p.grantedAt)
    .map((p) => p.grantedAt!)
    .sort()[0]
  const from = period === '3' ? addDays(state.now, -91) : period === '12' ? addDays(state.now, -365) : (live ?? addDays(state.now, -365))
  const months = period === '3' ? 3 : period === '12' ? 12 : Math.max(1, Math.round(dayGap(from, state.now) / 30))
  const estimate = packetEstimate(chosen.length, months)
  const divisions = new Set(agents.map((a) => a.divisionId)).size

  const confirm = () => {
    const code = `EXP-${String(state.exports.length + 1).padStart(4, '0')}`
    const result = buildExport({ agentIds: chosen.map((a) => a.id), from, to: state.now, format: 'packet', masked: true, note: 'RUAIH evidence packet' })
    if (!result.ok) return setError(result.reason)
    onBuilt({ code, pages: estimate.pages })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      width={560}
      title="Export evidence packet"
      description={`For the survey window opening ${formatDate(SURVEY_OPENS)}.`}
      footNote={error ? <span role="alert">{error}</span> : <span className={styles.estimate}>About {estimate.minutes} min · {estimate.pages.toLocaleString('en-US')} pages</span>}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm}>
            Export packet
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.group}>
          <h3 className={styles.caps}>Scope</h3>
          <RadioCardGroup<Scope>
            name="scope"
            aria-label="Scope"
            value={scope}
            onChange={setScope}
            options={[
              ...(agent ? [{ value: 'agent' as const, title: agent.name }] : []),
              { value: 'division' as const, title: `${division?.name ?? ''} division`, description: `${inDivision.length} agents` },
              { value: 'all' as const, title: 'All agents', description: `${agents.length} agents · ${divisions} divisions` },
            ]}
          />
        </div>
        <div className={styles.group}>
          <h3 className={styles.caps}>Period</h3>
          <Segmented<Period>
            aria-label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '3', label: 'Last 3 months' },
              { value: '12', label: 'Last 12 months' },
              { value: 'live', label: 'Since go-live' },
            ]}
          />
        </div>
        <div className={styles.group}>
          <h3 className={styles.caps}>Include</h3>
          <div className={styles.checks}>
            {INCLUDE.map((label, i) => (
              <Checkbox key={label} label={label} checked={include[i]!} onChange={(on) => setInclude((prev) => prev.map((v, j) => (j === i ? on : v)))} />
            ))}
            <Checkbox label="Open gaps with owner and due date" description="Listed as open, not left out" checked onChange={() => undefined} disabled />
          </div>
        </div>
        <p className={styles.note}>
          <strong>Patient identifiers removed.</strong> Case IDs stay, so a surveyor can ask to see the full record.
        </p>
      </div>
    </Modal>
  )
}
