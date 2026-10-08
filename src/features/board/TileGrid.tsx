import { StatusChip } from '../../components'
import { Icon, LinkButton, type IconName } from '../../design-system'
import type { Status } from '../../data/types'
import { cx } from '../../lib/cx'
import { formatClock } from '../../lib/clock'
import { useDemo } from '../../store'
import type { DivisionSummary } from './selectors'
import styles from './board.module.css'

const MARK: Partial<Record<Status, [IconName, string]>> = {
  crit: ['triangle', 'var(--cs-crit)'],
  warn: ['diamond', 'var(--cs-warn)'],
  review: ['ring', 'var(--cs-rev)'],
  stale: ['stale', 'var(--cs-meta)'],
  shadow: ['shadow', 'var(--cs-icon)'],
  paused: ['paused', 'var(--cs-icon)'],
}

function AgentSquare({ status }: { status: Status }) {
  const mark = MARK[status]
  return (
    <span data-agent-square className={cx(styles.square, mark && styles.squareMarked, styles[`sq_${status}`])}>
      {mark ? <Icon name={mark[0]} size={10} color={mark[1]} /> : null}
    </span>
  )
}

/** Divisions as tiles, one square per agent; attention first and larger (4d). */
export function TileGrid({ divisions }: { divisions: DivisionSummary[] }) {
  const people = useDemo((s) => s.people)
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? id
  return (
    <>
      <div className={styles.tiles}>
        {divisions.map((d) => {
          const attention = d.needsHuman > 0
          const chipLabel = d.status === 'crit' ? d.breakdown : attention ? `${d.needsHuman} need a human` : d.status === 'shadow' ? 'Shadow' : d.judgment
          return (
            <div key={d.id} data-tile className={cx(styles.tile, attention ? styles.tileWide : styles.tileNarrow)}>
              <div className={styles.tileHead}>
                <span className={styles.tileTitleBlock}>
                  <span className={styles.tileTitle}>{d.name}</span>
                  <span className={styles.metaDense}>
                    {d.owner} · {d.agentCount} agents
                  </span>
                </span>
                <StatusChip status={d.status} label={chipLabel} />
              </div>
              <div className={styles.squares}>
                {d.agentStatuses.map((st, i) => (
                  <AgentSquare key={i} status={st} />
                ))}
              </div>
              {attention ? (
                <>
                  <div className={styles.attentionList}>
                    {d.attention.map((a) => (
                      <div key={a.agentId} className={styles.attentionRow}>
                        <Icon name={MARK[a.status]?.[0] ?? 'ring'} color={MARK[a.status]?.[1] ?? 'var(--cs-meta)'} />
                        <span>
                          <strong className={styles.strongName}>{a.name}</strong> <span className={styles.text2}>{a.reason}</span>
                        </span>
                        <span className={styles.mono}>{a.age}</span>
                      </div>
                    ))}
                    {d.incidentId || d.resumeNeeds ? (
                      <div className={styles.tileNotes}>
                        {d.incidentId ? (
                          <span>
                            Incident {d.incidentId.toUpperCase()} open{d.note ? ` · ${d.note}` : ''}
                          </span>
                        ) : null}
                        {d.status === 'crit' && d.resumeNeeds ? <span>Resume needs {d.resumeNeeds.join(' and ')}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.tileFoot}>
                    <span className={styles.text2Dense}>
                      {d.page
                        ? `Paged ${name(d.page.who)} at ${formatClock(d.page.at)}${d.page.ackAt ? ` · acknowledged ${formatClock(d.page.ackAt)}` : ''}`
                        : d.nextDeadline
                          ? `Next deadline ${d.nextDeadline.at} · goes to ${d.nextDeadline.to}`
                          : ''}
                    </span>
                    <LinkButton to={`/operations/divisions/${d.id}`} size="sm">
                      Open division
                    </LinkButton>
                  </div>
                </>
              ) : (
                <span className={styles.text2Dense}>{d.quietNote}</span>
              )}
            </div>
          )
        })}
      </div>
      <span className={styles.note}>
        Each square is one agent. Grey means within scope; only agents that need a human carry a mark. Divisions that need a human sit first and get the larger tiles.
      </span>
    </>
  )
}
