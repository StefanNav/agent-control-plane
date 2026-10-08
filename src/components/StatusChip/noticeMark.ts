import type { NoticeMark } from '../../design-system'
import type { Status } from '../../data/types'

/** The Notice mark for a status. Only statuses that need a human get one. */
export function noticeMark(status: Status): NoticeMark {
  return status === 'crit' || status === 'warn' || status === 'review' || status === 'stale' ? status : 'none'
}
