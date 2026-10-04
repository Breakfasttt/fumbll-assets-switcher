# Kanban

Suivi des features, bugs et refontes. Une carte = un fichier Markdown. **Le statut est le dossier**
(jamais dupliqué dans le frontmatter). Validé par `npm run check-arch` (règle `kanban`).

## Colonnes

| Dossier | Sens | Qui y met la carte |
|---|---|---|
| `1_idee/` | piste, conception incomplète | tout le monde |
| `2_a_implementer/` | conception validée, prête à démarrer | utilisateur (ou IA sur validation) |
| `3_en_cours/` | en cours d'implémentation — **WIP max 2** | celui qui démarre |
| `4_a_valider/` | code fini, checklist cochée, `npm run verify` OK | IA / dev |
| `5_complete/` | validé par l'utilisateur, figé | **utilisateur uniquement** |
| `6_annule/` | abandonné (depuis tout statut sauf complété) | utilisateur |

Règles :
- La carte passe en `5_complete` dans le même commit que le code qui la termine (ou le suivant).
- Carte complétée = **non modifiable**. Pour prolonger : nouvelle carte avec `depends: [id]`.
- Un numéro n'est jamais réutilisé (même pour une carte annulée).
- En `4_a_valider` et `5_complete`, la checklist doit être entièrement cochée.
- Si les fichiers d'une feature changent, son skill `.claude/skills/feature-<nom>/SKILL.md` est mis à jour dans la même carte.

## Format

Nom : `<id>-<slug-kebab>.md` (ex. `12-unifier-slot-asset.md`).

```markdown
---
id: 12
title: Unifier le slot d'asset portrait/pitch
feature: asset-editor   # une feature ou zone de architecture.config.mjs
type: ux                # ux | bug | refactor | feature | chore | doc
priority: haute         # haute | moyenne | basse
depends: [8, 9]         # optionnel
---

## Objectif
Pourquoi, en 2-3 lignes.

## Conception
Fichiers touchés, composants, décisions.

## Hors périmètre
Ce que la carte ne fait pas.

## Checklist
- [ ] étape concrète
- [ ] skill feature mis à jour
- [ ] `npm run verify` OK
```

Valeurs de `feature` : `config`, `rosters`, `asset-editor`, `iconset`, `pitches`, `packs`, `orphans`
(features) ou `shared-ui`, `main-ipc`, `project` (zones transverses).

## CLI

```bash
npm run kanban                                   # tableau
npm run kanban -- new "Titre" --feature=packs --type=bug --priority=haute [--column=2_a_implementer]
npm run kanban -- move 12 3_en_cours
npm run kanban -- next-id
```
