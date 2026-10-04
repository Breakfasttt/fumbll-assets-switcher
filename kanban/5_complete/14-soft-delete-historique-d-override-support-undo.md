---
id: 14
title: Soft-delete & historique d'override (support undo)
feature: main-ipc
type: feature
priority: haute
depends: []
---

## Objectif
permettre "Annuler" après suppression/remplacement/répétition de variante sans confirmation.

## Conception
Voir `docs/ux-research.md` (carte #14) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] Avant `saveOverride`/`deleteOverride` : copier la version précédente dans `overrides/.history/<hash>/<ts>` (cap 5/URL)
- [x] IPC `restoreOverride(url, versionId)` + `restoreOrphanFile` (corbeille temporaire purgée au démarrage)
- [x] Retourner `versionId` depuis les mutations
- [x] Tests Node (JS compilé + stub `electron`, 43 assertions) : save→save→restore (+ redo), delete→restore, restore d'une version inactive, cap 5 versions, activation de pack sur URL perso→restore, orphelin→corbeille→restore (et refus si le fichier a réapparu), purge corbeille > 24 h ; non-régression `test-pack-collision` (carte #3)
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK

## Réalisé
- `src/main/lib/overrideHistory.ts` (nouveau) : archive fichier + métadonnées sous `overrides/.history/<MD5 url>/<versionId>/`, cap 5/URL, `listOverrideHistory`.
- `overrides.ts` : `saveOverrideFile` / `deleteOverride` / `registerActiveOverride` (entrée perso remplacée par un pack) archivent avant d'écrire et retournent le `versionId` ; `restoreOverride` archive l'état courant (redo) puis restaure fichier, index et cache FFB selon `active`. `setOverrideActive` n'archive pas.
- `cacheWriter.ts` : `deleteOrphanCacheFile` déplace vers `userData/trash/cache/<trashId>/` et retourne `trashId` ; `restoreOrphanCacheFile` ; `purgeCacheTrash` (> 24 h) appelé au `whenReady`.
- IPC `overrides:restore`, `overrides:history`, `cache:restoreOrphanFile` ; types `OverrideSaveResult` (`undoVersionId?`), `OverrideHistoryVersion`. Aucune UI : les toasts « Annuler » viendront avec #8 (baseline `ipc-unused` rattachée à #8, count 4).
- Limite : la version perso archivée lors d'une activation de pack est inactive (`activatePack` désactive tout avant d'enregistrer) ; l'undo global d'une activation de pack reste à concevoir (#29).
