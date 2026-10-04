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

## Réalisé
`shared/hooks/useHotkey.ts` (maison, combos `ctrl+k`/`escape`/`?`, ignoré en saisie), `ShortcutsDialog`
(touche `?` ou bouton de la status bar), `Ctrl+1…5` onglets, `Ctrl+Z` = `runLastUndo()` (rejoue le dernier
« Annuler » encore affiché). Raccourcis affichés dans les tooltips de la sidebar. Validé par e2e (Ctrl+2/5,
?, Échap, Ctrl+Z après suppression).

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] Hook avec `enabled`, ignore inputs sauf opt-in
- [x] Dialog "Raccourcis" avec `<Kbd>`
- [x] Affichage des raccourcis dans tooltips/menus
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
