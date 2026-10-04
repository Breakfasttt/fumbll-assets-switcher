// Gestes communs des scénarios e2e (pas un scénario : ignoré par scripts/e2e.mjs).
import { createRequire } from "node:module";
import path from "node:path";
import { sleep } from "../lib/app-driver.mjs";

/** Writes a one-entry pack zip ("Pack E2E") in `dir` and returns its path. */
export async function buildPackZip(dir) {
  const AdmZip = createRequire(import.meta.url)("adm-zip");
  const zip = new AdmZip();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
  const fileName = "E2EPACK.png";
  const manifest = { formatVersion: 1, name: "Pack E2E", createdAt: new Date().toISOString(), entries: [{ url: "https://fumbbl.com/i/999999", fileName }] };
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest)));
  zip.addFile(fileName, png);
  const file = path.join(dir, "e2e-pack.zip");
  zip.writeZip(file);
  return file;
}

/** Rosters tab must be open: selects a roster and waits for the asset slots. */
export async function openRoster(app, name) {
  await sleep(1000);
  // The roster list comes from the network: wait for the option rather than a fixed delay.
  // Works with the roster Select (before #21) and with the filterable roster list (cmdk options).
  const hasOption = `[...document.querySelectorAll("[role=option]")].some((o) => o.textContent.trim() === ${JSON.stringify(name)})`;
  await app.waitFor(`!!document.querySelector("main button[role=combobox]") || ${hasOption}`, 30000);
  if (await app.evaluate(`!!document.querySelector("main button[role=combobox]")`)) {
    await app.evaluate(`document.querySelector("main button[role=combobox]").click()`);
    await app.waitFor(hasOption, 30000);
  }
  await app.click(name, { within: "body", exact: true });
  await app.waitFor(`document.querySelectorAll("main [data-slot=custom]").length >= 2`, 20000);
  await sleep(2500);
}

/** Drops a generated 120x60 PNG of `color` on the n-th custom slot (AssetSlotPair dropzone; 0 = portrait, 1 = iconset). */
export function dropPngOnZone(app, color, zoneIndex) {
  return app.evaluate(`(async () => {
    const c = document.createElement("canvas"); c.width = 120; c.height = 60;
    const g = c.getContext("2d"); g.fillStyle = ${JSON.stringify(color)}; g.fillRect(0, 0, 120, 60);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const file = new File([blob], "test.png", { type: "image/png" });
    const zone = [...document.querySelectorAll("main [data-slot=custom]")][${zoneIndex}];
    if (!zone) return "no zone";
    const dt = new DataTransfer(); dt.items.add(file);
    zone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    return "dropped";
  })()`);
}

/** Clicks the `testId` button of the n-th AssetSlotPair (0 = portrait, 1 = iconset). */
export function clickInPair(app, testId, pairIndex) {
  return app.evaluate(`(() => {
    const pair = document.querySelectorAll("main [data-testid=asset-slot-pair]")[${pairIndex}];
    const el = pair?.querySelector("[data-testid=${testId}]");
    if (!el || el.disabled) return false;
    el.click();
    return true;
  })()`);
}
