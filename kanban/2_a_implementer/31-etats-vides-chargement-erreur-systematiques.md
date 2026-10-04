---
id: 31
title: États vides/chargement/erreur systématiques
feature: shared-ui
type: ux
priority: moyenne
depends: [13, 15]
---

## Objectif
chaque query a un skeleton au ratio, un EmptyState et un ErrorState avec Réessayer.

## Conception
Voir `docs/ux-research.md` (carte #31) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Inventaire des vues (5 onglets + panneaux)
- [ ] Skeletons vignettes ; EmptyState illustrés lucide
- [ ] ErrorState branché sur `refetch`
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
