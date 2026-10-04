---
id: 30
title: Orphelins : segmented, sélection multiple, réactiver, undo
feature: orphans
type: ux
priority: moyenne
depends: [8, 14, 15]
---

## Objectif
nettoyage sûr et en masse.

## Conception
Voir `docs/ux-research.md` (carte #30) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] ToggleGroup "Customs inactifs | Fichiers du cache" avec compteurs
- [ ] Libellés lisibles (roster › position · type), URL en tooltip
- [ ] Sélection multiple (Shift/Ctrl+A) + barre d'actions flottante
- [ ] Réactiver ; supprimer → Undo (customs) / AlertDialog chiffré (fichiers cache)
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
