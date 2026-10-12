# Attune motion kit · v1.0

Open **index.html** in a browser to explore the collection. All files work offline. There are no dependencies, build tools, network requests, or tracking.

## The collection

| Motion | Use | Recommended size | Character |
|---|---|---|---|
| `quiet` · Quiet pulse | Inline waits, refreshing evidence, buttons | 24–40 px | Small staggered breath; minimal travel |
| `search` · Signal search | User-triggered investigation, gathering context | 64–96 px | Fluid circles on independent elliptical orbits |
| `process` · Common rhythm | Comparing or synthesizing information | 64–96 px | A circular cross that opens and contracts |
| `welcome` · First hello | Initial workspace entry | 120–160 px | 2.25-second partner dance, then quiet waiting |
| `handoff` · Passing insight | Transferring context to a next step | 64–96 px | A soft traveling wave |
| `reconnect` · Find our way | An active connection attempt | 48–80 px | Outward searches returning to a shared rhythm |

All motions share two additional treatments: **settle** on completion, **freeze** on blocked work. Retry starts a fresh attempt. These are application states, not timed chapters in a repeating animation.

## Files

- `attune-motion.js` — reusable SVG animation runtime; exposes `window.AttuneMotion`.
- `assets/attune-symbol.svg` — static two-color symbol, transparent background.
- `assets/attune-symbol-dark.svg` — lighter palette for dark surfaces.
- `assets/attune-symbol-mono.svg` — monochrome, inherits currentColor when inlined.
- `assets/attune-quiet-loader.svg` — standalone quiet loop for simple image embeds, with a static reduced-motion fallback.
- `tokens.json` — colors, timing and recommended sizes.
- `index.html`, `preview.css`, `preview.js` — interactive preview gallery, not required by the runtime.
- `example.html` — minimal, accessible integration with simulated work events.

## Integration

```html
<script src="attune-motion.js"></script>
<div class="work-status">
  <span id="attune-mark" aria-hidden="true"></span>
  <span id="work-label" role="status" aria-live="polite">Gathering evidence…</span>
</div>
<script>
  const motion = AttuneMotion.create('#attune-mark', {
    mode: 'search',
    size: 80,
    state: 'loading'
  });

  // Trigger these from your application's actual lifecycle events:
  function processingStarted() {
    motion.setState('processing');
    document.querySelector('#work-label').textContent = 'Preparing the summary…';
  }
  function resultReceived() {
    motion.setState('complete');
    document.querySelector('#work-label').textContent = 'Ready for your review';
    // Show the result immediately. Do not await animation completion.
  }
  function connectionLost() {
    motion.setState('blocked');
    document.querySelector('#work-label').textContent = 'Connection lost. Work has paused.';
  }
  function retryStarted() {
    motion.setMode('reconnect');
    motion.restart();
    document.querySelector('#work-label').textContent = 'Reconnecting…';
  }
  // When the component unmounts: motion.destroy();
</script>
```

For a button or compact wait, use `quiet` at 24–32 px. Retain a visible label such as “Saving…” and disable duplicate submissions if your workflow requires it. This runtime only draws the mark: the application owns work, text, navigation, focus, and accessible busy state.

### API

`AttuneMotion.create(elementOrSelector, options)` mounts one decorative SVG and returns a controller. Mount into a connected element; initialize after insertion. Call `destroy()` before removing that element.

| Option | Default | Values |
|---|---|---|
| `mode` | `quiet` | Six mode names above |
| `state` | `loading` | `idle`, `loading`, `processing`, `complete`, `blocked` |
| `size` | `64` | Positive numeric square footprint in CSS pixels |
| `reducedMotion` | system preference | `true` forces a static mark; system reduced motion always wins |

Controller methods: `setState(state)`, `setMode(mode)`, `restart()`, `pause()`, `resume()`, `getState()`, `destroy()`. `element` exposes the SVG for inspection. Invalid mode/state names throw an error. `restart()` resets the current mode to `loading`; it does not initiate real work.

`processing` uses Common rhythm regardless of the selected mode. `complete` settles to the original symbol in about 0.5 seconds and stops. `blocked` freezes immediately, dims the mark, and stops. `idle` settles and stops. Changing mode while idle, blocked, or complete does not start work. `pause()` freezes presentation only; it does not cancel the underlying task.

### Appearance

Override on a parent element:

```css
.attune-area {
  --attune-cobalt: #0754D5;
  --attune-sky: #359EF5;
}
@media (prefers-color-scheme: dark) {
  .attune-area {
    --attune-cobalt: #548FFF;
    --attune-sky: #71C1FF;
  }
}
```

The SVG has a 200 × 200 viewBox containing the motion's full travel. `size` is the whole footprint, including movement space, rather than the width of the resting mark. Keep this space in layout to prevent jumping. Backgrounds are transparent. For a static logo, use the tightly framed assets instead.

### Simple SVG loader

```html
<img src="assets/attune-quiet-loader.svg" width="32" height="32" alt="">
<span role="status">Loading…</span>
```

Remove the image when work ends. For processing, failure, retry, pause controls, or welcome-to-ready transitions use the JavaScript runtime. A standalone image cannot respond to application events. The SVG loader uses native SVG animation and respects reduced motion through a static alternate group.

## Motion principles

1. **One expressive focal point.** The gallery runs examples together for comparison. In the product, use one expressive animation per visible region; use the quiet variant elsewhere.
2. **State precedes spectacle.** Never invent progress percentages. Loading can continue indefinitely. Completion means the requested operation returned, not that a clinical decision is approved or safe.
3. **Welcome once.** Dance at initial entry, not every route change. If content is ready after 100 ms, reveal it after 100 ms. On longer waits, the dance naturally becomes quiet after 2.25 seconds. Prefer no loader at all for instant operations.
4. **Avoid clinical alarm language.** No red flashes, spinning emergency crosses, celebratory confetti, or animated marks competing with an urgent exception. Describe urgency with the product's explicit clinical status and text.
5. **Pair motion with meaning.** The mark is decorative (`aria-hidden`). Keep a visible, meaningful label; announce state changes once with `role="status"`, not each frame. Put `aria-busy` on the region actually loading if appropriate, not around the status announcement itself.
6. **Offer stillness.** Reduced motion is a static symbol with the same status text. The runtime reacts to preference changes, suspends offscreen and hidden-tab animation, and supports manual pause. Long-running motion should have a product-level pause/reduced-motion preference or an equivalent control.
7. **Release resources.** Call `destroy()` on unmount to cancel the animation frame and remove observers and listeners. Each instance is isolated.

## Technical scope

Browser JavaScript with inline SVG; no React, Lottie, or video dependency. Paths interpolate continuously between soft pebbles and equal-radius circles. Shape stretching preserves approximate area. Movement uses requestAnimationFrame and pauses when out of view. No animations communicate a result by themselves.

The preview has been checked in desktop Chrome, a narrow mobile viewport, dark appearance, and system reduced motion. Safari/Firefox and embedded webviews should be validated in the eventual product. No backend integration is included. Labels and work events in the gallery and example are simulated.
