---
id: 5
title: « Répéter une variante » écrase l'override sans prévenir
feature: iconset
type: bug
priority: moyenne
depends: []
---

## Objectif
`applyUniformRow` part de l'image active (parfois le défaut) et remplace silencieusement un override
custom existant.

## Conception
Si un override existe et n'est pas la source, demander confirmation (`useConfirm`) ; indiquer dans
le popover quelle image sert de source (défaut ou custom).

## Hors périmètre
Refonte de l'éditeur.

## Checklist
- [ ] source affichée dans le popover
- [ ] confirmation si écrasement d'un override
- [ ] `npm run verify` OK
