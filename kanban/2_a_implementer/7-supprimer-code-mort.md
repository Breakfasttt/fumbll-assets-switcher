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
- [ ] canaux inutilisés retirés (preload + main)
- [ ] imports/clé/prop inutilisés retirés
- [ ] entrées baseline `ipc-unused` et `i18n-unused-key` retirées
- [ ] skills main-ipc / shared-ui à jour
- [ ] `npm run verify` OK
