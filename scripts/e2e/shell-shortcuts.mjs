// E2E (bac à sable, cartes #16/#19) : navigation clavier, aide des raccourcis, badges, status bar, Ctrl+Z.
import { fileURLToPath } from "node:url";
import { launchApp, sleep } from "../lib/app-driver.mjs";
import { buildPackZip, dropPngOnZone, openRoster } from "./helpers.mjs";

const assert = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("ok  " + m);
};
const currentTab = (app) => app.evaluate(`document.querySelector("aside nav button[aria-current=page]")?.textContent ?? ""`);
const statusBar = (app) => app.text("footer");

const app = await launchApp({ sandbox: true, port: 9336 });
try {
  assert(/0 image/.test(await statusBar(app)), "status bar : 0 image custom en jeu");
  assert(/Dossier cache|Cache/.test(await statusBar(app)), "status bar : chemin du cache");
  assert(!(await app.evaluate(`document.body.innerText.includes("Pack actif")`)), "pas de carte « Pack actif » sans pack");

  await app.press("2", { ctrl: true });
  assert(/Rosters/.test(await currentTab(app)), "Ctrl+2 → onglet Rosters (aria-current)");
  await app.press("5", { ctrl: true });
  assert(/Orphelins/.test(await currentTab(app)), "Ctrl+5 → onglet Orphelins");

  await app.press("?", { shift: true });
  assert(await app.evaluate(`document.body.innerText.includes("Raccourcis clavier")`), "? → aide des raccourcis");
  await app.press("Escape");
  assert(!(await app.evaluate(`document.body.innerText.includes("Raccourcis clavier")`)), "Échap ferme l'aide");

  await app.press("2", { ctrl: true });
  await openRoster(app, "Human");
  assert((await dropPngOnZone(app, "#cc2222", 1)) === "dropped", "drop iconset");
  await sleep(2500);
  assert(/1 image/.test(await statusBar(app)), "status bar : 1 image custom en jeu");
  const badge = await app.evaluate(`[...document.querySelectorAll("aside nav button")].find((b) => b.textContent.includes("Rosters")).textContent`);
  assert(/1$/.test(badge.trim()), "badge Rosters = 1");

  await app.evaluate(`[...document.querySelectorAll("main button")].find((b) => b.textContent.trim() === "✕").click()`);
  await sleep(2000);
  assert(/0 image/.test(await statusBar(app)), "suppression → 0 image");
  await app.press("z", { ctrl: true });
  await sleep(2500);
  assert(/1 image/.test(await statusBar(app)), "Ctrl+Z annule la suppression");

  // Active pack card: import a real pack zip through the IPC, reload, activate it from the Packs tab.
  const zip = await buildPackZip(app.sandbox.dir);
  await app.evaluate(`window.fumbblApi.importPack(${JSON.stringify(zip)}).then(() => location.reload())`);
  await sleep(3000);
  await app.press("4", { ctrl: true });
  await sleep(1000);
  await app.click("Activer", { within: "main" });
  await app.click("Continuer", { within: "[role=alertdialog]" });
  await sleep(2500);
  assert(await app.evaluate(`document.querySelector("aside").innerText.includes("Pack E2E")`), "carte « Pack actif » affichée dans la sidebar");
  await app.screenshot(fileURLToPath(new URL("../../.screenshots/card16-active-pack.png", import.meta.url)));
  await app.click("Détacher", { within: "aside" });
  await sleep(2000);
  assert(!(await app.evaluate(`document.querySelector("aside").innerText.includes("Pack E2E")`)), "« Détacher » retire la carte");
  console.log("\nE2E shell OK");
} finally {
  await app.close();
}
