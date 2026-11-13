#!/usr/bin/env node
/**
 * Zero-dependency UI smoke test for Flip Clock Radio.
 *
 * Serves the repo over http://127.0.0.1:<port>, drives headless Chrome/Edge
 * through the DevTools Protocol, and checks the behaviours the README promises:
 * rendering, persistence, panels, clock options and station management.
 *
 * Verify the built artifact, not the Vite source template:
 *   npm run build && node .opencode/skills/webapp-verify/scripts/verify.mjs
 *
 * Usage:
 *   node .opencode/skills/webapp-verify/scripts/verify.mjs
 *   node .opencode/skills/webapp-verify/scripts/verify.mjs --screenshots
 *   node .opencode/skills/webapp-verify/scripts/verify.mjs --json
 *   CHROME_PATH="/path/to/chrome" node .../verify.mjs
 *   APP_PATH="/public/index.html" node .../verify.mjs
 *
 * Exit code 0 = every check passed, 1 = at least one failed.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const ARGS = new Set(process.argv.slice(2));
const WANT_SHOTS = ARGS.has("--screenshots");
const WANT_JSON = ARGS.has("--json");
const OUT_DIR = path.join(ROOT, "tmp");
// The app is authored in index.html + src/, but only public/index.html is a
// runnable single file. Serve the built artifact by default.
const APP_PATH = (process.env.APP_PATH || "/public/index.html").replace(/^\/?/, "/");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ chrome */

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const pf = process.env.ProgramFiles || "C:\\Program Files";
  const pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const local = process.env.LOCALAPPDATA || "";
  const candidates =
    process.platform === "win32"
      ? [
          path.join(pf, "Google/Chrome/Application/chrome.exe"),
          path.join(pf86, "Google/Chrome/Application/chrome.exe"),
          path.join(local, "Google/Chrome/Application/chrome.exe"),
          path.join(pf, "Microsoft/Edge/Application/msedge.exe"),
          path.join(pf86, "Microsoft/Edge/Application/msedge.exe"),
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
  const found = candidates.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error("No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.");
  return found;
}

/* ------------------------------------------------------------------ server */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    }
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const file = path.resolve(ROOT, rel);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain" }).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

/* --------------------------------------------------------------------- cdp */

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Set();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", () => reject(new Error("DevTools websocket failed")));
      this.ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: ok, reject: bad } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) bad(new Error(msg.error.message));
          else ok(msg.result);
          return;
        }
        for (const fn of this.listeners) fn(msg);
      });
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

/* ---------------------------------------------------------------- harness */

