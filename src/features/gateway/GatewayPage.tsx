import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, LinkButton, Modal, Notice, Table, Tabs, Textarea } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { selectGateway, type GatewayTab } from './selectors'
import styles from './gateway.module.css'

const TABS: GatewayTab[] = ['unregistered', 'low', 'dismissed']

/** 9b: callers using hospital credentials with no registry record, flagged to Dana. */
export function GatewayPage() {
  const { callerId = null } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const state = useDemo((s) => s)
  const [rules, setRules] = useState(false)
  const [deciding, setDeciding] = useState<'block' | 'notAgent' | 'message' | null>(null)
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'unregistered'
  const view = selectGateway(state, callerId, tab, state.personaId)
  if (!view) return <NotFound />
  const d = view.detail
  const locked = d && !d.canDecide ? lockReason('decideCaller', state.personaId) : null
  const query = tab === 'unregistered' ? '' : `?tab=${tab}`

  return (
    <>
      <PageHeader
        breadcrumb="Inventory / Gateway"
        title="Seen at the gateway, not registered"
        sub="Callers using hospital credentials to reach Epic, the pharmacy worklist, Pyxis or Teams without a registry record."
        actions={<Button onClick={() => setRules(true)}>Gateway rules</Button>}
        tabs={<Tabs ariaLabel="Callers" current={tab} items={view.tabs} />}
      />
      <div className={styles.layout}>
        <div className={styles.main}>
          {view.notice ? (
            <Notice mark="warn" lead={view.notice.lead}>
              {view.notice.text}
            </Notice>
          ) : null}
          <Table
            ariaLabel="Callers"
            rows={view.rows}
            getRowId={(r) => r.id}
            selectedId={view.selectedId}
            onSelect={(id) => navigate(`/inventory/unregistered/${id}${query}`)}
            minRowHeight={60}
            columns={[
              {
                id: 'caller',
                header: 'Caller',
                width: 'minmax(0, 1.3fr)',
                render: (r) => (
                  <span className={styles.pair}>
                    <span className={styles.strong}>{r.name}</span>
                    <span className={styles.meta}>{r.status ?? r.credential}</span>
                  </span>
                ),
              },
              { id: 'first', header: 'First seen', width: '96px', render: (r) => r.firstSeen },
              { id: 'calls', header: 'Calls · 7d', width: '88px', render: (r) => <span className={styles.number}>{r.calls}</span> },
              {
                id: 'reaches',
                header: 'Reaches',
                width: 'minmax(0, 1.4fr)',
                render: (r) => (
                  <span className={styles.pair}>
                    {r.reaches.map((x, i) => (
                      <span key={x} className={i ? styles.meta : undefined}>
                        {x}
                      </span>
                    ))}
                  </span>
                ),
              },
              {
                id: 'owner',
                header: 'Likely owner',
                width: '160px',
                render: (r) => (
                  <span className={styles.pair}>
                    <span>{r.owner.name}</span>
                    <span className={styles.meta}>{r.owner.sub}</span>
                  </span>
                ),
              },
            ]}
          />
          <p className={styles.foot}>Found by matching gateway traffic against the registry every 15 minutes. Callers with fewer than 20 calls a week are grouped under Low volume.</p>
        </div>

        {d ? (
          <aside className={styles.panel} aria-label={d.name}>
            <div className={styles.panelHead}>
              <span className={styles.strong}>{d.name}</span>
              <span className={styles.meta}>{d.seen}</span>
            </div>
            <div className={styles.panelBlock}>
              {d.does ? <Fact label="What it does, from its traffic">{d.does}</Fact> : null}
              {d.patientData ? (
                <span className={styles.fact}>
                  <span className={styles.meta}>Patient data</span>
                  <span className={styles.inline}>
                    <StatusChip status="warn" label={d.patientData.flag} />
                    <span>{d.patientData.note}</span>
                  </span>
                </span>
              ) : null}
              {d.registeredBy ? <Fact label="Registered by">{d.registeredBy}</Fact> : null}
              {d.looksLike ? <Fact label="Looks like">{d.looksLike}</Fact> : null}
            </div>
            <div className={styles.panelBlock}>
              {d.decision ? (
                <Notice mark="none" lead={`${d.decision.lead}.`}>
                  {d.decision.text}
                </Notice>
              ) : (
                <>
                  {d.start ? (
                    <LinkButton to={d.start.to} variant="primary" className={styles.wide}>
                      {d.start.label}
                    </LinkButton>
                  ) : null}
                  {d.noMatch ? <span className={styles.sub}>{d.noMatch}</span> : null}
                  <span className={styles.inline}>
                    {d.message ? locked ? <Button locked={locked}>{d.message}</Button> : <Button onClick={() => setDeciding('message')}>{d.message}</Button> : null}
                    {locked ? <Button locked={locked}>Block at the gateway</Button> : <Button onClick={() => setDeciding('block')}>Block at the gateway</Button>}
                  </span>
                  {d.caution ? (
                    <span className={styles.sub}>
                      <strong className={styles.strong}>{d.caution.lead}</strong> {d.caution.text}
                    </span>
                  ) : null}
                </>
              )}
              {d.messages.map((m) => (
                <span key={m} className={styles.meta}>
                  {m}
                </span>
              ))}
            </div>
            <div className={styles.panelFoot}>
              <span className={styles.meta}>Every choice is logged with a reason.</span>
              {d.decision ? null : locked ? (
                <Button locked={locked} variant="ghost">
                  Not an agent
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setDeciding('notAgent')}>
                  Not an agent
                </Button>
              )}
            </div>
          </aside>
        ) : null}
      </div>
      {rules ? <RulesModal onClose={() => setRules(false)} /> : null}
      {deciding && d && view.selectedId ? <DecisionModal kind={deciding} callerId={view.selectedId} name={d.name} owner={d.message?.replace('Message ', '') ?? ''} onClose={() => setDeciding(null)} /> : null}
    </>
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

/** "Gateway rules" (composed): the three rules 9b states, read only. */
function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Gateway rules"
      description="How callers without a registry record are found and handled."
      actions={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className={styles.rules}>
        <li>Match gateway traffic against the registry every 15 minutes.</li>
        <li>Group callers with fewer than 20 calls a week under Low volume.</li>
        <li>Log calls from a caller with no registry record; block only when a person decides, with a reason.</li>
      </ul>
    </Modal>
  )
}

