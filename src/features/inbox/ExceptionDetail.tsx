import { useState, type ReactNode } from 'react'
import { noticeMark, StatusChip } from '../../components'
import { Button, LinkButton, Menu, Notice, Textarea } from '../../design-system'
import { addMinutes, formatClock, tomorrowAt } from '../../lib/clock'
import type { ActionResult, DismissInput } from '../../store'
import type { FlagAnswer } from '../../store/feedback'
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
  /** Who a dismissal is logged as. */
  actorName: string
  onSnooze: (until: string) => void
  onDismiss: (input: DismissInput) => ActionResult
  /** Escalated to you (5d): hand it to someone, or take it yourself. */
  onAssign: (personId: string) => void
  onClaim: () => void
  /** Questions from a person. */
  onAnswer: (answer: 'yes' | 'no') => void
  /** A pharmacist's flag from Epic (R14). */
  onAnswerFlag?: (answer: FlagAnswer) => ActionResult
}

const FLAG_ANSWERS: { kind: FlagAnswer['kind']; button: string; label: string; submit: string }[] = [
  { kind: 'inProgress', button: 'Working on a fix…', label: 'What you’re doing about it', submit: 'Send' },
  { kind: 'notDefect', button: 'Not a defect…', label: 'Why it isn’t a defect', submit: 'Close as not a defect' },
  { kind: 'reply', button: 'Reply', label: 'Reply', submit: 'Send reply' },
]

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
  actorName,
  onSnooze,
  onDismiss,
  onAssign,
  onClaim,
  onAnswer,
  onAnswerFlag,
}: ExceptionDetailProps) {
  const [dismissing, setDismissing] = useState(false)
  const [answering, setAnswering] = useState<FlagAnswer['kind'] | null>(null)
  const [answer, setAnswer] = useState('')
  const [answerError, setAnswerError] = useState<string>()
  const total = detail.breakdown.reduce((sum, row) => sum + row.count, 0)
  const lockProps = { disabled: Boolean(locked), title: locked ?? undefined }
  const agentLink = `/operations/agents/${detail.agentId}`

  const snooze = (
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
              sub: locked ?? `Back at ${formatClock(addMinutes(now, 60))}`,
              locked: Boolean(locked),
              onSelect: () => onSnooze(addMinutes(now, 60)),
            },
            {
              id: 'morning',
              label: 'Tomorrow 07:00',
              sub: locked ?? 'Back in the morning',
              locked: Boolean(locked),
              onSelect: () => onSnooze(tomorrowAt(now, '07:00')),
            },
          ],
        },
      ]}
    />
  )

  let buttons: ReactNode
  if (detail.closed) {
    buttons = detail.link ? <LinkButton to={detail.link.to}>{detail.link.label}</LinkButton> : <LinkButton to={agentLink}>Open agent</LinkButton>
  } else if (detail.link) {
    // An onboarding hand-off: the work lives on the step it links to (ruling R9).
    buttons = (
      <>
        <LinkButton to={detail.link.to} variant="primary">
          {detail.link.label}
        </LinkButton>
        {snooze}
      </>
    )
  } else if (detail.kind === 'incident' && detail.incidentId) {
    buttons = (
      <>
        <LinkButton to={`/operations/incidents/${detail.incidentId}`} variant="primary">
          Open incident {detail.incidentId.toUpperCase()}
        </LinkButton>
        <LinkButton to={agentLink}>Investigate</LinkButton>
      </>
    )
  } else if (detail.escalatedToViewer) {
    buttons = (
      <>
        {detail.techOwnerId ? (
          <Button variant="primary" onClick={() => onAssign(detail.techOwnerId!)} {...lockProps}>
            Assign to {detail.techOwnerName}
          </Button>
        ) : null}
        <Button onClick={onClaim} {...lockProps}>
          Answer myself
        </Button>
        <LinkButton to={`${agentLink}?control=pause`} variant="ghost">
          Pause {detail.agentName}
        </LinkButton>
      </>
    )
  } else if (detail.kind === 'flag' && detail.flag) {
    buttons = (
      <>
        {FLAG_ANSWERS.map((a, i) => (
          <Button key={a.kind} variant={i === 0 ? 'primary' : undefined} onClick={() => setAnswering(a.kind)} {...lockProps}>
            {a.kind === 'reply' ? `Reply to ${detail.flag!.by}…` : a.button}
          </Button>
        ))}
        {snooze}
      </>
    )
  } else if (detail.kind === 'question') {
    buttons = (
      <>
        <Button variant="primary" onClick={() => onAnswer('yes')} {...lockProps}>
          Answer yes
        </Button>
        <Button onClick={() => onAnswer('no')} {...lockProps}>
          Answer no
        </Button>
        {snooze}
      </>
    )
  } else {
    buttons = (
      <>
        <LinkButton to={agentLink} variant="primary">
          Investigate
        </LinkButton>
        <LinkButton to={`${agentLink}?control=shadow`}>Return to Shadow</LinkButton>
        {snooze}
        <Button variant="ghost" onClick={() => setDismissing(true)} {...lockProps}>
          Dismiss…
        </Button>
      </>
    )
  }

  return (
    <section aria-label="Exception detail" className={styles.detail}>
      <div className={styles.detailHead}>
        <StatusChip
          status={detail.status}
          label={detail.type}
          size="header"
          muted={Boolean(detail.closed)}
        />
        <h2 className={styles.headline}>{detail.headline}</h2>
        <span className={styles.meta}>{detail.meta}</span>
      </div>

      {detail.closed ? <Notice lead={detail.closed.lead}>{detail.closed.text}</Notice> : null}

      {detail.escalationNotice ? (
        <Notice mark="stale" lead="Escalated to you because nobody answered by the deadline.">
          {detail.escalationNotice}
        </Notice>
      ) : null}

      {detail.flag ? (
        <div className={styles.block}>
          <span className={styles.label}>
            {detail.flag.code} · {detail.flag.reason} · {detail.flag.draft}
          </span>
          {detail.flag.edit ? <span>{detail.flag.edit}</span> : null}
          {detail.flag.note ? <span>“{detail.flag.note}”</span> : null}
          {detail.flag.reply ? <span className={styles.timelineSub}>{detail.flag.reply}</span> : null}
          {detail.flag.traceTo ? (
            <span>
              <LinkButton to={detail.flag.traceTo} variant="ghost">
                Open trace
              </LinkButton>
            </span>
          ) : null}
        </div>
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

      {detail.silence && !detail.closed ? (
        <Notice mark="stale" lead="What silence means here:">
          {detail.silence}
        </Notice>
      ) : null}

      <div className={styles.actions}>
        <span className={styles.buttons}>{buttons}</span>
        {detail.escalationLine ? (
          <span className={styles.escalation}>{detail.escalationLine}</span>
        ) : null}
      </div>

      {answering && onAnswerFlag ? (
        <div className={styles.block}>
          <label className={styles.label} htmlFor="flag-answer">
            {FLAG_ANSWERS.find((a) => a.kind === answering)!.label}
          </label>
          <Textarea id="flag-answer" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <span className={styles.buttons}>
            <Button
              variant="primary"
              onClick={() => {
                const result = onAnswerFlag({ kind: answering, text: answer })
                if (!result.ok) return setAnswerError(result.reason)
                setAnswering(null)
                setAnswer('')
                setAnswerError(undefined)
              }}
            >
              {FLAG_ANSWERS.find((a) => a.kind === answering)!.submit}
            </Button>
            <Button variant="ghost" onClick={() => setAnswering(null)}>
              Cancel
            </Button>
          </span>
          {answerError ? <span role="alert">{answerError}</span> : null}
        </div>
      ) : null}

      {dismissing ? (
        <DismissDialog
          detail={detail}
          actorName={actorName}
          onClose={() => setDismissing(false)}
          onConfirm={onDismiss}
        />
      ) : null}
    </section>
  )
}
