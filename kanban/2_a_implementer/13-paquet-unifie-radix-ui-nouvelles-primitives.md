---
id: 13
title: Paquet unifié radix-ui + nouvelles primitives
feature: shared-ui
type: refactor
priority: haute
depends: [12]
---

## Objectif
migrer vers `radix-ui` et créer tooltip, slider, toggle-group, alert-dialog, dropdown-menu, input, textarea, badge, skeleton, kbd, icon-button, empty-state.

## Conception
Voir `docs/ux-research.md` (carte #13) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Migrer imports des 5 composants existants, retirer `@radix-ui/react-*`
- [ ] Ajouter les primitives + `tw-animate-css`
- [ ] `IconButton` impose `aria-label` (type requis) + Tooltip
- [ ] `extendTailwindMerge` avec les tokens custom
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
