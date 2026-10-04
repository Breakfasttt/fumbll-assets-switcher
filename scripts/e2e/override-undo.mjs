// E2E (bac à sable, carte #15) : drop iconset, remplacement + Annuler, suppression + Annuler.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp, sleep } from "../lib/app-driver.mjs";
import { clickInPair, dropPngOnZone, openRoster } from "./helpers.mjs";
const OUT = fileURLToPath(new URL("../../.screenshots", import.meta.url));
const assert = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("ok  " + m);
};

const app = await launchApp({ sandbox: true, port: 9335 });
const overridesJson = () => {
  const p = path.join(app.sandbox.userData, "overrides", "overrides.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
};
const toasts = () => app.evaluate(`[...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\\s+/g, " ").trim())`);
try {
  await app.click("Rosters");
  await openRoster(app, "Human");

  // Zone 1 = iconset custom (zone 0 = portrait, which opens the crop editor).
  assert((await dropPngOnZone(app, "#cc2222", 1)) === "dropped", "drop iconset #1");
  await sleep(2500);
  let idx = overridesJson();
  const url = Object.keys(idx)[0];
  assert(url && idx[url].active, "override créé et actif");
  const firstFile = fs.readFileSync(path.join(app.sandbox.userData, "overrides", idx[url].fileName));
  assert((await toasts()).length === 0, "pas de toast d'annulation pour une création (rien remplacé)");

  assert((await dropPngOnZone(app, "#2222cc", 1)) === "dropped", "drop iconset #2 (remplacement)");
  await sleep(2500);
  let t = await toasts();
  console.log("    toasts :", t);
  assert(t.some((x) => /remplac/i.test(x) && /Annuler/.test(x)), "toast « remplacée » avec Annuler");
  const secondFile = fs.readFileSync(path.join(app.sandbox.userData, "overrides", overridesJson()[url].fileName));
  assert(!secondFile.equals(firstFile), "fichier remplacé sur disque");
  await app.screenshot(`${OUT}/card15-replaced-toast.png`);

  await app.click("Annuler", { within: "[data-sonner-toaster]" });
  await sleep(2500);
  const restored = fs.readFileSync(path.join(app.sandbox.userData, "overrides", overridesJson()[url].fileName));
  assert(restored.equals(firstFile), "Annuler restaure la 1re image");

  // Delete via the custom slot's "Supprimer" icon button, then undo.
  assert(await clickInPair(app, "slot-delete", 1), "bouton Supprimer de l'iconset");
  await sleep(2500);
  assert(!overridesJson()[url], "override supprimé");
  t = await toasts();
  assert(t.some((x) => /supprim/i.test(x) && /Annuler/.test(x)), "toast « supprimée » avec Annuler");
  await app.click("Annuler", { within: "[data-sonner-toaster]" });
  await sleep(2500);
  idx = overridesJson();
  assert(idx[url]?.active, "Annuler restaure l'override actif");
  const cacheFiles = fs.readdirSync(app.sandbox.cacheFolder).filter((f) => f !== "map.json");
  assert(cacheFiles.length >= 1, "image remise dans le cache FFB");
  await app.screenshot(`${OUT}/card15-after-undo.png`);
  console.log("\nE2E #15 OK");
} finally {
  await app.close();
}
