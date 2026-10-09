import { useId, useState } from 'react'
import { useParams } from 'react-router'
import { AutonomyLadder, StatusChip } from '../../components'
import type { Condition, ReviewDecision } from '../../data/types'
import { Button, Field, Input, LinkButton, Notice, RadioCardGroup, RuleTag, StatStrip, Textarea } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { DECISION_WORDS } from '../../store/onboarding'
import { lockReason } from '../../store/permissions'
import { selectBoardDecision } from './selectors'
import styles from './promotion.module.css'

type View = NonNullable<ReturnType<typeof selectBoardDecision>>

/** 14b: above Tier 2 the AI review board decides a promotion, from what the sponsor signed. */
export function BoardDecisionPage() {
  const { promotionId = '' } = useParams()
  const state = useDemo((s) => s)
  const view = selectBoardDecision(state, promotionId, state.personaId)
  if (!view) return <NotFound />
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.status}
        idLine={view.idLine}
        chips={view.chip ? <StatusChip status={view.chip.status} label={view.chip.label} size="header" /> : null}
        actions={<LinkButton to="/reports/export?agent=allergy-recon">Download PDF</LinkButton>}
      />
      <div className={styles.board}>
        <article className={styles.paper} aria-label={view.paperTitle}>
          <div className={styles.pair}>
            <h2 className={styles.paperTitle}>{view.paperTitle}</h2>
            <span className={styles.paperSub}>{view.paperSub}</span>
          </div>
          <span className={styles.ladderBoard}>
            <AutonomyLadder variant="compact" size="wide" labels steps={view.ladder} />
          </span>
          <section className={styles.section} aria-label="Evidence">
            <h3 className={styles.caps}>{view.evidenceHead}</h3>
            <StatStrip stats={view.stats} />
          </section>
          {view.reasonHead ? (
            <section className={styles.section} aria-label="Sponsor’s reason">
              <h3 className={styles.caps}>{view.reasonHead}</h3>
              <p className={styles.quote}>“{view.reason}”</p>
            </section>
          ) : null}
          <section className={styles.section} aria-label="Stays the same">
            <h3 className={styles.caps}>Stays the same</h3>
            <div className={styles.lines}>
              {view.staysTheSame.map((l) => (
                <span key={l.text}>
                  {l.text}
                  {l.tag ? <RuleTag>{l.tag}</RuleTag> : null}
                </span>
              ))}
            </div>
          </section>
          <section className={styles.section} aria-label={view.stepDownHead}>
            <h3 className={styles.caps}>{view.stepDownHead}</h3>
            <span className={styles.lines}>{view.stepDownOn}</span>
          </section>
        </article>
        <Decision view={view} />
      </div>
    </>
  )
}

/** "Your decision" (14b): 2c's four outcomes, C4 proposed, a reason; or what was decided. */
function Decision({ view }: { view: View }) {
  const state = useDemo((s) => s)
  const decide = useDemo((s) => s.decidePromotion)
  const [kind, setKind] = useState<ReviewDecision['kind']>('approveWithConditions')
  const [conditions, setConditions] = useState<Condition[]>(view.proposed)
  const [adding, setAdding] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const id = useId()

  if (view.mode === 'waiting') {
    return (
      <section className={styles.decision} aria-label="Your decision">
        <h2 className={styles.sideTitle}>Your decision</h2>
        <Notice mark="review" lead={`Waiting for ${view.sponsor}’s signature.`}>
          The board decides once the sponsor signs.
        </Notice>
      </section>
    )
  }
  if (view.mode === 'logged' && view.decision) {
    return (
      <section className={styles.decision} aria-label="Decision logged">
        <h2 className={styles.sideTitle}>Decision logged</h2>
        <Notice mark="none" lead={`${DECISION_WORDS[view.decision.kind].replace(/^./, (c) => c.toUpperCase())} by ${view.decision.by} · ${view.decision.at}.`}>
          {view.decision.reason}
        </Notice>
        {view.decision.conditions.map((c) => (
          <span key={c} className={styles.label}>
            {c}
          </span>
        ))}
      </section>
    )
  }
  const add = () => {
    const text = adding.trim()
    if (!text) return
    const n = Math.max(4, ...conditions.map((c) => Number(c.id.slice(1)) || 0)) + 1
    setConditions([...conditions, { id: `C${n}`, text, appliesTo: 'This branch', activityIds: [], checkedBy: 'Agent owner' }])
    setAdding('')
  }
  const record = () => {
    const result = decide(view.id, { kind, conditions, reason })
    setError(result.ok ? undefined : result.reason)
  }
  return (
    <section className={styles.decision} aria-label="Your decision">
      <div className={styles.pair}>
        <h2 className={styles.sideTitle}>Your decision</h2>
        <span className={styles.muted}>Logged with your reason. Conditions carry onto {view.idLine.split(' ')[0]}.</span>
      </div>
      <RadioCardGroup<ReviewDecision['kind']>
        name="decision"
        aria-label="Decision"
        value={kind}
        onChange={setKind}
        options={([
          { value: 'approve', title: 'Approve', description: 'Takes effect today' },
          { value: 'approveWithConditions', title: 'Approve with conditions', description: 'Takes effect today, with conditions' },
          { value: 'reReview', title: 'Re-review', description: `Back to ${view.sponsor} with questions` },
          { value: 'deny', title: 'Deny', description: `Stays at ${view.from}` },
        ] as { value: ReviewDecision['kind']; title: string; description: string }[]).map((o) => ({ ...o, disabled: view.mode !== 'decide' }))}
      />
      {kind === 'approveWithConditions' ? (
        <section className={styles.section} aria-label="Conditions">
          <span className={styles.strong}>Conditions</span>
          {conditions.map((c) => (
            <span key={c.id} className={styles.condition}>
              <span className={styles.mono}>{c.id}</span>
              <span>{c.text}</span>
              <Button variant="ghost" size="sm" aria-label={`Remove ${c.id}`} onClick={() => setConditions(conditions.filter((x) => x.id !== c.id))}>
                Remove
              </Button>
            </span>
          ))}
          <span className={styles.inline}>
            <Input aria-label="Add condition" placeholder="Add condition" value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <Button variant="ghost" onClick={add}>
              Add condition
            </Button>
          </span>
        </section>
      ) : null}
      <Field label="Reason" htmlFor={id}>
        <Textarea id={id} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {error ? (
        <span role="alert" className={styles.meta}>
          {error}
        </span>
      ) : null}
      <span className={styles.buttons}>
        {view.mode === 'decide' ? (
          <Button variant="primary" onClick={record}>
            Record decision
          </Button>
        ) : (
          <Button locked={lockReason('approveGoLive', state.personaId)}>Record decision</Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setReason('')
            setKind('approveWithConditions')
            setConditions(view.proposed)
          }}
        >
          Cancel
        </Button>
      </span>
      <span className={styles.meta}>{view.logged}</span>
    </section>
  )
}
