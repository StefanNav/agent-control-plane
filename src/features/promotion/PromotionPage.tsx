import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AutonomyLadder, LadderLegend, StatusChip } from '../../components'
import { Button, Checkbox, Field, Icon, Modal, Notice, RuleTag, Table, Textarea } from '../../design-system'
import { Split } from '../../layout/layouts'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { selectPromotion } from './selectors'
import { WhoDecides } from './WhoDecides'
import styles from './promotion.module.css'

type View = NonNullable<ReturnType<typeof selectPromotion>>
type Branch = View['branches'][number]
type Criterion = View['criteria'][number]

/** 14a: the sponsor signs one branch up a level; above Tier 2 it then goes to the board. */
export function PromotionPage() {
  const { promotionId = '' } = useParams()
  const state = useDemo((s) => s)
  const view = selectPromotion(state, promotionId, state.personaId)
  if (!view) return <NotFound />
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        idLine={view.idLine}
        chips={<StatusChip status={view.chip.status} label={view.chip.label} size="header" />}
        sub={view.sub}
      />
      <Split
        main={
          <>
            <section className={styles.section} aria-label={view.branchesTitle}>
              <h2 className={styles.caps}>{view.branchesTitle}</h2>
              <Table<Branch>
                ariaLabel="Branches"
                rows={view.branches}
                getRowId={(b) => b.id}
                selectedId={view.branches.find((b) => b.selected)?.id ?? null}
                minRowHeight={85}
                columns={[
                  {
                    id: 'branch',
                    header: 'Branch',
                    width: 'minmax(0, 1fr)',
                    render: (b) => (
                      <span className={b.selected ? `${styles.pair} ${styles.selected}` : styles.pair}>
                        <span className={styles.name}>{b.name}</span>
                        {b.sub ? <span className={styles.meta}>{b.sub}</span> : null}
                      </span>
                    ),
                  },
                  {
                    id: 'level',
                    header: 'Level',
                    width: '360px',
                    render: (b) => (
                      <span className={styles.ladder}>
                        <AutonomyLadder variant="compact" size="wide" labels steps={b.ladder} />
                      </span>
                    ),
                  },
                  {
                    id: 'note',
                    header: 'Note',
                    width: '140px',
                    render: (b) => (b.tag ? <span><RuleTag>{b.note}</RuleTag></span> : <span className={b.selected ? styles.strong : styles.muted}>{b.note}</span>),
                  },
                ]}
              />
            </section>
            <section className={styles.section} aria-label="Evidence">
              <div className={styles.sectionHead}>
                <h2 className={styles.caps}>{view.evidenceHead}</h2>
                <Link className={styles.link} to="/operations/sampling?tab=week">
                  Open sampled cases
                </Link>
              </div>
              <Table<Criterion>
                ariaLabel="Criteria"
                rows={view.criteria}
                getRowId={(c) => c.label}
                minRowHeight={61}
                columns={[
                  { id: 'label', header: `Criterion for ${view.title.split(' to ').at(-1)}`, width: 'minmax(0, 1fr)', render: (c) => <span className={styles.label}>{c.label}</span> },
                  { id: 'target', header: 'Target', width: '110px', render: (c) => c.target },
                  { id: 'result', header: 'Result', width: '160px', render: (c) => <span className={styles.result}>{c.result}</span> },
                  {
                    id: 'status',
                    header: 'Status',
                    width: '120px',
                    render: (c) =>
                      c.met ? (
                        <span className={styles.met}>
                          <Icon name="check" size={12} color="var(--cs-meta)" />
                          Met
                        </span>
                      ) : (
                        <StatusChip status="warn" label="Not met" />
                      ),
                  },
                ]}
              />
              <p className={styles.note}>{view.note}</p>
            </section>
            <section className={styles.section} aria-label={view.atLevelHead}>
              <h2 className={styles.caps}>{view.atLevelHead}</h2>
              <Table
                ariaLabel={view.atLevelHead}
                rows={view.atLevel.map(([k, v]) => ({ k, v }))}
                getRowId={(r) => r.k}
                minRowHeight={61}
                hideHeader
                columns={[
                  { id: 'k', header: '', width: '387px', render: (r) => <span className={styles.label}>{r.k}</span> },
                  { id: 'v', header: '', width: 'minmax(0, 1fr)', render: (r) => r.v },
                ]}
              />
            </section>
            <Signature view={view} />
          </>
        }
        side={
          <>
            <WhoDecides steps={view.who} note={view.tierNote} />
            <section className={styles.side} aria-label="Ladder legend">
              <div className={styles.sideHead}>
                <h2 className={styles.sideTitle}>Ladder legend</h2>
              </div>
              <div className={styles.legend}>
                <LadderLegend />
              </div>
            </section>
          </>
        }
      />
    </>
  )
}

