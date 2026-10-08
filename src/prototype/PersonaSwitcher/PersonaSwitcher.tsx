import { useNavigate } from 'react-router'
import { Icon, Menu } from '../../design-system'
import { useDemo } from '../../store'
import { PERSONAS, personaById } from '../personas'
import styles from './PersonaSwitcher.module.css'

/** "Viewing as Marcus · Agent owner ▾": switch who you are and land on their screen. */
export function PersonaSwitcher() {
  const navigate = useNavigate()
  const personaId = useDemo((s) => s.personaId)
  const setPersona = useDemo((s) => s.setPersona)
  const current = personaById(personaId)
  return (
    <Menu
      align="right"
      width={260}
      trigger={({ toggle, ref, open }) => (
        <button ref={ref} type="button" className={styles.trigger} aria-expanded={open} aria-haspopup="menu" onClick={toggle}>
          Viewing as <strong className={styles.name}>{current.name}</strong> · {current.roleLabel}
          <Icon name="chevron" size={10} />
        </button>
      )}
      groups={[
        {
          label: 'View the prototype as',
          items: PERSONAS.map((persona) => ({
            id: persona.id,
            label: persona.name,
            sub: persona.roleLabel,
            selected: persona.id === personaId,
            onSelect: () => {
              setPersona(persona.id)
              navigate(persona.landing)
            },
          })),
        },
      ]}
    />
  )
}
