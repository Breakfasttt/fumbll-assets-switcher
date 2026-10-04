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

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `src/renderer/styles/tokens.css` + `@theme inline`
- [ ] Remplacer `text-[#…]`, `body{background}` et classes legacy (`card-raised`, `accent-active`)
- [ ] Étendre la règle `no-hardcoded-color` de `check-arch.mjs` à `index.css` / fichiers CSS
- [ ] Scrollbars stylées, `prefers-reduced-motion`, `tabular-nums`
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
