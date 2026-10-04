---
id: 16
title: Shell : sidebar à badges, carte pack actif, status bar
feature: shared-ui
type: ux
priority: haute
depends: [8, 15]
---

## Objectif
navigation accessible, état global visible partout (§3.1).

## Conception
Voir `docs/ux-research.md` (carte #16) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `<nav>` boutons + icônes lucide + `aria-current`, badges compteurs (queries)
- [ ] Carte "Pack actif" + action Détacher
- [ ] Status bar cache (santé, chemin tronqué, coach, nb overrides, Ouvrir)
- [ ] `minWidth/minHeight` fenêtre côté main
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
