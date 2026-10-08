import { useState } from 'react'
import { Button, Icon, LinkButton, Menu, Notice } from '../../design-system'
import { noticeMark, StatusChip } from '../../components'
import { addMinutes, formatClock, tomorrowAt } from '../../lib/clock'
import type { DismissInput } from '../../store'
import { DismissDialog } from './DismissDialog'
import type { ExceptionDetailView } from './selectors'
import { TrendChart } from './TrendChart'
import styles from './inbox.module.css'

export interface ExceptionDetailProps {
  detail: ExceptionDetailView
  now: string
  /** Trend day labels, oldest first. */
  days: string[]
  /** Null when the persona may act; otherwise why not. */
  locked: string | null
  onSnooze: (until: string) => void
  /** Who a dismissal is logged as. */
  actorName: string
  /** True when the dismissal went through, so the dialog can close. */
  onDismiss: (input: DismissInput) => boolean
  /** Escalated items (5d): hand it to someone, or take it yourself. */
  onAssign: (personId: string) => void
  onAnswer: () => void
}

const STATUS_COLOR: Record<string, string> = {
  crit: 'var(--cs-crit)',
  warn: 'var(--cs-warn)',
  review: 'var(--cs-rev)',
}

/** The selected exception (5a): what happened, the evidence, and what you can do about it. */
export function ExceptionDetail({
  detail,
  now,
  days,
  locked,
  onSnooze,
  actorName,
  onDismiss,
  onAssign,
  onAnswer,
}: ExceptionDetailProps) {
  const [dismissing, setDismissing] = useState(false)
  const hour = addMinutes(now, 60)
  const morning = tomorrowAt(now, '07:00')
  const total = detail.breakdown.reduce((sum, row) => sum + row.count, 0)
  return (
    <section aria-label="Exception detail" className={styles.detail}>
      <div className={styles.detailHead}>
        <StatusChip status={detail.status} label={detail.type} size="header" />
        <h2 className={styles.headline}>{detail.headline}</h2>
        <span className={styles.meta}>{detail.meta}</span>
      </div>

      {detail.escalationNotice ? (
        <Notice mark="stale" lead="Escalated to you because nobody answered by the deadline.">
          {detail.escalationNotice}
        </Notice>
      ) : null}

      {detail.trend?.length ? (
        <TrendChart
          label={detail.trendLabel ?? 'Trend'}
          values={detail.trend}
          days={days}
          target={detail.target}
          accent={STATUS_COLOR[detail.status]}
        />
      ) : null}

      {detail.breakdown.length ? (
        <div className={styles.block}>
          <span className={styles.label}>{detail.breakdownLabel}</span>
          <table className={styles.breakdown}>
            <tbody>
              {detail.breakdown.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td className={styles.count}>{row.count}</td>
                  <td className={styles.barCell} aria-hidden="true">
                    <span className={styles.track}>
                      <span
                        className={styles.fill}
                        style={{ width: `${(row.count / total) * 100}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {detail.cause ? (
        <Notice mark={noticeMark(detail.status)} lead="Likely cause:">
          {detail.cause}
        </Notice>
      ) : null}

      {detail.timeline.length ? (
        <div className={styles.block}>
          <span className={styles.label}>Timeline</span>
          <ol className={styles.timeline}>
            {detail.timeline.map((t) => (
              <li key={`${t.at}-${t.title}`}>
                <span className={styles.timelineAt}>{t.at}</span>
                <span>
                  <span className={styles.timelineTitle}>{t.title}</span>
                  {t.sub ? <span className={styles.timelineSub}>{t.sub}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {detail.silence ? (
        <Notice mark="stale" lead="What silence means here:">
          {detail.silence}
        </Notice>
      ) : null}

      {detail.escalated ? (
        <div className={styles.actions}>
          <span className={styles.buttons}>
            {detail.techOwnerId ? (
              <Button
                variant="primary"
                onClick={() => onAssign(detail.techOwnerId!)}
                disabled={Boolean(locked)}
                title={locked ?? undefined}
              >
                Assign to {detail.techOwnerName}
              </Button>
            ) : null}
            <Button onClick={onAnswer} disabled={Boolean(locked)} title={locked ?? undefined}>
              Answer myself
            </Button>
            <LinkButton to={`/operations/agents/${detail.agentId}`} variant="ghost">
              Pause {detail.agentName}
            </LinkButton>
          </span>
        </div>
      ) : (
        <div className={styles.actions}>
          <span className={styles.buttons}>
            <LinkButton to={`/operations/agents/${detail.agentId}`} variant="primary">
              Investigate
            </LinkButton>
            <LinkButton to={`/operations/agents/${detail.agentId}?tab=activities`}>
              Return to Shadow
            </LinkButton>
            <Menu
              width={240}
              trigger={({ toggle, ref, open }) => (
                <Button
                  ref={ref}
                  variant="ghost"
                  onClick={toggle}
                  aria-expanded={open}
                  aria-haspopup="menu"
                >
                  Snooze
                </Button>
              )}
              groups={[
                {
                  label: 'Snooze until',
                  items: [
                    {
                      id: 'hour',
                      label: '1 hour',
                      sub: locked ?? `Back at ${formatClock(hour)}`,
                      locked: Boolean(locked),
                      onSelect: () => onSnooze(hour),
                    },
                    {
                      id: 'morning',
                      label: 'Tomorrow 07:00',
                      sub: locked ?? 'Back in the morning',
                      locked: Boolean(locked),
                      onSelect: () => onSnooze(morning),
                    },
                  ],
                },
              ]}
            />
            <Button
              variant="ghost"
              onClick={() => setDismissing(true)}
              disabled={Boolean(locked)}
              title={locked ?? undefined}
            >
              Dismiss…
            </Button>
          </span>
          <span className={styles.escalation}>
            {detail.escalated ? <Icon name="triangle" size={12} color="var(--cs-crit)" /> : null}
            {detail.escalationLine}
          </span>
        </div>
      )}
      {dismissing ? (
        <DismissDialog
          detail={detail}
          actorName={actorName}
          onClose={() => setDismissing(false)}
          onConfirm={(input) => {
            if (onDismiss(input)) setDismissing(false)
          }}
        />
      ) : null}
    </section>
  )
}
