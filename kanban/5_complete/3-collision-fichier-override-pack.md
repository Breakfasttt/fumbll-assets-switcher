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

## Réalisé
L'index `overrides.json` n'a qu'une entrée par URL : activer un pack remplace forcément l'entrée perso.
Correction : les fichiers d'un pack sont copiés sous `pack-<packId>-<MD5>.<ext>` (toujours depuis
`packs/<id>/`), le fichier perso `<MD5>.<ext>` reste intact sur disque ; l'export retire ce préfixe.
Corrigé au passage : activation impossible sans dossier `overrides/` (ENOENT) et fichier manquant
dans un pack qui interrompait l'activation (désormais ignoré + log).
Le fichier perso n'est plus référencé par l'index : il redeviendra accessible via l'historique (#14).

## Hors périmètre
UI des packs ; plusieurs versions par URL (#14).

## Checklist
- [x] scénario reproduit (override perso puis pack sur la même URL) — script de test stub Electron, 7 assertions
- [x] correction + fichier perso conservé sur disque
- [x] skill main-ipc / feature-packs à jour
- [x] `npm run verify` OK
