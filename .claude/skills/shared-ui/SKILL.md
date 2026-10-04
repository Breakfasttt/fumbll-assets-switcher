---
name: shared-ui
description: Zone transverse renderer de fumbbl-assets-switcher — shell de l'app (App.tsx, sidebar, onglets), design system (tokens Tailwind, primitives Radix façon shadcn dans shared/ui), composants partagés (ConfirmDialog, ImageZoom, CropEditor), hooks partagés (garde pack actif, config, dimensions), utilitaires, données rosters partagées et i18n (4 langues). Charger avant de toucher un de ces fichiers, d'ajouter un composant UI, une couleur, une clé de traduction ou de modifier la navigation.
---

# Zone shared-ui (renderer transverse)

## Fichiers

### Shell
| Fichier | Rôle |
|---|---|
| `src/renderer/main.tsx` | `createRoot` + import `index.css` |
| `src/renderer/index.css` | directives Tailwind + `body` (fond, couleur, police système 14 px) en dur |
| `src/renderer/global.d.ts` | `window.fumbblApi: FumbblApi` (import type depuis `src/main/preload.ts`, exception déclarée) |
| `src/renderer/app/App.tsx` | providers (`LanguageProvider`, `ConfirmDialogProvider`) + `AppShell` : sidebar 220 px, 5 onglets `div role=button`, statut cache + « Ouvrir le dossier », rendu de la vue active ; Config forcée si pas de cache |

### Design system — `shared/ui` (purs : ni IPC, ni i18n)
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/ui/button.tsx` | `Button` cva : variants default/destructive/outline/ghost, sizes default/sm/icon, `asChild` (Radix Slot) |
| `src/renderer/shared/ui/card.tsx` | `Card`, `CardTitle` |
| `src/renderer/shared/ui/checkbox.tsx` | `Checkbox` Radix |
| `src/renderer/shared/ui/dialog.tsx` | `Dialog`, `DialogTrigger`, `DialogContent` Radix |
| `src/renderer/shared/ui/popover.tsx` | `Popover`, `PopoverTrigger`, `PopoverContent` Radix |
| `src/renderer/shared/ui/select.tsx` | `Select` Radix (Trigger, Value, Content, Item, Group, Label) |

Tokens : `tailwind.config.js` (`app`, `sidebar`, `card`, `card-raised`, `input`, `well`, `border`/`border-strong`, `muted`, `faint`, `accent` (+hover, `accent-active` orange = slot actif), `success`, `danger`) ; radius 6/8 px. Thème sombre unique, hex statiques (pas de variables CSS).
Manquants : Input, Tabs, Tooltip, Toast, Slider, Badge, ToggleGroup, ScrollArea.

### Composants partagés — `shared/components`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/components/ConfirmDialogProvider.tsx` | `ConfirmDialogProvider` + `useConfirm()` → `confirm(message): Promise<boolean>` (Dialog Radix, remplace `window.confirm`) |
| `src/renderer/shared/components/ImageZoomModal.tsx` | `ImageZoomButton` (loupe en bas à droite d'une vignette) → Dialog pan/zoom (molette + range 0,5–8), Reset, « Afficher dans le dossier » (`RevealTarget` override/cacheFile) |
| `src/renderer/shared/components/CropEditor.tsx` | `CropEditor` + `CropTarget` : viewport 360 px au ratio cible, pan pointer, zoom molette/range, sauvegarde PNG `targetWidth×targetHeight` en override (garde pack actif). Utilisé par rosters (panneau) et pitches (dialog) |

### Hooks — `shared/hooks`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/hooks/useActivePackGuard.ts` | `guardAgainstActivePack()` : si un pack est actif, `confirm` avant mutation ; l'appelant fait ensuite `clearActivePack()` |
| `src/renderer/shared/hooks/useCacheFolder.ts` | charge `cacheFolder` depuis la config (`loaded` jamais utilisé → flash de l'écran Config) |
| `src/renderer/shared/hooks/useImageDimensions.ts` | dimensions naturelles d'une image (data URL) |

### Lib — `shared/lib`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/lib/utils.ts` | `cn()` = clsx + tailwind-merge |
| `src/renderer/shared/lib/rosters.ts` | `DIVISION_IDS`, `BB2025_ROSTER_IDS`, `extractAssetId`, `fetchAllRosters`, index « utilisé par » module-level (`indexRosterUsage`, `getRosterUsageIndexReady`, `getRostersUsingAsset`) |

### i18n — `shared/i18n`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/i18n/LanguageContext.tsx` | `LanguageProvider` (charge/sauve `config.language`), `useTranslation()` → `{t, language, setLanguage}`, interpolation `{x}` |
| `src/renderer/shared/i18n/translations.ts` | `LANGUAGE_NAMES`, dictionnaires `en`/`fr`/`es`/`de` (`Dictionary`), `TRANSLATIONS` |

Ajouter une clé : dans les **4** dictionnaires (règle `i18n-parity`), clé `zone.sousZone.nom`, utilisée via `t("…")` littéral (les clés dynamiques `` t(`weather.${w}`) `` sont tolérées par préfixe).

## Règles

- `shared/*` n'importe jamais une feature (`renderer-layers`).
- Couleurs : uniquement via tokens (`no-hardcoded-color`).
- Confirmation : `useConfirm`, jamais `window.confirm`/`alert` (`no-native-dialog`).
- Nouvelle primitive UI : dans `shared/ui`, API façon shadcn (Radix + cva + `cn`), sans texte en dur.

## Pièges connus

- Aucun système de feedback (toast, busy, erreur) ; `alert()` dans config/packs (carte 8).
- Onglet initial toujours « config » ; dernier onglet non mémorisé.
- Navigation et slots en `div role=button`, pas d'`aria-label` sur les boutons icône.
- Pan/zoom pointer dupliqué entre `CropEditor` et `ImageZoomModal` ; `loadImage`/`canvasToPngBase64` dupliqués avec `features/iconset`.
- `index.html` en `lang="fr"` fixe.

## Cible UX (validée)

Tailwind 4 + tokens HSL en variables CSS (#11, #12) ; paquet `radix-ui` + Tooltip/Slider/ToggleGroup/AlertDialog/DropdownMenu (#13) ;
toasts sonner + ConfirmDialog v2 (#8) ; couche react-query (#15) ; shell avec badges, carte pack actif, status bar (#16) ;
raccourcis (#19), palette Ctrl+K (#20), états vides/chargement/erreur (#31), passe a11y/i18n (#32).
Détail : `docs/ux-research.md` §2, §3, §4.8, §5.
