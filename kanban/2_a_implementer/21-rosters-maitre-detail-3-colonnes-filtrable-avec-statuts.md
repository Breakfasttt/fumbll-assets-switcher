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

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Colonne rosters (filtre + ToggleGroup BB2025/Tous + badges)
- [ ] Colonne positions (pastilles P/I, flèches clavier, vrais boutons)
- [ ] Breadcrumb dans header ; suppression `max-h-[calc(...)]` magique
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
