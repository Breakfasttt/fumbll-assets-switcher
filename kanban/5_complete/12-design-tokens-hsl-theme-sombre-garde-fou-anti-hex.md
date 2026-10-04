---
id: 12
title: Design tokens HSL + thème sombre + garde-fou anti-hex
feature: shared-ui
type: refactor
priority: haute
depends: [11]
---

## Objectif
un seul fichier de tokens (§2.2), aucune couleur en dur, damier transparence, focus-visible global, typo système 13 px.

## Conception
Voir `docs/ux-research.md` (carte #12) et la section de la feature concernée.

## Réalisé
`shared/styles/tokens.css` : variables HSL sémantiques sur `:root` + `@theme inline`, polices, rayons.
Codemod des classes legacy (`card`→`surface`, `card-raised`→`surface-raised`, `muted`/`faint`→`*-foreground`,
`accent`→`primary`, `accent-active` (orange)→`live` (vert), `input`→`field`, `text-white`→`text-foreground`
ou `*-foreground` sur fond plein). `tabular-nums` sur tailles/px/Ko. check-arch : couleurs littérales interdites en CSS hors tokens,
palette Tailwind interdite, nouvelle règle `unknown-color-token`.

## Hors périmètre
Hauteurs de contrôles 28/32 px et nouvelles variantes de Button (#13).

## Checklist
- [x] `src/renderer/shared/styles/tokens.css` + `@theme inline` (dans `shared/` pour être couvert par le skill shared-ui)
- [x] Remplacer `body{background}` et classes legacy (`card-raised`, `accent-active`, …) — 128 classes renommées
- [x] Étendre `no-hardcoded-color` aux CSS + palette Tailwind ; règle `unknown-color-token` (testées sur fichiers temporaires)
- [x] Damier de transparence derrière les images : essayé puis **retiré** à la demande de l'utilisateur (fond uni `bg-well` conservé)
- [x] Scrollbars stylées, `prefers-reduced-motion`, `tabular-nums`, focus-visible global
- [x] skill shared-ui mis à jour ; vérif visuelle `npm run screenshots` (5 onglets)
- [x] `npm run verify` OK
