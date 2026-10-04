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
Vérifier aussi le chemin du preload (`dist/main/main/preload.js`, OK).

## Hors périmètre
Packaging (electron-builder) : carte séparée si besoin.

## Checklist
- [ ] chemin corrigé
- [ ] `npm run build && npm start` affiche l'app
- [ ] `npm run verify` OK
