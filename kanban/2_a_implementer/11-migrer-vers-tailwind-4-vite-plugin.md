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

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `npx @tailwindcss/upgrade` sur branche dédiée
- [ ] `@tailwindcss/vite` dans `vite.config`, supprimer `postcss.config`, `tailwind.config.js`
- [ ] Vérifier rings/rounded/shadows visuellement sur les 5 onglets
- [ ] `npm run verify` vert
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
