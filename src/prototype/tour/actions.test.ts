import { act, render, screen } from '@testing-library/react'
import { createElement, Fragment, useState, type ChangeEvent } from 'react'
import { cardSide, findTarget, runActions, typeInto, type ActionHost } from './actions'

/** A host that records what the runner asks of it, in order. */
function makeHost(overrides: Partial<ActionHost> = {}) {
  const log: string[] = []
  const host: ActionHost = {
    setOutline: vi.fn((target) => void log.push(`outline:${target}`)),
    outline: vi.fn(() => null),
    reveal: vi.fn(async (el) => void log.push(`reveal:${el.dataset.storyTarget}`)),
    setCard: vi.fn((card) => void log.push(`card:${card ? `${card.id}/${card.side}` : 'none'}`)),
    moveCursor: vi.fn(async (x, y, click) => void log.push(`cursor:${x},${y},${click}`)),
    watchClick: vi.fn(async () => {}),
    rate: () => 1,
    reducedMotion: () => false,
    ...overrides,
  }
  return { host, log }
}

/** Put an element on the page with a stubbed bounding box (jsdom has no layout). */
function addTarget(
  target: string,
  box: { left: number; top: number; width: number; height: number } = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  tag = 'button',
) {
  const el = document.createElement(tag)
  el.dataset.storyTarget = target
  el.getBoundingClientRect = () =>
    ({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
      toJSON: () => ({}),
    }) as DOMRect
  document.body.append(el)
  return el
}

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('cardSide', () => {
  const rect = (left: number, width: number) => ({ left, width }) as DOMRect

  test('a target whose centre is in the right half puts the card on the left', () => {
    expect(cardSide(rect(900, 200), 1440)).toBe('left')
  })

  test('a target whose centre is in the left half puts the card on the right', () => {
    expect(cardSide(rect(100, 200), 1440)).toBe('right')
  })

  test('a target centred on the middle puts the card on the right', () => {
    expect(cardSide(rect(620, 200), 1440)).toBe('right')
  })

  test('no target puts the card on the right', () => {
    expect(cardSide(null, 1440)).toBe('right')
  })

  test('an override wins over the target', () => {
    expect(cardSide(rect(900, 200), 1440, 'right')).toBe('right')
    expect(cardSide(rect(100, 200), 1440, 'left')).toBe('left')
    expect(cardSide(null, 1440, 'left')).toBe('left')
  })
})

describe('findTarget', () => {
  test('finds an element that is already on the page without waiting a frame', async () => {
    const el = addTarget('here')
    expect(await findTarget('here', new AbortController().signal)).toBe(el)
  })

  test('finds an element that renders within the wait', async () => {
    vi.useFakeTimers()
    const found = findTarget('late', new AbortController().signal)
    await vi.advanceTimersByTimeAsync(500)
    const el = addTarget('late')
    await vi.advanceTimersByTimeAsync(50)
    expect(await found).toBe(el)
  })

  test('gives up with null after the timeout', async () => {
    vi.useFakeTimers()
    let result: HTMLElement | null | undefined
    void findTarget('nope', new AbortController().signal).then((el) => (result = el))
    await vi.advanceTimersByTimeAsync(1999)
    expect(result).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(result).toBeNull()
  })

  test('resolves null, not an error, when aborted', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const found = findTarget('nope', controller.signal)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    expect(await found).toBeNull()

    expect(await findTarget('nope', controller.signal)).toBeNull()
  })

  test('looks in the document it is given', async () => {
    const other = document.implementation.createHTMLDocument('other')
    const el = other.createElement('div')
    el.dataset.storyTarget = 'elsewhere'
    other.body.append(el)
    expect(await findTarget('elsewhere', new AbortController().signal, 2000, other)).toBe(el)
  })

  test('a target name with a quote does not throw', async () => {
    vi.useFakeTimers()
    const found = findTarget('a"b', new AbortController().signal, 50)
    await vi.advanceTimersByTimeAsync(50)
    expect(await found).toBeNull()
  })
})

