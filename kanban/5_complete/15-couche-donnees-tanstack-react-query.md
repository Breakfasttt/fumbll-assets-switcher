---
id: 15
title: Couche données @tanstack/react-query
feature: project
type: refactor
priority: haute
depends: [14]
---

## Objectif
un hook par ressource IPC (`useRosters`, `useRoster`, `useOverride`, `usePacks`, …) et des mutations avec invalidation ; fin des refetch par onglet.

## Conception
Voir `docs/ux-research.md` (carte #15) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] `QueryClientProvider` (staleTime adaptés, pas de refetchOnWindowFocus)
- [x] `shared/api/queries.ts` + `mutations.ts` ; supprimer cache module de `rosters.ts`
- [x] `useActivePackGuard` → lit `usePacks()` (plus d'IPC par mutation)
- [x] Mutations branchées sur `notify.undoable`
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK

## Réalisé
- **Nouveau** `src/renderer/shared/api/` : `queryClient.ts` (client : pas de `refetchOnWindowFocus`, `retry: 1`, `staleTime` 5 min par défaut ; `queryKeys`), `queries.ts` (13 hooks lecture + options réutilisables), `mutations.ts` (11 mutations, invalidation dans `onSettled`). `QueryClientProvider` tout en haut de `app/App.tsx`.
- **Nouveau** `shared/hooks/useOverrideUndo.ts` : toast `notify.undoable` → `useRestoreOverride` (suppression d'override dans AssetPanel + PitchWeatherSlot, remplacement par drop d'iconset). Clés `assetPanel.deletedToast|replacedToast`, `common.undo|restoredToast|undoFailedToast` (4 langues).
- `shared/lib/rosters.ts` : cache module-level supprimé, remplacé par `buildRosterUsageIndex()` pur (queryFn de `useRosterUsageIndex`, qui remplit aussi le cache `useRoster`).
- Migrés : RosterView, PitchView (+ PitchWeatherSlot), AssetPanel, AtlasBreakdown, PixelEditor, CropEditor, OrphansView, PacksView, ConfigView, useCacheFolder, useActivePackGuard (cache `packs`, plus d'IPC), LanguageContext. Callbacks `onSaved` supprimés (l'invalidation de `override(url)` rafraîchit tous les slots montés), donc PlayerDetail touché aussi.
- staleTime : config / liste rosters / index « utilisé par » / image par défaut / packs = ∞ ; roster = 1 h ; orphelins du cache = 0 (le jeu écrit dedans) ; reste = 5 min (invalidé précisément de toute façon).
- `useSaveConfig(patch)` fusionne avec la config en cache (fin du load+save complet à 3 endroits).
- Baseline `ipc-unused` 4 → 2 (`listOverrides` via `useOverrides`, `restoreOverride` via l'undo). Restent `listOverrideHistory`, `restoreOrphanCacheFile`.
- Reste : `useOverrides` pas encore consommé (badges #16) ; pas d'undo sur crop/pixel/« répéter une variante »/toggle Défaut-Custom ni sur les orphelins (#22, #30) ; états d'erreur/chargement inchangés (#31).