const DECISIONS = {
  block: { title: (n: string) => `Block ${n} at the gateway?`, label: 'Reason', button: 'Block at the gateway' },
  notAgent: { title: (n: string) => `${n} is not an agent`, label: 'Reason', button: 'Move to Dismissed' },
  message: { title: (_n: string, owner: string) => `Message ${owner}`, label: 'Message', button: 'Send message' },
} as const

/** Block, "Not an agent" or a message to the likely owner: each needs words, and each is logged (9b). */
function DecisionModal({ kind, callerId, name, owner, onClose }: { kind: keyof typeof DECISIONS; callerId: string; name: string; owner: string; onClose: () => void }) {
  const blockCaller = useDemo((s) => s.blockCaller)
  const dismissCaller = useDemo((s) => s.dismissCaller)
  const messageCallerOwner = useDemo((s) => s.messageCallerOwner)
  const [text, setText] = useState(kind === 'message' ? `${name} is reaching hospital systems without a registry record. Can we talk about onboarding it?` : '')
  const [error, setError] = useState<string>()
  const spec = DECISIONS[kind]
  const confirm = () => {
    const result = kind === 'block' ? blockCaller(callerId, text) : kind === 'notAgent' ? dismissCaller(callerId, text) : messageCallerOwner(callerId, text)
    if (!result.ok) return setError(result.reason)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={spec.title(name, owner)}
      description={kind === 'block' ? 'Blocking stops calls within a minute.' : kind === 'notAgent' ? 'It moves to Dismissed with your reason.' : `${owner} isn’t a console user; the message is logged on the caller.`}
      footNote={error ? <span role="alert">{error}</span> : 'Every choice is logged with a reason.'}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirm}>
            {spec.button}
          </Button>
        </>
      }
    >
      <label className={styles.fact}>
        <span className={styles.meta}>{spec.label}</span>
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
    </Modal>
  )
}
