---
id: 26
title: Éditeur pixel v2 : outils, undo/redo, pipette, palette du sprite
feature: iconset
type: feature
priority: haute
depends: [25, 19]
---

## Objectif
rendre la retouche réaliste (conventions Aseprite/Piskel).

## Conception
Voir `docs/ux-research.md` (carte #26) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Outils Crayon/Gomme/Pipette (B/E/I, Alt = pipette temporaire), clic droit = secondaire
- [ ] Pile undo/redo (Ctrl+Z/Y, cap 50)
- [ ] Palette extraite du sprite + récentes + picker `react-colorful` (hex)
- [ ] Zoom Slider + grille + aperçu 1:1/×2 ; navigation cellules ◀ ▶ ; garde modifs non enregistrées
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
