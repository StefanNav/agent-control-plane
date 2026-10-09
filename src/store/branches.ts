import type { Activity, Level } from '../data/types'

const LEVELS: Level[] = ['shadow', 'draft', 'supervised', 'autonomous']

/**
 * An activity just dropped a level (return to Shadow, a lapse, a step-down): each branch with a
 * level of its own drops one too, and a branch that would sit at or below its activity simply
 * follows it again. Returns the branch levels left, for the next privilege version.
 */
export function lowerBranches(activity: Activity): Record<string, Level> | undefined {
  const left: Record<string, Level> = {}
  for (const branch of activity.branches) {
    if (!branch.level) continue
    const lower = LEVELS[LEVELS.indexOf(branch.level) - 1]
    if (!lower || LEVELS.indexOf(lower) <= LEVELS.indexOf(activity.level)) delete branch.level
    else left[branch.id] = branch.level = lower
  }
  return Object.keys(left).length ? left : undefined
}
