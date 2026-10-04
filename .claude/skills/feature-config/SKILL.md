---
name: feature-config
description: Feature "config" de fumbbl-assets-switcher — langue de l'interface, choix du dossier cache FFB (auto-détection registre Windows ou sélection manuelle), guide de setup. Charger avant de toucher ConfigView, l'onboarding, la persistance de la langue ou la détection du coach.
---

# Feature config

Écran d'onboarding/réglages. Forcé tant qu'aucun `cacheFolder` n'est configuré (`app/App.tsx`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/config/ConfigView.tsx` | deux états. **Onboarding** (cache absent/invalide) : stepper 3 étapes (`Step` local : done/current/todo), message `config.folderMissing` si le dossier configuré a disparu. **Paramètres** (cache valide) : dossier (mono), coach, « Relancer la détection » / « Choisir un autre dossier… ». Puis la langue (Select) |
| `src/renderer/features/config/index.ts` | API publique : `ConfigView` |

Dépendances partagées : `shared/i18n/LanguageContext` (`language`, `setLanguage`), `shared/i18n/translations` (`LANGUAGE_NAMES`), `@common/types` (`LANGUAGES`), `shared/api` (`useConfig`, `useCacheValid` côté App).

## Comportement actuel

- Affiché d'office (autres onglets verrouillés) tant qu'aucun dossier cache **valide** n'est configuré.
- `detect()` : `detectCoaches()` → coachs avec `cachePath` affichés en **choix radio** (le dossier actuel présélectionné et marqué « actuel ») ; **rien n'est enregistré** avant « Utiliser ce dossier ». Aucun coach → `EmptyState` + aide.
- `selectManually()` : `selectFolder()` → `validateCacheFolder()` ; invalide → message **inline** (pas de toast).
- `applyFolder()` : si un dossier valide est déjà configuré et qu'on en change → `confirm` (AlertDialog « Changer de dossier »). Puis `useSaveConfig`, toast de succès, `onConfigured()` → onglet Rosters.
- La langue est sauvée par `LanguageContext.setLanguage`.

## IPC utilisés

`detectCoaches`, `selectFolder`, `validateCacheFolder` (appels directs) ; `loadConfig`/`saveConfig` via `shared/api` (`useConfig`, `useSaveConfig`) (voir **main-ipc** : `registry.ts`, `cacheWriter.validateCacheFolder`, `config.ts`).

## Pièges connus

- `useSaveConfig(patch)` fusionne avec la config en cache puis réécrit tout `config.json`. `coachName` n'est relu nulle part.
- Auto-détection Windows uniquement.

## Cible UX (validée)

Onboarding en stepper vivant (cache absent/invalide uniquement), choix explicite du coach détecté, erreurs inline, page Paramètres une fois configuré ; mémorisation du dernier onglet.
Détail : `docs/ux-research.md` §4.1.

## Cartes

#17, #18 — `npm run kanban` pour l'état courant.
