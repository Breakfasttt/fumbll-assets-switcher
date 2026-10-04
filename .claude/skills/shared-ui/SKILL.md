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
| `src/renderer/index.css` | `@import "tailwindcss"` + tokens, couche base : bordure par défaut `--border`, `body` 13 px police système, scrollbars fines, focus-visible global (`--ring`), curseur pointer des boutons, `prefers-reduced-motion`. **Aucune couleur littérale** |
| `src/renderer/global.d.ts` | `window.fumbblApi: FumbblApi` (import type depuis `src/main/preload.ts`, exception déclarée) |
| `src/renderer/app/App.tsx` | providers (`LanguageProvider`, `ConfirmDialogProvider`) + `AppShell` : sidebar 220 px, 5 onglets `div role=button`, statut cache + « Ouvrir le dossier », rendu de la vue active ; Config forcée si pas de cache |

### Tokens — `shared/styles`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/styles/tokens.css` | **seule source de couleurs** : variables HSL sémantiques sur `:root` (`--background`, `--surface`, `--surface-raised`, `--field`, `--well`, `--overlay`, `--foreground`, `--muted-foreground`, `--faint-foreground`, `--border`, `--border-strong`, `--ring`, `--primary(-hover/-foreground)`, `--live(-foreground)` = « utilisé en jeu », `--warning`, `--danger(-hover/-foreground)`), exposées en classes via `@theme inline` (`bg-surface`, `text-muted-foreground`…) ; polices `--font-sans` (Segoe UI Variable) / `--font-mono` ; rayons `--radius` 6 / `-lg` 8 / `-xl` 10 px |

