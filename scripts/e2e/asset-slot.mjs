// E2E (bac à sable, carte #22) : AssetSlotPair — dropzone vide, drop iconset, badge « En jeu »,
// ToggleGroup Défaut/Custom (overrides.json), « Partagé par » + avertissement, captures iconset/terrain.
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

const app = await launchApp({ sandbox: true, port: 9342 });
const overridesJson = () => {
  const p = path.join(app.sandbox.userData, "overrides", "overrides.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
};
// State of the n-th pair (0 = portrait, 1 = iconset).
const pairState = (i) =>
  app.evaluate(`(() => {
    const pair = document.querySelectorAll("main [data-testid=asset-slot-pair]")[${i}];
    if (!pair) return null;
    const inGame = pair.querySelector("[data-in-game]");
    return {
      inGame: inGame?.dataset.slot ?? null,
      badgeIn: pair.querySelector("[data-testid=in-game-badge]")?.closest("[data-slot]")?.dataset.slot ?? null,
      chooseFile: !!pair.querySelector("[data-testid=slot-choose-file]"),
      customDisabled: !!pair.querySelector("[data-testid=slot-toggle-custom]")?.disabled,
      toggleLabel: pair.querySelector("[role=radiogroup]")?.getAttribute("aria-label") ?? null,
      pressed: [...pair.querySelectorAll("[role=radiogroup] [data-state=on]")].map((b) => b.dataset.testid),
      sharedBy: pair.querySelector("[data-testid=shared-by]")?.innerText ?? null,
      warning: pair.querySelector("[data-testid=shared-warning]")?.innerText ?? null,
    };
  })()`);

try {
  await app.click("Rosters");
  await openRoster(app, "Human");

  let s = await pairState(1);
  assert(s.chooseFile, "custom vide : bouton « Choisir un fichier… »");
  assert(s.customDisabled, "option Custom désactivée sans image custom");
  assert(s.inGame === "default" && s.badgeIn === "default", "« En jeu » sur Défaut par défaut");
  assert(s.toggleLabel === "Image utilisée en jeu", "ToggleGroup avec aria-label");
  assert(!(await app.evaluate(`!!document.querySelector("main [role=button][data-slot]")`)), "vignettes non cliquables (pas de role=button)");

  await app.screenshot(`${OUT}/card22-portrait.png`);

  assert((await dropPngOnZone(app, "#22aa55", 1)) === "dropped", "drop sur la vignette custom de l'iconset");
  await sleep(2500);
  const url = Object.keys(overridesJson())[0];
  assert(url && overridesJson()[url].active, "override créé et actif");
  s = await pairState(1);
  assert(s.inGame === "custom" && s.badgeIn === "custom", "badge « En jeu » sur Custom après drop");
  assert(!s.chooseFile && s.pressed.includes("slot-toggle-custom"), "toggle sur Custom, actions de la custom affichées");
  await app.evaluate(`document.querySelectorAll("main [data-testid=asset-slot-pair]")[1].scrollIntoView({ block: "center" })`);
  await sleep(500);
  await app.screenshot(`${OUT}/card22-iconset.png`);

  assert(await clickInPair(app, "slot-toggle-default", 1), "clic Défaut dans le ToggleGroup");
  await sleep(2000);
  assert(overridesJson()[url]?.active === false, "overrides.json : override inactif");
  s = await pairState(1);
  assert(s.inGame === "default" && s.badgeIn === "default", "badge « En jeu » revenu sur Défaut");

  assert(await clickInPair(app, "slot-toggle-custom", 1), "clic Custom dans le ToggleGroup");
  await sleep(2000);
  assert(overridesJson()[url]?.active === true, "overrides.json : override réactivé");

  // Menu ⋯ : copy the asset URL.
  // Radix menus open on pointerdown, not click.
  const opened = await app.evaluate(`(() => {
    const btn = document.querySelectorAll("main [data-testid=asset-slot-pair]")[1]?.querySelector("[data-testid=slot-menu]");
    btn?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
    return !!btn;
  })()`);
  assert(opened, "ouverture du menu ⋯");
  await sleep(400);
  const items = await app.evaluate(`[...document.querySelectorAll("[role=menuitem]")].map((e) => e.textContent.trim())`);
  assert(items.includes("Afficher dans le dossier") && items.includes("Copier l'URL de l'asset"), "menu ⋯ : dossier + copier l'URL");
  await app.press("Escape");

  // "Shared by": wait for the usage index, then look for a position whose asset several rosters share.
  await app.waitFor(`!!document.querySelector("main [data-testid=shared-by]")`, 60000);
  s = await pairState(0);
  assert(/Partagé par : .*Human/.test(s.sharedBy ?? ""), "ligne « Partagé par » (Human inclus)");
  // Griff Oberwald (Human star) shares his assets with other rosters.
  await app.click("Griff Oberwald", { within: "main" });
  await app.waitFor(`!!document.querySelector("main [data-testid=shared-warning]")`, 20000);
  const warning = (await pairState(0)).warning ?? (await pairState(1)).warning;
  assert(/^Modifier cette image change aussi /.test(warning) && !/Human/.test(warning), `avertissement « partagé » sans le roster courant (${warning})`);

  // Pitches (Human has no dedicated pitch, Amazon does): one weather slot pair per weather.
  await app.press("3", { ctrl: true });
  await sleep(1000);
  await app.evaluate(`document.querySelector("main button[role=combobox]").click()`);
  await sleep(600);
  await app.waitFor(`[...document.querySelectorAll("[role=listbox] [role=option]")].some((o) => o.textContent.trim() === "Amazon")`, 30000);
  await app.click("Amazon", { within: "[role=listbox]", exact: true });
  await app.waitFor(`document.querySelectorAll("main [data-testid=asset-slot-pair]").length === 5`, 20000);
  await app.waitFor(`!!document.querySelector("main [data-slot=default] img")`, 60000);
  await sleep(1500);
  const pitch = await pairState(0);
  assert(pitch.chooseFile && pitch.inGame === "default", "terrain : paire Défaut/Custom avec « Choisir un fichier… »");
  assert(pitch.sharedBy === null, "terrain : pas de ligne « Partagé par »");
  await app.screenshot(`${OUT}/card22-pitch.png`);
  console.log("\nE2E #22 OK");
} finally {
  await app.close();
}
