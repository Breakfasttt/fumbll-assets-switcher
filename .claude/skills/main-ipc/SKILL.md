---
name: main-ipc
description: Process main Electron de fumbbl-assets-switcher — fenêtre, routeur IPC (main.ts), preload (window.fumbblApi), contrats partagés (src/shared/types.ts), services disque (config, overrides, packs, cache FFB map.json/MD5), API FUMBBL (XML rosters, CDN images, zips de pitch) et détection registre Windows. Charger avant d'ajouter/modifier un canal IPC, un type partagé, le stockage ou l'accès réseau/disque.
---

# Zone main-ipc

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/main/main.ts` | `createWindow` (1100×760, `contextIsolation`) ; mode dev **uniquement** si lancé avec `--dev` (`npm run dev`) = Vite 5173 + DevTools, sinon `loadFile(dist/renderer/index.html)` (`npm start` après `npm run build`) ; **tous** les `ipcMain.handle` ; logique `fumbbl:fetchAssetImage` (cache FFB > CDN + écriture cache, sauf si override actif) |
| `src/main/preload.ts` | objet `api` exposé en `window.fumbblApi` via `contextBridge` ; `export type FumbblApi` |
| `src/main/config.ts` | `loadConfig` / `saveConfig` → `userData/config.json` (défaut `{cacheFolder: null, coachName: null, language: "en"}`) |
| `src/main/lib/cacheWriter.ts` | cache FFB : `computeHash` (MD5 URL), `map.json` (`readMapJson`/`writeMapJson`/`withMapJson` = file d'écriture par dossier), `validateCacheFolder`, `putImageInCache`, `removeImageFromCache`, `listOrphanCacheFiles`, `readCacheFileDataUrl`, `deleteOrphanCacheFile` (→ corbeille, retourne `trashId`), `restoreOrphanCacheFile`, `purgeCacheTrash`, `readCachedImageDataUrl` |
| `src/main/lib/overrides.ts` | `userData/overrides/<MD5>.<ext>` + `overrides.json` : `listOverrides`, `listInactiveOverrides`, `getOverride`, `saveOverrideFile`, `overrideFilePath`, `registerActiveOverride`, `readOverrideImageDataUrl`, `showOverrideInFolder`, `deleteOverride`, `setOverrideActive`, `restoreOverride` (save/delete/register archivent la version remplacée) |
| `src/main/lib/overrideHistory.ts` | historique d'override `overrides/.history/<MD5 url>/<versionId>/` : `archiveOverrideVersion`, `readOverrideVersion`, `dropOverrideVersion`, `listOverrideHistory` (cap 5/URL) |
| `src/main/lib/packs.ts` | `userData/packs/<uuid>/` + `packs.json` `{activePackId, packs}` : `listPacks`, `exportPack`, `importPack`, `activatePack`, `clearActivePack`, `deletePack` |
| `src/main/lib/fumbblApi.ts` | `fetchRoster` (XML → `RosterInfo`), `fetchDivisionRosters`, `resolveAssetUrl`, `fetchAssetImageBuffer` / `fetchAssetImageDataUrl`, pitches : `parsePitchZipUrl`, `fetchZipBuffer` (cache de promesses), `fetchPitchImage` (lit `pitch.ini`) |
| `src/main/lib/registry.ts` | `reg query HKCU\Software\JavaSoft\Prefs` : `listFfbCoachNodes`, `readCoachIconCacheSetting`, `detectAllCoaches` (Windows uniquement) |
| `src/shared/types.ts` | `LANGUAGES`, `AppConfig`, `RosterPosition`, `RosterInfo`, `DivisionRosterSummary`, `WEATHER_CODES`, `CacheMapEntry`, `DetectedCoach`, `OverrideEntry`, `OverrideSaveResult` (`undoVersionId?`), `OverrideHistoryVersion`, `PackManifest*`, `PackSummary`, `OrphanCacheFile` |

## Canaux IPC (namespace:action)

`config:load|save` · `registry:detectCoaches` · `dialog:selectFolder|selectSaveFile|selectZipFile` ·
`cache:validateFolder|openFolder|listOrphanFiles|readOrphanFile|deleteOrphanFile|restoreOrphanFile` · `shell:showFileInFolder` ·
`overrides:list|get|save|setActive|delete|readImage|listInactive|showInFolder|restore|history` ·
`packs:list|export|import|activate|delete|clearActive` ·
`fumbbl:fetchRoster|fetchDivisionRosters|fetchAssetImage`

**Ajouter un canal** : fonction dans `src/main/lib/*` → `ipcMain.handle("ns:action")` dans `main.ts` →
méthode typée dans `api` (`preload.ts`) → types dans `src/shared/types.ts` si besoin → `npm run check-arch` (`ipc-parity`).

## Mécanique override

Écrire un override = copier le fichier dans `userData/overrides/` (index `overrides.json`) **et** dans
le cache FFB sous `MD5(url)` en majuscules + entrée `map.json`. Désactiver = retirer du cache FFB
(le fichier reste dans `overrides/`, d'où les « overrides inactifs » de la feature orphans).

## Undo (carte #14) : historique et corbeille

- `saveOverrideFile`, `deleteOverride` et `registerActiveOverride` (seulement si l'entrée remplacée est perso, pas un pack) copient d'abord l'entrée courante (fichier + `meta.json`) dans `overrides/.history/<MD5 url>/<versionId>/` ; `versionId` = timestamp 13 chiffres monotone + suffixe hex, trié comme chaîne ; 5 versions max par URL. `setOverrideActive` n'archive pas (undo = re-toggle).
- Retours : `saveOverride` → `OverrideSaveResult` (`undoVersionId?`), `deleteOverride` → `versionId | null`. `restoreOverride(folder, url, versionId)` archive l'état courant (`undoVersionId` = redo), réécrit fichier + index, met le cache FFB d'accord avec `active`, puis retire la version restaurée de l'historique.
- `deleteOrphanCacheFile` déplace le fichier dans `userData/trash/cache/<trashId>/` (+ `meta.json` avec le dossier cache d'origine ; copie + unlink si autre disque) ; `restoreOrphanCacheFile` le remet sauf si un fichier du même nom a réapparu (→ `false`). `purgeCacheTrash` (au `whenReady`) supprime les éléments de plus de 24 h.

## Pièges connus

- `__dirname` du main compilé = `dist/main/main` (rootDir `src`) : chemins relatifs à calculer depuis là.
- Lancer Electron depuis le terminal de VS Code / Claude Code : `ELECTRON_RUN_AS_NODE=1` est hérité → `app` undefined. Utiliser `env -u ELECTRON_RUN_AS_NODE npx electron .`.
- Une seule entrée par URL dans `overrides.json`. Fichiers d'un pack activé : `overrides/pack-<packId>-<MD5>.<ext>` (`packOverrideFileName`), jamais en collision avec un override perso `<MD5>.<ext>` ; l'export retire le préfixe (`PACK_FILE_PREFIX_RE`). Activer un pack remplace l'entrée perso de l'index (fichier perso conservé sur disque, version perso archivée dans `.history`, restaurable via `overrides:restore`).
- `MIME_BY_EXT` dupliqué (`cacheWriter.ts`, `overrides.ts`, variante dans `fumbblApi.ts`).
- `overrides:list` (couche données #15), `overrides:restore|history` et `cache:restoreOrphanFile` (toasts « Annuler » #8) exposés mais pas encore appelés : baseline `ipc-unused` (carte #8, count 4).
- Une version perso archivée par l'activation d'un pack est **inactive** (`activatePack` désactive tout avant `registerActiveOverride`) : la restaurer la remet inactive.
- `noUnusedLocals` / `noUnusedParameters` actifs (`tsconfig.base.json`) : le code mort ne compile plus.
- Pas de packaging (electron-builder/forge absent).
- `src/shared` ne doit importer aucun paquet (chargé par les deux process).
