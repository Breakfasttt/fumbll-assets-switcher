---
id: 13
title: Paquet unifié radix-ui + nouvelles primitives
feature: shared-ui
type: refactor
priority: haute
depends: [12]
---

## Objectif
migrer vers `radix-ui` et créer tooltip, slider, toggle-group, alert-dialog, dropdown-menu, input, textarea, badge, skeleton, kbd, icon-button, empty-state.

## Conception
Voir `docs/ux-research.md` (carte #13) et la section de la feature concernée.

## Réalisé
`radix-ui` remplace les 5 paquets `@radix-ui/react-*`. 12 nouvelles primitives dans `shared/ui` (tooltip,
icon-button, slider, toggle-group, alert-dialog, dropdown-menu, input, textarea, badge, skeleton, kbd,
empty-state), non encore utilisées par les features (elles le seront par #8, #16, #22…). `TooltipProvider`
monté dans `App`. `cn()` étendu avec les tokens (`COLOR_TOKENS`) + ombre `overlay` ; règle check-arch
`twmerge-tokens` qui garde la liste synchronisée avec `tokens.css`. Rendu existant inchangé (captures).

## Hors périmètre
Hauteurs de contrôles 28/32 px, variantes `secondary`/`loading` de Button et animations des
Dialog/Popover/Select existants : changements visibles, à montrer et appliquer lors des cartes UI.

## Checklist
- [x] Migrer imports des 5 composants existants, retirer `@radix-ui/react-*`
- [x] Ajouter les primitives + `tw-animate-css` (animations sur les nouvelles primitives uniquement)
- [x] `IconButton` impose `aria-label` (type requis) + Tooltip
- [x] `extendTailwindMerge` avec les tokens custom
- [x] skill shared-ui mis à jour (12 primitives, `radix-ui`, `COLOR_TOKENS`) ; liste blanche des libs à jour
- [x] `npm run verify` OK
