/** What a quote can follow and still open: the start of the text, a space, a bracket or a dash. */
const OPENS_AFTER = /[\s([{–—‘“]/

/**
 * Set a line's quotes as type: ’ for an apostrophe, ‘ ’ and “ ” for quotes. A quote opens when it
 * starts the text or follows a space, bracket or dash and is followed by a word; any other is ’ or ”.
 *
 * The tour's narration is written with straight quotes, and its clips' hashes are made from that
 * text (Ruling 34). So it stays straight in `script.ts` and is set with this only where it is shown.
 */
export function typographic(text: string): string {
  return text.replace(/["']/g, (mark, at: number) => {
    const opening =
      (at === 0 || OPENS_AFTER.test(text.charAt(at - 1))) && /\S/.test(text.charAt(at + 1))
    if (mark === '"') return opening ? '“' : '”'
    return opening ? '‘' : '’'
  })
}
