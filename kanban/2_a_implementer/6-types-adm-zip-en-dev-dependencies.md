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

## Hors périmètre
—

## Checklist
- [ ] déplacé
- [ ] entrée baseline retirée
- [ ] `npm run verify` OK
