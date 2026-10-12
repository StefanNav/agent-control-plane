import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { AttuneWelcome } from './AttuneWelcome'
import { markWelcomed } from './session'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import styles from './AttuneSplash.module.css'

/** After the mark comes to rest: a beat with it and its name, then the fade to the page. */
export const SPLASH_HOLD_MS = 300
export const SPLASH_FADE_MS = 300

type Phase = 'waiting' | 'showing' | 'leaving' | 'gone'

/** Tests about the tour itself switch it off (`tests/e2e/welcomed.ts`); a visitor never does. */
function switchedOff(): boolean {
  try {
    return sessionStorage.getItem('attune-splash') === 'off'
  } catch {
    return false
  }
}

export interface AttuneSplashProps {
  /** The tour's welcome is showing (a link opened the tour on this page's first location). */
  show: boolean
}

/**
 * The full-page welcome before a tour link's first screen: the page covered, Attune's mark doing
 * its "First hello" over its name, a beat at rest, then a fade to the tour's welcome card beneath.
 * Every time a page opens on that card (a tour link, a refresh of one), never under reduced motion.
 * A click or a key skips it; the key goes no further, so it never presses Play beneath. Decorative:
 * the card beneath is what assistive tech reads. It marks the session welcomed, so the landing
 * page's own welcome stays still afterwards.
 */
export function AttuneSplash({ show }: AttuneSplashProps) {
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState<Phase>('waiting')
  const [settled, setSettled] = useState(false)
  // Decided the moment the welcome shows, while rendering, so nothing paints before the cover.
  if (phase === 'waiting' && show) setPhase(!reduced && !switchedOff() ? 'showing' : 'gone')
  if ((phase === 'showing' || phase === 'leaving') && !show) setPhase('gone')

  const leave = useCallback(() => setPhase((now) => (now === 'showing' ? 'leaving' : now)), [])
  const covering = phase === 'showing' || phase === 'leaving'

  useEffect(() => {
    if (phase === 'showing') markWelcomed()
  }, [phase])

  // Every key while it covers the page skips it, and is spent doing so (before the tour's own keys).
  // Listening from before the first paint, so no key slips past it.
  useLayoutEffect(() => {
    if (!covering) return
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      leave()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [covering, leave])

  useEffect(() => {
    if (phase !== 'showing' || !settled) return
    const timer = setTimeout(leave, SPLASH_HOLD_MS)
    return () => clearTimeout(timer)
  }, [phase, settled, leave])

  useEffect(() => {
    if (phase !== 'leaving') return
    const timer = setTimeout(() => setPhase('gone'), SPLASH_FADE_MS)
    return () => clearTimeout(timer)
  }, [phase])

  const onSettled = useCallback(() => setSettled(true), [])
  if (!covering) return null
  return (
    <div
      className={styles.splash}
      data-tour="splash"
      data-leaving={phase === 'leaving'}
      aria-hidden="true"
      onPointerDown={leave}
    >
      <AttuneWelcome size={150} once={false} onSettled={onSettled} />
      <span className={styles.name}>Attune</span>
      <span className={styles.product}>Agent Control Plane</span>
    </div>
  )
}
