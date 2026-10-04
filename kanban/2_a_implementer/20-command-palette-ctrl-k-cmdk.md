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

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `shared/ui/command.tsx` (cmdk + Dialog)
- [ ] Sources : rosters, index positions (préchargement idle), terrains, packs, actions
- [ ] Récents (5) persistés ; navigation via `NavigationContext`
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
