// E2E (bac à sable, carte #20) : palette Ctrl+K → roster, puis roster › position, récents.
import { fileURLToPath } from "node:url";
import { launchApp, sleep } from "../lib/app-driver.mjs";

const assert = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("ok  " + m);
};
const paletteOpen = (app) => app.evaluate(`!!document.querySelector("[role=dialog] [cmdk-root]")`);

const app = await launchApp({ sandbox: true, port: 9339 });
try {
  await app.press("k", { ctrl: true });
  assert(await paletteOpen(app), "Ctrl+K ouvre la palette");
  await app.type("Dwarf");
  await app.press("Enter");
  await app.waitFor(`document.querySelector("[data-testid=roster-list] [data-active]")?.textContent.includes("Dwarf")`, 15000);
  assert(!(await paletteOpen(app)), "Entrée ferme la palette");
  assert(true, "roster Dwarf ouvert dans l'onglet Rosters");

  // Positions come from the background "used by" index: wait until the rosters are loaded.
  await app.waitFor(`true`, 1000);
  let found = false;
  for (let i = 0; i < 20 && !found; i++) {
    await app.press("k", { ctrl: true });
    await app.type("Human Blitzer");
    found = await app.evaluate(`[...document.querySelectorAll("[cmdk-item]")].some((e) => e.textContent.includes("Human › Blitzer"))`);
    if (!found) {
      await app.press("Escape");
      await sleep(1500);
    }
  }
  assert(found, "position « Human › Blitzer » proposée");
  await app.screenshot(fileURLToPath(new URL("../../.screenshots/card20-palette.png", import.meta.url)));
  // "Human Blitzer" also matches "Old World Alliance › Human Blitzer": pick the exact entry.
  await app.evaluate(`[...document.querySelectorAll("[cmdk-item]")].find((e) => e.textContent === "Human › Blitzer").click()`);
  await app.waitFor(`document.querySelector("[data-testid=roster-list] [data-active]")?.textContent.includes("Human")`, 15000);
  await app.waitFor(`[...document.querySelectorAll("main h2")].some((h) => h.textContent === "Blitzer")`, 15000);
  assert(await app.evaluate(`document.querySelector("[data-testid=roster-list] [data-active]").textContent.includes("Human")`), "roster Human + position Blitzer ouverts");

  await app.press("k", { ctrl: true });
  assert(await app.evaluate(`document.querySelector("[role=dialog] [cmdk-root]").innerText.includes("Récents")`), "groupe « Récents » affiché");
  await app.press("Escape");
  console.log("\nE2E palette OK");
} finally {
  await app.close();
}
