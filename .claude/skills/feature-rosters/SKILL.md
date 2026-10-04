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
| `src/renderer/features/rosters/RosterView.tsx` | Select du roster + case « rosters spéciaux » (hors `BB2025_ROSTER_IDS`), ligne résumé ; `useRosterList`, `useRoster(id)`, lance `useRosterUsageIndex` en tâche de fond |
| `src/renderer/features/rosters/PlayerEditor.tsx` | grille liste des positions (gauche, 1ʳᵉ sélectionnée par défaut) + `PlayerDetail` |
| `src/renderer/features/rosters/PlayerDetail.tsx` | 2 `AssetPanel` (portrait 95×147, iconset) + panneau latéral sticky : `PixelEditor` ou `CropEditor` (`SidePanel` state) |
| `src/renderer/features/rosters/index.ts` | API publique : `RosterView` |

Dépendances : `@/features/asset-editor` (`AssetPanel`), `@/features/iconset` (`PixelEditor`, `AtlasInfo`, `EditorTarget`), `shared/components/CropEditor`, `shared/api/queries`, `shared/lib/rosters` (`BB2025_ROSTER_IDS`).

## Mémoire de navigation

Roster choisi, case « spéciaux » et position sélectionnée sont mémorisés (`useUiMemory` : `lastRosterId`, `showSpecialRosters`, `lastPositionName`) et restaurés au lancement. `PlayerEditor` est monté avec `key={roster.id}` : sans ça, revenir sur un roster déjà en cache gardait la position de l'ancien roster.

## Données

- `useRosterList()` (`staleTime: Infinity`) → `fetchAllRosters()` interroge les divisions `[1,2,3,5,10,200]` et dédoublonne par nom ; `BB2025_ROSTER_IDS` codé en dur (31 ids).
- `useRoster(id)` (`staleTime` 1 h) → `RosterInfo {id, name, baseIconPath, positions[{name,type,urlPortrait,urlIconSet}]}` (parsing XML dans `main/lib/fumbblApi.ts`).
- `useRosterUsageIndex()` (∞) : index « utilisé par » construit depuis tous les rosters, qui remplissent au passage le cache `useRoster`.
- Cache mémoire react-query pour la session (rien sur disque) : revenir sur l'onglet ne refait aucune requête ; le roster/position sélectionné n'est pas mémorisé.

## Pièges connus

- Pas de recherche/filtre de roster ni de position ; pas de mémorisation du dernier roster/position.
- Layout en grilles fixes imbriquées, peu adapté aux petites fenêtres.

## Cible UX (validée)

Maître-détail 3 colonnes : liste rosters filtrable (BB2025 | Tous) avec badges, liste positions avec pastilles P/I, détail ; cache react-query ; recherche globale Ctrl+K.
Détail : `docs/ux-research.md` §4.2.

## Cartes

#21 (+ #15, #20) — `npm run kanban` pour l'état courant.