const results = [];
const consoleErrors = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function main() {
  const chromePath = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "flipclock-verify-"));
  const { server, port } = await serve();
  const appUrl = `http://127.0.0.1:${port}${APP_PATH}`;

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--window-size=960,480",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const cleanup = () => {
    try {
      chrome.kill();
    } catch {}
    try {
      server.close();
    } catch {}
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
  };

  let wsUrl;
  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    const match = chunk.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) wsUrl = match[1];
  });
  const started = Date.now();
  while (!wsUrl && Date.now() - started < 15000) await sleep(100);
  if (!wsUrl) {
    cleanup();
    throw new Error("Chrome did not open a DevTools port");
  }

  const cdp = new CDP(wsUrl);
  await cdp.ready;
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);

  const waitForEvent = (method, timeout = 10000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`timed out waiting for ${method}`));
      }, timeout);
      const off = cdp.on((msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          clearTimeout(timer);
          off();
          resolve(msg.params);
        }
      });
    });

  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    }
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      consoleErrors.push(`${msg.params.entry.source}: ${msg.params.entry.text}`);
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  };

  const waitFor = async (expression, label, timeout = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`timeout waiting for ${label}`);
  };

  const setViewport = (width, height) =>
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  const load = async () => {
    const loaded = waitForEvent("Page.loadEventFired");
    await send("Page.navigate", { url: appUrl });
    await loaded;
    await waitFor("document.readyState === 'complete'", "document ready");
    await sleep(400);
  };

  const reload = async () => {
    const loaded = waitForEvent("Page.loadEventFired");
    await send("Page.reload", { ignoreCache: true });
    await loaded;
    await sleep(400);
  };

  const click = (selector) =>
    evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error("missing ${selector}");
      el.click(); return true; })()`);

  const setSelect = (selector, value) =>
    evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
      el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return el.value; })()`);

  const key = (keyName) =>
    evaluate(`document.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(keyName)}, bubbles: true }))`);

  const storage = (keyName) => evaluate(`localStorage.getItem(${JSON.stringify(keyName)})`);

  try {
    await setViewport(960, 480);
    await load();

    await check("no console errors on load", async () => {
      assertEqual(consoleErrors.join(" | "), "", "console errors");
    });

    await check("four flip cards render digits", async () => {
      const digits = await evaluate(`[...document.querySelectorAll(".digit")].map((d) => d.textContent)`);
      assertEqual(digits.length, 4, "digit count");
      assert(digits.every((d) => /^\d$/.test(d)), `digits not numeric: ${JSON.stringify(digits)}`);
    });

    await check("date line is filled", async () => {
      const text = await evaluate(`document.getElementById("date").textContent`);
      assert(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) \d{1,2} [A-Z][a-z]+/.test(text), `date line: ${text}`);
    });

    await check("defaults: Soft Black theme and 12 px UI", async () => {
      assertEqual(await evaluate(`document.documentElement.dataset.theme`), "softblack", "theme");
      assertEqual(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue("--fs").trim()`), "12px", "font size");
      assertEqual(
        await evaluate(`getComputedStyle(document.body).backgroundColor`),
        "rgb(20, 19, 17)",
        "soft black background",
      );
    });

    await check("player bar does not cover the clock", async () => {
      const boxes = await evaluate(`(() => {
        const player = document.querySelector(".player").getBoundingClientRect();
        const clock = document.querySelector(".clock").getBoundingClientRect();
        return { playerBottom: player.bottom, clockTop: clock.top, clockWidth: clock.width, width: innerWidth };
      })()`);
      assert(boxes.clockTop >= boxes.playerBottom - 1, `clock top ${boxes.clockTop} is under player bottom ${boxes.playerBottom}`);
      assert(boxes.clockWidth <= boxes.width, `clock overflows viewport: ${boxes.clockWidth} > ${boxes.width}`);
    });

    await check("idle state shows the tap hint", async () => {
      assert(await evaluate(`document.getElementById("hint").classList.contains("show")`), "hint not shown");
      assertEqual(await evaluate(`document.getElementById("dot").className`), "dot", "stream dot");
    });

    await check("settings open and close from the gear", async () => {
      await click("#cfg");
      assert(await evaluate(`document.getElementById("settings").classList.contains("open")`), "settings did not open");
      await click("#closeSettings");
      assert(!(await evaluate(`document.getElementById("settings").classList.contains("open")`)), "settings did not close");
    });

    await check("theme switch applies and persists", async () => {
      await click("#cfg");
      await setSelect("#themeSel", "paper");
      assertEqual(await evaluate(`document.documentElement.dataset.theme`), "paper", "theme attribute");
      assertEqual(await storage("fc.theme"), "paper", "fc.theme");
      assertEqual(
        await evaluate(`getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()`),
        "#d9d6cc",
        "paper --bg",
      );
      await sleep(450); // background has a .35s transition; let it settle before reading the painted colour
      assertEqual(await evaluate(`getComputedStyle(document.body).backgroundColor`), "rgb(217, 214, 204)", "paper background");
      await setSelect("#themeSel", "softblack");
      await click("#closeSettings");
    });

    await check("font size scales UI text but not clock digits", async () => {
      const digitBefore = await evaluate(`getComputedStyle(document.querySelector(".digit")).fontSize`);
      await click("#cfg");
      await setSelect("#fontSel", "24");
      assertEqual(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue("--fs").trim()`), "24px", "--fs");
      assertEqual(await storage("fc.fs"), "24", "fc.fs");
      const digitAfter = await evaluate(`getComputedStyle(document.querySelector(".digit")).fontSize`);
      assertEqual(digitAfter, digitBefore, "digit font-size must not follow --fs");
      await setSelect("#fontSel", "12");
      await click("#closeSettings");
    });

    await check("clock options cycle, apply body classes and persist", async () => {
      await click("#cfg");
      const rows = `document.querySelectorAll("#clockList .row")`;
      assertEqual(await evaluate(`${rows}.length`), 4, "clock option rows");

      await evaluate(`${rows}[0].click()`);
      assertEqual(JSON.parse(await storage("fc.clock")).format, "12-hour", "12-hour persisted");
      assert(await evaluate(`/ · (AM|PM)$/.test(document.getElementById("date").textContent)`), "date line missing AM/PM");
      await evaluate(`${rows}[0].click()`);
      assertEqual(JSON.parse(await storage("fc.clock")).format, "24-hour", "24-hour persisted");

      await evaluate(`${rows}[3].click()`);
      assert(await evaluate(`getComputedStyle(document.getElementById("secs")).display !== "none"`), "seconds hidden");
      assert(await evaluate(`/^:\\d\\d$/.test(document.getElementById("secs").textContent)`), "seconds text malformed");
      await evaluate(`${rows}[3].click()`);

      // huge (default) -> normal -> large -> huge
      await evaluate(`${rows}[2].click()`);
      assert(
        !(await evaluate(`document.body.classList.contains("size-huge") || document.body.classList.contains("size-large")`)),
        "normal card size not applied",
      );
      await evaluate(`${rows}[2].click()`);
      assert(await evaluate(`document.body.classList.contains("size-large")`), "large card size not applied");
      await evaluate(`${rows}[2].click()`);
      assert(await evaluate(`document.body.classList.contains("size-huge")`), "huge card size not applied");
      await click("#closeSettings");
    });

    await check("station picker opens, lists and closes", async () => {
      await click("#meta");
      assert(await evaluate(`document.getElementById("picker").classList.contains("open")`), "picker did not open");
      assertEqual(await evaluate(`document.querySelectorAll("#stationList .row").length`), 11, "picker rows");
      await key("Escape");
      assert(!(await evaluate(`document.getElementById("picker").classList.contains("open")`)), "Escape did not close picker");
    });

    await check("station manager adds, deletes and restores stations", async () => {
      await click("#cfg");
      await click("#openStations");
      assert(await evaluate(`document.getElementById("stationsPanel").classList.contains("open")`), "manager did not open");
      assertEqual(await evaluate(`document.getElementById("stationCount").textContent`), "11 stations", "initial count");

      await evaluate(`document.getElementById("newName").value = "Test Station"`);
      await evaluate(`document.getElementById("newUrl").value = "https://example.com/stream.mp3"`);
      await click("#addStation");
      assertEqual(await evaluate(`document.getElementById("stationCount").textContent`), "12 stations", "count after add");
      assert(
        (await storage("fc.stations")).includes("Test Station"),
        "added station not persisted",
      );

      await evaluate(`[...document.querySelectorAll("#manageList .del")].at(-1).click()`);
      assertEqual(await evaluate(`document.getElementById("stationCount").textContent`), "11 stations", "count after delete");

      await evaluate(`document.querySelector("#manageList .del").click()`);
      assertEqual(await evaluate(`document.getElementById("stationCount").textContent`), "10 stations", "count after deleting FIP");

      await click("#restoreStations");
      assertEqual(await evaluate(`document.getElementById("stationCount").textContent`), "11 stations", "count after restore");
      assertEqual(await evaluate(`document.querySelector("#manageList .n").textContent`), "FIP", "first station after restore");
      await click("#closeStations");
    });

    await check("preferences survive a reload", async () => {
      await click("#cfg");
      await setSelect("#themeSel", "paper");
      await setSelect("#fontSel", "14");
      await click("#closeSettings");
      await reload();
      assertEqual(await evaluate(`document.documentElement.dataset.theme`), "paper", "theme after reload");
      assertEqual(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue("--fs").trim()`), "14px", "font after reload");
      await click("#cfg");
      await setSelect("#themeSel", "softblack");
      await setSelect("#fontSel", "12");
      await click("#closeSettings");
    });

    await check("portrait phone layout has no horizontal overflow", async () => {
      await setViewport(390, 844);
      await reload();
      const boxes = await evaluate(`(() => {
        const clock = document.querySelector(".clock").getBoundingClientRect();
        return { scrollWidth: document.documentElement.scrollWidth, innerWidth, clockWidth: clock.width };
      })()`);
      assert(boxes.scrollWidth <= boxes.innerWidth + 1, `horizontal overflow: ${boxes.scrollWidth} > ${boxes.innerWidth}`);
      assert(boxes.clockWidth <= boxes.innerWidth, `clock wider than viewport: ${boxes.clockWidth}`);
      assertEqual(await evaluate(`document.querySelectorAll(".digit").length`), 4, "digits in portrait");
    });

    await check("no console errors during the run", async () => {
      assertEqual(consoleErrors.join(" | "), "", "console errors");
    });

    if (WANT_SHOTS) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      await setViewport(960, 480);
      await reload();
      const landscape = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT_DIR, "verify-960x480.png"), Buffer.from(landscape.data, "base64"));
      await setViewport(390, 844);
      await reload();
      const portrait = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT_DIR, "verify-390x844.png"), Buffer.from(portrait.data, "base64"));
    }
  } finally {
    cdp.close();
    cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  if (WANT_JSON) {
    console.log(JSON.stringify({ ok: failed.length === 0, checks: results }, null, 2));
  } else {
    console.log("Flip Clock Radio — UI smoke test\n");
    for (const r of results) {
      console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `\n        ${r.error}`}`);
    }
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
    if (WANT_SHOTS) console.log(`Screenshots: ${path.relative(ROOT, OUT_DIR)}\\verify-*.png`);
  }
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(`verify failed: ${error.message}`);
  process.exitCode = 1;
});
