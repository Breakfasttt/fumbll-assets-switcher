---
id: 1
title: Chemin du renderer faux en build de prod
feature: main-ipc
type: bug
priority: haute
depends: []
---

## Objectif
`npm run build && npm start` charge `dist/main/renderer/index.html` (inexistant) : page blanche.
`__dirname` vaut `dist/main/main`, Vite sort dans `dist/renderer`.

## Conception
`src/main/main.ts` `createWindow` : `path.join(__dirname, "../../renderer/index.html")`.
Découvert en route : `isDev = !app.isPackaged` valait `true` avec `npm start` (app jamais packagée) → chargeait
`localhost:5173`. Remplacé par le flag `--dev`, passé uniquement par `npm run dev`.
Vérifier aussi le chemin du preload (`dist/main/main/preload.js`, OK).

## Hors périmètre
Packaging (electron-builder) : carte séparée si besoin.

## Checklist
- [x] chemin corrigé
- [x] mode dev piloté par `--dev` (`npm run dev`), plus par `app.isPackaged`
- [x] `npm run build && npm start` charge `dist/renderer/index.html` (vérifié : renderer chargé, aucune erreur de chargement)
- [x] skill main-ipc à jour
- [x] `npm run verify` OK
