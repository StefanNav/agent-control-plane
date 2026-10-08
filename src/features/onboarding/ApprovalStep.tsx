import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { StatusChip } from '../../components'
import { Button, LinkButton, Notice, RadioCardGroup, RuleTag, Textarea } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { FinalSet } from './FinalSet'
import { selectApprovalStep, selectFinalSet } from './selectors'
import { SideCard, StepCard } from './StepCard'
import styles from './onboarding.module.css'

/** Step 5: the sponsor reads job, reach and limits as one page, then approves or sends one row back (1e, 1f). */
export function ApprovalStep({ agentId, onRequesting }: { agentId: string; onRequesting: (on: boolean) => void }) {
  const state = useDemo((s) => s)
  const approveAsSponsor = useDemo((s) => s.approveAsSponsor)
  const requestSponsorChanges = useDemo((s) => s.requestSponsorChanges)
  const navigate = useNavigate()
  const view = useMemo(() => selectApprovalStep(state, agentId, state.personaId), [state, agentId])
  const set = useMemo(() => selectFinalSet(state, agentId), [state, agentId])
  const [requesting, setRequesting] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  if (!view || !set) return null
  const allowed = can(state, state.personaId, 'approveTools', { agentId })
  const waiting = view.state === 'waiting'
  const sendTo = to ?? view.tech.id
  const toName = sendTo === view.tech.id ? view.tech.name : view.owner.name
  const about = sendTo === view.tech.id ? picked : null
  const aboutLabel = about ? set.limits.rows.find((r) => r.code === about)?.label : null
  const request = (on: boolean) => {
    setRequesting(on)
    onRequesting(on)
    setError(undefined)
  }

  const footer = waiting ? (
    <div className={styles.signBar}>
      <span className={styles.signText}>
        <strong>Approve as clinical sponsor</strong>
        {view.signLine}
      </span>
      <span className={styles.inline}>
        {allowed ? (
          <>
            <Button onClick={() => request(true)}>Request changes</Button>
            <Button
              variant="primary"
              onClick={() => {
                const result = approveAsSponsor(agentId)
                if (result.ok) navigate(`/inventory/agents/${agentId}/onboarding/review`)
                else setError(result.reason)
              }}
            >
              Approve and sign
            </Button>
          </>
        ) : (
          <>
            <Button locked={lockReason('approveTools', state.personaId)}>Request changes</Button>
            <Button locked={lockReason('approveTools', state.personaId)}>Approve and sign</Button>
          </>
        )}
      </span>
    </div>
  ) : null

  const notice =
    view.state === 'signed' ? (
      <Notice mark="none" lead={`${view.signed}.`} actions={<LinkButton to={`/inventory/agents/${agentId}/onboarding/review`}>Open ready for review</LinkButton>}>
        The record is frozen at v1.0 and with AIMS Review.
      </Notice>
    ) : view.state === 'returned' && view.returned ? (
      <Notice mark="lock" lead={`Sent back to ${view.returned.to} on ${view.returned.at}.`}>
        Opens again when {view.returned.to} sends the set.
      </Notice>
    ) : view.state === 'notSent' ? (
      <Notice mark="lock" lead="Not sent yet.">
        Opens when {view.tech.name} sends the set. {view.sponsor} reviews job, reach and limits together.
      </Notice>
    ) : null

  return (
    <Split
      main={
        <StepCard number="05" title="Sponsor approval" sub="Job, reach and limits on one page, as the committee will read them. Approve the set, or send it back with a note." meta={view.sent ?? undefined}>
          {notice}
          <FinalSet agentId={agentId} picked={picked} onPick={waiting && allowed ? (code) => setPicked(picked === code ? null : code) : undefined} />
          {footer}
          {error ? <span role="alert" className={styles.blocked}>{error}</span> : null}
        </StepCard>
      }
      side={
        requesting ? (
          <SideCard label="Request changes" title="Request changes" sub="Goes back with your note. Nothing is approved.">
            <div className={styles.form}>
              <RadioCardGroup
                name="send-back"
                aria-label="Send back to"
                value={sendTo}
                onChange={setTo}
                options={[
                  { value: view.tech.id, title: view.tech.name, description: 'Limits: tools and hard stops' },
                  { value: view.owner.id, title: view.owner.name, description: 'Job and reach' },
                ]}
              />
              <span className={styles.note}>
                {aboutLabel ? (
                  <>
                    About <RuleTag>{aboutLabel}</RuleTag> the row you selected
                  </>
                ) : sendTo === view.tech.id ? (
                  'Select a hard stop on the left to send just that row back.'
                ) : (
                  'Steps 2 and 3 go back to the owner.'
                )}
              </span>
              <Textarea aria-label={`Note for ${toName}`} rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
              <span className={styles.note}>
                {sendTo === view.tech.id
                  ? `Step 4 reopens for ${toName}; steps 2 and 3 stay done. Your review comes back when ${toName} sends it again.`
                  : `Steps 2 and 3 reopen for ${toName}; step 4 stays done. Your review comes back when ${toName} sends it again.`}
              </span>
              {error ? <span role="alert">{error}</span> : null}
              <span className={styles.inline}>
                <Button
                  variant="primary"
                  onClick={() => {
                    const result = requestSponsorChanges(agentId, { to: sendTo, ...(about ? { about } : {}), note })
                    if (result.ok) {
                      request(false)
                      setNote('')
                      setPicked(null)
                    } else setError(result.reason)
                  }}
                >
                  Send back to {toName}
                </Button>
                <Button variant="ghost" onClick={() => request(false)}>
                  Cancel
                </Button>
              </span>
            </div>
          </SideCard>
        ) : (
          <SideCard
            label="Review: final set"
            title={waiting ? <StatusChip status="review" label="Review: final set" /> : 'Review: final set'}
            sub={waiting ? (view.waiting ?? undefined) : view.state === 'signed' ? (view.signed ?? undefined) : 'Not waiting'}
            foot={
              <span>
                <strong>{view.roundNote.lead}</strong> {view.roundNote.text}
              </span>
            }
          >
            <div className={styles.also}>
              <h3 className={styles.caps}>Who did what</h3>
            </div>
            {view.who.map((w) => (
              <div key={w.text} className={styles.whoRow}>
                <span>{w.text}</span>
                <span className={styles.monoMeta}>{w.date}</span>
              </div>
            ))}
          </SideCard>
        )
      }
    />
  )
}
