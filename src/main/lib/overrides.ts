import { app, shell } from "electron";
import { promises as fs } from "fs";
import * as path from "path";
import { computeHash, putImageInCache, removeImageFromCache } from "./cacheWriter";
import { archiveOverrideVersion, dropOverrideVersion, readOverrideVersion } from "./overrideHistory";
import { OverrideEntry, OverrideSaveResult } from "../../shared/types";

const OVERRIDES_INDEX_FILE = "overrides.json";

interface OverridesIndex {
  [url: string]: OverrideEntry;
}

function overridesDir(): string {
  return path.join(app.getPath("userData"), "overrides");
}

function indexPath(): string {
  return path.join(overridesDir(), OVERRIDES_INDEX_FILE);
}

async function readIndex(): Promise<OverridesIndex> {
  try {
    const raw = await fs.readFile(indexPath(), "utf8");
    return JSON.parse(raw) as OverridesIndex;
  } catch {
    return {};
  }
}

async function writeIndex(index: OverridesIndex): Promise<void> {
  await fs.mkdir(overridesDir(), { recursive: true });
  await fs.writeFile(indexPath(), JSON.stringify(index, null, 2), "utf8");
}

export async function listOverrides(): Promise<OverridesIndex> {
  return readIndex();
}

/** Overrides saved by the tool but not currently active in the FFB cache - the game shows the default asset instead. */
export async function listInactiveOverrides(): Promise<OverrideEntry[]> {
  const index = await readIndex();
  return Object.values(index).filter((entry) => !entry.active);
}

export async function getOverride(url: string): Promise<OverrideEntry | null> {
  const index = await readIndex();
  return index[url] ?? null;
}

/** Archives the index entry currently registered for `url` (if any) so the coming mutation can be undone. */
async function archiveCurrent(index: OverridesIndex, url: string): Promise<string | null> {
  const current = index[url];
  if (!current) return null;
  return archiveOverrideVersion(current, overrideFilePath(current.fileName));
}

/**
 * Stores a custom image for `url` in the tool's own overrides folder (never
 * inside the FFB cache folder itself, to avoid the real client overwriting or
 * conflicting with it), and immediately activates it in the real FFB cache.
 * The replaced version, if any, is archived first (`undoVersionId`).
 */
export async function saveOverrideFile(
  cacheFolder: string,
  url: string,
  imageBuffer: Buffer,
  format: string
): Promise<OverrideSaveResult> {
  const index = await readIndex();
  const undoVersionId = await archiveCurrent(index, url);

  const hash = computeHash(url);
  const fileName = `${hash}.${format}`;
  await fs.mkdir(overridesDir(), { recursive: true });
  await fs.writeFile(path.join(overridesDir(), fileName), imageBuffer);

  const entry: OverrideEntry = { url, fileName, active: true };
  index[url] = entry;
  await writeIndex(index);

  await putImageInCache(cacheFolder, url, imageBuffer, format);

  return undoVersionId ? { ...entry, undoVersionId } : entry;
}

export function overrideFilePath(fileName: string): string {
  return path.join(overridesDir(), fileName);
}

/**
 * Registers (or refreshes) an override entry as active, pointing at a file
 * that the caller has already placed in overridesDir() - used when activating
 * a pack, where the file comes from the pack's own storage rather than a
 * fresh user-provided buffer (see saveOverrideFile for the ad-hoc case).
 * An ad-hoc entry replaced this way is archived first and its version id
 * returned; pack entries are not archived (the pack storage keeps them, and
 * they would push the user's own versions out of the per-URL cap).
 */
export async function registerActiveOverride(
  cacheFolder: string,
  url: string,
  fileName: string,
  packId: string | undefined
): Promise<string | null> {
  const index = await readIndex();
  const current = index[url];
  const undoVersionId = current && !current.packId ? await archiveCurrent(index, url) : null;
  index[url] = { url, fileName, active: true, packId };
  await writeIndex(index);

  const format = fileName.split(".").pop() || "png";
  const buffer = await fs.readFile(overrideFilePath(fileName));
  await putImageInCache(cacheFolder, url, buffer, format);
  return undoVersionId;
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/** Reads an override's stored file and returns it as a data URL for display. */
export async function readOverrideImageDataUrl(url: string): Promise<string | null> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return null;
  try {
    const buffer = await fs.readFile(overrideFilePath(entry.fileName));
    const ext = entry.fileName.split(".").pop()?.toLowerCase() || "png";
    const mime = MIME_BY_EXT[ext] || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Reveals the override's stored file in the OS file explorer (never in the FFB cache folder, since it lives in the tool's own overrides folder). */
export async function showOverrideInFolder(url: string): Promise<void> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return;
  shell.showItemInFolder(overrideFilePath(entry.fileName));
}

/** Removes the override of `url` (index, stored file, FFB cache) after archiving it; returns the archived version id. */
export async function deleteOverride(cacheFolder: string, url: string): Promise<string | null> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return null;
  const undoVersionId = await archiveCurrent(index, url);

  if (entry.active) {
    await removeImageFromCache(cacheFolder, url);
  }

  delete index[url];
  await writeIndex(index);
  try {
    await fs.unlink(overrideFilePath(entry.fileName));
  } catch {
    // already gone
  }
  return undoVersionId;
}

/**
 * Brings back an archived version of `url`'s override (undo of a save,
 * delete or pack activation). The current version, if any, is archived first
 * so the restore itself can be undone (`undoVersionId`); the restored version
 * leaves the history since it is the live one again. The FFB cache follows the
 * restored state: active => image written under MD5(url), inactive => removed.
 */
export async function restoreOverride(cacheFolder: string, url: string, versionId: string): Promise<OverrideSaveResult> {
  const { entry, buffer } = await readOverrideVersion(url, versionId);

  const index = await readIndex();
  const current = index[url];
  const undoVersionId = await archiveCurrent(index, url);

  await fs.mkdir(overridesDir(), { recursive: true });
  await fs.writeFile(overrideFilePath(entry.fileName), buffer);
  // An ad-hoc file under another name (e.g. other extension) is now archived and unreferenced.
  if (current && !current.packId && current.fileName !== entry.fileName) {
    try {
      await fs.unlink(overrideFilePath(current.fileName));
    } catch {
      // already gone
    }
  }

  index[url] = entry;
  await writeIndex(index);

  if (entry.active) {
    await putImageInCache(cacheFolder, url, buffer, entry.fileName.split(".").pop() || "png");
  } else {
    await removeImageFromCache(cacheFolder, url);
  }

  await dropOverrideVersion(url, versionId);
  return undoVersionId ? { ...entry, undoVersionId } : entry;
}

/**
 * Turns a saved override on/off in the real FFB cache: activating copies the
 * override file into the cache folder under its official MD5(url) hash name
 * and adds the map.json entry; deactivating removes both, so the client falls
 * back to downloading the original asset again. The override file itself,
 * stored separately under the tool's own folder, is never touched.
 */
export async function setOverrideActive(
  cacheFolder: string,
  url: string,
  active: boolean
): Promise<void> {
  const index = await readIndex();
  const entry = index[url];
  if (!entry) return;

  if (active) {
    const format = entry.fileName.split(".").pop() || "png";
    const buffer = await fs.readFile(overrideFilePath(entry.fileName));
    await putImageInCache(cacheFolder, url, buffer, format);
  } else {
    await removeImageFromCache(cacheFolder, url);
  }

  entry.active = active;
  index[url] = entry;
  await writeIndex(index);
}
