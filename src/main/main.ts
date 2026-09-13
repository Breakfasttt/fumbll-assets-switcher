import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import * as path from "path";
import { loadConfig, saveConfig } from "./config";
import { detectAllCoaches } from "./lib/registry";
import { listCacheEntries, validateCacheFolder, readCachedImageDataUrl } from "./lib/cacheWriter";
import {
  listOverrides,
  getOverride,
  saveOverrideFile,
  setOverrideActive,
  deleteOverride,
  readOverrideImageDataUrl,
} from "./lib/overrides";
import { fetchRoster, fetchDivisionRosters, fetchAssetImageDataUrl } from "./lib/fumbblApi";
import { WEATHER_CODES } from "../shared/types";

const isDev = !app.isPackaged;

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
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
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

ipcMain.handle("cache:validateFolder", (_e, folder: string) => validateCacheFolder(folder));
ipcMain.handle("cache:listEntries", (_e, folder: string) => listCacheEntries(folder));
ipcMain.handle("cache:openFolder", (_e, folder: string) => shell.openPath(folder));

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

ipcMain.handle("fumbbl:fetchRoster", (_e, rosterId: number) => fetchRoster(rosterId));
ipcMain.handle("fumbbl:fetchDivisionRosters", (_e, divisionId: number) => fetchDivisionRosters(divisionId));
ipcMain.handle("fumbbl:weatherCodes", () => WEATHER_CODES);

// Prefer the asset already sitting in the FFB client's own Local Icon Cache
// (the real client downloaded it before) over hitting the FUMBBL CDN again.
// Skipped once an override is active for this URL: at that point the cache
// entry is our own custom file, not the original FUMBBL asset, so reading it
// here would show the custom image in the "default" slot.
ipcMain.handle("fumbbl:fetchAssetImage", async (_e, folder: string | null, url: string) => {
  if (folder) {
    const override = await getOverride(url);
    if (!override?.active) {
      const cached = await readCachedImageDataUrl(folder, url);
      if (cached) return cached;
    }
  }
  return fetchAssetImageDataUrl(url);
});
