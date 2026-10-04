---
id: 19
title: Raccourcis clavier maison + aide (touche ?)
feature: shared-ui
type: feature
priority: moyenne
depends: [16]
---

## Objectif
`useHotkey` (~40 lignes) et raccourcis globaux (Ctrl+K, Ctrl+1…5, Échap, Ctrl+Z global, ?).

## Conception
Voir `docs/ux-research.md` (carte #19) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Hook avec `enabled`, ignore inputs sauf opt-in
- [ ] Dialog "Raccourcis" avec `<Kbd>`
- [ ] Affichage des raccourcis dans tooltips/menus
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
