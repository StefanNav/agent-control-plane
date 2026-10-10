import type { TourAction } from './types'

/** What the player lends the runner: the tour's overlay (outline, card, cursor) and its settings. */
export interface ActionHost {
  setOutline(target: string | null): void
  /** The target currently outlined, possibly set by an earlier beat. */
  outline(): string | null
  /** Scroll the element into view, clear of the player bar. */
  reveal(el: HTMLElement): Promise<void>
  setCard(card: { id: string; side: 'left' | 'right' } | null): void
  /** Glide the cursor to a point, and press it there when `click` is true. */
  moveCursor(x: number, y: number, click: boolean): Promise<void>
  /**
   * Call just before a click: resolves once the page has answered it (re-rendered, and on screen at
   * any URL the click went to), so the next action never measures or clicks what it is replacing.
   */
  watchClick(): Promise<void>
  rate(): number
  reducedMotion(): boolean
}

/** A tour action that names an element. */
type TargetAction = Extract<TourAction, { target: string }>

/** Milliseconds a character takes to type at rate 1. */
const TYPE_MS = 25

/** How long to wait for a target to render before skipping its action. */
const TARGET_WAIT_MS = 2000

function selectorFor(target: string): string {
  return `[data-story-target="${target.replace(/["\\]/g, '\\$&')}"]`
}

/** Wait `ms`; false if the signal aborted first. */
function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false)
    const finish = (completed: boolean) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(completed)
    }
    const onAbort = () => finish(false)
    const timer = setTimeout(() => finish(true), ms)
    signal.addEventListener('abort', onAbort)
  })
}

/** Wait for a host promise, but stop waiting if the signal aborts; the host's own failures still throw. */
function untilAborted(work: Promise<void>, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve()
    const onAbort = () => resolve()
    signal.addEventListener('abort', onAbort)
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/**
 * The element carrying `data-story-target="<target>"`, waiting up to `timeoutMs` for it to render
 * (checked now, then every animation frame); null if it never does, or if the signal aborts.
 */
export function findTarget(
  target: string,
  signal: AbortSignal,
  timeoutMs = TARGET_WAIT_MS,
  doc: Document = document,
): Promise<HTMLElement | null> {
  const selector = selectorFor(target)
  return new Promise((resolve) => {
    const look = () => doc.querySelector<HTMLElement>(selector)
    if (signal.aborted) return resolve(null)
    const found = look()
    if (found) return resolve(found)
    let frame = 0
    const finish = (el: HTMLElement | null) => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(el)
    }
    const onAbort = () => finish(null)
    const tick = () => {
      const el = look()
      if (el) finish(el)
      else frame = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => finish(look()), timeoutMs)
    signal.addEventListener('abort', onAbort)
    frame = requestAnimationFrame(tick)
  })
}

/**
 * Type `text` into a field the way a person would, replacing what is there: one character at a time,
 * `perCharMs` apart, through the element's native value setter and a bubbling `input` event so
 * React-controlled fields notice. With `perCharMs` 0 the whole text goes in at once. Stops when aborted.
 */
export async function typeInto(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  perCharMs: number,
  signal: AbortSignal,
): Promise<void> {
  const setValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
  const put = (value: string) => {
    if (setValue) setValue.call(el, value)
    else el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  if (perCharMs <= 0 || text === '') {
    if (!signal.aborted) put(text)
    return
  }
  for (let i = 1; i <= text.length; i++) {
    if (signal.aborted) return
    put(text.slice(0, i))
    if (i < text.length && !(await sleep(perCharMs, signal))) return
  }
}

/**
 * Pick the option with `value` in a select, the way a person would from its list: through the
 * element's native value setter, then the bubbling `input` and `change` events a real pick fires, so
 * React-controlled selects notice.
 */
function chooseIn(el: HTMLSelectElement, value: string): void {
  const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  if (setValue) setValue.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Which side of the screen a card goes: the one away from the target, so it never covers what it
 * talks about. An override wins; with no target, right.
 */
export function cardSide(
  targetRect: DOMRect | null,
  viewportWidth: number,
  override?: 'left' | 'right',
): 'left' | 'right' {
  if (override) return override
  if (!targetRect) return 'right'
  return targetRect.left + targetRect.width / 2 > viewportWidth / 2 ? 'left' : 'right'
}

/**
 * Run a beat's actions in order against the real page. A target that never renders is skipped (and
 * reported). When the signal aborts it stops at its next await and resolves with what it skipped.
 */
export async function runActions(
  actions: TourAction[],
  host: ActionHost,
  signal: AbortSignal,
): Promise<{ skipped: string[] }> {
  const skipped: string[] = []

  const skip = (action: TargetAction, why: string) => {
    const label = `${action.kind}:${action.target}`
    skipped.push(label)
    console.warn(`Tour: skipped ${label}, ${why}`)
  }

  /** Find the action's target and bring it into view; null if it was skipped or the run was aborted. */
  const reach = async (action: TargetAction): Promise<HTMLElement | null> => {
    const el = await findTarget(action.target, signal)
    if (signal.aborted) return null
    if (!el) {
      skip(action, `no element has data-story-target="${action.target}"`)
      return null
    }
    await untilAborted(host.reveal(el), signal)
    return signal.aborted ? null : el
  }

  /** Glide the cursor onto the element and press it; false if the run was aborted on the way. */
  const pressOn = async (el: HTMLElement): Promise<boolean> => {
    const box = el.getBoundingClientRect()
    await untilAborted(
      host.moveCursor(box.left + box.width / 2, box.top + box.height / 2, true),
      signal,
    )
    return !signal.aborted
  }

  for (const action of actions) {
    if (signal.aborted) break
    switch (action.kind) {
      case 'outline': {
        if (await reach(action)) host.setOutline(action.target)
        break
      }
      case 'scroll': {
        await reach(action)
        break
      }
      case 'click': {
        const el = await reach(action)
        if (!el || !(await pressOn(el))) break
        // Watch from before the click: a router updates the URL during it.
        const answered = host.watchClick()
        el.click()
        await untilAborted(answered, signal)
        break
      }
      case 'type': {
        const el = await reach(action)
        if (!el) break
        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          skip(action, 'it is not a text field')
          break
        }
        if (!(await pressOn(el))) break
        el.focus({ preventScroll: true })
        await typeInto(el, action.text, host.reducedMotion() ? 0 : TYPE_MS / host.rate(), signal)
        // Done typing: give focus back to the page, so Space keeps working the tour (Ruling 13).
        // A run cut short leaves it where it is: the visitor has taken over.
        if (!signal.aborted) el.blur()
        break
      }
      case 'choose': {
        const el = await reach(action)
        if (!el) break
        if (!(el instanceof HTMLSelectElement)) {
          skip(action, 'it is not a select')
          break
        }
        if (![...el.options].some((option) => option.value === action.value)) {
          skip(action, `it has no option "${action.value}"`)
          break
        }
        if (await pressOn(el)) chooseIn(el, action.value)
        break
      }
      case 'card': {
        const outlined = host.outline()
        const rect = outlined
          ? (document.querySelector<HTMLElement>(selectorFor(outlined))?.getBoundingClientRect() ??
            null)
          : null
        host.setCard({ id: action.card, side: cardSide(rect, window.innerWidth, action.side) })
        break
      }
      case 'clearCard': {
        host.setCard(null)
        break
      }
      case 'wait': {
        await sleep(action.ms / host.rate(), signal)
        break
      }
    }
  }
  return { skipped }
}
