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
| `src/renderer/features/asset-editor/AssetPanel.tsx` | `AssetPanel` (chargement défaut + override, setActive, drop, delete, prompt) ; sous-composants `AssetSlot` (défaut) et `DropSlot` (custom, zone de dépôt, ✕, « Recadrer ») ; `fileToBase64` |
| `src/renderer/features/asset-editor/PromptPopover.tsx` | bouton « Générer un prompt IA » → Popover textarea lecture seule + « Copier » |
| `src/renderer/features/asset-editor/imagePrompt.ts` | `buildPortraitPrompt(ctx, w, h)`, `buildIconsetPrompt(ctx, cellSize, rows)` |
| `src/renderer/features/asset-editor/index.ts` | API publique : `AssetPanel` |

Dépendances : `@/features/iconset` (`AtlasBreakdown` affiché sous les slots si `showAtlasBreakdown`), `shared/components/ImageZoomModal`, `shared/hooks/useActivePackGuard`, `useOverrideUndo`, `useImageDimensions`, `shared/api` (queries/mutations), `shared/lib/rosters` (`extractAssetId`).

## Comportement

- Données via `shared/api` : `useDefaultAsset(cacheFolder, url)` (cache FFB d'abord, sinon CDN — voir **main-ipc**), `useOverride(url)` (entrée + image), `useRosterUsageIndex()` (« Utilisé par »). Plus de `refreshOverride` : les mutations invalident `override(url)`, donc tout slot monté sur la même URL (autre onglet, crop, éditeur pixel) se met à jour seul.
- Cliquer un slot = l'activer (`useSetOverrideActive`). Toute mutation : `guardAgainstActivePack()` puis `useClearActivePack()`.
- Drop : portrait → `onOpenCrop` (le crop sauve lui-même) ; iconset → `useSaveOverride` direct, toast « Override remplacé » + Annuler si une version existait (`undoVersionId`).
- ✕ : `useDeleteOverride` puis toast « Override supprimé » + Annuler (`useOverrideUndo` → `useRestoreOverride`).
- Props de rappel (`onOpenEditor`, `onOpenCrop`, `onRecropExisting`, sans `onSaved`) : l'ouverture des éditeurs est déléguée au conteneur (`rosters/PlayerDetail`).

## Pièges connus

- `ImageZoomButton` est imbriqué dans le slot cliquable : il stoppe lui-même la propagation (clic + clavier, portal de la Dialog inclus). Tout nouveau bouton placé dans un slot doit faire pareil (`e.stopPropagation()`), en attendant la refonte #22.
- `div role=button` + `<button>` imbriqués ; ✕ texte sans `aria-label`.
- Logique quasi identique dupliquée dans `features/pitches/PitchView.tsx` (`PitchWeatherSlot`) : à factoriser dans un composant partagé lors de la refonte.
- Affordance faible : l'état actif n'est signalé que par bordure + pastille orange.

## Cible UX (validée)

Composant unique `AssetSlotPair` (portrait/iconset/terrain) : ToggleGroup « Défaut | Custom » explicite, vignettes non cliquables sur damier, dropzone + « Choisir un fichier… », actions IconButton + menu ⋯, undo par toast ; crop unifié en Dialog (react-easy-crop) ; visionneuse avec comparaison.
Détail : `docs/ux-research.md` §4.3.

## Cartes

#22, #23, #24 (+ #2 quick fix) — `npm run kanban` pour l'état courant.
