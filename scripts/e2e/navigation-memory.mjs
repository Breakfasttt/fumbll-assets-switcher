// E2E (bac à sable, carte #17) : réouverture sur le dernier onglet/roster, onboarding si cache invalide.
import fs from "node:fs";
import path from "node:path";
import { launchApp, sleep } from "../lib/app-driver.mjs";
import { openRoster } from "./helpers.mjs";

const assert = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("ok  " + m);
};
const currentTab = (app) => app.evaluate(`document.querySelector("aside nav button[aria-current=page]")?.textContent ?? ""`);

let app = await launchApp({ sandbox: true, port: 9337 });
const box = app.sandbox;
try {
  assert(/Rosters/.test(await currentTab(app)), "1er lancement configuré → onglet Rosters (pas Config)");
  await openRoster(app, "Dwarf");
  await app.click("Blitzer", { within: "main" });
  await sleep(800);
  await app.press("4", { ctrl: true });
  assert(/Packs/.test(await currentTab(app)), "navigation vers Packs");
  await sleep(1000);
  await app.close({ keepSandbox: true });

  app = await launchApp({ sandbox: box, port: 9337 });
  assert(/Packs/.test(await currentTab(app)), "relance → rouvre Packs");
  await app.press("2", { ctrl: true });
  await app.waitFor(`document.querySelector("[data-testid=roster-list] [data-active]")?.textContent.includes("Dwarf")`, 15000);
  assert(true, "Rosters → roster Dwarf restauré");
  await app.waitFor(`[...document.querySelectorAll("main h2")].some((h) => h.textContent.includes("Blitzer"))`, 15000);
  assert(true, "position Blitzer restaurée");
  await app.close({ keepSandbox: true });

  // Cache folder removed behind the app's back: back to onboarding, other tabs locked.
  fs.rmSync(box.cacheFolder, { recursive: true, force: true });
  app = await launchApp({ sandbox: box, port: 9337 });
  assert(/Configuration/.test(await currentTab(app)), "cache invalide → onglet Configuration");
  assert(await app.evaluate(`document.body.innerText.includes("n'est plus utilisable")`), "message « dossier plus utilisable »");
  const locked = await app.evaluate(`[...document.querySelectorAll("aside nav button")].filter((b) => b.disabled).length`);
  assert(locked === 4, "4 onglets verrouillés");
  console.log("\nE2E navigation OK");
} finally {
  await app.close();
}