describe('typeInto', () => {
  function field() {
    const input = document.createElement('input')
    document.body.append(input)
    const values: string[] = []
    input.addEventListener('input', (e) => {
      expect(e.bubbles).toBe(true)
      values.push(input.value)
    })
    return { input, values }
  }

  test('types one character at a time, each with an input event', async () => {
    vi.useFakeTimers()
    const { input, values } = field()
    const typed = typeInto(input, 'abc', 25, new AbortController().signal)
    expect(values).toEqual(['a'])
    await vi.advanceTimersByTimeAsync(25)
    expect(values).toEqual(['a', 'ab'])
    await vi.advanceTimersByTimeAsync(25)
    await typed
    expect(values).toEqual(['a', 'ab', 'abc'])
    expect(input.value).toBe('abc')
  })

  test('types the whole text at once when the delay is 0', async () => {
    const { input, values } = field()
    await typeInto(input, 'abc', 0, new AbortController().signal)
    expect(values).toEqual(['abc'])
  })

  test('replaces what is in the field', async () => {
    const { input } = field()
    input.value = 'old text'
    await typeInto(input, 'new', 0, new AbortController().signal)
    expect(input.value).toBe('new')
  })

  test('types into a textarea', async () => {
    const area = document.createElement('textarea')
    document.body.append(area)
    await typeInto(area, 'two\nlines', 0, new AbortController().signal)
    expect(area.value).toBe('two\nlines')
  })

  test('stops typing when aborted and resolves', async () => {
    vi.useFakeTimers()
    const { input } = field()
    const controller = new AbortController()
    const typed = typeInto(input, 'abcdef', 25, controller.signal)
    await vi.advanceTimersByTimeAsync(30)
    controller.abort()
    await typed
    expect(input.value).toBe('ab')
    await vi.advanceTimersByTimeAsync(500)
    expect(input.value).toBe('ab')
  })

  test('types nothing when it is already aborted', async () => {
    const { input } = field()
    const controller = new AbortController()
    controller.abort()
    await typeInto(input, 'abc', 25, controller.signal)
    expect(input.value).toBe('')
  })
})

