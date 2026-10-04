---
name: feature-iconset
description: Feature "iconset" de fumbbl-assets-switcher — découpage d'un iconset (sprite sheet pixel art 4 colonnes home/away idle/moving × N lignes), « répéter une variante » sur toutes les lignes, éditeur pixel d'une cellule. Charger avant de toucher AtlasBreakdown, PixelEditor, le format atlas ou l'édition pixel.
---

# Feature iconset

Un iconset FUMBBL est un atlas : **4 colonnes** (Home idle, Home moving, Away idle, Away moving)
× **N lignes** (variantes). Taille de cellule = largeur / 4 (≈ 30 px).

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/iconset/AtlasBreakdown.tsx` | prop `imageSource` (default/custom) ; `canvasAtlasFromImage` (image → canvas + `cellSize` + `rows`), `canvasToPngBase64`, `ATLAS_COLUMN_LABELS` ; grille de vignettes 48 px cliquables (ouvre l'éditeur) ; Popover « Répéter une variante » (`applyUniformRow`) |
| `src/renderer/features/iconset/PixelEditor.tsx` | types `AtlasInfo`, `EditorTarget` ; éditeur d'une cellule : Selects ligne/colonne, canvas zoom ×16, palette fixe 12 couleurs, gomme, « Enregistrer l'atlas » |
| `src/renderer/features/iconset/index.ts` | API publique : `AtlasBreakdown`, `PixelEditor`, `AtlasInfo`, `EditorTarget` |

Utilisé par : `asset-editor` (AtlasBreakdown sous les slots) et `rosters` (PixelEditor dans le panneau latéral).

## Comportement

- Sauvegarde = PNG de l'atlas complet → `fumbblApi.saveOverride(cacheFolder, url, base64, "png")` → `clearActivePack()` → `onSaved()` (refresh du panel).
- Garde pack actif avant chaque sauvegarde (`useActivePackGuard`).
- PixelEditor travaille sur une copie (`workingCanvasRef`) ; seule la cellule courante est réécrite à la sauvegarde (changer de cellule sans sauver perd les modifs).

## Pièges connus

- « Répéter une variante » part de l'image **active** : le popover affiche la source (`imageSource`) et une confirmation est demandée si la source est le défaut alors qu'un override custom existe (lu via `getOverride` au clic, pas depuis l'état du parent).
- Libellés de colonnes en anglais en dur (`ATLAS_COLUMN_LABELS`) — non traduits.
- `loadImage` / `canvasToPngBase64` dupliqués dans `shared/components/CropEditor.tsx` → à mutualiser dans `shared/lib`.
- Éditeur pixel minimal : pas d'undo/redo, pas de pipette, pas de couleur libre, pas de raccourcis, souris uniquement.
- Couleurs de palette en hex : données légitimes (pas des tokens UI), `style={{background}}` non concerné par `no-hardcoded-color`.

## Cible UX (validée)

Grille atlas traduite et navigable au clavier, action par ligne « utiliser pour toutes » avec undo ; éditeur pixel v2 : crayon/gomme/pipette (B/E/I, Alt), undo/redo, palette extraite du sprite + picker, zoom, navigation cellules.
Détail : `docs/ux-research.md` §4.4.

## Cartes

#25, #26 (+ #5) — `npm run kanban` pour l'état courant.
