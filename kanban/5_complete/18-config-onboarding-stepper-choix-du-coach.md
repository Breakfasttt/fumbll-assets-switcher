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

## Réalisé
ConfigView en deux états (onboarding stepper / page Paramètres), détection en choix radio sans
enregistrement implicite (le 1er coach n'est plus pris d'office), erreur de dossier manuel inline,
confirmation AlertDialog pour changer un dossier valide. 6 clés i18n mortes retirées, 17 ajoutées.
Pas de « nb d'images » par coach (nécessiterait un IPC de comptage, peu utile). Validé : e2e
`onboarding` (registre réel en lecture seule, écriture dans le bac à sable) + captures `card18-*.png`.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] Stepper vivant 3–4 étapes
- [x] Liste de coachs détectés (radio cards, nb d'entrées map.json)
- [x] Erreurs inline (dossier invalide), Button loading pendant détection
- [x] Page Paramètres : langue, cache, version
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
