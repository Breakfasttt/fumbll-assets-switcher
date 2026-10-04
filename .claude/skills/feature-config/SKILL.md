---
name: feature-config
description: Feature "config" de fumbbl-assets-switcher — langue de l'interface, choix du dossier cache FFB (auto-détection registre Windows ou sélection manuelle), guide de setup. Charger avant de toucher ConfigView, l'onboarding, la persistance de la langue ou la détection du coach.
---

# Feature config

Écran d'onboarding/réglages. Forcé tant qu'aucun `cacheFolder` n'est configuré (`app/App.tsx`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/renderer/features/config/ConfigView.tsx` | 3 cartes : langue (Select), dossier cache (statut + « Auto-détecter » / « Choisir manuellement »), guide setup statique 4 étapes |
| `src/renderer/features/config/index.ts` | API publique : `ConfigView` |

Dépendances partagées : `shared/i18n/LanguageContext` (`language`, `setLanguage`), `shared/i18n/translations` (`LANGUAGE_NAMES`), `@common/types` (`LANGUAGES`), `shared/hooks/useCacheFolder` (côté App).

## Comportement actuel

- `detect()` : `fumbblApi.detectCoaches()` → garde les coachs avec `cachePath` → prend **le premier** ; `alert()` si aucun ou plusieurs. Sauve `{cacheFolder, coachName}`.
- `selectManually()` : `selectFolder()` → `validateCacheFolder()` (présence de `map.json` / dossier valide) → sauve `{cacheFolder, coachName: null}`.
- `onConfigured(folder)` → App met à jour le state et bascule sur l'onglet Rosters.
- La langue est sauvée par `LanguageContext.setLanguage` (load + save complet de `config.json`).

## IPC utilisés

`detectCoaches`, `selectFolder`, `validateCacheFolder`, `loadConfig`, `saveConfig` (voir **main-ipc** : `registry.ts`, `cacheWriter.validateCacheFolder`, `config.ts`).

## Pièges connus

- `alert()` natifs (baseline `no-native-dialog`, carte 8) ; couleurs `text-[#4ade80]`/`text-[#f43f5e]` (baseline `no-hardcoded-color`, carte 9).
- Config relue/réécrite entièrement côté renderer à 3 endroits (ici ×2, LanguageContext) : risque d'écrasement concurrent. `coachName` n'est relu nulle part.
- Plusieurs coachs détectés : le premier gagne sans choix utilisateur.
- Auto-détection Windows uniquement.

## Cible UX (validée)

Onboarding en stepper vivant (cache absent/invalide uniquement), choix explicite du coach détecté, erreurs inline, page Paramètres une fois configuré ; mémorisation du dernier onglet.
Détail : `docs/ux-research.md` §4.1.

## Cartes

#17, #18 — `npm run kanban` pour l'état courant.
