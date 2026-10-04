---
id: 9
title: Remplacer les couleurs en dur par des tokens
feature: shared-ui
type: ux
priority: moyenne
depends: []
---

## Objectif
`text-[#4ade80]` / `text-[#f43f5e]` dans ConfigView et RosterView (baseline `no-hardcoded-color`)
alors que `success` / `danger` existent.

## Conception
`text-success` / `text-danger`. Si la refonte des tokens (variables CSS) passe avant, l'appliquer
dans la foulée.

## Hors périmètre
Refonte de la palette.

## Checklist
- [x] 3 occurrences remplacées par `text-success` / `text-danger` (mêmes valeurs hex, aucun changement visuel)
- [x] entrées baseline retirées
- [x] skills feature-config / feature-rosters à jour
- [x] `npm run verify` OK
