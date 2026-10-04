---
name: main-ipc
description: Process main Electron de fumbbl-assets-switcher — fenêtre, routeur IPC (main.ts), preload (window.fumbblApi), contrats partagés (src/shared/types.ts), services disque (config, overrides, packs, cache FFB map.json/MD5), API FUMBBL (XML rosters, CDN images, zips de pitch) et détection registre Windows. Charger avant d'ajouter/modifier un canal IPC, un type partagé, le stockage ou l'accès réseau/disque.
---

# Zone main-ipc

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/main/main.ts` | `createWindow` (1100×760, `contextIsolation`, dev = Vite 5173 + DevTools, prod = `loadFile`) ; **tous** les `ipcMain.handle` ; logique `fumbbl:fetchAssetImage` (cache FFB > CDN + écriture cache, sauf si override actif) |
| `src/main/preload.ts` | objet `api` exposé en `window.fumbblApi` via `contextBridge` ; `export type FumbblApi` |
| `src/main/config.ts` | `loadConfig` / `saveConfig` → `userData/config.json` (défaut `{cacheFolder: null, coachName: null, language: "en"}`) |
| `src/main/lib/cacheWriter.ts` | cache FFB : `computeHash` (MD5 URL), `map.json` (`readMapJson`/`writeMapJson`/`withMapJson` = file d'écriture par dossier), `validateCacheFolder`, `putImageInCache`, `removeImageFromCache`, `listCacheEntries`, `listOrphanCacheFiles`, `readCacheFileDataUrl`, `deleteOrphanCacheFile`, `readCachedImageDataUrl` |
| `src/main/lib/overrides.ts` | `userData/overrides/<MD5>.<ext>` + `overrides.json` : `listOverrides`, `listInactiveOverrides`, `getOverride`, `saveOverrideFile`, `overrideFilePath`, `registerActiveOverride`, `readOverrideImageDataUrl`, `showOverrideInFolder`, `deleteOverride`, `setOverrideActive` |
| `src/main/lib/packs.ts` | `userData/packs/<uuid>/` + `packs.json` `{activePackId, packs}` : `listPacks`, `exportPack`, `importPack`, `activatePack`, `clearActivePack`, `deletePack` |
| `src/main/lib/fumbblApi.ts` | `fetchRoster` (XML → `RosterInfo`), `fetchDivisionRosters`, `resolveAssetUrl`, `fetchAssetImageBuffer` / `fetchAssetImageDataUrl`, pitches : `parsePitchZipUrl`, `fetchZipBuffer` (cache de promesses), `fetchPitchImage` (lit `pitch.ini`) |
| `src/main/lib/registry.ts` | `reg query HKCU\Software\JavaSoft\Prefs` : `listFfbCoachNodes`, `readCoachIconCacheSetting`, `detectAllCoaches` (Windows uniquement) |
| `src/shared/types.ts` | `LANGUAGES`, `AppConfig`, `RosterPosition`, `RosterInfo`, `DivisionRosterSummary`, `WEATHER_CODES`, `CacheMapEntry`, `DetectedCoach`, `OverrideEntry`, `PackManifest*`, `PackSummary`, `OrphanCacheFile` |

## Canaux IPC (namespace:action)

`config:load|save` · `registry:detectCoaches` · `dialog:selectFolder|selectSaveFile|selectZipFile` ·
`cache:validateFolder|listEntries|openFolder|listOrphanFiles|readOrphanFile|deleteOrphanFile` · `shell:showFileInFolder` ·
`overrides:list|get|save|setActive|delete|readImage|listInactive|showInFolder` ·
`packs:list|export|import|activate|delete|clearActive` ·
`fumbbl:fetchRoster|fetchDivisionRosters|fetchAssetImage|weatherCodes`

**Ajouter un canal** : fonction dans `src/main/lib/*` → `ipcMain.handle("ns:action")` dans `main.ts` →
méthode typée dans `api` (`preload.ts`) → types dans `src/shared/types.ts` si besoin → `npm run check-arch` (`ipc-parity`).

## Mécanique override

Écrire un override = copier le fichier dans `userData/overrides/` (index `overrides.json`) **et** dans
le cache FFB sous `MD5(url)` en majuscules + entrée `map.json`. Désactiver = retirer du cache FFB
(le fichier reste dans `overrides/`, d'où les « overrides inactifs » de la feature orphans).

## Pièges connus

- **Bug prod** : `loadFile(path.join(__dirname, "../renderer/index.html"))` avec `__dirname = dist/main/main` → `dist/main/renderer/index.html`, alors que Vite sort dans `dist/renderer` (carte 1).
- **Bug packs** : copie conditionnelle dans `activatePack` (carte 3).
- `MIME_BY_EXT` dupliqué (`cacheWriter.ts`, `overrides.ts`, variante dans `fumbblApi.ts`).
- Canaux exposés jamais appelés : `listCacheEntries`, `listOverrides`, `weatherCodes` (baseline `ipc-unused`, carte 7).
- `@types/adm-zip` en `dependencies` (carte 6). Pas de packaging (electron-builder/forge absent).
- `src/shared` ne doit importer aucun paquet (chargé par les deux process).
