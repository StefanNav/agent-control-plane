import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '../../design-system'
import { personaById } from '../personas'
import { onStepRoute } from '../stories/engine'
import { STORIES } from '../stories/index'
import type { Story } from '../stories/types'
import { useActiveStory, useStoryActions } from '../stories/useStory'
import styles from './StoryPanel.module.css'

const SAFE_TARGET = /^[a-z0-9-]+$/

/** Bring the step's target into view once it renders (R6); leave it alone if it already shows. */
function useScrollToTarget(target: string | undefined, key: string) {
  useEffect(() => {
    if (!target || !SAFE_TARGET.test(target)) return
    let frame = 0
    let tries = 0
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-story-target="${target}"]`)
      if (!el) {
        if (++tries < 60) frame = requestAnimationFrame(tick)
        return
      }
      const rect = el.getBoundingClientRect()
      const tall = rect.height > window.innerHeight - 160
      const topHidden = rect.top < 0 || rect.top > window.innerHeight - 120
      if (!topHidden && (tall || rect.bottom <= window.innerHeight)) return
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView?.({
        block: tall ? 'start' : 'center',
        behavior: reduced ? 'auto' : 'smooth',
      })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, key])
}

/** The narration panel (spec §4.3, R5): docked bottom-right while a story is followed. */
export function StoryPanel({ stories = STORIES }: { stories?: readonly Story[] }) {
  const active = useActiveStory(stories)
  const { go, exit } = useStoryActions(stories)
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)
  const step = active ? active.story.steps[active.progress.step - 1] : undefined
  useScrollToTarget(step?.target, active ? `${active.story.id}-${active.progress.step}` : '')
  if (!active || !step) return null

  const { story, progress } = active
  const n = progress.step
  const total = story.steps.length
  const last = n === total
  const name = personaById(story.personaId).name
  const count = `Step ${n} of ${total}`
  const target = step.target && SAFE_TARGET.test(step.target) ? step.target : null

  return (
    <>
      {target ? (
        <style>{`[data-story-target="${target}"] { outline: 2px solid var(--cs-ink); outline-offset: 2px; }`}</style>
      ) : null}
      {hidden ? (
        <aside aria-label="Story" className={styles.collapsed}>
          <span className={styles.storyTitle}>{story.title}</span>
          <span className={styles.count}>{count}</span>
          <button type="button" className={styles.textButton} onClick={() => setHidden(false)}>
            Show
          </button>
        </aside>
      ) : (
        <>
          <div className={styles.space} aria-hidden="true" />
          <aside aria-label="Story" className={styles.panel}>
            <div className={styles.head}>
              <span className={styles.storyTitle}>{story.title}</span>
              <span className={styles.count}>{count}</span>
              <button type="button" className={styles.textButton} onClick={() => setHidden(true)}>
                Hide
              </button>
            </div>
            <h2 className={styles.title}>{step.title}</h2>
            <p className={styles.body}>{step.body}</p>
            {onStepRoute(step, pathname) ? null : (
              <p className={styles.note}>
                You’ve left this step.{' '}
                <button type="button" className={styles.inline} onClick={() => go(n)}>
                  Return to it
                </button>
              </p>
            )}
            {last ? (
              <p className={styles.note}>
                End of {name}’s story. Keep exploring as {name}, or pick another from Stories.
              </p>
            ) : null}
            <div className={styles.foot}>
              {n > 1 ? (
                <Button size="sm" onClick={() => go(n - 1)}>
                  Back
                </Button>
              ) : null}
              <Button size="sm" variant="primary" onClick={() => (last ? exit() : go(n + 1))}>
                {last ? 'Finish' : 'Next'}
              </Button>
              <Button size="sm" variant="ghost" className={styles.exit} onClick={exit}>
                Exit
              </Button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
