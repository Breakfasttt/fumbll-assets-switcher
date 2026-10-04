// E2E (bac à sable non configuré, carte #18) : onboarding, détection sans enregistrement implicite, choix explicite.
// La détection lit le vrai registre Windows (lecture seule) ; le choix n'est écrit que dans la config du bac à sable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp, sleep } from "../lib/app-driver.mjs";

const assert = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("ok  " + m);
};
const shot = (name) => fileURLToPath(new URL(`../../.screenshots/${name}`, import.meta.url));

const app = await launchApp({ sandbox: true, configured: false, port: 9338 });
const savedConfig = () => JSON.parse(fs.readFileSync(path.join(app.sandbox.userData, "config.json"), "utf8"));
try {
  assert(await app.evaluate(`document.body.innerText.includes("Bienvenue")`), "onboarding affiché");
  const locked = await app.evaluate(`[...document.querySelectorAll("aside nav button")].filter((b) => b.disabled).length`);
  assert(locked === 4, "4 onglets verrouillés");
  await app.screenshot(shot("card18-onboarding.png"));

  await app.click("Auto-détecter", { within: "main" });
  await app.waitFor(`!document.querySelector("main button[disabled] .animate-spin")`, 20000);
  await sleep(500);
  const radios = await app.evaluate(`document.querySelectorAll("main [role=radio]").length`);
  const empty = await app.evaluate(`document.body.innerText.includes("Aucun coach")`);
  assert(radios > 0 || empty, `détection : ${radios} coach(s) proposé(s) ou état vide`);
  assert(savedConfig().cacheFolder === null, "rien n'est enregistré avant le choix explicite");
  await app.screenshot(shot("card18-detected.png"));

  if (radios > 0) {
    await app.click("Utiliser ce dossier", { within: "main" });
    await app.waitFor(`[...document.querySelectorAll("aside nav button")].every((b) => !b.disabled)`, 15000);
    assert(!!savedConfig().cacheFolder, "choix enregistré, onglets déverrouillés");
    await app.press("1", { ctrl: true });
    assert(await app.evaluate(`document.body.innerText.includes("Dossier cache connecté")`), "Config devient la page Paramètres");
    await app.screenshot(shot("card18-settings.png"));
  }
  console.log("\nE2E onboarding OK");
} finally {
  await app.close();
}
