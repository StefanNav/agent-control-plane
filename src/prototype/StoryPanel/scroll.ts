/** The parts of a DOMRect the scroll rule reads. */
export interface Box {
  left: number
  top: number
  right: number
  bottom: number
  height: number
}

const MARGIN = 16

/**
 * How far to scroll so a step's target shows clear of the narration panel (R6): 0 when it already
 * does. A target that shares the panel's columns must end above it; one too tall to fit is left
 * alone while its top shows in the upper half of the screen, else brought to the top.
 */
export function scrollDelta(target: Box, panel: Box | null, viewportHeight: number): number {
  const covered = panel !== null && target.left < panel.right && target.right > panel.left
  const floor = (covered ? panel.top : viewportHeight) - MARGIN
  if (target.height > floor - MARGIN) {
    const topShows = target.top >= 0 && target.top < viewportHeight / 2
    return topShows ? 0 : target.top - MARGIN
  }
  if (target.top < 0) return target.top - MARGIN
  if (target.bottom > floor) return target.bottom - floor
  return 0
}
