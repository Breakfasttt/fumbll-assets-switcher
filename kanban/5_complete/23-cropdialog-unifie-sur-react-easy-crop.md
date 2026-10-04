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

## Réalisé
`shared/components/CropDialog.tsx` (react-easy-crop en Dialog, Slider, aperçus ×1/×2 — ×0,5 pour les
terrains —, Ctrl+Entrée, toast Annuler si remplacement) remplace `CropEditor` pour portraits ET terrains ;
`PlayerDetail` ne réserve plus de colonne pour le crop (la colonne détail retrouve sa largeur quand
l'éditeur pixel est fermé). Validé : e2e `crop-dialog` (PNG 95×147 vérifié sur disque) + capture
`card23-crop.png`.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] Remplacer `CropEditor` par `react-easy-crop` + rendu canvas final
- [x] Slider zoom Radix, molette centrée, flèches, Ajuster/Remplir
- [x] Aperçu 1:1 et ×2 ; `Ctrl+Entrée` enregistrer, Échap annuler
- [x] Retirer le panneau crop sticky de `PlayerDetail`
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
