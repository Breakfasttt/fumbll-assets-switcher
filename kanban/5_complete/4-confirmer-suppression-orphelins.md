---
id: 4
title: Confirmer la suppression des orphelins
feature: orphans
type: bug
priority: haute
depends: []
---

## Objectif
Supprimer un override inactif ou un fichier du cache est irréversible et se fait en un clic, sans
confirmation ni garde de pack.

## Conception
`OrphansView` : `useConfirm` avant `deleteInactive` / `deleteOrphanFile`. Nouvelles clés i18n dans les 4 langues.
Pas de garde pack actif finalement : aucune des deux suppressions ne touche ce que le jeu charge
(override inactif = hors cache, fichier orphelin = hors `map.json`).

## Hors périmètre
Sélection multiple (refonte UX).

## Checklist
- [x] confirmation sur les deux suppressions (message spécifique, nom du fichier pour le cache)
- [x] clés i18n ×4 (`orphans.deleteInactiveConfirm`, `orphans.deleteFileConfirm`)
- [x] skill feature-orphans à jour
- [x] `npm run verify` OK
