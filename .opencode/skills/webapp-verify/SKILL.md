---
name: Web app verification
description: Run and verify Flip Clock Radio in a real browser — headless smoke test, local preview server, screenshots, stream URL probing, and the manual checks a headless browser cannot cover. Use before committing UI or behaviour changes.
---

# Web app verification

Two dependency-free Node scripts plus a list of things only a human/device can confirm. `verify.mjs` needs Node 22+ (it uses the built-in `WebSocket`); `serve.mjs` runs on Node 18+. Browser: Chrome or Edge (Chromium).

## Smoke test

```bash
npm run build                                                          # the test loads public/index.html
node .opencode/skills/webapp-verify/scripts/verify.mjs
node .opencode/skills/webapp-verify/scripts/verify.mjs --screenshots  # also writes tmp/verify-960x480.png, tmp/verify-390x844.png
node .opencode/skills/webapp-verify/scripts/verify.mjs --json         # machine-readable result
CHROME_PATH="/path/to/chrome" node .../verify.mjs                     # override browser detection
APP_PATH="/public/index.html" node .../verify.mjs                     # override the page under test
```

How it works: starts a static server for the repository on an ephemeral `127.0.0.1` port, launches headless Chrome with a temporary profile, attaches over the DevTools Protocol, then drives the built `/public/index.html` at 960×480 and 390×844. Exit code 0 means all checks passed; 1 means at least one failed and the failing check prints its reason. No browser download — it uses the local Chrome/Edge binary. Always test the build: it is the artifact that ships, and a stale `public/index.html` would hide a regression.

Checks it already covers:

1. no console errors on load
2. four cards render numeric digits
3. date line is filled
4. defaults are Soft Black + 12 px (attribute, `--fs`, painted background)
5. player bar does not overlap the clock, clock fits the viewport
6. idle state shows the tap hint and grey dot
7. settings panel opens/closes from the gear
8. theme switch sets `data-theme`, persists, paints the new background
9. font size changes `--fs` and UI text but never the clock digits
10. clock options cycle, apply body classes, persist (`12-hour`, seconds, card sizes)
11. station picker opens, lists all 11 defaults, `Esc` closes it
12. station manager adds, deletes, restores; count and `fc.stations` stay right
13. theme and font survive a reload (pre-paint script)
14. portrait 390×844 has no horizontal overflow
15. no console errors accumulated during the whole run

### Extend it

Use the existing helpers in `scripts/verify.mjs`: `check(name, fn)`, `evaluate(expr)`, `waitFor(expr, label)`, `click(selector)`, `setSelect(selector, value)`, `storage(key)`, `sleep(ms)`, `setViewport(w, h)`, `reload()`. Assert behaviour and user-visible state (attributes, classes, computed style, storage), not implementation details.

Guidelines:

- Select by element id, as the app does.
- Never assert on the current wall-clock time. For the 12-hour check, look for `· AM|PM`; for night dimming, compute the expected class from `new Date().getHours()`.
- CSS transitions need either `waitFor` on the final value or a short `sleep` before reading painted colours. Don't paper over app bugs with long sleeps.
- The run starts with `localStorage.clear()`, so checks are order-independent only within one flow; if you add a check that changes state, restore it (the suite switches theme/font back and restores station defaults).
- A new README promise deserves a new check.

### When it fails

- Rerun once to rule out flake; `--json` gives exact diffs.
- "Chrome did not open a DevTools port" → wrong `CHROME_PATH`, or a browser policy blocking `--remote-debugging-port`.
- A timeout waiting for a selector/state usually means a real regression: reproduce in the preview server and inspect the page.

## Preview server

```bash
npm run dev        # Vite dev server with reload, http://localhost:5173
npm run preview    # serves the built public/ folder
```

For a zero-dependency preview of the built file:

```bash
npm run build
node .opencode/skills/webapp-verify/scripts/serve.mjs 8099
# http://127.0.0.1:8099/  (serves public/)
```

Use http rather than `file://`: matches a kiosk host and keeps a stable `localStorage` origin. The app needs no server-side logic.

One-shot screenshot without the harness:

```bash
chrome --headless=new --disable-gpu --hide-scrollbars \
  --window-size=960,480 --virtual-time-budget=2500 \
  --screenshot=tmp/shot.png http://127.0.0.1:8099/
```

If the model cannot view images, verify with DOM/computed-style assertions and ask the user to look at the screenshot. Do not claim a visual change is correct from a file size alone.

## Manual checks (not automatable here)

- **Audio**: tap ▶ — the station should play, the dot turns accent, the sub line returns. This environment has no audio output; headless playback success is not proof the stream works. A wrong URL shows a red dot and "stream unreachable" (autoplay is gesture-gated by design, so a scripted `play()` can still be rejected).
- **Stream URLs**: probe with a browser user agent, because SomaFM answers `403` to `curl` and to a bare `Mozilla/5.0`:
  ```bash
  curl -s -A 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile' \
       -o /dev/null -w '%{http_code} %{content_type}\n' <url>
  ```
  `https://` is required when the page is served over HTTPS (mixed content); `.m3u8`/HLS does not play in a plain `<audio>`.
- **Fullscreen, wake lock, MediaSession**: device/browser behaviour; verify on the Echo Show or a desktop browser with a real gesture. Fullscreen is lost on reload by design.
- **Night dimming**: happens 23:00–07:00. Temporarily toggle `document.body.classList.add("night")` to inspect the fade rather than changing the system clock.
- **Old WebView**: keep an eye on total file size and avoid APIs missing from Chromium ~90 (Android 11 WebView).
- **Device screenshots**: browsers that set `FLAG_SECURE` (Privacy Browser) make `adb shell screencap` empty; Lightning captures fine.

## Reporting

State what was verified and how. A green smoke test covers structure, persistence and interactions — it does not prove audio, visual polish or device behaviour. Say which of those remain unverified.
