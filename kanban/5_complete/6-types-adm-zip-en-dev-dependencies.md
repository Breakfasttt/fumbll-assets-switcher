---
id: 6
title: Déplacer @types/adm-zip en devDependencies
feature: project
type: chore
priority: basse
depends: []
---

## Objectif
Paquet de typage rangé dans `dependencies` (baseline `types-in-dev-deps`).

## Conception
`npm uninstall @types/adm-zip && npm install -D @types/adm-zip`, retirer l'entrée de baseline.

## Réalisé en plus
La baseline masquait toute nouvelle violation d'une règle déjà tolérée dans le même fichier
(découvert en ajoutant des clés i18n). Chaque entrée porte désormais un `count` exact :
une violation de plus échoue, une de moins demande de baisser `count`.

## Hors périmètre
—

## Checklist
- [x] déplacé
- [x] entrée baseline retirée
- [x] `npm run verify` OK
