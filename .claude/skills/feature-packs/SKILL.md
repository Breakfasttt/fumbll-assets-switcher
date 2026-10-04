---
name: feature-packs
description: Feature "packs" de fumbbl-assets-switcher — export des overrides actifs en zip partageable, import, liste des packs importés, activation exclusive, suppression, et règle « pack actif » (garde avant modification ad hoc). Charger avant de toucher PacksView, le format de pack (manifest.json), l'activation ou useActivePackGuard.
---

# Feature packs

Un pack = zip `manifest.json` (`formatVersion: 1`, `name`, `description?`, `createdAt`, `entries[{url, fileName}]`) + images.
Un seul pack actif à la fois ; l'activer désactive tous les overrides actifs puis active ceux du pack.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/packs/PacksView.tsx` | carte Export/Import (input nom + « Exporter » → dialogue d'enregistrement natif, « Importer » → sélecteur zip ; progression et résultat via `notify.promise`) ; liste des `PackCard` (nom, nb d'assets, date, badge Actif, Activer, Supprimer avec `useConfirm`) |
| `src/renderer/features/packs/index.ts` | API publique : `PacksView` |

Côté main : `src/main/lib/packs.ts` (`exportPack`, `importPack`, `activatePack`, `clearActivePack`, `deletePack`, `listPacks`) — voir **main-ipc**.
Règle transverse : `src/renderer/shared/hooks/useActivePackGuard.ts` (voir **shared-ui**) — toute mutation d'override ailleurs demande confirmation si un pack est actif, puis appelle `clearActivePack()`.

## Pièges connus

- Activer un pack remplace l'entrée d'index des overrides perso de même URL (une entrée par URL) ; le fichier perso reste sur disque mais n'est plus référencé (sera exposé par l'historique #14). Fichiers du pack nommés `pack-<packId>-<MD5>.<ext>`.
- Pas d'action « désactiver le pack », pas d'aperçu du contenu, pas de champ description (`undefined` passé à l'export).
- Le pack actif n'est visible que dans cet onglet ; l'utilisateur ne le voit pas en éditant.
- `<input>` texte stylé à la main (pas de composant `Input` partagé).

## Cible UX (validée)

Dialog « Créer un pack » (nom, description, récap), lignes avec mosaïque, Activer/Désactiver, `toast.promise` ; pack actif visible dans la sidebar ; garde modale remplacée par détachement non bloquant + undo.
Détail : `docs/ux-research.md` §4.6.

## Cartes

#28, #29 (+ #3) — `npm run kanban` pour l'état courant.
