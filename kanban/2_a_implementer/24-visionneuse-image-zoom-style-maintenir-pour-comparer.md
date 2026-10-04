---
id: 24
title: Visionneuse image : zoom stylé + maintenir pour comparer
feature: asset-editor
type: ux
priority: moyenne
depends: [22]
---

## Objectif
modal pan/zoom avec Slider, boutons −/+/1:1/Ajuster, Espace maintenu = version alternative, "Afficher dans le dossier".

## Conception
Voir `docs/ux-research.md` (carte #24) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Refonte `ImageZoomModal` sur Slider + IconButtons
- [ ] Prop `compareSrc` (défaut ↔ custom)
- [ ] Damier + rendu pixelated conditionnel
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
