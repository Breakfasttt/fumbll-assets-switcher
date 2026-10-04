---
id: 32
title: Passe accessibilité & i18n
feature: project
type: chore
priority: moyenne
depends: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
---

## Objectif
zéro `role="button"` sur div, `aria-label` sur toutes les icônes, `alt` sur images, toutes chaînes traduites (4 langues).

## Conception
Voir `docs/ux-research.md` (carte #32) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Règle arch : interdire `role="button"` et `<img` sans `alt`
- [ ] Parcours clavier complet de chaque onglet
- [ ] Vérif contrastes muted/faint ; clés i18n manquantes (fr/es/de)
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
