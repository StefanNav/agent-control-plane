import { DEMO_NOW } from '../../lib/clock'
import type { DemoState } from '../types'
import { actions } from './actions'
import { activities } from './activities'
import { agents } from './agents'
import { divisions } from './divisions'
import { changeEvents, logEvents } from './events'
import { exceptions } from './exceptions'
import { people, roles } from './people'
import { grants, hardStops, instructions } from './policies'
import { privileges } from './privileges'

/**
 * Bump whenever seed data or the DemoState shape changes: saved state from an older
 * version is discarded and replaced by a fresh seed (Review focus 1).
 */
export const SEED_VERSION = 3

const SEED: DemoState = {
  version: SEED_VERSION,
  now: DEMO_NOW,
  personaId: 'marcus',
  people,
  roles,
  divisions,
  agents,
  activities,
  privileges,
  hardStops,
  instructions,
  grants,
  exceptions,
  actions,
  resumeRequests: [],
  logEvents,
  changeEvents,
  stats24h: { closedEarlier: 5, medianCloseMin: 41 },
  audit: [],
}

/** A fresh, independent copy of Lakeshore Health as of Tue 08 Dec 2026, 09:52. */
export function createSeed(): DemoState {
  return structuredClone(SEED)
}
