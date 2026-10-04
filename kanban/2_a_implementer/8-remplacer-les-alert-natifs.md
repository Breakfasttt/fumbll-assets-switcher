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

## Hors périmètre
Undo des mutations (carte #14 côté main, #15 côté données).

## Checklist
- [ ] `<Toaster/>` thémé dans App, helper `notify.success/error/promise/undoable`
- [ ] `confirm({title, description, confirmLabel, destructive})` sur AlertDialog
- [ ] Remplacer 5 `alert()` (Config, Packs) ; retirer les entrées baseline `no-native-dialog`
- [ ] Clés i18n 4 langues
- [ ] skill shared-ui mis à jour
- [ ] `npm run verify` OK
