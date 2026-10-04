---
id: 22
title: AssetSlotPair unifié (fix loupe, toggle Défaut/Custom explicite)
feature: asset-editor
type: bug
priority: haute
depends: [13, 8, 15]
---

## Objectif
un composant partagé portrait/iconset/terrain ; activation par ToggleGroup "En jeu" ; corrige le bug loupe et les boutons imbriqués.

## Conception
Voir `docs/ux-research.md` (carte #22) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Extraire `useAssetSlot(url)` (queries/mutations) ; supprimer duplication `PitchWeatherSlot`
- [ ] Vignettes non cliquables, damier, skeleton au ratio, label "En jeu"
- [ ] Dropzone + "Choisir un fichier…", remplacement avec Undo
- [ ] Barre d'actions IconButton + menu ⋯ ; avertissement "partagé par N rosters"
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
