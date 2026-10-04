---
id: 11
title: Migrer vers Tailwind 4 + Vite plugin
feature: project
type: chore
priority: haute
depends: []
---

## Objectif
aligner Tailwind avec tailwind-merge v3 et préparer les tokens CSS-first. Supprimer postcss/autoprefixer.

## Conception
Voir `docs/ux-research.md` (carte #11) et la section de la feature concernée.

## Réalisé
`@tailwindcss/upgrade` (tokens migrés en `@theme` dans `index.css`, `outline-none`→`outline-hidden`,
`rounded-sm`→`rounded-xs`, `theme(colors.card)`→`var(--color-card)`), puis passage au plugin Vite.
Compat v3 ajoutée dans `@layer base` : curseur pointer des boutons, placeholder gray-400 (Tailwind 4
les a retirés) ; bordure par défaut gray-200 conservée par l'outil (à remplacer par les tokens en #12).
Ajout de `npm run screenshots` (captures CDP des 5 onglets) pour vérifier les cartes UI.

## Hors périmètre
Tokens HSL / variables sémantiques (#12).

## Checklist
- [x] `npx @tailwindcss/upgrade` (sur `main`, arbre propre au départ, revertable par git)
- [x] `@tailwindcss/vite` dans `vite.config`, `postcss.config.cjs` et `tailwind.config.js` supprimés ; postcss/autoprefixer désinstallés ; liste blanche des libs à jour
- [x] Vérifier rings/rounded/shadows visuellement sur les 5 onglets (`npm run screenshots`, rayon `rounded` = 6 px confirmé dans le CSS buildé)
- [x] skills project-map / shared-ui mis à jour
- [x] `npm run verify` OK + `npm run build` OK
