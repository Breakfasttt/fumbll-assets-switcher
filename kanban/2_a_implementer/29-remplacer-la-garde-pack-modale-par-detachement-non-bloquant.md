---
id: 29
title: Remplacer la garde pack modale par détachement non bloquant
feature: packs
type: ux
priority: haute
depends: [16, 28]
---

## Objectif
plus de confirmation à chaque modif ; toast warning + Annuler à la première modif ad hoc.

## Conception
Voir `docs/ux-research.md` (carte #29) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `useActivePackGuard` → `useDetachPackOnEdit` (lecture cache query)
- [ ] Toast "Pack détaché" + Annuler (réactive le pack)
- [ ] Mise à jour carte sidebar en temps réel
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
