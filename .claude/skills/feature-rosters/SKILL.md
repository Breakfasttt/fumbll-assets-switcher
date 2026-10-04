---
name: feature-rosters
description: Feature "rosters" de fumbbl-assets-switcher — sélection d'un roster FUMBBL (BB2025 / spéciaux), liste des positions, détail d'un joueur qui compose les éditeurs d'assets (portrait, iconset), le crop et l'éditeur pixel dans un panneau latéral. Charger avant de toucher RosterView, PlayerEditor, PlayerDetail ou la navigation roster → position.
---

# Feature rosters

Onglet « Rosters » : roster → position → édition des assets du joueur.
Feature **conteneur** : elle compose `asset-editor` et `iconset` (déclaré dans `dependsOn`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/rosters/RosterView.tsx` | Select du roster + case « rosters spéciaux » (hors `BB2025_ROSTER_IDS`), ligne résumé ; lance `indexRosterUsage` en tâche de fond |
| `src/renderer/features/rosters/PlayerEditor.tsx` | grille liste des positions (gauche, 1ʳᵉ sélectionnée par défaut) + `PlayerDetail` |
| `src/renderer/features/rosters/PlayerDetail.tsx` | 2 `AssetPanel` (portrait 95×147, iconset) + panneau latéral sticky : `PixelEditor` ou `CropEditor` (`SidePanel` state) |
| `src/renderer/features/rosters/index.ts` | API publique : `RosterView` |

Dépendances : `@/features/asset-editor` (`AssetPanel`), `@/features/iconset` (`PixelEditor`, `AtlasInfo`, `EditorTarget`), `shared/components/CropEditor`, `shared/lib/rosters` (`fetchAllRosters`, `BB2025_ROSTER_IDS`, `indexRosterUsage`).

## Données

- `shared/lib/rosters.ts` : `fetchAllRosters()` interroge les divisions `[1,2,3,5,10,200]` et dédoublonne par nom ; `BB2025_ROSTER_IDS` codé en dur (31 ids) ; index « utilisé par » module-level.
- `fumbblApi.fetchRoster(id)` → `RosterInfo {id, name, baseIconPath, positions[{name,type,urlPortrait,urlIconSet}]}` (parsing XML dans `main/lib/fumbblApi.ts`).
- Rien n'est persisté : refetch à chaque montage de l'onglet.

## Pièges connus

- `fetchAllRosters()` (6 requêtes) relancé à chaque montage de Rosters, Pitches et Orphelins.
- Pas de recherche/filtre de roster ni de position ; pas de mémorisation du dernier roster/position.
- Layout en grilles fixes imbriquées, peu adapté aux petites fenêtres.

## Cible UX (validée)

Maître-détail 3 colonnes : liste rosters filtrable (BB2025 | Tous) avec badges, liste positions avec pastilles P/I, détail ; cache react-query ; recherche globale Ctrl+K.
Détail : `docs/ux-research.md` §4.2.

## Cartes

#21 (+ #15, #20) — `npm run kanban` pour l'état courant.
