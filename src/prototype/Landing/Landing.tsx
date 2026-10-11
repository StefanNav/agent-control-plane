import { useId } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, LinkButton } from '../../design-system'
import type from '../../design-system/type.module.css'
import { useDemo } from '../../store'
import { PITCH } from '../copy'
import { personaById } from '../personas'
import { STORIES } from '../stories'
import { useStory } from '../stories/progress'
import { useStoryActions } from '../stories/useStory'
import { NARRATOR_PHOTO } from '../tour/narrator'
import { tourMinutes } from '../tour/tourMinutes'
import { exitTourIfOpen, tourRuntime, unlockVoice } from '../tour/useTour'
import { Credit } from './Credit'
import styles from './Landing.module.css'

/**
 * The start page (guided-tour spec §4.1): what this is, the narrated tour as its main action, then
 * seven stories and free explore.
 */
export function Landing() {
  const navigate = useNavigate()
  const setPersona = useDemo((s) => s.setPersona)
  const { start } = useStoryActions()
  const marcus = personaById('marcus')

  const { timeline, player } = tourRuntime()
  const minutes = tourMinutes(timeline.total)
  const exploreHintId = useId()

  // The click is the gesture that lets the browser play audio, so the voice is primed inside it.
  const playTour = () => {
    unlockVoice()
    player.getState().open(0, true)
  }

  const exploreFreely = () => {
    // Exploring takes over from the tour, as a story does (Rulings 14, 39). Closing it first
    // resets the demo, so Marcus below is the persona left, and this navigation the last one.
    exitTourIfOpen()
    useStory.getState().exit()
    setPersona(marcus.id)
    navigate(marcus.landing)
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <span className={type.label}>Prototype · mock data</span>
        <h1 className={type.pageTitle}>Agent Control Plane</h1>
        <p className={styles.lead}>{PITCH}</p>
        <p className={styles.text}>
          Agent Control Plane is the operations console of Attune’s AI management system (AIMS).
          This clickable prototype runs on mock data for Lakeshore Health, a fictional hospital with
          41 agents in 5 divisions. The clock is frozen at Tue 08 Dec 2026, 09:52.
        </p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={playTour}>
            Play the tour · {minutes} min
          </Button>
          <div className={styles.more}>
            <div className={styles.moreButtons}>
              <Button variant="secondary" aria-describedby={exploreHintId} onClick={exploreFreely}>
                Explore freely
              </Button>
              <LinkButton to="/about">About this work</LinkButton>
            </div>
            <span id={exploreHintId} className={type.meta}>
              Explore freely starts as Marcus, the agent owner.
            </span>
          </div>
        </div>
        <p className={styles.text}>
          A narrated walkthrough of one agent’s life: the problem, the product, three key decisions
          and how I’d validate it.
        </p>
        <Credit name="Stefan" src={NARRATOR_PHOTO} />
      </section>

      <section className={styles.stories} aria-labelledby="stories-title">
        <div className={styles.storiesHead}>
          <h2 id="stories-title" className={type.label}>
            Or explore on your own
          </h2>
          <p className={styles.text}>
            Each story walks through the real screens in a few steps. Click around on the way; Next
            brings you back.
          </p>
        </div>
        <div className={styles.grid} data-story-target="people-cards">
          {STORIES.map((story) => {
            const persona = personaById(story.personaId)
            return (
              <Card
                key={story.id}
                role="article"
                aria-label={persona.name}
                className={styles.card}
                data-story-target={`people-${persona.id}`}
              >
                <div className={styles.who}>
                  <span className={styles.name}>{persona.name}</span>
                  <span className={type.meta}>{persona.roleLabel}</span>
                </div>
                <span className={styles.storyTitle}>{story.title}</span>
                <p className={styles.summary}>{story.summary}</p>
                <span className={styles.foot}>
                  <span className={type.mono}>{story.steps.length} steps</span>
                  <Button variant="ghost" size="sm" onClick={() => start(story.id)}>
                    Follow {persona.name}’s story →
                  </Button>
                </span>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
