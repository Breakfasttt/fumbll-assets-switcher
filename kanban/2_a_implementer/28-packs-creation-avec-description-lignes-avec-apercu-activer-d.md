---
id: 28
title: Packs : création avec description, lignes avec aperçu, activer/désactiver
feature: packs
type: ux
priority: moyenne
depends: [8, 15, 16]
---

## Objectif
exposer description (IPC existant), aperçu mosaïque, désactivation, feedback async.

## Conception
Voir `docs/ux-research.md` (carte #28) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Dialog "Créer un pack" (nom, description, récap par type)
- [ ] `PackRow` mosaïque + état + menu ⋯ ; Désactiver = `clearActivePack`
- [ ] Import par bouton et drop .zip ; `toast.promise` pour import/export/activation
- [ ] AlertDialog chiffré sur suppression et sur activation écrasant des customs
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
