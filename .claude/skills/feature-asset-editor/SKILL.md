---
name: feature-asset-editor
description: Feature "asset-editor" de fumbbl-assets-switcher — panneau d'un asset joueur (portrait ou iconset) avec slots Défaut/Custom, activation de l'override, drag & drop d'image, suppression, recadrage, prompt IA à copier, ligne « utilisé par ». Charger avant de toucher AssetPanel, les slots, les overrides côté UI, le prompt IA ou le drop de fichier.
---

# Feature asset-editor

Un `AssetPanel` = un asset (URL FUMBBL) avec deux slots : **Défaut** (image FUMBBL d'origine) et
**Custom** (override de l'utilisateur). Le slot actif = celui que le client FFB charge.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/asset-editor/AssetPanel.tsx` | `AssetPanel` : carte titre + `PromptPopover`, `useAssetSlot` + `AssetSlotPair` partagés (vignettes 147 px de haut pour le portrait = taille réelle, 96 px pour l'iconset), `AtlasBreakdown` sous la paire pour l'iconset (image **active**) |
| `src/renderer/features/asset-editor/PromptPopover.tsx` | bouton « Générer un prompt IA » → Popover textarea lecture seule + « Copier » |
| `src/renderer/features/asset-editor/imagePrompt.ts` | `buildPortraitPrompt(ctx, w, h)`, `buildIconsetPrompt(ctx, cellSize, rows)` |
| `src/renderer/features/asset-editor/index.ts` | API publique : `AssetPanel` |

Dépendances : `@/features/iconset` (`AtlasBreakdown` affiché sous la paire si `showAtlasBreakdown`), `shared/components/AssetSlotPair`, `shared/hooks/useAssetSlot` (queries + mutations + garde pack + undo), `useImageDimensions` (prompt), `shared/api` (`useRosterUsageIndex`), `shared/lib/rosters` (`extractAssetId`).

## Comportement

- Données et mutations : `useAssetSlot(cacheFolder, url)` (voir **shared-ui**) — `useDefaultAsset` (cache FFB d'abord, sinon CDN), `useOverride`, mutations qui invalident `override(url)` : tout slot monté sur la même URL (autre onglet, crop, éditeur pixel) se met à jour seul.
- Image en jeu = choix **explicite** dans le ToggleGroup « Défaut | Custom » de `AssetSlotPair` (Custom désactivé tant qu'il n'y a pas d'override). Vignettes non cliquables. Toute mutation : `guardAgainstActivePack()` puis `useClearActivePack()`.
- Fichier (drop sur la vignette custom, « Choisir un fichier… », « Remplacer ») : portrait → `onOpenCrop` (le crop sauve lui-même) ; iconset → `slot.saveFile` direct, toast « Override remplacé » + Annuler si une version existait.
- Supprimer (IconButton) : sans confirmation, toast « Override supprimé » + Annuler. Menu ⋯ : afficher dans le dossier, copier l'URL de l'asset.
- « Partagé par » (`useRosterUsageIndex`, skeleton pendant le chargement) + avertissement si l'asset sert à plus d'un roster (le roster courant, `promptContext.rosterName`, est exclu de la liste « change aussi »).
- Props de rappel (`onOpenEditor`, `onOpenCrop`, `onRecropExisting`) : l'ouverture des éditeurs est déléguée au conteneur (`rosters/PlayerDetail`).

## Pièges connus

- Toute évolution des slots se fait dans `shared/components/AssetSlotPair.tsx` (aussi utilisé par **pitches**) : vérifier les deux écrans.
- Le crop des portraits reste en panneau latéral (`PlayerDetail`) alors que celui des terrains est en Dialog → #23.
- Activer Défaut/Custom n'a pas encore de toast « Annuler » (§2.9) : réversible d'un clic dans le ToggleGroup.

## Cible UX (validée)

Composant unique `AssetSlotPair` (portrait/iconset/terrain) : ToggleGroup « Défaut | Custom » explicite, vignettes non cliquables sur fond uni `bg-well` (fait en #22), dropzone + « Choisir un fichier… », actions IconButton + menu ⋯, undo par toast ; crop unifié en Dialog (react-easy-crop) ; visionneuse avec comparaison.
Détail : `docs/ux-research.md` §4.3.

## Cartes

#22, #23, #24 (+ #2 quick fix) — `npm run kanban` pour l'état courant.
