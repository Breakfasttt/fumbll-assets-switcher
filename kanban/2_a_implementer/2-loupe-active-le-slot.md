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
- [ ] `stopPropagation` sur clic + Entrée/Espace du bouton loupe
- [ ] vérifié sur portrait, iconset, pitch
- [ ] `npm run verify` OK
