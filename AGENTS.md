# Flip Clock Radio — agent notes

Single-page bedside clock + internet-radio player for a 1 GB Android panel (Echo Show 5, 960×480). The shipped artifact is one self-contained `index.html`; sources are split into `index.html` (markup), `src/styles.css` and `src/main.js`, and Vite bundles them into `public/index.html`. `README.md` is the user-facing spec — read it before changing behaviour.

## Hard constraints

- **Ship one file, author in three.** `npm run build` must produce a single `public/index.html` with CSS and JS inlined and no external requests. No runtime dependencies, CDNs, web fonts, icon fonts or images. `assets/` holds README screenshots only. Build tooling lives in `package.json`; never edit `public/index.html` by hand.
- **Target an old Chromium WebView** (LineageOS 18.1 / Android 11, 1 GB RAM). Prefer fast and small over clever. `vite.config.js` sets `build.target: "chrome90"` — keep it. Nothing is fetched at runtime except radio streams — no analytics, no external calls.
- **Match the existing JS style** in `src/main.js`: one IIFE, `"use strict"`, `var`, `function`, no arrow functions, template literals or imports. The file is loaded as a module only so Vite can bundle it.
- **The pre-paint script in the entry `index.html` must stay inline in `<head>` and before the module script.** It applies the saved theme and font size before first paint so a light theme never flashes dark. Never move it into `src/` or defer it.
- **`textContent` for anything user-supplied** (station names, URLs). `innerHTML` only for fixed entity/icon strings.
- Preserve accessibility: `aria-label` on icon buttons, `role="button"` + `tabIndex=0` on clickable rows, keyboard shortcuts (`Space`, `f`, `c`, `Esc`).

## Source layout

| Path | Contents |
|---|---|
| `index.html` | Vite entry: meta tags, the inline theme/font pre-paint script, `<link rel="stylesheet" href="/src/styles.css">`, body markup, `<script type="module" src="/src/main.js">` |
| `src/styles.css` | All CSS — theme blocks (`html[data-theme="…"]` with the nine colour vars), layout, player bar, panels, portrait media query |
| `src/main.js` | The app IIFE (no imports) |
| `public/index.html` | Generated single-file build; deploy this, never edit it |
| `vite.config.js` | `outDir: "public"`, `target: "chrome90"`, single-file inlining |

`src/main.js`, in order: default stations + persistence/merge → clock preferences → clock rendering/`tick()` → radio/MediaSession → station picker → settings/themes/font → station manager → clock option rows → fullscreen/wake lock.

Theme contract: themes set only `--bg --card --card-edge --digit --dim --seam --accent --bar --ink`. `--fs` is interface text in px, `--bar-h` derives from it, `--btn`/`--dt` scale buttons and the date. Sizing is `vh`/`vw` because the target is a fixed 960×480 panel.

Body classes: `size-large`, `size-huge`, `nodate`, `showsecs`, `night`. `<html>` carries `data-theme`.

## State (`localStorage`)

| Key | Shape | Notes |
|---|---|---|
| `fc.theme` | `THEMES` id, default `softblack` | read by the pre-paint script |
| `fc.fs` | `"12"` … `"24"` (even), default `12` | interface px, not the digits |
| `fc.stations` | JSON array of `{name, sub, url}` | overrides `DEFAULT_STATIONS` once saved |
| `fc.stationsV` | `STATIONS_VERSION` string | one-shot merge guard for new presets |
| `fc.clock` | JSON `{format, date, size, seconds, v}` | `v:2` = huge cards became the default |
| `fc.station` | current station index | clamped when the list shrinks |
| `fc.volume` | `0`–`100` | applied to `audio.volume` |

Versioned migrations: when changing shipped defaults, add a `since`/`v` bump rather than silently overwriting saved state (see `STATIONS_VERSION` and `CLOCK.v`).

## Recipes

Detailed steps live in the `flip-clock-dev` skill. Short version:

- **Theme** → CSS block in `src/styles.css` with all nine vars + `THEMES` entry in `src/main.js` (`sw` = card/digit/accent) + README table. Light themes need a dark `--ink`.
- **Clock option** → `CLOCK_DEFS` entry in `src/main.js` + CSS keyed off a body class + `applyClock()` + README table.
- **Preset station** → `DEFAULT_STATIONS` entry in `src/main.js` with `since: N` + bump `STATIONS_VERSION` + README if the list changes materially.
- **UI/behaviour** → keep README features, controls, gotchas tables in sync.

## Pitfalls that cost real time

- Every control's handler calls `stopPropagation()`: the `.stage` click starts the radio or toggles fullscreen, so a bubbling control click double-fires.
- Panels close on backdrop click only when `e.target === panel`. Native `<select>` changes need the 700 ms `suppressBackdrop()` guard — Android closes the dialog with a tap that lands on the page.
- Flip animation timing is split: 180 ms `setTimeout` swaps the digit while 380 ms CSS keyframes run. Change both together.
- Autoplay needs a user gesture by design (start on tap); fullscreen is lost on reload; wake lock is best-effort.
- Night dimming is the `h >= 23 || h < 7` test in `tick()`; the README repeats it.
- Station rows use `textContent`; user URLs are only validated as `http(s)://…` on purpose.

## Commands

```bash
npm install            # dev tooling only (PowerShell: npm.cmd)
npm run dev            # Vite dev server, http://localhost:5173
npm run build          # minified single file -> public/index.html
npm run preview        # serve the built public/

# UI smoke test: 15 checks, headless Chrome via CDP — run the build first
node .opencode/skills/webapp-verify/scripts/verify.mjs
node .opencode/skills/webapp-verify/scripts/verify.mjs --screenshots   # tmp/verify-*.png
```

Run the smoke test after any behaviour change and add a check when you add a promise the README makes. `tmp/` is gitignored. Screenshots for the README go in `assets/screenshot-<topic>.png` and must be linked from `README.md`.

Manual-only checks (audio playback, fullscreen, wake lock, MediaSession, real device): see the `webapp-verify` skill.

## Git and publishing

- `main` tracks `origin` → `git@github.com:mikhailnakanechny/flip-clock-radio.git`.
- The deployable site is the generated `public/` folder; `public/index.html` is committed so a checkout still has a drop-in page.
- GitHub Pages deploys `public/` via `.github/workflows/pages.yml` on every push to `main` (and manually via workflow dispatch). One-time setup: Settings → Pages → Source = **GitHub Actions**. The repository-root `index.html` is a Vite template and is **not** servable on its own.
- `npm ci` in the workflow depends on `package-lock.json`; keep it committed.
- Commit subjects: short, imperative, e.g. `Add station manager delete guard`. Commit only when asked; never commit `tmp/` or local scratch files.
- The code is original and MIT-licensed; stations are third-party links only. Do not add station logos, artwork or bundled audio.
