---
name: project-map
description: Skill MAÎTRE de fumbbl-assets-switcher (app Electron qui personnalise les assets du client Java FUMBBL). À charger EN PREMIER à chaque session, avant toute exploration du code. Donne la carte du projet (process Electron, couches, stockage), l'index feature → skill → dossier, les règles d'architecture vérifiées par check-arch, le workflow kanban et les commandes. Charger ensuite uniquement le(s) skill(s) feature-* / shared-ui / main-ipc concernés au lieu d'explorer le repo.
---

# fumbbl-assets-switcher — carte du projet

App **desktop Electron** (pas une extension) qui remplace les images du client Java FUMBBL
(portraits, iconsets, terrains) en écrivant dans son **Local Icon Cache** (`map.json` + fichiers
nommés `MD5(url)`). Windows d'abord (auto-détection via le registre). UI en 4 langues.

**Règle de session : ne pas explorer le repo à l'aveugle.** Lire ce skill, puis le skill de la
feature visée (table ci-dessous). Chaque skill liste tous les fichiers de son périmètre
(`check-arch` le vérifie), donc il fait foi pour localiser le code.

## Stack

| Couche | Techno |
|---|---|
| Process main | Electron 33, TypeScript → CommonJS (`tsc -p tsconfig.main.json`), `adm-zip`, `fast-xml-parser` |
| Renderer | React 18, Vite 6, Tailwind 4 via `@tailwindcss/vite` (tokens CSS-first : bloc `@theme` de `src/renderer/index.css`, pas de `tailwind.config.js`), Radix + cva + `cn()` façon shadcn, lucide-react |
| Contrats | `src/shared/types.ts` (types + constantes partagés main/renderer, aucun import de paquet) |
| Outillage | `scripts/check-arch.mjs`, `scripts/kanban.mjs`, config `architecture.config.mjs` (zéro dépendance) |

Liste blanche des libs : `architecture.config.mjs` → `libraries` (toute lib non déclarée fait échouer `check-arch`).

## Process Electron et flux

```
renderer (React)  --window.fumbblApi.x()-->  preload.ts (contextBridge)  --ipcRenderer.invoke("ns:x")-->  main.ts (ipcMain.handle) --> src/main/lib/*
```
- Un canal IPC = une entrée dans `preload.ts` (`api`) + un `ipcMain.handle` dans `main.ts`. Parité vérifiée par `check-arch` (règle `ipc-parity`).
- Le type `FumbblApi` (preload) type `window.fumbblApi` via `src/renderer/global.d.ts`.
- Détails des handlers/services/stockage : skill **main-ipc**.

## Arborescence

```
src/main/            process main (main.ts = routeur IPC, preload.ts, config.ts, lib/* services)
src/shared/          contrats main<->renderer (alias renderer : @common/*)
src/renderer/        (alias : @/*)
  main.tsx, index.css, global.d.ts
  app/               shell : App.tsx (providers, sidebar, onglets)
  features/<nom>/    une feature = un dossier + index.ts (API publique) + un skill
  shared/ui/         primitives design system (purs : pas d'IPC, pas d'i18n)
  shared/components/ composants transverses (ConfirmDialog, ImageZoom, CropEditor)
  shared/hooks/      hooks transverses (garde pack actif, config, undo override, dimensions image)
  shared/api/        couche données react-query : queryClient + queryKeys, queries, mutations (invalidation)
  shared/lib/        utilitaires + données rosters partagées
  shared/i18n/       LanguageContext + dictionnaires en/fr/es/de
scripts/             check-arch.mjs, kanban.mjs, lib/kanban-cards.mjs
kanban/              cartes de suivi (voir plus bas)
docs/                ux-research.md (direction UX/UI + plan de refonte)
.claude/skills/      ce skill + un skill par feature/zone
```

## Index feature → skill

