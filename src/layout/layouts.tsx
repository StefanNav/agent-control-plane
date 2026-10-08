import type { ReactNode } from 'react'
import styles from './layouts.module.css'

/** Main column + 340px sidebar (record pages, forms). */
export function Split({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className={styles.split}>
      <div className={styles.column}>{main}</div>
      <aside className={styles.column}>{side}</aside>
    </div>
  )
}

/** 420px list + detail (inbox, action list). */
export function SplitL({ list, detail }: { list: ReactNode; detail: ReactNode }) {
  return (
    <div className={styles.splitL}>
      <div className={styles.column}>{list}</div>
      <div className={styles.column}>{detail}</div>
    </div>
  )
}

/** Single column (boards, reports). */
export function Body({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>
}
