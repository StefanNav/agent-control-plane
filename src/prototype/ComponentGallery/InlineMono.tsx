import styles from './ComponentGallery.module.css'

/** Inline mono value (dates, times) as the component sheet sets them inside text. */
export function InlineMono({ children, tone }: { children: string; tone?: 'warn' }) {
  return <span className={tone === 'warn' ? styles.monoWarn : styles.monoInline}>{children}</span>
}
