---
id: 33
title: Ranger dépendances et vérifier le poids du bundle
feature: project
type: chore
priority: basse
depends: [6, 32]
---

## Objectif
`@types/adm-zip` en devDependencies, retirer paquets morts, mesurer le bundle.

## Conception
Voir `docs/ux-research.md` (carte #33) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Déplacer/retirer dépendances
- [ ] `rollup-plugin-visualizer` ponctuel, vérifier tree-shaking lucide/radix
- [ ] Mettre à jour README (stack UI)
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
