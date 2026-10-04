---
id: 23
title: CropDialog unifié sur react-easy-crop
feature: asset-editor
type: refactor
priority: haute
depends: [22]
---

## Objectif
même expérience de recadrage pour portraits et terrains, en Dialog, avec aperçu taille réelle.

## Conception
Voir `docs/ux-research.md` (carte #23) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Remplacer `CropEditor` par `react-easy-crop` + rendu canvas final
- [ ] Slider zoom Radix, molette centrée, flèches, Ajuster/Remplir
- [ ] Aperçu 1:1 et ×2 ; `Ctrl+Entrée` enregistrer, Échap annuler
- [ ] Retirer le panneau crop sticky de `PlayerDetail`
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
