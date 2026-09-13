import { app } from "electron";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { PackManifest, PackManifestEntry, PackSummary } from "../../shared/types";
import { listOverrides, overrideFilePath, registerActiveOverride, setOverrideActive } from "./overrides";

const PACKS_INDEX_FILE = "packs.json";

interface PackRecord {
  id: string;
  name: string;
  description?: string;
  importedAt: string;
  entries: PackManifestEntry[];
}

interface PacksIndex {
  activePackId: string | null;
  packs: Record<string, PackRecord>;
}

function packsDir(): string {
  return path.join(app.getPath("userData"), "packs");
}

function packFolder(packId: string): string {
  return path.join(packsDir(), packId);
}

function indexPath(): string {
  return path.join(packsDir(), PACKS_INDEX_FILE);
}

async function readIndex(): Promise<PacksIndex> {
  try {
    const raw = await fs.readFile(indexPath(), "utf8");
    return JSON.parse(raw) as PacksIndex;
  } catch {
    return { activePackId: null, packs: {} };
  }
}

async function writeIndex(index: PacksIndex): Promise<void> {
  await fs.mkdir(packsDir(), { recursive: true });
  await fs.writeFile(indexPath(), JSON.stringify(index, null, 2), "utf8");
}

export async function listPacks(): Promise<PackSummary[]> {
  const index = await readIndex();
  return Object.values(index.packs).map((record) => ({
    id: record.id,
    name: record.name,
    description: record.description,
    importedAt: record.importedAt,
    entryCount: record.entries.length,
    active: record.id === index.activePackId,
  }));
}

/** Bundles the currently active overrides into a shareable pack zip. */
export async function exportPack(name: string, description: string | undefined, destZipPath: string): Promise<void> {
  const overrides = await listOverrides();
  const activeEntries = Object.values(overrides).filter((entry) => entry.active);
  if (activeEntries.length === 0) {
    throw new Error("No active custom overrides to export");
  }

  const manifest: PackManifest = {
    formatVersion: 1,
    name,
    description,
    createdAt: new Date().toISOString(),
    entries: activeEntries.map((entry) => ({ url: entry.url, fileName: entry.fileName })),
  };

  const zip = new AdmZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  for (const entry of manifest.entries) {
    const buffer = await fs.readFile(overrideFilePath(entry.fileName));
    zip.addFile(entry.fileName, buffer);
  }
  await fs.writeFile(destZipPath, zip.toBuffer());
}

/** Registers a pack from a zip file. Does not activate it - import only makes it available to switch to. */
export async function importPack(zipPath: string): Promise<PackSummary> {
  const zipBuffer = await fs.readFile(zipPath);
  const zip = new AdmZip(zipBuffer);
  const manifestEntry = zip.getEntry("manifest.json");
  if (!manifestEntry) {
    throw new Error("Not a valid pack file (missing manifest.json)");
  }

  let manifest: PackManifest;
  try {
    manifest = JSON.parse(zip.readAsText(manifestEntry));
  } catch {
    throw new Error("Not a valid pack file (invalid manifest.json)");
  }
  if (manifest.formatVersion !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error("Unsupported pack format");
  }

  const id = randomUUID();
  await fs.mkdir(packFolder(id), { recursive: true });

  for (const entry of manifest.entries) {
    const fileEntry = zip.getEntry(entry.fileName);
    if (!fileEntry) {
      console.error(`importPack: file "${entry.fileName}" missing from pack zip, skipping`);
      continue;
    }
    await fs.writeFile(path.join(packFolder(id), entry.fileName), fileEntry.getData());
  }

  const record: PackRecord = {
    id,
    name: manifest.name,
    description: manifest.description,
    importedAt: new Date().toISOString(),
    entries: manifest.entries,
  };

  const index = await readIndex();
  index.packs[id] = record;
  await writeIndex(index);

  return { id, name: record.name, description: record.description, importedAt: record.importedAt, entryCount: record.entries.length, active: false };
}

/**
 * Activates a pack as a total replacement: deactivates every currently active
 * override (preserving the underlying files, exactly like a manual toggle-off),
 * then activates only this pack's entries.
 */
export async function activatePack(cacheFolder: string, packId: string): Promise<void> {
  const index = await readIndex();
  const pack = index.packs[packId];
  if (!pack) {
    throw new Error(`Unknown pack: ${packId}`);
  }

  const overrides = await listOverrides();
  for (const entry of Object.values(overrides)) {
    if (entry.active) {
      await setOverrideActive(cacheFolder, entry.url, false);
    }
  }

  for (const entry of pack.entries) {
    const sourcePath = path.join(packFolder(packId), entry.fileName);
    const targetPath = overrideFilePath(entry.fileName);
    try {
      await fs.access(targetPath);
    } catch {
      await fs.copyFile(sourcePath, targetPath);
    }
    await registerActiveOverride(cacheFolder, entry.url, entry.fileName, packId);
  }

  index.activePackId = packId;
  await writeIndex(index);
}

/**
 * Marks no pack as active, without touching any override's active/inactive
 * state - used when the user makes an ad-hoc override change while a pack was
 * active, so the "active pack" badge stops claiming the cache is a pure copy
 * of that pack (see useActivePackGuard.ts on the renderer side).
 */
export async function clearActivePack(): Promise<void> {
  const index = await readIndex();
  if (index.activePackId === null) return;
  index.activePackId = null;
  await writeIndex(index);
}

/**
 * Deletes a pack's own extracted storage and index entry. Never touches the
 * shared overridesDir() files - only deactivates this pack's entries there if
 * it was the active pack, so the user can still see/reactivate them manually
 * (consistent with the rest of the app never destroying a file on deactivation).
 */
export async function deletePack(cacheFolder: string, packId: string): Promise<void> {
  const index = await readIndex();
  const pack = index.packs[packId];
  if (!pack) return;

  if (index.activePackId === packId) {
    const overrides = await listOverrides();
    for (const entry of pack.entries) {
      if (overrides[entry.url]?.active) {
        await setOverrideActive(cacheFolder, entry.url, false);
      }
    }
    index.activePackId = null;
  }

  await fs.rm(packFolder(packId), { recursive: true, force: true });
  delete index.packs[packId];
  await writeIndex(index);
}
