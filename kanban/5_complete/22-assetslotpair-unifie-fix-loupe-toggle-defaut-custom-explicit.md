---
id: 22
title: AssetSlotPair unifié (fix loupe, toggle Défaut/Custom explicite)
feature: asset-editor
type: bug
priority: haute
depends: [13, 8, 15]
---

## Objectif
un composant partagé portrait/iconset/terrain ; activation par ToggleGroup "En jeu" ; corrige le bug loupe et les boutons imbriqués.

## Conception
Voir `docs/ux-research.md` (carte #22) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] Extraire `useAssetSlot(url)` (queries/mutations) ; supprimer duplication `PitchWeatherSlot`
- [x] Vignettes non cliquables, fond uni bg-well (pas de damier), skeleton au ratio, label "En jeu"
- [x] Dropzone + "Choisir un fichier…", remplacement avec Undo
- [x] Barre d'actions IconButton + menu ⋯ ; avertissement "partagé par N rosters"
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK

## Réalisé
- `shared/hooks/useAssetSlot.ts` : défaut + override + `setActive` / `saveFile` / `remove` (garde pack actif, clear du pack, toasts Annuler) ; `fileToBase64` y a déménagé.
- `shared/components/AssetSlotPair.tsx` : paire Défaut/Custom partagée — ToggleGroup « Image utilisée en jeu » (Custom désactivé + tooltip sans override), vignettes non cliquables sur `bg-well`, liseré `border-live` + Badge « En jeu », `pixelated` seulement si agrandie, Skeleton au ratio, dropzone (drag-over pointillé primary « Déposer pour remplacer ») + « Choisir un fichier… », IconButton Remplacer/Recadrer/Supprimer, menu ⋯ (dossier, copier l'URL), « Partagé par » tronqué + tooltip et avertissement `warning` sans le roster courant.
- `AssetPanel` (portrait 147 px = taille réelle, iconset 96 px + AtlasBreakdown) et `PitchWeatherSlot` réécrits dessus : plus de `div role=button`, de pastille ni de ✕.
- i18n : 13 clés `assetSlot.*` (4 langues), `assetPanel.usedBy*` supprimées. Baseline `ipc-unused` → carte 30 (count 2).
- e2e : helpers sur `data-slot` / `data-testid`, `openRoster` compatible Select et liste #21 ; nouveau `scripts/e2e/asset-slot.mjs` (+ captures `card22-portrait/iconset/pitch.png`).
