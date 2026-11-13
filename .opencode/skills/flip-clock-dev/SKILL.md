---
name: Flip Clock Radio development
description: Change or extend the Flip Clock Radio app — add themes, clock options or preset stations, edit the player/picker/settings UI, adjust persistence or night dimming. Use for any code change to index.html, src/styles.css or src/main.js.
---

# Flip Clock Radio development

`index.html` holds the markup and pre-paint script, `src/styles.css` holds all CSS, and `src/main.js` holds the app IIFE. `npm run build` (Vite + vite-plugin-singlefile) bundles them into the single self-contained `public/index.html`. The README is the user-facing spec; this skill is where the code goes.

## Map of the sources

- **Pre-paint script** (first thing in the entry `index.html` `<head>`): restores `fc.theme` and `fc.fs` before first paint. It performs its own validation (`fs >= 12 && fs <= 24 && fs % 2 === 0`) — keep it in sync with `applyTheme()` / `applyFont()` / `FS_DEFS`. Keep it inline and before the module script; never move it into `src/`.
- **CSS** (`src/styles.css`), in order: theme blocks, base layout, clock/cards, player bar, picker/settings/forms, hint, portrait media query.
- **Markup** (`index.html`): `.stage` → `.clock` (`.group` hosts the cards) → `.date` → `.secs`; fixed `.player`; full-screen panels `#picker`, `#settings`, `#stationsPanel`; `#hint`.
- **Script** (`src/main.js`): one IIFE — defaults + persistence/merge → `CLOCK_DEFS`/migration → `tick()`/animations → `Audio`/MediaSession → picker → themes/font/settings → station manager → clock rows → fullscreen/wake lock. It has no imports; the CSS is linked from `index.html`.
- **CSS contract**: a theme sets exactly `--bg --card --card-edge --digit --dim --seam --accent --bar --ink`. `--fs` is interface px; `--bar-h` is `max(16.5vh, calc(var(--fs) * 2.9 + 15px))` so the fixed bar never covers the clock; `--btn` and `--dt` scale controls and the date. Sizing is `vh`/`vw` for a fixed 960×480 panel, with a portrait override.
- **State hooks**: `<html data-theme>`; body classes `size-large`, `size-huge`, `nodate`, `showsecs`, `night`.

## Recipes

### Add a theme

1. Copy the `softblack` rule to `html[data-theme="<id>"]` and set all nine vars.
2. Add `{ id:"<id>", name:"<Name>", sw:["<card>","<digit>","<accent>"] }` to `THEMES` — the settings swatches come from `sw`.
3. Add a row to the README themes table.

`--ink` is the control-bar text colour: light themes (e.g. `paper`) need a dark `--ink`, and `--dim` must still read against `--bg` because the date line and secondary text use it. Night dimming only fades `.stage`, so it works for every palette.

### Add a clock option

1. `CLOCK_DEFS` entry: `{ id, name, values:[…], def? }`. Tapping the row cycles `values` in order, and the value is shown with `-` replaced by a space.
2. Toggle a body class in `applyClock()` and add the CSS that class drives.
3. `applyClock()` sets `lastMinute = -1`, forcing `tick()` to redraw digits on the next tick — keep that if the option affects the clock itself.
4. Add the option to the README clock-options table.

Changing a shipped default means a migration, not an edit: see the `CLOCK.v` block that made `huge` the default, and bump `v`.

### Ship a new preset station

1. Append `{ name, sub, url, since: N }` to `DEFAULT_STATIONS` (keep the aligned-column style).
2. Bump `STATIONS_VERSION` to the same `N`.
3. Use the house `sub` style: `genre · network`.

`since` merges a station into existing saved lists exactly once per version. Never reuse an old `since` number — that resurrects stations users deleted. `defaultStations()` strips `since` before the list is stored.

### Change the player or panels

- Every control handler calls `e.stopPropagation()` — `.stage` starts the radio / toggles fullscreen on click, so a bubbling control click would also fire that.
- Backdrop close only when `e.target === panel`. Native `<select>` `change` handlers call `suppressBackdrop()`; the 700 ms guard prevents Android's dialog-dismiss tap from closing the panel.
- Build station rows with `textContent` (names and URLs are user data), never `innerHTML`.
- Player states: `idle` (▶, grey dot), `live` (⏸, accent dot, `sub` restored), `err` (red dot, "stream unreachable"). `start()` sets `wantPlay`; `stop()` clears `src` and calls `load()`.
- MediaSession metadata and action handlers mirror the on-screen controls — update both together.

### Timing and animation

- Digit swap: a 180 ms `setTimeout` changes the text mid-way through the 380 ms `flipOut`/`flipIn` keyframes. Change both values together or the swap lands at the wrong angle.
- Clock: one 1 s interval; digits and date redraw only when the minute changes, seconds and colon every tick. `visibilitychange` resets `lastMinute` and re-ticks on resume; audio resumes if `wantPlay`.
- Night dimming is `h >= 23 || h < 7` in `tick()`; the README repeats the window, so update both.

### Accessibility and input

Clickable rows are `role="button"` + `tabIndex=0`; icon buttons carry `aria-label`; `Space` toggles play (only when `e.target === document.body`), `f` fullscreen, `c` settings, `Esc` closes panels. New interactive elements should follow the same pattern.

## Do not

- Do not edit `public/index.html` — it is generated. Edit the sources and run `npm run build`.
- Do not add runtime dependencies, CDNs, web fonts, icon fonts or bundled images. Dev tooling is limited to Vite, esbuild and vite-plugin-singlefile.
- Do not move the pre-paint script into the main IIFE or make it `defer`/`async`.
- Do not use `innerHTML` with station or input data.
- Do not add a framework or split the app across modules; the single-file artifact is the feature.
- Do not change shipped defaults without a versioned migration.

## Verify

```bash
npm run build
node .opencode/skills/webapp-verify/scripts/verify.mjs
node .opencode/skills/webapp-verify/scripts/verify.mjs --screenshots
```

The smoke test loads the built `/public/index.html`. Rebuild before running it.

Add a smoke-test check whenever you add a promise the README makes. For visual work, inspect `tmp/verify-960x480.png` and `tmp/verify-390x844.png` (ask the user to review if the model cannot see images). Audio playback, real fullscreen, wake lock and MediaSession need a device — see the `webapp-verify` skill. Update the README in the same change: features, controls, themes, clock options, station notes and gotchas all describe this code.
