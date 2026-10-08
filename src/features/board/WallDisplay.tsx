import { useMemo } from 'react'
import { Link } from 'react-router'
import { Icon, type IconName } from '../../design-system'
import type { Status } from '../../data/types'
import { cx } from '../../lib/cx'
import { useDemo } from '../../store'
import { selectWall } from './selectors'
import styles from './wall.module.css'

const MARK: Partial<Record<Status, [IconName, string]>> = {
  crit: ['triangle', 'var(--cs-crit)'],
  warn: ['diamond', 'var(--cs-warn)'],
  review: ['ring', 'var(--cs-rev)'],
  stale: ['stale', 'var(--cs-meta)'],
}

/** The hospital board for a pharmacy or command-centre wall: dark, big type, no controls (4e). */
export function WallDisplay() {
  const state = useDemo((s) => s)
  const wall = useMemo(() => selectWall(state), [state])
  return (
    <div data-theme="dark" className={styles.wall}>
      <div className={styles.head}>
        <span className={styles.headText}>
          <span className={styles.kicker}>LAKESHORE HEALTH · AGENT BOARD</span>
          <h1 className={styles.title}>{wall.title}</h1>
        </span>
        <span className={styles.clockBlock}>
          <span className={styles.clock}>{wall.clock}</span>
          <span className={styles.kickerPlain}>{wall.date}</span>
        </span>
      </div>
      <div className={styles.grid}>
        <div className={styles.attention}>
          {wall.attention.map((d) => {
            const mark = MARK[d.status]
            return (
              <section key={d.id} className={styles.card} aria-label={d.name}>
                <div className={styles.cardHead}>
                  <span className={styles.cardTitleBlock}>
                    <span className={styles.cardTitle}>{d.name}</span>
                    <span className={styles.cardSub}>{d.sub}</span>
                  </span>
                  <span className={cx(styles.chip, styles[`chip_${d.status}`])}>
                    {mark ? <Icon name={mark[0]} size={18} color={mark[1]} /> : null}
                    {d.chip}
                  </span>
                </div>
                <div>
                  {d.items.map((item) => {
                    const m = MARK[item.status]
                    return (
                      <div key={item.id} className={styles.item}>
                        <span className={styles.itemMark}>{m ? <Icon name={m[0]} size={16} color={m[1]} /> : null}</span>
                        <span className={styles.itemText}>
                          <span className={styles.itemName}>{item.name}</span> <span className={styles.itemReason}>{item.reason}</span>
                        </span>
                        <span className={styles.itemAge}>{item.age}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
        <div className={styles.quiet}>
          <span className={styles.kickerPad}>WITHIN SCOPE</span>
          {wall.quiet.map((d) => (
            <div key={d.id} className={styles.quietRow}>
              <span className={styles.quietName}>
                <span className={styles.quietTitle}>{d.name}</span>
                <span className={styles.kickerPlain}>{d.sub}</span>
              </span>
              <span className={styles.kickerPlain}>{d.note}</span>
            </div>
          ))}
          <div className={styles.lastHour}>
            <span className={styles.kicker}>LAST HOUR</span>
            <span className={styles.lastHourText}>{wall.lastHour}</span>
          </div>
        </div>
      </div>
      <div className={styles.foot}>
        <span>{wall.overflow.join(' · ')}</span>
        <span>Read only · touch nothing here; act from your own screen</span>
      </div>
      <Link to="/operations" className={styles.exit}>
        Exit wall display
      </Link>
    </div>
  )
}