/** "Your signature" (14a), or what happened to it. */
function Signature({ view }: { view: View }) {
  const state = useDemo((s) => s)
  const sign = useDemo((s) => s.signPromotion)
  const resend = useDemo((s) => s.resendPromotion)
  const [reason, setReason] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [returning, setReturning] = useState(false)
  const [error, setError] = useState<string>()
  const id = useId()
  const sig = view.signature
  const run = (result: { ok: boolean; reason?: string }) => setError(result.ok ? undefined : result.reason)

  if (sig.mode === 'signed' && sig.signed) {
    return (
      <section className={styles.sign} aria-label="Your signature" data-story-target="promotion-signature">
        <h2 className={styles.signTitle}>Signature</h2>
        <Notice mark={view.chip.label === 'With the board' ? 'review' : 'none'} lead={sig.signed.lead}>
          {sig.signed.text}
        </Notice>
        <p className={styles.quote}>“{sig.signed.reason}”</p>
      </section>
    )
  }
  if (sig.mode === 'returned' && sig.returned) {
    return (
      <section className={styles.sign} aria-label="Your signature" data-story-target="promotion-signature">
        <h2 className={styles.signTitle}>Your signature</h2>
        <Notice mark="review" lead={sig.returned.lead}>
          {sig.returned.text}
        </Notice>
        <span className={styles.buttons}>
          {sig.returned.canResend ? (
            <Button variant="primary" onClick={() => run(resend(view.id))}>
              {sig.returned.button}
            </Button>
          ) : (
            <Button locked={lockReason('requestGoLive', state.personaId)}>{sig.returned.button}</Button>
          )}
        </span>
      </section>
    )
  }
  const locked = sig.mode === 'locked' ? lockReason('signPrivilege', state.personaId) : !sig.met ? 'Every criterion must be met' : undefined
  return (
    <section className={styles.sign} aria-label="Your signature" data-story-target="promotion-signature">
      <h2 className={styles.signTitle}>Your signature</h2>
      {sig.question ? (
        <Notice mark="review" lead={sig.question.lead}>
          {sig.question.text}
        </Notice>
      ) : null}
      <Notice mark="review" lead={sig.notice.lead}>
        {sig.notice.text}
      </Notice>
      <Field label="Reason" htmlFor={id} hint="Required for a promotion">
        <Textarea id={id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Checkbox label={sig.accept} checked={accepted} onChange={setAccepted} />
      {error ? (
        <span role="alert" className={styles.meta}>
          {error}
        </span>
      ) : null}
      <span className={styles.buttons}>
        {locked ? (
          <Button locked={locked}>{sig.button}</Button>
        ) : reason.trim() && accepted ? (
          <Button variant="primary" onClick={() => run(sign(view.id, { reason, accepted }))}>
            {sig.button}
          </Button>
        ) : (
          // Gating (handoff "Interactions"): blocked until there is a reason and the box is ticked, as on 3c.
          <Button variant="blocked">{sig.button}</Button>
        )}
        {sig.mode === 'sign' ? <Button onClick={() => setReturning(true)}>Request changes</Button> : <Button locked={lockReason('signPrivilege', state.personaId)}>Request changes</Button>}
        <Button
          variant="ghost"
          onClick={() => {
            setReason('')
            setAccepted(false)
          }}
        >
          Cancel
        </Button>
      </span>
      {returning ? <RequestChanges id={view.id} onClose={() => setReturning(false)} /> : null}
    </section>
  )
}

/** "Request changes" (14a, composed): back to the owner with a note. */
function RequestChanges({ id, onClose }: { id: string; onClose: () => void }) {
  const returnPromotion = useDemo((s) => s.returnPromotion)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const field = useId()
  const confirm = () => {
    const result = returnPromotion(id, note)
    if (!result.ok) return setError(result.reason)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Request changes"
      description="It goes back to the owner with your note. Nothing is signed."
      footNote={error ? <span role="alert">{error}</span> : 'Logged with your note.'}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm}>
            Send back
          </Button>
        </>
      }
    >
      <Field label="Note" htmlFor={field} hint="Required">
        <Textarea id={field} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  )
}
