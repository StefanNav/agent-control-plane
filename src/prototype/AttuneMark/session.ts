/** The landing's welcome plays once a browser session: this flag says it has. */
const KEY = 'attune-welcomed'

/** When sessionStorage throws (private mode, blocked site data), the flag lasts for the page instead. */
let welcomedThisPage = false

export function hasWelcomed(): boolean {
  if (welcomedThisPage) return true
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markWelcomed(): void {
  welcomedThisPage = true
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // Storage is blocked; the page-level flag above still holds.
  }
}

/** Tests only: a fresh session. */
export function forgetWelcomed(): void {
  welcomedThisPage = false
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing stored to forget.
  }
}
