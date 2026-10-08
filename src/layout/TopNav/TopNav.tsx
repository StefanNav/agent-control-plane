import { Link } from 'react-router'
import { NAV_ITEMS, type NavSection } from '../../app/nav'
import { Avatar } from '../../design-system'
import { cx } from '../../lib/cx'
import styles from './TopNav.module.css'

export interface TopNavProps {
  current: NavSection | null
  avatarInitial: string
  hospital?: string
}

export function TopNav({ current, avatarInitial, hospital = 'Lakeshore Health' }: TopNavProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.wordmark}>AIMS</span>
        <nav aria-label="Main" className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              aria-current={item.id === current ? 'page' : undefined}
              className={cx(styles.item, item.id === current && styles.current)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.right}>
        <span>{hospital}</span>
        <Avatar initial={avatarInitial} />
      </div>
    </header>
  )
}