### Design system — `shared/ui` (purs : ni IPC, ni i18n)
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/ui/button.tsx` | `Button` cva : variants default/destructive/outline/ghost, sizes default/sm/icon, `asChild` (Radix Slot) |
| `src/renderer/shared/ui/card.tsx` | `Card`, `CardTitle` |
| `src/renderer/shared/ui/checkbox.tsx` | `Checkbox` Radix |
| `src/renderer/shared/ui/dialog.tsx` | `Dialog`, `DialogTrigger`, `DialogContent` Radix |
| `src/renderer/shared/ui/popover.tsx` | `Popover`, `PopoverTrigger`, `PopoverContent` Radix |
| `src/renderer/shared/ui/select.tsx` | `Select` Radix (Trigger, Value, Content, Item, Group, Label) |
| `src/renderer/shared/ui/tooltip.tsx` | `TooltipProvider` (monté une fois dans `app/App.tsx`), `Tooltip`, `TooltipTrigger`, `TooltipContent` |
| `src/renderer/shared/ui/icon-button.tsx` | `IconButton` : bouton icône seule, `label` **obligatoire** (= `aria-label` + tooltip), `hint` optionnel (raccourci). À utiliser pour toute action en icône |
| `src/renderer/shared/ui/slider.tsx` | `Slider` Radix (zoom crop / visionneuse / éditeur pixel) — remplace les `input type=range` natifs |
| `src/renderer/shared/ui/toggle-group.tsx` | `ToggleGroup`, `ToggleGroupItem` (sizes default/sm) : contrôle segmenté pour les choix exclusifs (Défaut/Custom, météos, BB2025/Tous, outils pixel) |
| `src/renderer/shared/ui/alert-dialog.tsx` | `AlertDialog` + Content/Title/Description/Footer/Cancel/Action (`destructive`) : confirmation d'une action **irréversible**, libellé d'action explicite |
| `src/renderer/shared/ui/dropdown-menu.tsx` | `DropdownMenu` + Trigger/Content/Item (`destructive`)/Label/Separator : menus « ⋯ » d'actions secondaires |
| `src/renderer/shared/ui/input.tsx` | `Input` + `fieldClasses` (style commun des champs, `aria-invalid` → bordure danger) |
| `src/renderer/shared/ui/textarea.tsx` | `Textarea` (réutilise `fieldClasses`) |
| `src/renderer/shared/ui/badge.tsx` | `Badge` cva : default / primary / live (en jeu) / warning / danger / outline ; compteurs en `tabular-nums` |
| `src/renderer/shared/ui/skeleton.tsx` | `Skeleton` : placeholder de chargement aux dimensions exactes du contenu |
| `src/renderer/shared/ui/kbd.tsx` | `Kbd` : affichage d'un raccourci clavier |
| `src/renderer/shared/ui/toaster.tsx` | `Toaster` sonner habillé aux tokens (monté une fois dans `app/App.tsx`, en bas à droite) |
| `src/renderer/shared/ui/empty-state.tsx` | `EmptyState` (icon, title, description, action) : état vide d'une liste/panneau, textes passés déjà traduits |

Toutes les primitives viennent du paquet unifié `radix-ui` (`import { Dialog as DialogPrimitive } from "radix-ui"`, `Slot.Root`). Les **nouvelles** primitives ont des animations d'ouverture (`tw-animate-css`, classes `animate-in`/`data-[state=closed]:animate-out`) ; Dialog/Popover/Select existants pas encore (changement visible à montrer d'abord).

Thème sombre unique (un thème clair = redéfinir le bloc `:root` de `tokens.css`). Accent d'action unique `primary` (bleu) ; accent d'état unique `live` (vert, ex-orange `accent-active`) pour l'image utilisée en jeu.
Manquants volontairement (docs/ux-research.md §5.4) : Tabs, ScrollArea, ContextMenu. Toast : sonner (#8).

### Composants partagés — `shared/components`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/components/ConfirmDialogProvider.tsx` | `ConfirmDialogProvider` + `useConfirm()` → `confirm(message | {title, description, confirmLabel, destructive}): Promise<boolean>` sur **AlertDialog**. Réservé aux actions irréversibles ; le réversible passe par `notify.undoable` |
| `src/renderer/shared/components/ImageZoomModal.tsx` | `ImageZoomButton` (loupe en bas à droite d'une vignette) → Dialog pan/zoom (molette + range 0,5–8), Reset, « Afficher dans le dossier » (`RevealTarget` override/cacheFile). Racine `<span>` qui stoppe clic/keydown : les événements React traversent le portal et remonteraient au slot parent |
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
| `src/renderer/shared/lib/notify.ts` | **seul canal de feedback** : `notify.success/error/warning(msg, description?)`, `notify.promise(p, {loading, success, error})` (opérations longues), `notify.undoable(msg, {label, run})` (toast 6 s avec « Annuler »). Textes passés déjà traduits |
| `src/renderer/shared/lib/utils.ts` | `cn()` = clsx + tailwind-merge **étendu** avec `COLOR_TOKENS` (liste des tokens couleur, synchronisée avec `tokens.css` — règle check-arch `twmerge-tokens`) et l'ombre `overlay` |
| `src/renderer/shared/lib/rosters.ts` | `DIVISION_IDS`, `BB2025_ROSTER_IDS`, `extractAssetId`, `fetchAllRosters`, index « utilisé par » module-level (`indexRosterUsage`, `getRosterUsageIndexReady`, `getRostersUsingAsset`) |

### i18n — `shared/i18n`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/i18n/LanguageContext.tsx` | `LanguageProvider` (charge/sauve `config.language`), `useTranslation()` → `{t, language, setLanguage}`, interpolation `{x}` |
| `src/renderer/shared/i18n/translations.ts` | `LANGUAGE_NAMES`, dictionnaires `en`/`fr`/`es`/`de` (`Dictionary`), `TRANSLATIONS` |

Ajouter une clé : dans les **4** dictionnaires (règle `i18n-parity`), clé `zone.sousZone.nom`, utilisée via `t("…")` littéral (les clés dynamiques `` t(`weather.${w}`) `` sont tolérées par préfixe).

## Règles

- `shared/*` n'importe jamais une feature (`renderer-layers`).
- Couleurs : uniquement via tokens. `check-arch` refuse les hex/`rgb()`/`hsl()` hors `tokens.css`, les couleurs de la palette Tailwind (`text-white`, `bg-gray-500`…) et toute classe de couleur vers un token inexistant (`unknown-color-token`, ex. `bg-card` → aucun style généré).
- Images : sur fond uni `bg-well` (**pas de damier** : essayé en #12, refusé par l'utilisateur) ; chiffres (tailles, px, Ko) en `tabular-nums`.
- Feedback : `notify.*` ; confirmation (irréversible uniquement) : `useConfirm` ; jamais `window.confirm`/`alert` (`no-native-dialog`).
- Nouvelle primitive UI : dans `shared/ui`, API façon shadcn (Radix + cva + `cn`), sans texte en dur.

## Pièges connus

- Onglet initial toujours « config » ; dernier onglet non mémorisé.
- Navigation et slots en `div role=button`, pas d'`aria-label` sur les boutons icône.
- Pan/zoom pointer dupliqué entre `CropEditor` et `ImageZoomModal` ; `loadImage`/`canvasToPngBase64` dupliqués avec `features/iconset`.
- `index.html` en `lang="fr"` fixe.

## Cible UX (validée)

Tailwind 4 + tokens HSL en variables CSS (#11, #12) ; paquet `radix-ui` + Tooltip/Slider/ToggleGroup/AlertDialog/DropdownMenu (#13) ;
toasts sonner + ConfirmDialog v2 (#8) ; couche react-query (#15) ; shell avec badges, carte pack actif, status bar (#16) ;
raccourcis (#19), palette Ctrl+K (#20), états vides/chargement/erreur (#31), passe a11y/i18n (#32).
Détail : `docs/ux-research.md` §2, §3, §4.8, §5.
