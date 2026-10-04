---
name: feature-orphans
description: Feature "orphans" de fumbbl-assets-switcher — nettoyage : overrides custom désactivés (stockés mais non chargés par le jeu) et fichiers orphelins du cache FFB (présents sur disque mais absents de map.json). Charger avant de toucher OrphansView ou la détection/suppression d'orphelins.
---

# Feature orphans

Onglet « Orphelins » : deux listes de cartes avec vignette, loupe et bouton Supprimer.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/orphans/OrphansView.tsx` | `OrphansView` (charge les 2 listes, construit l'index « utilisé par » si absent) ; `InactiveOverrideCard` (vignette, URL, roster(s)) ; `OrphanFileCard` (vignette, nom, taille via `formatSize`) |
| `src/renderer/features/orphans/index.ts` | API publique : `OrphansView` |

IPC : `listInactiveOverrides`, `listOrphanCacheFiles`, `readOverrideImage`, `readOrphanCacheFile`, `deleteOverride`, `deleteOrphanCacheFile` (main : `overrides.listInactiveOverrides`, `cacheWriter.listOrphanCacheFiles`).

## Pièges connus

- Suppressions irréversibles : confirmées via `useConfirm` (`orphans.deleteInactiveConfirm`, `orphans.deleteFileConfirm`). Pas de garde pack actif (rien de ce que le jeu charge n'est touché).
- Pas de sélection multiple / suppression groupée.
- Cartes `w-56` dupliquées avec `packs` (pas de composant commun).
- Réutilise la clé i18n `roster.loading` pour son état de chargement.

## Cible UX (validée)

Segmented « Customs inactifs | Fichiers du cache », libellés lisibles, sélection multiple + barre d'actions, « Réactiver », undo (customs) / AlertDialog chiffré (cache).
Détail : `docs/ux-research.md` §4.7.

## Cartes

#30 (+ #4) — `npm run kanban` pour l'état courant.
