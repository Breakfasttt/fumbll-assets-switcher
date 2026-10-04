#!/usr/bin/env node
// Capture chaque onglet de l'app (build de prod) via le protocole DevTools. Zéro dépendance.
// Lecture seule : ne fait que cliquer la navigation (et ouvrir un roster sur l'onglet Rosters).
// Usage : npm run build && npm run screenshots [-- --roster=Human] [-- --sandbox]
//   -> .screenshots/<n>-<onglet>.png ; --sandbox = données jetables (aucun override réel).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp, sleep } from "./lib/app-driver.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".screenshots");
const roster = process.argv.find((a) => a.startsWith("--roster="))?.slice(9) ?? "Human";
const NAV = `[...document.querySelectorAll("aside nav [role=button], aside nav button")]`;

fs.mkdirSync(OUT, { recursive: true });
const app = await launchApp({ sandbox: process.argv.includes("--sandbox") });
try {
  await sleep(500);
  // Tab label only (badges carry counters).
  const tabs = (await app.evaluate(`${NAV}.map((e) => (e.querySelector("span.flex-1") ?? e).textContent.trim())`)) ?? [];
  for (const [i, label] of tabs.entries()) {
    await app.evaluate(`${NAV}[${i}].click()`);
    await sleep(2500);
    if (/roster/i.test(label)) {
      await app.evaluate(`[...document.querySelectorAll("[data-testid=roster-list] [cmdk-item]")].find((o) => o.textContent.trim().startsWith(${JSON.stringify(roster)}))?.click()`);
      await sleep(4000);
    }
    const file = path.join(OUT, `${i}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
    await app.screenshot(file);
    console.log(`✓ ${path.relative(ROOT, file)}`);
  }
} finally {
  await app.close();
}
