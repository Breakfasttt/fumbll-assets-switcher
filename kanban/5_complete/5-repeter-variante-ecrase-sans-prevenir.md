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
- [x] source affichée dans le popover (`atlas.sourceDefault` / `atlas.sourceCustom`) — prop `imageSource` passée par AssetPanel
- [x] confirmation (`atlas.overwriteCustomConfirm`) si la source est le défaut et qu'un override existe — lu via IPC `getOverride` au clic (v1 reposait sur l'état d'AssetPanel : retour utilisateur « pas de confirmation »)
- [x] skill feature-iconset à jour
- [x] `npm run verify` OK
