---
id: 25
title: Grille atlas iconset accessible + "répéter variante" avec undo
feature: iconset
type: ux
priority: haute
depends: [14, 22]
---

## Objectif
tableau 4×N traduit, cellules boutons navigables, action par ligne, plus de popover.

## Conception
Voir `docs/ux-research.md` (carte #25) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Colonnes/lignes traduites (supprimer `ATLAS_COLUMN_LABELS` anglais)
- [ ] Cellules `<button>` 56 px, focus grille (flèches), cellule en édition surlignée
- [ ] Action ligne "Utiliser pour toutes les variantes" → toast Annuler
- [ ] Indicateur cellule modifiée vs défaut
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