| Feature (dossier `src/renderer/features/`) | Skill | Contenu | dependsOn |
|---|---|---|---|
| `config` | **feature-config** | langue UI, dossier cache (auto-détection registre / manuel), guide setup | — |
| `rosters` | **feature-rosters** | choix du roster, liste des positions, détail joueur (compose asset-editor + iconset + crop) | asset-editor, iconset |
| `asset-editor` | **feature-asset-editor** | slots Défaut/Custom d'un asset joueur, drop, suppression, recadrage, prompt IA, « utilisé par » | iconset |
| `iconset` | **feature-iconset** | découpage atlas d'iconset, « répéter une variante », éditeur pixel | — |
| `pitches` | **feature-pitches** | terrains par roster/spécial/système × 5 météos, crop en dialog | — |
| `packs` | **feature-packs** | export/import zip d'overrides, activation, suppression, garde pack actif | — |
| `orphans` | **feature-orphans** | overrides inactifs + fichiers orphelins du cache | — |

| Zone transverse | Skill | Contenu |
|---|---|---|
| `src/renderer/shared/**`, `src/renderer/app/**` | **shared-ui** | design system, tokens, shell/navigation, i18n, composants et hooks partagés |
| `src/main/**`, `src/shared/**` | **main-ipc** | handlers IPC, services main, stockage disque, cache FFB, API FUMBBL |

## Règles d'architecture (vérifiées par `npm run check-arch`)

| Règle | Contenu |
|---|---|
| `process-boundary` | main n'importe pas le renderer et inversement ; `src/shared` sans paquet. Exception déclarée : `global.d.ts` → `preload.ts` en `import type` |
| `renderer-layers` | `app` → features + shared ; `features` → shared ; `shared/ui` → `shared/ui`, `shared/lib` uniquement ; etc. (`rendererLayers` dans la config) |
| `feature-deps` / `feature-public-api` | une feature n'importe une autre feature que si `dependsOn` le déclare, et seulement via son `index.ts` ; graphe acyclique |
| `feature-structure` / `skill-coverage` | dossier feature ⇔ config ⇔ skill `feature-<nom>` référencé ici ; **chaque fichier doit être cité dans son skill** |
| `ipc-parity` / `ipc-unused` / `ipc-forbidden` | parité main/preload ; méthodes jamais appelées ; pas de `window.fumbblApi` dans `shared/ui` |
| `no-hardcoded-color` | pas de `text-[#xxx]` / `color: "#xxx"` dans les `.tsx` : utiliser les tokens |
| `no-native-dialog` | pas d'`alert()` / `window.confirm()` : `useConfirm` + feedback UI |
| `i18n-parity` / `i18n-missing-key` / `i18n-unused-key` | mêmes clés dans les 4 langues, aucune clé inconnue |
| `libraries` / `types-in-dev-deps` | toute dépendance déclarée avec scope + raison ; lib main pas dans le renderer et inversement |
| `kanban` / `kanban-deps` | format des cartes, WIP, checklist cochée en à valider/complété |
| `baseline` | violations tolérées, chacune liée à une carte ouverte avec un `count` exact : une violation en plus échoue, une en moins demande de baisser `count` |

**Ajouter une feature** : créer `src/renderer/features/<nom>/` + `index.ts`, la déclarer dans
`architecture.config.mjs` (`features`), créer `.claude/skills/feature-<nom>/SKILL.md` (sur le modèle
des autres) qui cite chaque fichier, l'ajouter dans la table ci-dessus, puis `npm run check-arch`.

**Ajouter une lib** : vérifier qu'elle sert plusieurs features (sauf lib mono-fonction légère),
l'ajouter à `libraries` avec scope + raison, justifier dans la carte kanban.

## Stockage

