import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { LinkButton, Tabs } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { addMinutes, formatDate } from '../../lib/clock'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { ExceptionDetail } from './ExceptionDetail'
import { InboxItem } from './InboxItem'
import { selectExceptionDetail, selectInbox, selectInboxHeader } from './selectors'
import styles from './inbox.module.css'

type Tab = 'needs' | 'waiting' | 'log'
const TABS: Tab[] = ['needs', 'waiting', 'log']

/** The exception inbox (5a): what needs you, by deadline, with the selected item in detail. */
export function InboxPage() {
  const { exceptionId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const state = useDemo((s) => s)
  const snoozeException = useDemo((s) => s.snoozeException)
  const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'needs'
  const inbox = useMemo(() => selectInbox(state, state.personaId), [state])
  const header = selectInboxHeader(state, state.personaId)
  const items = tab === 'waiting' ? inbox.waiting : inbox.needsMe
  const selectedId = exceptionId ?? items[0]?.id
  const detail = selectedId ? selectExceptionDetail(state, selectedId) : null
  const search = tab === 'needs' ? '' : `?tab=${tab}`
  const days = (detail?.trend ?? []).map((_, i, all) => formatDate(addMinutes(state.now, -(all.length - 1 - i) * 24 * 60)))
  const agentId = detail?.agentId
  const locked = can(state, state.personaId, 'resolveException', { agentId }) ? null : lockReason('resolveException', state.personaId)

  const listLabel = tab === 'waiting' ? 'Waiting on others' : 'Needs me'
  return (
    <>
      <PageHeader
        breadcrumb="Operations / Inbox"
        title="Inbox"
        status={header.status}
        actions={
          <span className={styles.headerActions}>
            <LinkButton to="/operations/inbox?view=digest" variant="ghost">
              Daily digest
            </LinkButton>
            <LinkButton to={header.divisionId ? `/settings/divisions/${header.divisionId}` : '/settings'}>Delivery settings</LinkButton>
          </span>
        }
        tabs={
          <Tabs
            ariaLabel="Inbox"
            current={tab}
            items={[
              { id: 'needs', label: `Needs me · ${inbox.needsMe.length}`, to: '/operations/inbox' },
              { id: 'waiting', label: `Waiting on others · ${inbox.waiting.length}`, to: '/operations/inbox?tab=waiting' },
              { id: 'log', label: 'Log', to: '/operations/inbox?tab=log' },
            ]}
          />
        }
      />
      <div className={styles.body}>
        <div className={styles.listCard}>
          <div className={styles.listHead}>
            <span className={styles.label}>
              {listLabel} · {items.length}
            </span>
            <span className={styles.sorted}>sorted by deadline</span>
          </div>
          {items.length ? (
            <ul aria-label={listLabel} className={styles.list}>
              {items.map((item) => (
                <InboxItem key={item.id} item={item} to={`/operations/inbox/${item.id}${search}`} selected={item.id === selectedId} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{tab === 'waiting' ? 'Nothing is waiting on anyone else.' : 'Nothing needs you right now.'}</p>
          )}
          <div className={styles.howItReaches}>
            <span className={styles.label}>How this reaches you</span>
            <span>Critical pages you. Warnings, reviews and questions land here and in the 07:00 digest. Information stays in the log.</span>
          </div>
        </div>
        {detail ? (
          <ExceptionDetail
            detail={detail}
            now={state.now}
            days={days}
            locked={locked}
            onSnooze={(until) => {
              const result = snoozeException(detail.id, until)
              if (result.ok && selectedId === detail.id) navigate(`/operations/inbox${search}`)
            }}
          />
        ) : (
          <section aria-label="Exception detail" className={styles.detailEmpty}>
            Select an item to see what happened and what it needs.
          </section>
        )}
      </div>
    </>
  )
}
