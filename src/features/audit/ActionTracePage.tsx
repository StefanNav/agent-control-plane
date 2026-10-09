import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionTrace } from '../../components'
import { Button, Card, Checkbox, Field, Input, LinkButton, Modal } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { nextIncidentCode } from '../../store/mutations'
import { can, lockReason } from '../../store/permissions'
import { personName } from '../board/selectors'
import { roleOn } from '../controls/selectors'
import { ReadOnlyChip } from './ReadOnlyChip'
import { selectTrace } from './selectors'
import styles from './audit.module.css'

/** One action, start to finish (7b): every step to the millisecond, with who and what, decisions and links. */
export function ActionTracePage() {
  const { actionId = '' } = useParams()
  const navigate = useNavigate()
  const state = useDemo((s) => s)
  const openIncident = useDemo((s) => s.openIncident)
  const trace = selectTrace(state, actionId)
  const [opening, setOpening] = useState(false)
  const [title, setTitle] = useState('')
  const [linkAll, setLinkAll] = useState(true)
  if (!trace) return <NotFound />
  const allowed = can(state, state.personaId, 'openIncident', { agentId: trace.agentId })
  const defaultTitle = `${trace.blockedBy ? `${trace.blockedBy} blocked: ` : ''}${trace.view.title}`
  const confirm = () => {
    const code = nextIncidentCode(state)
    const result = openIncident(trace.agentId, {
      title: title || defaultTitle,
      actionIds: linkAll ? trace.sameRuleIds : [actionId],
    })
    if (result.ok) navigate(`/operations/incidents/${code.toLowerCase()}`)
  }
  return (
    <>
      <PageHeader
        breadcrumb={`Operations / Actions / ${trace.view.code}`}
        title={trace.view.title}
        idLine={trace.view.code}
        chips={<ReadOnlyChip />}
        sub={trace.sub}
        actions={
          <span className={styles.headerActions}>
            <LinkButton to={`/reports/export?agent=${trace.agentId}`}>
              Export for surveyor
            </LinkButton>
            <Button
              variant="primary"
              locked={allowed ? undefined : lockReason('openIncident', state.personaId)}
              onClick={() => setOpening(true)}
            >
              Open incident
            </Button>
          </span>
        }
      />
      <div className={styles.split}>
        <div className={styles.traceCard}>
          {trace.view.steps.length ? (
            <div data-story-target="trace-steps">
              <ActionTrace view={trace.view} layout="rows" />
            </div>
          ) : (
            <p className={styles.empty}>
              No step-level trace was kept for this action. Its outcome and policy result are in the
              action list.
            </p>
          )}
        </div>
        <div className={styles.side}>
          <Card>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Who and what</span>
            </div>
            {trace.who.map(([k, v]) => (
              <div key={k} className={styles.kv}>
                <span>{k}</span>
                <span className={styles.value}>{v}</span>
              </div>
            ))}
            <div className={styles.cardSpacer} />
          </Card>
          {trace.policy ? (
            <Card>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>Policy decisions</span>
                <span className={styles.cardSub}>{trace.policy.summary}</span>
              </div>
              {trace.policy.rows.map(([rule, result]) => (
                <div key={rule} className={styles.kvIndented}>
                  <span className={result === 'blocked' ? styles.ink : undefined}>{rule}</span>
                  <span className={styles.value}>{result}</span>
                </div>
              ))}
              <div className={styles.cardSpacer} />
            </Card>
          ) : null}
          <Card>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Linked</span>
            </div>
            <div className={styles.kv}>
              <span>Exception</span>
              <span className={styles.value}>
                {trace.linked.exception ? (
                  <Link to={`/operations/inbox/${trace.linked.exception.id}`}>
                    {trace.linked.exception.text}
                  </Link>
                ) : (
                  'None'
                )}
              </span>
            </div>
            <div className={styles.kv}>
              <span>Same rule today</span>
              <span className={styles.value}>
                {trace.linked.sameRule.length
                  ? trace.linked.sameRule.map((code, i) => (
                      <span key={code}>
                        {i ? ', ' : ''}
                        <Link to={`/operations/actions/${code.toLowerCase()}`}>{code}</Link>
                      </span>
                    ))
                  : 'None'}
              </span>
            </div>
            <div className={styles.cardSpacer} />
          </Card>
        </div>
      </div>
      {opening ? (
        <Modal
          open
          onClose={() => setOpening(false)}
          title="Open an incident"
          description={`The commander is the agent’s owner, ${personName(state, state.agents.find((a) => a.id === trace.agentId)?.ownerId)}. You can add entries as it goes.`}
          audit={`Logs ${personName(state, state.personaId)} · ${roleOn(state, state.personaId, trace.agentId)}`}
          actions={
            <>
              <Button variant="ghost" onClick={() => setOpening(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirm}>
                Open incident
              </Button>
            </>
          }
        >
          <div className={styles.dialogBody}>
            <Field label="Title" htmlFor="incident-title">
              <Input
                id="incident-title"
                value={title}
                placeholder={defaultTitle}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            {trace.blockedBy ? (
              <Checkbox
                checked={linkAll}
                onChange={setLinkAll}
                label={`Links ${trace.sameRuleIds.length} actions blocked by ${trace.blockedBy} today`}
                description="Untick to link only this action."
              />
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
