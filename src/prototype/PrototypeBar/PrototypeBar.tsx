import { Link, useNavigate } from 'react-router'
import { Icon, Menu } from '../../design-system'
import { useDemo } from '../../store'
import { PersonaSwitcher } from '../PersonaSwitcher/PersonaSwitcher'
import { personaById } from '../personas'
import { STORIES } from '../stories/index'
import { useStory } from '../stories/progress'
import type { Story } from '../stories/types'
import { useActiveStory, useStoryActions } from '../stories/useStory'
import styles from './PrototypeBar.module.css'

/** Demo controls above the product UI: who you are, the stories, reset, About. */
export function PrototypeBar({ stories = STORIES }: { stories?: readonly Story[] }) {
  const navigate = useNavigate()
  const reset = useDemo((s) => s.reset)
  const active = useActiveStory(stories)
  const { start, exit } = useStoryActions(stories)
  return (
    <div className={styles.bar} role="region" aria-label="Prototype controls">
      <Link to="/" className={styles.brand}>
        Signal · Agent Control Plane · <span className={styles.tag}>Prototype</span>
      </Link>
      <div className={styles.controls}>
        <PersonaSwitcher />
        <Menu
          align="right"
          width={300}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              className={styles.action}
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={toggle}
            >
              Stories
              <Icon name="chevron" size={10} />
            </button>
          )}
          groups={[
            {
              label: 'Follow a story',
              items: stories.map((story) => {
                const persona = personaById(story.personaId)
                return {
                  id: story.id,
                  label: story.title,
                  sub: `${persona.name} · ${persona.roleLabel} · ${story.steps.length} steps`,
                  selected: active?.story.id === story.id,
                  onSelect: () => start(story.id),
                }
              }),
            },
            ...(active ? [{ items: [{ id: 'exit', label: 'Exit story', onSelect: exit }] }] : []),
          ]}
        />
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            useStory.getState().setProgress(null)
            reset()
            navigate('/operations/divisions/medications')
          }}
        >
          Reset demo
        </button>
        <Link to="/about" className={styles.link}>
          About
        </Link>
      </div>
    </div>
  )
}
