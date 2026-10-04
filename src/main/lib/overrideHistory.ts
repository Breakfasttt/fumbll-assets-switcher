import { app } from "electron";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { computeHash } from "./cacheWriter";
import { OverrideEntry, OverrideHistoryVersion } from "../../shared/types";

/** Versions kept per URL; older ones are pruned on each archive. */
const MAX_VERSIONS_PER_URL = 5;
const META_FILE = "meta.json";
const VERSION_ID_RE = /^\d{13}-[0-9a-f]{8}$/;

interface VersionMeta extends OverrideEntry {
  archivedAt: string;
}

/**
 * Previous versions of an override live next to the overrides themselves:
 * `overrides/.history/<MD5 url>/<versionId>/{meta.json, <fileName>}`. Each
 * version is a full copy of the image, since the live file is overwritten
 * (same `<MD5>.<ext>` name) or deleted by the mutation being archived.
 */
function historyDir(url: string): string {
  return path.join(app.getPath("userData"), "overrides", ".history", computeHash(url));
}

function versionDir(url: string, versionId: string): string {
  if (!VERSION_ID_RE.test(versionId)) {
    throw new Error(`Invalid override version id: ${versionId}`);
  }
  return path.join(historyDir(url), versionId);
}

// Version ids sort chronologically as plain strings: a zero-padded millisecond
// timestamp, bumped when two archives land in the same millisecond, plus a
// random suffix so ids never collide across app restarts.
let lastTimestamp = 0;

function newVersionId(): string {
  const now = Date.now();
  lastTimestamp = now > lastTimestamp ? now : lastTimestamp + 1;
  return `${String(lastTimestamp).padStart(13, "0")}-${randomBytes(4).toString("hex")}`;
}

async function listVersionIds(url: string): Promise<string[]> {
  try {
    const names = await fs.readdir(historyDir(url));
    return names.filter((name) => VERSION_ID_RE.test(name)).sort();
  } catch {
    return [];
  }
}

/**
 * Archives `entry` (index metadata + a copy of its stored file) and returns
 * the new version id, or null if the file is missing on disk (nothing
 * restorable to keep). Prunes the oldest versions beyond the per-URL cap.
 */
export async function archiveOverrideVersion(entry: OverrideEntry, sourceFilePath: string): Promise<string | null> {
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(sourceFilePath);
  } catch {
    return null;
  }

  const versionId = newVersionId();
  const dir = versionDir(entry.url, versionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, entry.fileName), buffer);
  const meta: VersionMeta = { ...entry, archivedAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(meta, null, 2), "utf8");

  const ids = await listVersionIds(entry.url);
  for (const oldId of ids.slice(0, Math.max(0, ids.length - MAX_VERSIONS_PER_URL))) {
    await fs.rm(path.join(historyDir(entry.url), oldId), { recursive: true, force: true });
  }

  return versionId;
}

/** Reads one archived version (metadata + image bytes); throws if it does not exist. */
export async function readOverrideVersion(
  url: string,
  versionId: string
): Promise<{ entry: OverrideEntry; buffer: Buffer }> {
  const dir = versionDir(url, versionId);
  const meta = JSON.parse(await fs.readFile(path.join(dir, META_FILE), "utf8")) as VersionMeta;
  const buffer = await fs.readFile(path.join(dir, meta.fileName));
  return { entry: { url: meta.url, fileName: meta.fileName, active: meta.active, packId: meta.packId }, buffer };
}

export async function dropOverrideVersion(url: string, versionId: string): Promise<void> {
  await fs.rm(versionDir(url, versionId), { recursive: true, force: true });
}

/** Archived versions of `url`, newest first. */
export async function listOverrideHistory(url: string): Promise<OverrideHistoryVersion[]> {
  const versions: OverrideHistoryVersion[] = [];
  for (const versionId of (await listVersionIds(url)).reverse()) {
    try {
      const raw = await fs.readFile(path.join(historyDir(url), versionId, META_FILE), "utf8");
      const meta = JSON.parse(raw) as VersionMeta;
      versions.push({ versionId, archivedAt: meta.archivedAt, fileName: meta.fileName, active: meta.active, packId: meta.packId });
    } catch {
      // half-written or corrupted version: not restorable, skip it
    }
  }
  return versions;
}
