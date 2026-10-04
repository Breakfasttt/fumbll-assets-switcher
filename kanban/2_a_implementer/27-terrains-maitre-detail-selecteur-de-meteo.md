---
id: 27
title: Terrains : maître-détail + sélecteur de météo
feature: pitches
type: ux
priority: moyenne
depends: [22, 23]
---

## Objectif
une météo à la fois via ToggleGroup/filmstrip, liste filtrable groupée, "appliquer à toutes les météos".

## Conception
Voir `docs/ux-research.md` (carte #27) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Liste filtrable (Rosters/Spéciaux/Système) avec badges
- [ ] Filmstrip 5 météos avec pastille custom
- [ ] `AssetSlotPair` ratio 782/452 ; action "toutes les météos" + Undo
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
