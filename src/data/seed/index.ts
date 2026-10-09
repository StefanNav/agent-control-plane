import { DEMO_NOW } from '../../lib/clock'
import type { DemoState } from '../types'
import { actions } from './actions'
import { activities } from './activities'
import { promotions, reviewLevels, samplingDraws } from './autonomy'
import { agents } from './agents'
import { divisions } from './divisions'
import { changeEvents, logEvents } from './events'
import { exceptions } from './exceptions'
import { epicDrafts, flags } from './feedback'
import { callers, gatewayItems } from './gateway'
import { incidents } from './incidents'
import { exportRecords, retiredAgents } from './inventory'
import { draftAgents, intakeRequests, onboardings } from './onboarding'
import { people, roles } from './people'
import { grants, hardStops, instructions } from './policies'
import { privileges } from './privileges'
import { sampleCases, scorecards } from './scorecards'

/**
 * Bump whenever seed data or the DemoState shape changes: saved state from an older
 * version is discarded and replaced by a fresh seed (Review focus 1).
 */
export const SEED_VERSION = 8

const SEED: DemoState = {
  version: SEED_VERSION,
  now: DEMO_NOW,
  personaId: 'marcus',
  people,
  roles,
  divisions,
  agents: [...agents, ...retiredAgents, ...draftAgents],
  activities,
  privileges,
  hardStops,
  instructions,
  grants,
  exceptions: [...exceptions, ...gatewayItems],
  actions,
  resumeRequests: [],
  logEvents,
  changeEvents,
  incidents,
  intakeRequests,
  onboardings,
  scorecards,
  sampleCases,
  exports: exportRecords,
  epicDrafts,
  flags,
  changes: [],
  callers,
  reviewChanges: [],
  reviewLevels,
  samplingDraws,
  promotions,
  stats24h: { closedEarlier: 5, medianCloseMin: 41, lastHour: { hardStops: 3, pauses: 1, pages: 0 }, actionsToday: 1912 },
  audit: [],
}

/** A fresh, independent copy of Lakeshore Health as of Tue 08 Dec 2026, 09:52. */
export function createSeed(): DemoState {
  return structuredClone(SEED)
}
