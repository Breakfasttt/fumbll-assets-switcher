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
`OrphansView` : `useConfirm` avant `deleteInactive` / `deleteOrphanFile` (+ `useActivePackGuard`
pour les overrides). Nouvelles clés i18n dans les 4 langues.

## Hors périmètre
Sélection multiple (refonte UX).

## Checklist
- [ ] confirmation sur les deux suppressions
- [ ] clés i18n ×4
- [ ] `npm run verify` OK
