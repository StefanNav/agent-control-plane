import { useNavigate } from 'react-router'
import { Button, Card, LinkButton } from '../../design-system'
import type from '../../design-system/type.module.css'
import { useDemo } from '../../store'
import { personaById } from '../personas'
import { STORIES } from '../stories'
import { useStory } from '../stories/progress'
import { useStoryActions } from '../stories/useStory'
import styles from './Landing.module.css'

/** The pitch, the opening line shared with the desktop gate. */
export const PITCH =
  'A hospital should bring on an AI agent the way it brings on a clinician: a written job, named people accountable, privileges earned on evidence, and supervision that spends human attention only where it matters.'

/** The start page (spec §4.2): what this is, seven stories, and free explore. */
export function Landing() {
  const navigate = useNavigate()
  const setPersona = useDemo((s) => s.setPersona)
  const { start } = useStoryActions()
  const marcus = personaById('marcus')

  const exploreFreely = () => {
    useStory.getState().setProgress(null)
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
          Agent Control Plane is the operations console of Signal’s AI management system (AIMS).
          This clickable prototype runs on mock data for Lakeshore Health, a fictional hospital with
          41 agents in 5 divisions. The clock is frozen at Tue 08 Dec 2026, 09:52.
        </p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={exploreFreely}>
            Explore freely
          </Button>
          <LinkButton to="/about">About this prototype</LinkButton>
          <span className={type.meta}>Explore freely starts as Marcus, the agent owner.</span>
        </div>
      </section>

      <section className={styles.stories} aria-labelledby="stories-title">
        <div className={styles.storiesHead}>
          <h2 id="stories-title" className={type.label}>
            Follow one person’s story
          </h2>
          <p className={styles.text}>
            Each story walks through the real screens in a few steps. Click around on the way; Next
            brings you back.
          </p>
        </div>
        <div className={styles.grid}>
          {STORIES.map((story) => {
            const persona = personaById(story.personaId)
            return (
              <Card key={story.id} role="article" aria-label={persona.name} className={styles.card}>
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
