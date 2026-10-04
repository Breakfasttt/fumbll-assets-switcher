---
id: 8
title: Toasts sonner + ConfirmDialog v2 + bannissement d'alert()
feature: shared-ui
type: ux
priority: haute
depends: [13]
---

## Objectif
Système de feedback unique (`docs/ux-research.md` §2.9) ; plus aucun `alert()` (ConfigView ×3,
PacksView ×2 ; baseline `no-native-dialog`).

## Conception
Voir `docs/ux-research.md` (carte #8). Lib `sonner` (validée, carte #10).

## Réalisé
`sonner` + `shared/ui/toaster.tsx` (variables CSS de sonner branchées sur les tokens) + `shared/lib/notify.ts`
(success/error/warning/promise/undoable). `ConfirmDialogProvider` sur AlertDialog, compatible avec
l'ancien appel `confirm(string)`. 5 `alert()` remplacés ; export/import de pack en `notify.promise`
(chargement → succès/erreur), succès explicite après configuration du cache. Baseline `ipc-unused`
réaffectée à #22 (consommateur des IPC d'annulation). Captures : `.screenshots/card8-*.png`.

## Hors périmètre
Undo des mutations (carte #14 côté main, #15 côté données).

## Checklist
- [x] `<Toaster/>` thémé dans App, helper `notify.success/error/promise/undoable`
- [x] `confirm({title, description, confirmLabel, destructive})` sur AlertDialog
- [x] Remplacer 5 `alert()` (Config, Packs) ; retirer les entrées baseline `no-native-dialog`
- [x] Clés i18n 4 langues
- [x] skill shared-ui mis à jour
- [x] `npm run verify` OK
