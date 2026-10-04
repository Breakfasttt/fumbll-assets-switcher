// E2E (bac à sable, carte #23) : drop sur le portrait → CropDialog → PNG 95×147 enregistré.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp, sleep } from "../lib/app-driver.mjs";
import { dropPngOnZone, openRoster } from "./helpers.mjs";

const assert = (c, m) => {
  if (!c) throw new Error("ÉCHEC : " + m);
  console.log("ok  " + m);
};
// PNG IHDR: width/height are big-endian uint32 at bytes 16 and 20.
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

const app = await launchApp({ sandbox: true, port: 9343 });
try {
  await openRoster(app, "Human");
  assert((await dropPngOnZone(app, "#22aa66", 0)) === "dropped", "drop sur le portrait");
  await app.waitFor(`!!document.querySelector("[role=dialog] .reactEasyCrop_Container")`, 10000);
  assert(true, "CropDialog ouvert (react-easy-crop)");
  await sleep(800);
  assert(await app.evaluate(`document.querySelectorAll("[role=dialog] img[alt]").length >= 2`), "aperçus taille réelle ×1 et ×2");
  await app.screenshot(fileURLToPath(new URL("../../.screenshots/card23-crop.png", import.meta.url)));
  await app.press("Enter", { ctrl: true });
  await app.waitFor(`!document.querySelector("[role=dialog] .reactEasyCrop_Container")`, 10000);
  assert(true, "Ctrl+Entrée enregistre et ferme");
  await sleep(1500);
  const index = JSON.parse(fs.readFileSync(path.join(app.sandbox.userData, "overrides", "overrides.json"), "utf8"));
  const entry = Object.values(index)[0];
  assert(entry?.active, "override portrait actif");
  const [w, h] = pngSize(fs.readFileSync(path.join(app.sandbox.userData, "overrides", entry.fileName)));
  assert(w === 95 && h === 147, `PNG enregistré en ${w}×${h}`);
  console.log("\nE2E crop OK");
} finally {
  await app.close();
}
