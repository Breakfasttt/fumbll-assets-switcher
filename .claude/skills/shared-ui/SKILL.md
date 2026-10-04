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
| `src/renderer/app/App.tsx` | providers (`QueryClientProvider` tout en haut, `LanguageProvider`, `TooltipProvider`, `ConfirmDialogProvider`, `Toaster`) + `AppShell` : grille sidebar 200 px / contenu / status bar ; rien n'est rendu avant config + vérif du cache (pas de flash) ; Config (onboarding) tant que le cache est absent **ou invalide** (`useCacheValid`), onglets verrouillés ; sinon rouvre `ui.lastTab` ; raccourcis globaux (`Ctrl+1…5` onglets, `Ctrl+Z` = `runLastUndo`, `?` = aide) |
| `src/renderer/app/Sidebar.tsx` | `Sidebar`, `Tab`, `TAB_ORDER` : `<nav>` de vrais `<button aria-current>`, icônes lucide, badges (customs actifs rosters / terrains en `live`, éléments nettoyables en `warning`), onglets désactivés + tooltip tant que pas de cache, `ActivePackCard` en bas |
| `src/renderer/app/ActivePackCard.tsx` | carte « Pack actif » visible partout (nom, nb d'images, « Détacher » = `clearActivePack` + toast) ; rien si aucun pack actif |
| `src/renderer/app/StatusBar.tsx` | barre du bas : santé du cache (`useCacheValid`, point live/danger), chemin tronqué au milieu (tooltip complet), coach, nb d'images custom en jeu, « Ouvrir le dossier », « Raccourcis » |

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
| `src/renderer/shared/ui/command.tsx` | primitives **cmdk** habillées (`Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`) : palette et futures listes filtrables (rosters #21, terrains #27) |
| `src/renderer/shared/ui/toaster.tsx` | `Toaster` sonner habillé aux tokens (monté une fois dans `app/App.tsx`, en bas à droite) |
| `src/renderer/shared/ui/empty-state.tsx` | `EmptyState` (icon, title, description, action) : état vide d'une liste/panneau, textes passés déjà traduits |

Toutes les primitives viennent du paquet unifié `radix-ui` (`import { Dialog as DialogPrimitive } from "radix-ui"`, `Slot.Root`). Les **nouvelles** primitives ont des animations d'ouverture (`tw-animate-css`, classes `animate-in`/`data-[state=closed]:animate-out`) ; Dialog/Popover/Select existants pas encore (changement visible à montrer d'abord).

Thème sombre unique (un thème clair = redéfinir le bloc `:root` de `tokens.css`). Accent d'action unique `primary` (bleu) ; accent d'état unique `live` (vert, ex-orange `accent-active`) pour l'image utilisée en jeu.
Manquants volontairement (docs/ux-research.md §5.4) : Tabs, ScrollArea, ContextMenu. Toast : sonner (#8).

### Composants partagés — `shared/components`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/components/CommandPalette.tsx` | palette **Ctrl+K** (`NavigationTarget {tab, rosterId?, positionName?}`) : groupes Récents (5, `ui.recentCommands`), Aller à, Rosters, Positions (rosters déjà en cache via l'index « utilisé par », aucune requête propre), Langue, Actions. L'app applique la cible (`App.navigate` : sauvegarde `ui` puis remonte la vue via `key`) |
| `src/renderer/shared/components/ShortcutsDialog.tsx` | aide des raccourcis (touche `?` ou bouton de la status bar) : **à tenir à jour** à chaque nouveau `useHotkey` |
| `src/renderer/shared/components/ConfirmDialogProvider.tsx` | `ConfirmDialogProvider` + `useConfirm()` → `confirm(message | {title, description, confirmLabel, destructive}): Promise<boolean>` sur **AlertDialog**. Réservé aux actions irréversibles ; le réversible passe par `notify.undoable` |
| `src/renderer/shared/components/ImageZoomModal.tsx` | `ImageZoomButton` (loupe en bas à droite d'une vignette) → Dialog pan/zoom (molette + range 0,5–8), Reset, « Afficher dans le dossier » (`RevealTarget` override/cacheFile). Racine `<span>` qui stoppe clic/keydown (héritage des slots cliquables, devenu inoffensif depuis #22) |
| `src/renderer/shared/components/AssetSlotPair.tsx` | `AssetSlotPair({slot, aspectRatio, thumbHeight, defaultCaption?, onFile?, onRecrop?, sharedBy?, owner?})` : paire Défaut/Custom d'un asset (portrait, iconset, terrain). Image en jeu choisie par `ToggleGroup` (`aria-label`, Custom désactivé + tooltip sans override) ; vignettes **non cliquables** sur `bg-well`, liseré `border-live` + Badge « En jeu », `pixelated` seulement si agrandie, `Skeleton` au ratio, dimensions `tabular-nums`, loupe sur chaque vignette ; vignette custom = dropzone (drag-over pointillé primary + « Déposer pour remplacer ») + input file caché ; actions `IconButton` Remplacer / Recadrer (si `onRecrop`) / Supprimer sous la vignette custom, menu ⋯ (afficher dans le dossier, copier l'URL) à droite du ToggleGroup ; vignette custom vide = texte + bouton « Choisir un fichier… » dans la dropzone (icône masquée sous 120 px de haut) ; « Partagé par » tronqué + tooltip, avertissement `warning` si > 1 roster (`owner` exclu de la liste). `onFile` absent = `slot.saveFile`. Repères e2e : `data-testid="asset-slot-pair"`, `data-slot="default\|custom"`, `data-in-game`, `slot-toggle-*`, `slot-replace/recrop/delete/menu/choose-file`, `in-game-badge`, `slot-file-input`, `shared-by`, `shared-warning` |
| `src/renderer/shared/components/CropEditor.tsx` | `CropEditor` + `CropTarget` : viewport 360 px au ratio cible, pan pointer, zoom molette/range, sauvegarde PNG `targetWidth×targetHeight` en override (garde pack actif). Utilisé par rosters (panneau) et pitches (dialog) |

### Hooks — `shared/hooks`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/hooks/useActivePackGuard.ts` | `guardAgainstActivePack()` : si un pack est actif (lu dans le cache `packs` via `fetchQuery(packsQuery)`, pas d'IPC par mutation), `confirm` avant mutation ; l'appelant fait ensuite `useClearActivePack()` |
| `src/renderer/shared/hooks/useUiMemory.ts` | `useUiMemory()` → `{ui, remember(patch)}` : mémoire de navigation persistée dans `config.json` (`AppConfig.ui` : `lastTab`, `lastRosterId`, `showSpecialRosters`, `lastPositionName`, `lastPitchKey`) ; lire pour l'état initial, `remember` à chaque changement |
| `src/renderer/shared/hooks/useOverrideUndo.ts` | `notifyOverrideUndo(msg, {cacheFolder, url, versionId})` : toast `notify.undoable` dont « Annuler » appelle `useRestoreOverride` (puis toast `common.restoredToast` / `common.undoFailedToast`) ; rien si `versionId` absent (rien n'a été remplacé) |
| `src/renderer/shared/hooks/useAssetSlot.ts` | `useAssetSlot(cacheFolder, url \| null)` → `AssetSlotState` : `defaultImage/defaultError/defaultLoading`, `override`, `customImage/customLoading`, `customActive`, `activeImage` (celle que charge le jeu), `setActive(bool)`, `saveFile(file)` (save direct + toast « remplacé » avec Annuler), `remove()` (toast Annuler, pas de confirmation) ; chaque mutation passe par `guardAgainstActivePack` puis `useClearActivePack`. Source unique pour `AssetSlotPair`, `AssetPanel`, `PitchWeatherSlot` |
| `src/renderer/shared/hooks/useHotkey.ts` | `useHotkey(combo \| combo[], handler, {enabled, allowInInput, preventDefault})` : raccourci global (`"ctrl+k"`, `"escape"`, `"?"`), ignoré pendant la saisie sauf `allowInInput`. Maison volontairement (pas de lib) |
| `src/renderer/shared/hooks/useImageDimensions.ts` | dimensions naturelles d'une image (data URL) |

### Lib — `shared/lib`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/lib/format.ts` | `isPitchUrl(url)` (override de terrain), `truncateMiddle(text, max)` (chemins) |
| `src/renderer/shared/lib/notify.ts` | **seul canal de feedback** (+ `runLastUndo()` : rejoue le dernier « Annuler » encore affiché, branché sur Ctrl+Z) : `notify.success/error/warning(msg, description?)`, `notify.promise(p, {loading, success, error})` (opérations longues), `notify.undoable(msg, {label, run})` (toast 6 s avec « Annuler »). Textes passés déjà traduits |
| `src/renderer/shared/lib/utils.ts` | `cn()` = clsx + tailwind-merge **étendu** avec `COLOR_TOKENS` (liste des tokens couleur, synchronisée avec `tokens.css` — règle check-arch `twmerge-tokens`) et l'ombre `overlay` |
| `src/renderer/shared/lib/rosters.ts` | données pures : `DIVISION_IDS`, `BB2025_ROSTER_IDS`, `extractAssetId`, `fetchAllRosters` (queryFn de `useRosterList`), `buildRosterUsageIndex(rosters)` → `Map<url, noms triés>` (queryFn de `useRosterUsageIndex`). Plus de cache module : le cache est react-query |

### Données — `shared/api` (n'importe que `shared/api`, `shared/lib` : ni i18n, ni composants)
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/api/queryClient.ts` | `queryClient` (pas de `refetchOnWindowFocus`, `retry: 1`, `staleTime` 5 min par défaut, mutations sans retry) ; `queryKeys` = **seule** source des clés |
| `src/renderer/shared/api/queries.ts` | options réutilisables (`configQuery`, `rosterListQuery`, `rosterQuery(id)`, `packsQuery`, `overrideQuery(url)`) + hooks : `useConfig` (∞), `useRosterList` (∞), `useRoster(id)` (1 h), `useRosterUsageIndex` (∞, construit depuis la liste + chaque roster, qui atterrit aussi dans le cache `useRoster`), `useDefaultAsset(cacheFolder, url)` (∞, `null` = échec de téléchargement), `useOverride(url)` → `{entry, image}`, `useOverrides` (index complet, pour les badges #16), `useInactiveOverrides`, `useOrphanFiles(cacheFolder)` (`staleTime: 0` : le jeu écrit dans son cache), `useOrphanImage`, `usePacks` (∞), `useActivePack` (`select` sur `packs`) |
| `src/renderer/shared/api/mutations.ts` | `useSaveOverride`, `useSetOverrideActive`, `useDeleteOverride` (→ `versionId \| null`), `useRestoreOverride`, `useActivatePack`, `useDeletePack`, `useClearActivePack`, `useImportPack`, `useExportPack`, `useDeleteOrphanFile`, `useSaveConfig(patch)` (fusionne avec la config en cache, met le cache à jour **avant** l'IPC) |

Invalidation (dans `onSettled` des mutations, jamais dans les composants) :

| Mutation | Clés invalidées |
|---|---|
| save / setActive / delete / restore override | `override(url)`, `overrides`, `inactiveOverrides`, `packs` (l'appelant clear le pack actif) |
| activate / delete pack | `overrideAll` (toutes les `override(url)`), `overrides`, `inactiveOverrides`, `packs` |
| clearActivePack, importPack | `packs` |
| deleteOrphanFile | `orphanFiles(cacheFolder)` + suppression de `orphanImage(cacheFolder, fileName)` |
| saveConfig | `config` mis à jour directement (`setQueryData`), invalidé si erreur |
| exportPack | rien |

**Ajouter une ressource** : clé dans `queryKeys` → hook dans `queries.ts` (`window.fumbblApi.x` écrit en toutes lettres : `check-arch ipc-unused` cherche ce texte) avec un `staleTime` justifié → pour chaque mutation qui la modifie, l'invalider dans `mutations.ts`. Les composants ne font jamais `useEffect` + `useState` + `refresh()` sur un IPC de lecture ; les commandes sans donnée en cache (`openCacheFolder`, `selectFolder`, `showOverrideInFolder`, `detectCoaches`…) restent des appels directs.

### i18n — `shared/i18n`
| Fichier | Rôle |
|---|---|
| `src/renderer/shared/i18n/LanguageContext.tsx` | `LanguageProvider` (`config.language` lu via `useConfig`, sauvé via `useSaveConfig`), `useTranslation()` → `{t, language, setLanguage}`, interpolation `{x}` |
| `src/renderer/shared/i18n/translations.ts` | `LANGUAGE_NAMES`, dictionnaires `en`/`fr`/`es`/`de` (`Dictionary`), `TRANSLATIONS` |

Ajouter une clé : dans les **4** dictionnaires (règle `i18n-parity`), clé `zone.sousZone.nom`, utilisée via `t("…")` littéral (les clés dynamiques `` t(`weather.${w}`) `` sont tolérées par préfixe).

## Règles

- `shared/*` n'importe jamais une feature (`renderer-layers`).
- Couleurs : uniquement via tokens. `check-arch` refuse les hex/`rgb()`/`hsl()` hors `tokens.css`, les couleurs de la palette Tailwind (`text-white`, `bg-gray-500`…) et toute classe de couleur vers un token inexistant (`unknown-color-token`, ex. `bg-card` → aucun style généré).
- Images : sur fond uni `bg-well` (**pas de damier** : essayé en #12, refusé par l'utilisateur) ; chiffres (tailles, px, Ko) en `tabular-nums`.
- Données IPC : toujours via `shared/api` (query + mutation qui invalide), jamais d'état local rafraîchi à la main.
- Feedback : `notify.*` ; confirmation (irréversible uniquement) : `useConfirm` ; jamais `window.confirm`/`alert` (`no-native-dialog`).
- Nouvelle primitive UI : dans `shared/ui`, API façon shadcn (Radix + cva + `cn`), sans texte en dur.

## Pièges connus

- Plus de `div role=button` : slots d'asset = `AssetSlotPair` + ToggleGroup (#22), navigation = vrais boutons (#16).
- Pan/zoom pointer dupliqué entre `CropEditor` et `ImageZoomModal` ; `loadImage`/`canvasToPngBase64` dupliqués avec `features/iconset`.
- `index.html` en `lang="fr"` fixe.

## Cible UX (validée)

Tailwind 4 + tokens HSL en variables CSS (#11, #12) ; paquet `radix-ui` + Tooltip/Slider/ToggleGroup/AlertDialog/DropdownMenu (#13) ;
toasts sonner + ConfirmDialog v2 (#8) ; couche react-query (#15, faite) ; shell avec badges, carte pack actif, status bar (#16) ;
raccourcis (#19), palette Ctrl+K (#20), états vides/chargement/erreur (#31), passe a11y/i18n (#32).
Détail : `docs/ux-research.md` §2, §3, §4.8, §5.
