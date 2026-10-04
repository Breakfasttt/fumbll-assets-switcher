---
id: 7
title: Supprimer le code mort (IPC, imports, clés i18n)
feature: main-ipc
type: chore
priority: basse
depends: []
---

## Objectif
Canaux exposés jamais appelés (`listCacheEntries`, `listOverrides`, `weatherCodes`), imports
inutilisés (`useRef`, `Button` dans AssetPanel/AtlasBreakdown), clé `atlas.loadImageError`
inutilisée, prop `hint` de `PromptPopover` jamais passée.

## Conception
Supprimer côté preload + main (sauf si une carte de refonte les réutilise : alors retirer de la
baseline au moment de l'usage). `npm run check-arch -- --rule=ipc-unused --verbose` pour la liste.

## Hors périmètre
—

## Checklist
- [x] canaux inutilisés retirés : `cache:listEntries` (+ `listCacheEntries`), `fumbbl:weatherCodes`. `overrides:list` **gardé** pour la couche données (#15), baseline réaffectée à #15
- [x] imports/clé/prop inutilisés retirés (`useRef`×2, `Button`, `atlas.loadImageError`×4, prop `hint`) ; `noUnusedLocals` + `noUnusedParameters` activés dans `tsconfig.base.json`
- [x] entrées baseline `i18n-unused-key` retirée, `ipc-unused` réduite à 1 (carte #15)
- [x] skills main-ipc / feature-asset-editor à jour
- [x] `npm run verify` OK
