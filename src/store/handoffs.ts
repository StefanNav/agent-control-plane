import type { DemoState } from '../data/types'
import { addDays } from '../lib/clock'

/**
 * Hand-offs (Phase 12, R9 product-wide): when one person's action makes another named person
 * responsible for the next step, that person gets an inbox item. Information goes to the log.
 */

/** 17:00 on `at`'s day, or the next day's 17:00 from 15:00 on: for hand-offs that shouldn't wait days. */
export function endOfDayDeadline(at: string): string {
  const day = Number(at.slice(11, 13)) >= 15 ? addDays(at, 1) : at
  return `${day.slice(0, 10)}T17:00:00`
}

/** An FYI: a log event addressed to the people told ("Priya told"); never an inbox item (E5). */
export function tell(s: DemoState, e: { at: string; agentId?: string; text: string; sub: string; to: string[] }): void {
  s.logEvents.push({ id: `log-tell-${s.logEvents.length + 1}`, at: e.at, ...(e.agentId ? { agentId: e.agentId } : {}), text: e.text, sub: e.sub, to: e.to })
}
