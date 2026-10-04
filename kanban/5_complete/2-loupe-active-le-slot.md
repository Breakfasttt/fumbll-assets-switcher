---
id: 2
title: Cliquer la loupe active aussi le slot
feature: asset-editor
type: bug
priority: haute
depends: []
---

## Objectif
`ImageZoomButton` est imbriqué dans les slots cliquables sans `stopPropagation` : ouvrir le zoom
bascule l'image active (portraits, iconsets et pitches).

## Conception
Dans `shared/components/ImageZoomModal.tsx`, le trigger stoppe la propagation du clic et du keydown.
Corrige d'un coup `AssetPanel` (AssetSlot, DropSlot) et `PitchView` (PitchWeatherSlot).
La refonte du slot (carte de recherche UX) supprimera l'imbrication `div role=button` > `button`.

## Hors périmètre
Refonte visuelle du slot.

## Checklist
- [x] `stopPropagation` (clic + keydown) à la racine d'`ImageZoomButton`, couvre aussi le contenu de la Dialog (portal)
- [x] point unique couvrant portrait, iconset et pitch (test manuel à faire à la validation)
- [x] skills asset-editor / pitches / shared-ui à jour
- [x] `npm run verify` OK
