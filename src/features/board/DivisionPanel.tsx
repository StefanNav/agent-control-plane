import { StatusChip } from '../../components'
import { Card, Icon, LinkButton } from '../../design-system'
import { formatClock } from '../../lib/clock'
import { useDemo } from '../../store'
import type { DivisionSummary } from './selectors'
import styles from './board.module.css'

const ICON = { crit: 'triangle', warn: 'diamond', review: 'ring', stale: 'stale' } as const
const COLOR = { crit: 'var(--cs-crit)', warn: 'var(--cs-warn)', review: 'var(--cs-rev)', stale: 'var(--cs-meta)' } as const

/** The board's right-hand explanation of the selected division (4a). */
export function DivisionPanel({ division: d }: { division: DivisionSummary }) {
  const critical = useDemo((s) =>
    d.status === 'crit' ? s.exceptions.find((e) => e.status === 'crit' && e.state !== 'resolved' && e.state !== 'dismissed' && s.agents.find((a) => a.id === e.agentId)?.divisionId === d.id) : undefined,
  )
  const sub = d.status === 'crit' ? d.breakdown : d.needsHuman ? `${d.needsHuman} need a human` : d.judgment
  return (
    <aside aria-label="Selected division" className={styles.panelColumn}>
      <Card>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{d.name}</span>
          <span className={styles.panelSub}>
            {d.owner} · {d.agentCount} agents · {sub}
          </span>
        </div>
        <div className={styles.panelBody}>
          <StatusChip status={d.status} label={d.judgment} size="header" align={false} />
          {critical?.detail ? (
            <span className={styles.panelText}>
              {critical.detail.headline} {critical.detail.cause}
            </span>
          ) : d.attention.length ? (
            <div className={styles.attentionList}>
              {d.attention.map((a) => (
                <div key={a.agentId} className={styles.attentionRow}>
                  <Icon name={ICON[a.status as keyof typeof ICON] ?? 'ring'} color={COLOR[a.status as keyof typeof COLOR] ?? 'var(--cs-meta)'} />
                  <span>
                    <strong className={styles.strongName}>{a.name}</strong> <span className={styles.text2}>{a.reason}</span>
                  </span>
                  <span className={styles.mono}>{a.age}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className={styles.panelText}>{d.quietNote}</span>
          )}
        </div>
        {d.incidentId ? <PanelRow label="Incident" value={`${d.incidentId.toUpperCase()} · open`} /> : null}
        {d.resumeNeeds && (d.status === 'crit' || d.needsHuman) ? <PanelRow label="Resume" value={`needs ${d.resumeNeeds.join(' and ')}`} /> : null}
        {critical ? <PanelRow label="Exception" value={`${critical.code} · raised ${formatClock(critical.raisedAt)}`} /> : null}
        {d.nextDeadline && d.status !== 'crit' ? <PanelRow label="Next deadline" value={`${d.nextDeadline.at} · goes to ${d.nextDeadline.to}`} /> : null}
        <div className={styles.panelFoot}>
          <LinkButton to={`/operations/divisions/${d.id}`} variant="primary">
            Open division
          </LinkButton>
          {d.incidentId ? (
            <LinkButton to={`/operations/incidents/${d.incidentId}`} variant="ghost">
              Open incident
            </LinkButton>
          ) : null}
        </div>
      </Card>
    </aside>
  )
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.panelRow}>
      <span>{label}</span>
      <span className={styles.panelRowValue}>{value}</span>
    </div>
  )
}
