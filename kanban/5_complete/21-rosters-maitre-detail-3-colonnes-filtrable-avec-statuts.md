---
id: 21
title: Rosters : maître-détail 3 colonnes filtrable avec statuts
feature: rosters
type: ux
priority: haute
depends: [15, 20]
---

## Objectif
remplacer Select + checkbox par listes filtrables (cmdk list) avec badges P/I et compteur par roster.

## Conception
Voir `docs/ux-research.md` (carte #21) et la section de la feature concernée.

## Réalisé
RosterView en grille 220 px | 200 px | détail : liste cmdk filtrable + ToggleGroup BB2025/Tous (remplace
Select + case), badge du nb d'images custom en jeu par roster (via l'index « utilisé par »), colonne
positions cmdk (navigation clavier) avec pastilles P/I, `EmptyState` sans sélection, skeletons au
chargement. 5 clés mortes retirées, 8 ajoutées. Validé : e2e (6/6) + capture `1-rosters.png`.
Reste : colonne détail étroite à 1280 px → le panneau latéral de `PlayerDetail` (pixel/crop) devra
devenir un dialog/drawer (#23, #26).

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] Colonne rosters (filtre + ToggleGroup BB2025/Tous + badges)
- [x] Colonne positions (pastilles P/I, flèches clavier, vrais boutons)
- [x] Breadcrumb dans header ; suppression `max-h-[calc(...)]` magique
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
