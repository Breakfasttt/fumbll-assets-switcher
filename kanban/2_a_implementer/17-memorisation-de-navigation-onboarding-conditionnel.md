---
id: 17
title: Mémorisation de navigation + onboarding conditionnel
feature: config
type: ux
priority: haute
depends: [16]
---

## Objectif
rouvrir sur le dernier onglet/roster/position ; Config uniquement si cache absent/invalide.

## Conception
Voir `docs/ux-research.md` (carte #17) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `AppConfig.ui` (lastTab, lastRosterId, lastPosition, lastPitchKey) + `NavigationContext`
- [ ] Validation du cache au démarrage → onboarding sinon dernier onglet
- [ ] Onglets désactivés + tooltip tant que non configuré
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
