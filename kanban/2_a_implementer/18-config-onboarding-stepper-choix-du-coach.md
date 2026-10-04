---
id: 18
title: Config : onboarding stepper + choix du coach
feature: config
type: ux
priority: haute
depends: [8, 17]
---

## Objectif
remplacer l'auto-sélection du 1er coach et les alertes par un flux guidé et une page Paramètres.

## Conception
Voir `docs/ux-research.md` (carte #18) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] Stepper vivant 3–4 étapes
- [ ] Liste de coachs détectés (radio cards, nb d'entrées map.json)
- [ ] Erreurs inline (dossier invalide), Button loading pendant détection
- [ ] Page Paramètres : langue, cache, version
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