describe('runActions', () => {
  test('click moves the cursor to the centre of the target before the click lands', async () => {
    const { host, log } = makeHost()
    const el = addTarget('x', { left: 100, top: 40, width: 60, height: 20 })
    el.addEventListener('click', () => log.push('clicked'))
    const result = await runActions(
      [{ kind: 'click', target: 'x' }],
      host,
      new AbortController().signal,
    )
    expect(host.moveCursor).toHaveBeenCalledWith(130, 50, true)
    expect(log).toEqual(['reveal:x', 'cursor:130,50,true', 'clicked'])
    expect(result).toEqual({ skipped: [] })
  })

  test('click reads the centre after the host has revealed the target', async () => {
    const el = addTarget('x', { left: 0, top: 900, width: 100, height: 40 })
    const { host } = makeHost({
      reveal: vi.fn(async () => {
        el.getBoundingClientRect = () =>
          ({ left: 0, top: 100, width: 100, height: 40, right: 100, bottom: 140 }) as DOMRect
      }),
    })
    await runActions([{ kind: 'click', target: 'x' }], host, new AbortController().signal)
    expect(host.moveCursor).toHaveBeenCalledWith(50, 120, true)
  })

  test('a click is watched from just before it lands, and the next action waits for the page to answer it', async () => {
    const { host, log } = makeHost()
    let answer = () => {}
    host.watchClick = vi.fn(() => {
      log.push('watching')
      return new Promise<void>((resolve) => {
        answer = () => {
          log.push('answered')
          resolve()
        }
      })
    })
    addTarget('x').addEventListener('click', () => log.push('clicked'))
    addTarget('y')
    const run = runActions(
      [
        { kind: 'click', target: 'x' },
        { kind: 'outline', target: 'y' },
      ],
      host,
      new AbortController().signal,
    )
    await vi.waitFor(() => expect(log).toContain('clicked'))
    expect(log).toEqual(['reveal:x', 'cursor:0,0,true', 'watching', 'clicked'])
    answer()
    expect(await run).toEqual({ skipped: [] })
    expect(log).toEqual([
      'reveal:x',
      'cursor:0,0,true',
      'watching',
      'clicked',
      'answered',
      'reveal:y',
      'outline:y',
    ])
  })

  test('aborting while the page answers a click stops the run there', async () => {
    const controller = new AbortController()
    addTarget('x')
    addTarget('y')
    const { host, log } = makeHost({ watchClick: vi.fn(() => new Promise<void>(() => {})) })
    const run = runActions(
      [
        { kind: 'click', target: 'x' },
        { kind: 'outline', target: 'y' },
      ],
      host,
      controller.signal,
    )
    await vi.waitFor(() => expect(host.watchClick).toHaveBeenCalled())
    controller.abort()
    expect(await run).toEqual({ skipped: [] })
    expect(log).toEqual(['reveal:x', 'cursor:0,0,true'])
  })

  test('click does not land if the run is aborted during the glide', async () => {
    const controller = new AbortController()
    const el = addTarget('x')
    const onClick = vi.fn()
    el.addEventListener('click', onClick)
    const { host } = makeHost({
      moveCursor: vi.fn(async () => controller.abort()),
    })
    const result = await runActions([{ kind: 'click', target: 'x' }], host, controller.signal)
    expect(onClick).not.toHaveBeenCalled()
    expect(result).toEqual({ skipped: [] })
  })

  test('outline reveals the target, then sets it', async () => {
    addTarget('x')
    const { host, log } = makeHost()
    await runActions([{ kind: 'outline', target: 'x' }], host, new AbortController().signal)
    expect(log).toEqual(['reveal:x', 'outline:x'])
  })

  test('scroll only reveals the target', async () => {
    addTarget('x')
    const { host, log } = makeHost()
    await runActions([{ kind: 'scroll', target: 'x' }], host, new AbortController().signal)
    expect(log).toEqual(['reveal:x'])
    expect(host.moveCursor).not.toHaveBeenCalled()
  })

  test('type moves the cursor, clicks to focus and types into a React-controlled input', async () => {
    function Field() {
      const [value, setValue] = useState('')
      return createElement(
        Fragment,
        null,
        createElement('input', {
          'data-story-target': 'r',
          'aria-label': 'reason',
          value,
          onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
        }),
        createElement('output', { 'aria-label': 'state' }, value),
      )
    }
    render(createElement(Field))
    const { host, log } = makeHost({ reducedMotion: () => true })
    const input = screen.getByLabelText('reason')
    const focusedWhileTyping: boolean[] = []
    input.addEventListener('input', () => focusedWhileTyping.push(document.activeElement === input))
    await act(async () => {
      await runActions(
        [{ kind: 'type', target: 'r', text: 'Rolled back after the dose error' }],
        host,
        new AbortController().signal,
      )
    })
    expect(log.slice(0, 2)).toEqual(['reveal:r', 'cursor:0,0,true'])
    expect(focusedWhileTyping).toEqual([true])
    expect(input).toHaveValue('Rolled back after the dose error')
    expect(screen.getByLabelText('state')).toHaveTextContent('Rolled back after the dose error')
  })

  test('type goes a character at a time at 25 ms ÷ rate', async () => {
    vi.useFakeTimers()
    const input = addTarget('r', undefined, 'input') as HTMLInputElement
    const { host } = makeHost({ rate: () => 5 })
    let done = false
    void runActions(
      [{ kind: 'type', target: 'r', text: 'abcd' }],
      host,
      new AbortController().signal,
    ).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(input.value).toBe('a')
    await vi.advanceTimersByTimeAsync(4)
    expect(input.value).toBe('a')
    await vi.advanceTimersByTimeAsync(1)
    expect(input.value).toBe('ab')
    await vi.advanceTimersByTimeAsync(10)
    expect(input.value).toBe('abcd')
    expect(done).toBe(true)
  })

  test('a finished type hands focus back to the page, so Space keeps working the tour (Ruling 13)', async () => {
    vi.useFakeTimers()
    const input = addTarget('r', undefined, 'input') as HTMLInputElement
    const focused: boolean[] = []
    input.addEventListener('input', () => focused.push(document.activeElement === input))
    const { host } = makeHost()
    const typed = runActions(
      [{ kind: 'type', target: 'r', text: 'abc' }],
      host,
      new AbortController().signal,
    )
    await vi.advanceTimersByTimeAsync(100)
    await typed
    expect(input.value).toBe('abc')
    expect(focused).toEqual([true, true, true])
    expect(document.activeElement).not.toBe(input)
    expect(document.activeElement).toBe(document.body)
  })

  test('a type cut short by an abort leaves focus in the field, with the visitor', async () => {
    vi.useFakeTimers()
    const input = addTarget('r', undefined, 'input') as HTMLInputElement
    const controller = new AbortController()
    const { host } = makeHost()
    const typed = runActions(
      [{ kind: 'type', target: 'r', text: 'abcdef' }],
      host,
      controller.signal,
    )
    await vi.advanceTimersByTimeAsync(30)
    controller.abort()
    await vi.advanceTimersByTimeAsync(100)
    await typed
    expect(input.value).toBe('ab')
    expect(document.activeElement).toBe(input)
  })

  test('type into something that is not a text field is skipped', async () => {
    addTarget('r', undefined, 'div')
    const { host } = makeHost()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await runActions(
      [{ kind: 'type', target: 'r', text: 'hello' }],
      host,
      new AbortController().signal,
    )
    expect(result).toEqual({ skipped: ['type:r'] })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(host.moveCursor).not.toHaveBeenCalled()
  })

  test('a missing target is skipped after 2000 ms with one warning, and the run carries on', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    addTarget('here')
    const { host, log } = makeHost()
    let result: { skipped: string[] } | undefined
    void runActions(
      [
        { kind: 'click', target: 'nope' },
        { kind: 'outline', target: 'here' },
      ],
      host,
      new AbortController().signal,
    ).then((r) => (result = r))
    await vi.advanceTimersByTimeAsync(1999)
    expect(result).toBeUndefined()
    expect(host.moveCursor).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(result).toEqual({ skipped: ['click:nope'] })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(log).toEqual(['reveal:here', 'outline:here'])
  })

  test('card puts the card opposite the current outline', async () => {
    addTarget('wide', { left: 900, top: 0, width: 200, height: 50 })
    addTarget('narrow', { left: 100, top: 0, width: 200, height: 50 })
    let outline: string | null = 'wide'
    const { host, log } = makeHost({ outline: () => outline })
    const signal = new AbortController().signal
    await runActions([{ kind: 'card', card: 'c1' }], host, signal)
    outline = 'narrow'
    await runActions([{ kind: 'card', card: 'c2' }], host, signal)
    outline = null
    await runActions([{ kind: 'card', card: 'c3' }], host, signal)
    outline = 'gone'
    await runActions([{ kind: 'card', card: 'c4' }], host, signal)
    await runActions([{ kind: 'card', card: 'c5', side: 'left' }], host, signal)
    expect(log).toEqual([
      'card:c1/left',
      'card:c2/right',
      'card:c3/right',
      'card:c4/right',
      'card:c5/left',
    ])
  })

  test('card does not wait for a missing outline target', async () => {
    const { host } = makeHost({ outline: () => 'gone' })
    const result = await runActions(
      [{ kind: 'card', card: 'c' }],
      host,
      new AbortController().signal,
    )
    expect(result).toEqual({ skipped: [] })
  })

  test('clearCard takes the card down', async () => {
    const { host, log } = makeHost()
    await runActions([{ kind: 'clearCard' }], host, new AbortController().signal)
    expect(log).toEqual(['card:none'])
  })

  test('wait sleeps ms ÷ rate', async () => {
    vi.useFakeTimers()
    const { host, log } = makeHost({ rate: () => 2 })
    let done = false
    void runActions(
      [{ kind: 'wait', ms: 1000 }, { kind: 'clearCard' }],
      host,
      new AbortController().signal,
    ).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(499)
    expect(log).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(log).toEqual(['card:none'])
    expect(done).toBe(true)
  })

  test('aborting during a wait stops before the next action and resolves', async () => {
    vi.useFakeTimers()
    addTarget('x')
    const controller = new AbortController()
    const { host, log } = makeHost()
    let result: { skipped: string[] } | undefined
    void runActions(
      [
        { kind: 'outline', target: 'x' },
        { kind: 'wait', ms: 1000 },
        { kind: 'outline', target: 'x' },
      ],
      host,
      controller.signal,
    ).then((r) => (result = r))
    await vi.advanceTimersByTimeAsync(300)
    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(result).toEqual({ skipped: [] })
    await vi.advanceTimersByTimeAsync(2000)
    expect(log).toEqual(['reveal:x', 'outline:x'])
  })

  test('aborting while waiting for a target does not report it as skipped', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const controller = new AbortController()
    const { host } = makeHost()
    let result: { skipped: string[] } | undefined
    void runActions([{ kind: 'click', target: 'nope' }], host, controller.signal).then(
      (r) => (result = r),
    )
    await vi.advanceTimersByTimeAsync(300)
    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(result).toEqual({ skipped: [] })
    expect(warn).not.toHaveBeenCalled()
  })

  test('aborting resolves the run even if the host never settles its cursor glide', async () => {
    const controller = new AbortController()
    const el = addTarget('x')
    const onClick = vi.fn()
    el.addEventListener('click', onClick)
    const { host } = makeHost({ moveCursor: vi.fn(() => new Promise<void>(() => {})) })
    const run = runActions([{ kind: 'click', target: 'x' }], host, controller.signal)
    await vi.waitFor(() => expect(host.moveCursor).toHaveBeenCalled())
    controller.abort()
    expect(await run).toEqual({ skipped: [] })
    expect(onClick).not.toHaveBeenCalled()
  })

  test('an already aborted signal runs nothing', async () => {
    addTarget('x')
    const controller = new AbortController()
    controller.abort()
    const { host, log } = makeHost()
    const result = await runActions(
      [{ kind: 'outline', target: 'x' }, { kind: 'clearCard' }],
      host,
      controller.signal,
    )
    expect(result).toEqual({ skipped: [] })
    expect(log).toEqual([])
  })

  test('runs the actions in order', async () => {
    addTarget('x')
    const { host, log } = makeHost()
    await runActions(
      [{ kind: 'outline', target: 'x' }, { kind: 'card', card: 'c' }, { kind: 'clearCard' }],
      host,
      new AbortController().signal,
    )
    expect(log).toEqual(['reveal:x', 'outline:x', 'card:c/right', 'card:none'])
  })
})
