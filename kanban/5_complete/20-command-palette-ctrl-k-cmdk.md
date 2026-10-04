---
id: 20
title: Command palette Ctrl+K (cmdk)
feature: shared-ui
type: feature
priority: moyenne
depends: [15, 19]
---

## Objectif
sauter à un roster / position / terrain / pack / action en 3 frappes.

## Conception
Voir `docs/ux-research.md` (carte #20) et la section de la feature concernée.

## Réalisé
`cmdk` + `shared/ui/command.tsx` + `shared/components/CommandPalette.tsx`, bouton « Rechercher… Ctrl+K »
en haut de la sidebar, raccourci dans l'aide. Navigation : `App.navigate` écrit `ui` puis remonte la vue.
Bug corrigé : deux `useSaveConfig` successifs s'écrasaient (lecture asynchrone de la config) → lecture
synchrone du cache. Terrains/packs absents de la palette (vues en refonte #27/#28). Validé : e2e
`command-palette` + capture `card20-palette.png`.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] `shared/ui/command.tsx` (cmdk + Dialog)
- [x] Sources : rosters, index positions (préchargement idle), terrains, packs, actions
- [x] Récents (5) persistés ; navigation via `NavigationContext`
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
