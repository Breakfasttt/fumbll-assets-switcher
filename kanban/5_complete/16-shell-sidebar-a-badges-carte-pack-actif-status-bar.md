---
id: 16
title: Shell : sidebar à badges, carte pack actif, status bar
feature: shared-ui
type: ux
priority: haute
depends: [8, 15]
---

## Objectif
navigation accessible, état global visible partout (§3.1).

## Conception
Voir `docs/ux-research.md` (carte #16) et la section de la feature concernée.

## Réalisé
`app/Sidebar.tsx` (`<nav>` de `<button aria-current>`, icônes lucide, badges customs actifs rosters/terrains
et éléments nettoyables plafonnés à 99+, onglets verrouillés + tooltip sans cache), `app/ActivePackCard.tsx`
(visible partout, « Détacher »), `app/StatusBar.tsx` (santé du cache via `useCacheValid`, chemin tronqué au
milieu, coach, nb d'images en jeu, Ouvrir, Raccourcis). Fenêtre 1280×840, min 1000×680.
Validé : `npm run e2e` (scénario `shell-shortcuts`, bac à sable) + captures `.screenshots/1-rosters.png`,
`card16-active-pack.png`.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] `<nav>` boutons + icônes lucide + `aria-current`, badges compteurs (queries)
- [x] Carte "Pack actif" + action Détacher
- [x] Status bar cache (santé, chemin tronqué, coach, nb overrides, Ouvrir)
- [x] `minWidth/minHeight` fenêtre côté main
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
