import { useState } from 'react'
import { Button, FilterPill, Icon, Notice, Textarea } from '../../design-system'
import type { FlagReason } from '../../data/types'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import type { selectEpic } from './selectors'
import styles from './epic.module.css'

type EpicView = NonNullable<ReturnType<typeof selectEpic>>

const MARK: Record<string, 'check' | 'ring' | null> = { fixed: 'check', inProgress: 'ring', sent: 'ring', notDefect: null }

/** Our panel inside Epic (10a, 10b): the agent's draft, the pharmacist's edits, one-action flagging, and their flags. */
export function AgentPanel({ view }: { view: EpicView }) {
  const personaId = useDemo((s) => s.personaId)
  const [flagging, setFlagging] = useState(false)
  const [tracing, setTracing] = useState(false)
  return (
    <aside className={styles.panel} aria-label="Med Rec Agent panel" data-story-target="epic-agent-panel">
      {view.readOnlyNote ? (
        <div className={styles.panelBlock}>
          <Notice mark="lock">{view.readOnlyNote}</Notice>
        </div>
      ) : null}
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>
          {view.panel.agent}
          <span className={styles.build}>{view.panel.build}</span>
        </span>
        <span className={styles.meta}>{view.panel.sub}</span>
      </div>
      {view.fix ? <FixCard fix={view.fix} canDismiss={view.canFlag} /> : null}
      <div className={styles.panelBlock}>
        {view.thisDraft ? (
          <Fact label="This draft">{view.thisDraft}</Fact>
        ) : (
          <>
            <Fact label="Sources">{view.panel.sources}</Fact>
            <Fact label="What it did">{view.panel.did}</Fact>
            <Fact label="Your edits">{view.panel.edits}</Fact>
          </>
        )}
        <span className={styles.actions}>
          {!view.canFlag ? (
            <Button locked={lockReason('flagDraft', personaId)} data-story-target="epic-flag">
              Flag a problem
            </Button>
          ) : view.flagged ? (
            <Button locked="You flagged this draft" data-story-target="epic-flag">
              Flagged · {view.flagged.code}
            </Button>
          ) : (
            <Button onClick={() => setFlagging(true)} aria-expanded={flagging} data-story-target="epic-flag">
              Flag a problem
            </Button>
          )}
          <Button variant="ghost" onClick={() => setTracing((t) => !t)} aria-expanded={tracing}>
            View trace
          </Button>
        </span>
        {view.flagged ? <Notice mark="none">{view.flagged.confirm}</Notice> : null}
        {tracing ? (
          <ol className={styles.trace} aria-label="Agent trace">
            {view.trace.map((t) => (
              <li key={`${t.at}-${t.title}`}>
                <span className={styles.mono}>{t.at}</span>
                <span>
                  {t.title}
                  {t.ruleTag ? <span className={styles.meta}> · {t.ruleTag}</span> : null}
                  {t.detail ? <span className={styles.traceDetail}>{t.detail}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        {flagging && !view.flagged ? <FlagForm view={view} onClose={() => setFlagging(false)} /> : null}
      </div>
      <div className={styles.panelBlock}>
        <span className={styles.flagsHead}>
          <strong>{view.flags.head}</strong>
          <span className={styles.meta}>Last 30 days</span>
        </span>
        <ul className={styles.flags}>
          {view.flags.items.map((f) => (
            <li key={f.code} className={styles.flag}>
              <span className={styles.flagMark}>{MARK[f.mark] ? <Icon name={MARK[f.mark]!} color="var(--cs-ink)" /> : '–'}</span>
              <span className={styles.flagBody}>
                <span>
                  <span className={styles.mono}>{f.code}</span> {f.title}
                </span>
                <strong className={styles.flagStatus}>{f.status}</strong>
                {f.note ? <span className={styles.meta}>{f.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <span className={styles.fact}>
      <span className={styles.meta}>{label}</span>
      <span>{children}</span>
    </span>
  )
}

/** "Flag this draft to Marcus" (10a): the edit is attached and the reason is picked from it. */
function FlagForm({ view, onClose }: { view: EpicView; onClose: () => void }) {
  const flagDraft = useDemo((s) => s.flagDraft)
  const [reason, setReason] = useState<FlagReason>(view.form.reason)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const send = () => {
    const result = flagDraft(view.draftId, { reason, ...(note.trim() ? { note } : {}) })
    if (!result.ok) return setError(result.reason)
    onClose()
  }
  return (
    <section className={styles.form} aria-label={view.form.to}>
      <h2 className={styles.formTitle}>{view.form.to}</h2>
      {view.form.edit ? (
        <>
          <span className={styles.caps}>Your edit is attached</span>
          <span className={styles.editBox}>
            <span>{view.form.edit.title}</span>
            <span>
              <s>{view.form.edit.from}</s> → {view.form.edit.to}
            </span>
          </span>
        </>
      ) : null}
      <span className={styles.caps} id="what-went-wrong">
        What went wrong
      </span>
      <span className={styles.chips} role="group" aria-labelledby="what-went-wrong">
        {view.reasons.map((r) => (
          <FilterPill key={r.value} on={reason === r.value} onClick={() => setReason(r.value)}>
            {r.label}
          </FilterPill>
        ))}
      </span>
      {view.form.edit && reason === view.form.reason ? <span className={styles.meta}>Picked from your edit. Change it if it’s wrong.</span> : null}
      <Textarea aria-label="Add a note (optional)" placeholder="Add a note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      <span className={styles.actions}>
        <Button variant="primary" onClick={send}>
          Send flag
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </span>
      {error ? (
        <span role="alert" className={styles.meta}>
          {error}
        </span>
      ) : null}
      <span className={styles.meta}>{view.form.footer}</span>
    </section>
  )
}

/** "Your flag led to a fix" (10b): the flag, the build that fixed it, the owner's note; What changed; Dismiss. */
function FixCard({ fix, canDismiss }: { fix: NonNullable<EpicView['fix']>; canDismiss: boolean }) {
  const dismiss = useDemo((s) => s.dismissFixNotice)
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.panelBlock}>
      <section className={styles.fix} aria-label="Your flag led to a fix" data-story-target="epic-fix">
        <h2 className={styles.fixTitle}>
          <Icon name="check" color="var(--cs-ink)" />
          Your flag led to a fix
        </h2>
        <span>
          <span className={styles.mono}>{fix.code}</span> {fix.title}
        </span>
        <span className={styles.fixLine}>{fix.line}</span>
        {fix.quote ? <span className={styles.meta}>{fix.quote}</span> : null}
        {open ? (
          <ul className={styles.changed}>
            {fix.changed.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
        <span className={styles.actions}>
          <Button variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            What changed
          </Button>
          {canDismiss ? (
            <Button variant="ghost" onClick={() => dismiss(fix.flagId)}>
              Dismiss
            </Button>
          ) : null}
        </span>
      </section>
    </div>
  )
}
