// Pilote l'app Electron buildée via le protocole DevTools (CDP). Zéro dépendance.
// Utilisé par scripts/screenshots.mjs et par les scripts de vérification des cartes UI.
//   const app = await launchApp({ sandbox: true });
//   await app.click("Orphelins"); await app.screenshot("x.png"); await app.close();
// sandbox: true -> userData + cache FFB jetables (FAS_USER_DATA), aucune donnée réelle touchée.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Windows stops painting occluded/background windows: keep rendering for captures.
const RENDER_FLAGS = [
  "--disable-features=CalculateNativeWinOcclusion",
  "--disable-renderer-backgrounding",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
];

export { sleep };

/** Creates a throw-away userData (config pointing to an empty fake FFB cache). */
export function createSandbox({ language = "fr" } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fas-sandbox-"));
  const userData = path.join(dir, "userData");
  const cacheFolder = path.join(dir, "cache");
  fs.mkdirSync(userData, { recursive: true });
  fs.mkdirSync(cacheFolder, { recursive: true });
  fs.writeFileSync(path.join(cacheFolder, "map.json"), "{}");
  fs.writeFileSync(path.join(userData, "config.json"), JSON.stringify({ cacheFolder, coachName: null, language }));
  return { dir, userData, cacheFolder, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

export async function launchApp({ sandbox = false, port = 9333, width = 1280, height = 860, language } = {}) {
  if (!fs.existsSync(path.join(ROOT, "dist/renderer/index.html"))) throw new Error("build absent : lancer `npm run build` d'abord");
  const box = sandbox ? createSandbox({ language }) : null;
  // Launched from VS Code / Claude Code, ELECTRON_RUN_AS_NODE=1 is inherited: drop it.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  if (box) env.FAS_USER_DATA = box.userData;
  const electronBin = (await import("electron")).default;
  const proc = spawn(electronBin, [".", `--remote-debugging-port=${port}`, ...RENDER_FLAGS], { cwd: ROOT, env, stdio: "ignore" });

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === "page" && !t.url.startsWith("devtools"));
    } catch {}
    if (!target) await sleep(500);
  }
  if (!target) {
    proc.kill();
    throw new Error("page introuvable via CDP");
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    pending.get(msg.id)?.(msg);
  });
  // CDP can stall (e.g. hidden window not painting): fail loudly instead of hanging.
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => reject(new Error(`CDP ${method} : pas de réponse en 15 s`)), 15000);
      pending.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  /** Evaluates an expression (string) in the page, awaiting promises; returns its JSON value. */
  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) throw new Error("evaluate : " + (res.result.exceptionDetails.exception?.description ?? res.result.exceptionDetails.text));
    return res.result?.result?.value;
  };

  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await sleep(2000);

  return {
    sandbox: box,
    send,
    evaluate,
    /** Clicks the first visible element (button, role=button, option, menuitem, nav tab) whose text matches. */
    async click(text, { within = "body", exact = false } = {}) {
      const ok = await evaluate(`(() => {
        const want = ${JSON.stringify(text)};
        const els = [...document.querySelectorAll(${JSON.stringify(within)} + " :is(button, [role=button], [role=option], [role=menuitem], [role=radio], a)")];
        const el = els.find((e) => ${exact} ? e.textContent.trim() === want : e.textContent.includes(want));
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!ok) throw new Error(`click : aucun élément "${text}"`);
      await sleep(400);
    },
    /** Real keyboard input, e.g. press("2", { ctrl: true }), press("?"), press("Escape"). */
    async press(key, { ctrl = false, shift = false, alt = false } = {}) {
      const modifiers = (alt ? 1 : 0) | (ctrl ? 2 : 0) | (shift ? 8 : 0);
      const code = /^[0-9]$/.test(key) ? `Digit${key}` : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key;
      const text = key.length === 1 && !ctrl && !alt ? key : undefined;
      await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key, code, modifiers, text });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
      await sleep(400);
    },
    async text(selector = "body") {
      return evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? ""`);
    },
    async waitFor(expression, timeoutMs = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (await evaluate(expression)) return true;
        await sleep(250);
      }
      throw new Error(`waitFor : ${expression}`);
    },
    async screenshot(file) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    },
    async close() {
      ws.close();
      proc.kill();
      await sleep(500);
      box?.cleanup();
    },
  };
}
