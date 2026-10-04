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
- [ ] Avant `saveOverride`/`deleteOverride` : copier la version précédente dans `overrides/.history/<hash>/<ts>` (cap 5/URL)
- [ ] IPC `restoreOverride(url, versionId)` + `restoreOrphanFile` (corbeille temporaire purgée au démarrage)
- [ ] Retourner `versionId` depuis les mutations
- [ ] Tests manuels : drop → annuler, delete → annuler
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
