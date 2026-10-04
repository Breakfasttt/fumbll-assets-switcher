---
id: 3
title: Image perso qui masque celle du pack à l'activation
feature: packs
type: bug
priority: haute
depends: []
---

## Objectif
`activatePack` (`src/main/lib/packs.ts`) ne copie le fichier du pack que si
`overrides/<MD5>.<ext>` n'existe pas : une image perso de même URL/extension reste en place et le
pack actif affiche autre chose que son contenu.

## Conception
Toujours écraser depuis le dossier du pack, ou nommer les fichiers de pack distinctement
(`<packId>/<file>` référencé par l'entrée override). Choisir l'option qui ne détruit pas l'override
perso (préférer : l'entrée override pointe vers le fichier du pack, l'override perso reste désactivé).

## Hors périmètre
UI des packs.

## Checklist
- [ ] scénario reproduit (override perso puis pack sur la même URL)
- [ ] correction + override perso conservé
- [ ] skill main-ipc / feature-packs à jour
- [ ] `npm run verify` OK
