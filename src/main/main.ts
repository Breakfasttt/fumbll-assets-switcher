import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import * as path from "path";
import { loadConfig, saveConfig } from "./config";
import { detectAllCoaches } from "./lib/registry";
import {
  validateCacheFolder,
  readCachedImageDataUrl,
  listOrphanCacheFiles,
  readCacheFileDataUrl,
  deleteOrphanCacheFile,
  putImageInCache,
} from "./lib/cacheWriter";
import {
  listOverrides,
  listInactiveOverrides,
  getOverride,
  saveOverrideFile,
  setOverrideActive,
  deleteOverride,
  readOverrideImageDataUrl,
  showOverrideInFolder,
} from "./lib/overrides";
import { fetchRoster, fetchDivisionRosters, fetchAssetImageDataUrl, fetchAssetImageBuffer } from "./lib/fumbblApi";
import { listPacks, exportPack, importPack, activatePack, deletePack, clearActivePack } from "./lib/packs";

// Dev mode only when launched by `npm run dev` (Vite server); `npm start` serves the built renderer.
const isDev = process.argv.includes("--dev");

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // __dirname = dist/main/main (tsc rootDir src), Vite outputs to dist/renderer.
    win.loadFile(path.join(__dirname, "../../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("config:load", () => loadConfig());
ipcMain.handle("config:save", (_e, config) => saveConfig(config));

ipcMain.handle("registry:detectCoaches", () => detectAllCoaches());

ipcMain.handle("dialog:selectFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:selectSaveFile", async (_e, defaultFileName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultFileName,
    filters: [{ name: "FUMBBL Asset Pack", extensions: ["zip"] }],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle("dialog:selectZipFile", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "FUMBBL Asset Pack", extensions: ["zip"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("cache:validateFolder", (_e, folder: string) => validateCacheFolder(folder));
ipcMain.handle("cache:openFolder", (_e, folder: string) => shell.openPath(folder));
ipcMain.handle("shell:showFileInFolder", (_e, folder: string, fileName: string) =>
  shell.showItemInFolder(path.join(folder, fileName))
);

ipcMain.handle("overrides:list", () => listOverrides());
ipcMain.handle("overrides:get", (_e, url: string) => getOverride(url));
ipcMain.handle(
  "overrides:save",
  (_e, folder: string, url: string, base64Data: string, format: string) =>
    saveOverrideFile(folder, url, Buffer.from(base64Data, "base64"), format)
);
ipcMain.handle(
  "overrides:setActive",
  (_e, folder: string, url: string, active: boolean) => setOverrideActive(folder, url, active)
);
ipcMain.handle("overrides:delete", (_e, folder: string, url: string) => deleteOverride(folder, url));
ipcMain.handle("overrides:readImage", (_e, url: string) => readOverrideImageDataUrl(url));
ipcMain.handle("overrides:listInactive", () => listInactiveOverrides());
ipcMain.handle("overrides:showInFolder", (_e, url: string) => showOverrideInFolder(url));

ipcMain.handle("cache:listOrphanFiles", (_e, folder: string) => listOrphanCacheFiles(folder));
ipcMain.handle("cache:readOrphanFile", (_e, folder: string, fileName: string) => readCacheFileDataUrl(folder, fileName));
ipcMain.handle("cache:deleteOrphanFile", (_e, folder: string, fileName: string) => deleteOrphanCacheFile(folder, fileName));

ipcMain.handle("packs:list", () => listPacks());
ipcMain.handle(
  "packs:export",
  (_e, name: string, description: string | undefined, destZipPath: string) =>
    exportPack(name, description, destZipPath)
);
ipcMain.handle("packs:import", (_e, zipPath: string) => importPack(zipPath));
ipcMain.handle("packs:activate", (_e, folder: string, packId: string) => activatePack(folder, packId));
ipcMain.handle("packs:delete", (_e, folder: string, packId: string) => deletePack(folder, packId));
ipcMain.handle("packs:clearActive", () => clearActivePack());

ipcMain.handle("fumbbl:fetchRoster", (_e, rosterId: number) => fetchRoster(rosterId));
ipcMain.handle("fumbbl:fetchDivisionRosters", (_e, divisionId: number) => fetchDivisionRosters(divisionId));

// Prefer the asset already sitting in the FFB client's own Local Icon Cache
// (the real client downloaded it before) over hitting the FUMBBL CDN again.
// Skipped once an override is active for this URL: at that point the cache
// entry is our own custom file, not the original FUMBBL asset, so reading it
// here would show the custom image in the "default" slot.
// When neither is available, we hit the FUMBBL CDN ourselves - and since we're
// already downloading the original asset, we persist it into the real cache
// folder too, exactly like the official client would, so it's there next time
// and the "default" slot never re-downloads it.
ipcMain.handle("fumbbl:fetchAssetImage", async (_e, folder: string | null, url: string) => {
  if (folder) {
    const override = await getOverride(url);
    if (!override?.active) {
      const cached = await readCachedImageDataUrl(folder, url);
      if (cached) return cached;

      const image = await fetchAssetImageBuffer(url);
      if (!image) return null;
      await putImageInCache(folder, url, image.buffer, image.format);
      return readCachedImageDataUrl(folder, url);
    }
  }
  return fetchAssetImageDataUrl(url);
});
