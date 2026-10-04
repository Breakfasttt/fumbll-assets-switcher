#!/usr/bin/env node
// Capture chaque onglet de l'app (build de prod) via le protocole DevTools. Zéro dépendance.
// Lecture seule : ne fait que cliquer la navigation (et ouvrir un roster sur l'onglet Rosters).
// Usage : npm run build && npm run screenshots [-- --roster=Human] -> .screenshots/<n>-<onglet>.png
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".screenshots");
const PORT = 9333;
const roster = process.argv.find((a) => a.startsWith("--roster="))?.slice(9) ?? "Human";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAV = `[...document.querySelectorAll("aside nav [role=button], aside nav button")]`;

if (!fs.existsSync(path.join(ROOT, "dist/renderer/index.html"))) {
  console.error("✗ build absent : lancer `npm run build` d'abord");
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

// Lancé depuis VS Code / Claude Code, ELECTRON_RUN_AS_NODE=1 est hérité : on le retire.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const electronBin = (await import("electron")).default;
// Windows stops painting occluded/background windows: keep rendering for captures.
const flags = ["--disable-features=CalculateNativeWinOcclusion", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"];
const app = spawn(electronBin, [".", `--remote-debugging-port=${PORT}`, ...flags], { cwd: ROOT, env, stdio: "ignore" });

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page" && !t.url.startsWith("devtools"));
    } catch {}
    if (!target) await sleep(500);
  }
  if (!target) throw new Error("page introuvable via CDP");

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
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await sleep(2500);
  const tabs = (await evaluate(`${NAV}.map((e) => e.textContent.trim())`)) ?? [];
  for (const [i, label] of tabs.entries()) {
    await evaluate(`${NAV}[${i}].click()`);
    await sleep(2500);
    if (/roster/i.test(label)) {
      await evaluate(`document.querySelector("main button[role=combobox]")?.click()`);
      await sleep(800);
      await evaluate(`[...document.querySelectorAll("[role=option]")].find((o) => o.textContent.includes(${JSON.stringify(roster)}))?.click()`);
      await sleep(4000);
    }
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const file = path.join(OUT, `${i}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
    fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    console.log(`✓ ${path.relative(ROOT, file)}`);
  }
  ws.close();
} finally {
  app.kill();
}
