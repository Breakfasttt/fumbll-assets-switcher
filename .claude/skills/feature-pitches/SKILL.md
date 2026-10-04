---
name: feature-pitches
description: Feature "pitches" de fumbbl-assets-switcher — remplacement des terrains (pitches) par roster, spéciaux (Blackbox, FUMBBL Cup, NAF) et système, pour 5 météos, avec slots Défaut/Custom et crop 782×452 en dialog. Charger avant de toucher PitchView, pitches.ts, les URLs de pitch ou les météos.
---

# Feature pitches

Onglet « Terrains ». Un terrain FUMBBL = un zip CDN contenant `pitch.ini` + une image par météo.
URL d'asset (clé d'override) : `…/Pitches/<Slug>.zip?pitch=<weather>`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/pitches/PitchView.tsx` | Select groupé (rosters BB2025 / spéciaux / système), 5 `PitchWeatherSlot` empilés (heat, sunny, nice, rain, blizzard), `CropEditor` dans un `Dialog` (782×452) |
| `src/renderer/features/pitches/pitches.ts` | `PITCH_ROSTER_SLUGS`, `SPECIAL_PITCH_OPTIONS`, `SYSTEM_PITCH_OPTIONS`, `rosterPitchOptions`, `buildPitchZipUrl`, `buildPitchWeatherUrl` |
| `src/renderer/features/pitches/index.ts` | API publique : `PitchView` |

Dépendances partagées : `shared/components/CropEditor`, `ImageZoomModal`, `shared/hooks/useActivePackGuard`, `useOverrideUndo`, `useImageDimensions`, `shared/api` (`useRosterList` en cache : plus de refetch à chaque visite, `useDefaultAsset`, `useOverride`, mutations), `shared/lib/rosters` (`BB2025_ROSTER_IDS`).

## Comportement

- Météo `intro` exclue (le client ne la lit jamais via l'URL custom).
- Défaut : `fetchAssetImage` → côté main `fetchPitchImage` télécharge le zip, lit `pitch.ini`, extrait l'image de la météo (cache de promesses par zip).
- Drop → toujours crop (dialog) ; « Recadrer » sur l'override existant.
- ✕ : `useDeleteOverride` + toast « Override supprimé » avec Annuler (`useOverrideUndo`).

## Pièges connus

- `PitchWeatherSlot` **duplique** la logique et le markup de `asset-editor/AssetPanel` (défaut, override, setActive, delete, drop, recrop, pastille) → à factoriser lors de la refonte.
- Crop en Dialog ici mais en panneau latéral pour les portraits : incohérent.
- Noms des pitches spéciaux en anglais en dur.

## Cible UX (validée)

Maître-détail comme Rosters, une météo à la fois (ToggleGroup/filmstrip), `AssetSlotPair` partagé, « appliquer à toutes les météos ».
Détail : `docs/ux-research.md` §4.5.

## Cartes

#27 — `npm run kanban` pour l'état courant.