| Où | Quoi | Géré par |
|---|---|---|
| `userData/config.json` | `{cacheFolder, coachName, language}` | `src/main/config.ts` |
| `userData/overrides/` + `overrides.json` | images custom `<MD5>.<ext>` + index `{url, fileName, active, packId?}` | `src/main/lib/overrides.ts` |
| `userData/packs/<uuid>/` + `packs.json` | packs importés + `{activePackId, packs}` | `src/main/lib/packs.ts` |
| cache FFB (`cacheFolder`) | `map.json` + fichiers `MD5(url).<ext>` lus par le client Java | `src/main/lib/cacheWriter.ts` |

## Kanban

Dossier `kanban/`, statut = dossier (jamais dans le frontmatter) :
`1_idee` → `2_a_implementer` → `3_en_cours` (WIP ≤ 2) → `4_a_valider` → `5_complete` ; `6_annule` depuis tout statut sauf complété.
- L'IA déplace jusqu'à `4_a_valider` (checklist cochée, `npm run verify` OK). **Seul l'utilisateur** passe en `5_complete`.
- Carte complétée = figée ; prolonger = nouvelle carte avec `depends`.
- Format, champs et exemples : `kanban/README.md`.
- CLI : `npm run kanban` (tableau) · `npm run kanban -- new "<titre>" --feature=<f> --type=<t> --priority=<p>` · `npm run kanban -- move <id> <colonne>` · `npm run kanban -- next-id`.

Démarrer une carte : la lire, charger les skills de sa `feature`, la passer en `3_en_cours`, implémenter,
cocher la checklist, mettre à jour le skill feature si des fichiers/comportements changent,
`npm run verify`, passer en `4_a_valider`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | tsc watch main + Vite (5173) + Electron |
| `npm run typecheck` | tsc main + renderer |
| `npm run check-arch` | règles d'architecture + kanban (`-- --rule=<id>` pour une seule règle) |
| `npm run verify` | typecheck + check-arch (à lancer avant de passer une carte en à valider) |
| `npm run build` | build main + renderer |
| `npm run e2e [-- <filtre>]` | après `build` : scénarios `scripts/e2e/*.mjs` en **bac à sable** (userData + cache FFB jetables) ; à étendre pour chaque carte UI testable |
| `npm run screenshots` | après `build` : lance l'app via CDP et capture chaque onglet dans `.screenshots/` (vérif visuelle des cartes UI ; `-- --roster=Dwarf`) |
| `npm run check-identity` | vérifie le compte git perso (commit) + compte GitHub actif `gh` (push) |

Pilote commun : `scripts/lib/app-driver.mjs` (`launchApp({sandbox})` → `click(texte)`, `evaluate`, `waitFor`, `screenshot`, `close`) ; le bac à sable passe par la variable `FAS_USER_DATA` lue dans `src/main/main.ts`. Ne jamais faire de test destructif hors bac à sable.

Hooks : `git config core.hooksPath .githooks` (activé sur ce poste). `pre-commit` = identité perso + check-arch ; `pre-push` = identité perso + compte `gh` actif.

## Compte git : PERSO uniquement

Projet personnel : commits **et** push avec le compte perso (`Breakyt` / `Breakfasttt`, `jeaneaut@gmail.com`),
**jamais** le compte pro (ludicius / succubus / `yannsucc`). Règles dans `architecture.config.mjs` > `gitIdentity`,
vérifiées par `scripts/check-git-identity.mjs` (hooks). Avant tout commit/push : `npm run check-identity` ;
si échec, **s'arrêter** et demander à l'utilisateur de basculer (`gh auth switch --hostname github.com --user Breakfasttt`,
`git config user.name/user.email`). Ne jamais contourner (`--no-verify`).

## Conventions

- Code et identifiants en anglais ; docs, skills, cartes et commentaires en français.
- Pas de commit sans demande explicite de l'utilisateur.
- Toute chaîne visible passe par `t("clé")` et existe dans les 4 dictionnaires.
- Direction UX/UI cible et liste des libs : `docs/ux-research.md` (chaque skill feature en reprend la section « Cible UX »).
