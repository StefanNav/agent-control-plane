import { useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation } from 'react-router'
import { Button, VisuallyHidden } from '../../design-system'
import { personaById } from '../personas'
import { onStepRoute } from '../stories/engine'
import { STORIES } from '../stories/index'
import { useStory } from '../stories/progress'
import type { Story } from '../stories/types'
import { useActiveStory, useStoryActions } from '../stories/useStory'
import { scrollDelta } from './scroll'
import styles from './StoryPanel.module.css'

const SAFE_TARGET = /^[a-z0-9-]+$/

/** Bring the step's target into view once it renders, clear of the panel (R6); leave it if it shows. */
function useScrollToTarget(
  target: string | undefined,
  key: string,
  panel: RefObject<HTMLElement | null>,
) {
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
      const box = panel.current?.getBoundingClientRect() ?? null
      const delta = scrollDelta(el.getBoundingClientRect(), box, window.innerHeight)
      if (delta === 0) return
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      window.scrollBy?.({ top: delta, behavior: reduced ? 'auto' : 'smooth' })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, key, panel])
}

/** The narration panel (spec §4.3, R5): docked bottom-right while a story is followed. */
export function StoryPanel({ stories = STORIES }: { stories?: readonly Story[] }) {
  const active = useActiveStory(stories)
  const { go, exit } = useStoryActions(stories)
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const toggled = useRef(false)
  const focusPanel = useStory((s) => s.focusPanel)
  const step = active ? active.story.steps[active.progress.step - 1] : undefined
  useScrollToTarget(
    step?.target,
    active ? `${active.story.id}-${active.progress.step}` : '',
    panelRef,
  )
  // Hide and Show swap the panel, so the button that was pressed is gone: hand focus to its partner.
  useEffect(() => {
    if (!toggled.current) return
    toggled.current = false
    toggleRef.current?.focus()
  }, [hidden])
  // A story started from the page (landing card, Stories menu) opens the panel and takes focus to its step (R6).
  if (focusPanel && hidden) setHidden(false)
  useEffect(() => {
    if (!focusPanel || !active || hidden) return
    titleRef.current?.focus()
    useStory.getState().panelFocused()
  }, [focusPanel, hidden, active])
  if (!active || !step) return null
  const toggle = (next: boolean) => {
    toggled.current = true
    setHidden(next)
  }

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
      <VisuallyHidden role="status">{`${count}: ${step.title}`}</VisuallyHidden>
      {hidden ? (
        <aside ref={panelRef} aria-label="Story" className={styles.collapsed} data-modal-companion>
          <span className={styles.storyTitle}>{story.title}</span>
          <span className={styles.count}>{count}</span>
          <button ref={toggleRef} type="button" className={styles.textButton} onClick={() => toggle(false)}>
            Show
          </button>
        </aside>
      ) : (
        <>
          <div className={styles.space} aria-hidden="true" />
          <aside ref={panelRef} aria-label="Story" className={styles.panel} data-modal-companion>
            <div className={styles.head}>
              <span className={styles.storyTitle}>{story.title}</span>
              <span className={styles.count}>{count}</span>
              <button ref={toggleRef} type="button" className={styles.textButton} onClick={() => toggle(true)}>
                Hide
              </button>
            </div>
            <h2 ref={titleRef} tabIndex={-1} className={styles.title}>
              {step.title}
            </h2>
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
