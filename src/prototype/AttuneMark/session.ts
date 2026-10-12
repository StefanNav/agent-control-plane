/** The welcome plays once a browser session: this flag says it has. */
const KEY = 'attune-welcomed'

/** When sessionStorage throws (private mode, blocked site data), the flag lasts for the page instead. */
let welcomedThisPage = false

/**
 * The flag as this page found it, read the first time anything here reads or writes it, so before
 * this page could mark it. Null until then.
 */
let welcomedOnLoad: boolean | null = null

function stored(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function snapshot(): void {
  welcomedOnLoad ??= stored()
}

export function hasWelcomed(): boolean {
  snapshot()
  return welcomedThisPage || stored()
}

export function markWelcomed(): void {
  snapshot()
  welcomedThisPage = true
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // Storage is blocked; the page-level flag above still holds.
  }
}

/**
 * Was the session welcomed before this page loaded (an earlier page in the same tab)? Marking it on
 * this page doesn't change the answer, so a welcome that waits for something (the tour's, until its
 * card opens) can still tell a fresh visit from a return.
 */
export function welcomedBeforeThisPage(): boolean {
  snapshot()
  return welcomedOnLoad ?? false
}

/** Tests only: a fresh session, and a page that hasn't read it yet. */
export function forgetWelcomed(): void {
  welcomedThisPage = false
  welcomedOnLoad = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing stored to forget.
  }
}
