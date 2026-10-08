const KEYBOARD_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/**
 * Shows focus rings only after keyboard navigation: sets `data-keyboard="true"`
 * on <html> after Tab or an arrow key, and clears it on mousedown.
 * Returns a cleanup function that removes the listeners.
 */
export function installKeyboardFocusMode(doc: Document = document): () => void {
  const root = doc.documentElement
  const onKeyDown = (event: KeyboardEvent) => {
    if (KEYBOARD_KEYS.has(event.key)) root.dataset.keyboard = 'true'
  }
  const onMouseDown = () => {
    delete root.dataset.keyboard
  }
  doc.addEventListener('keydown', onKeyDown, true)
  doc.addEventListener('mousedown', onMouseDown, true)
  return () => {
    doc.removeEventListener('keydown', onKeyDown, true)
    doc.removeEventListener('mousedown', onMouseDown, true)
  }
}
