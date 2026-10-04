# FUMBBL Assets Switcher — Recherche UX/UI et plan de refonte

Date : 2026-10-04. Périmètre lu : `src/renderer/app/App.tsx`, `features/*` (config, rosters, asset-editor, iconset, pitches, packs, orphans), `shared/*` (ui, components, hooks, i18n, lib), `src/main/preload.ts` (surface IPC), `tailwind.config.js`, `index.css`, `package.json`.

**Statut : validé par l'utilisateur le 2026-10-04 (carte #10).** Les cartes de refonte sont en `kanban/2_a_implementer/` ; les numéros `#N` ci-dessous sont leurs ids.

**Décisions utilisateur postérieures** : pas de damier de transparence derrière les images (fond uni `bg-well`) — toutes les mentions de damier ci-dessous sont caduques.

Ce document est une **recommandation**, pas un catalogue d'options. Quand il y a un choix, il est tranché.

---

## 0. Diagnostic express (ce que le code montre vraiment)

| # | Constat (code) | Impact UX |
|---|---|---|
| D1 | `App.tsx` : `useState<Tab>("config")` → on démarre toujours sur Config, même configuré. Nav = `div role="button"`. | Un clic perdu à chaque lancement ; a11y faible. |
| D2 | Pas de couche de données : chaque vue fait `useEffect` + `useState` + `refresh()` manuel. `fetchAllRosters()` est rappelé dans `RosterView`, `PitchView`, `OrphansView` à chaque montage. `AssetPanel` et `PitchWeatherSlot` ré-implémentent la même logique override (≈120 lignes dupliquées). | Latence à chaque changement d'onglet, états incohérents entre onglets (ex. activer un pack ne rafraîchit pas un AssetPanel monté). |
| D3 | `AssetSlot`/`DropSlot` : la carte entière est `role="button"` et contient `ImageZoomButton`, le bouton ✕ et "Recadrer" → boutons imbriqués dans un bouton ; la loupe ne fait pas `stopPropagation` → **bug** : zoomer active le slot (et peut déclencher la garde pack). | Action destructive/mutante déclenchée par un geste de consultation. |
| D4 | État actif = bordure accent bleue + pastille orange de 10 px. Aucun libellé "Actif / Utilisé en jeu". | L'utilisateur ne sait pas ce que le client FUMBBL affichera. |
| D5 | `alert()` natifs (Config ×3, Packs ×2) ; aucune confirmation sur suppression d'orphelins ; aucune notification de succès ; aucun busy state pendant les IPC (export zip, import, activation pack). | Incertitude ("ça a marché ?"), double-clics, perte de données sans filet. |
| D6 | `useActivePackGuard` refait un `listPacks()` IPC à chaque mutation et la seule trace du pack actif est dans l'onglet Packs. | L'utilisateur découvre le pack actif via une modale bloquante. |
| D7 | Crop : panneau sticky (portraits) vs `Dialog` (pitches) ; `input type=range` natif non stylé ; zoom molette non centré sur le curseur ; pas de clavier. | Incohérence, précision faible. |
| D8 | Pixel editor : palette fixe 12 couleurs saturées (aucune n'appartient aux sprites FUMBBL), pas d'undo, pas de pipette, sélection cellule via 2 `Select`, zoom fixe ×16 (30 px → 480 px). | Inutilisable pour retoucher un sprite existant (impossible de reprendre une couleur du sprite). |
| D9 | "Répéter une variante" écrase l'override existant sans prévenir ni undo. | Perte silencieuse d'un travail custom. |
| D10 | Couleurs en dur (`text-[#4ade80]`, `text-[#f43f5e]`, `body { background:#17171c }`), `ATLAS_COLUMN_LABELS` en anglais non traduits, `PALETTE` hex. | Thème non évolutif, i18n incomplète. |
| D11 | **`tailwind-merge@^3.7` avec `tailwindcss@^3.4`** : tailwind-merge v3 ne supporte que Tailwind v4 (les clés d'échelle ont changé). De plus les couleurs custom (`text-muted`, `border-strong`) ne sont pas déclarées à twMerge → risque de fusion erronée (`text-xs` vs `text-muted`). | Bugs de classes silencieux dans `cn()`. Argument fort pour migrer en Tailwind 4 (voir §5). |
| D12 | Packs : l'IPC `exportPack(name, description, dest)` accepte déjà une description, l'UI passe `undefined`. Pas de "désactiver", pas d'aperçu. | Fonctionnalité backend non exposée. |

---

## 1. Recherche : patterns d'outils comparables

### 1.1 Gestionnaires de mods (Vortex, MO2, r2modman, CurseForge)
- **Toggle par élément + action de masse** : Vortex gère l'activation par toggles et une barre d'action contextuelle apparaît en bas quand on sélectionne plusieurs mods (Ctrl+A → ENABLE/DISABLE/REMOVE). → Pour nous : toggle explicite "Défaut / Custom" par asset, et sélection multiple + barre d'action dans Orphelins. ([techspot Vortex](https://www.techspot.com/downloads/7759-vortex-mod-manager.html), [forums Nexus](https://forums.nexusmods.com/topic/8407498-vortex-doesnt-deploy-modslinks/))
- **Indicateurs d'état compacts avec tooltip** : MO2 affiche une colonne "Flags" (éclair +/−) dont la signification est donnée au survol ("Overwrites files"/"Overwritten files"). → Badges d'état compacts (Custom actif, Custom inactif, Vient d'un pack) dans la liste des positions/rosters, explicités par Tooltip. ([STEP forum MO2 flags](https://stepmodifications.org/forum/topic/2441-why-does-mod-organizer-have-so-many-flags/), [Steam discussion](https://steamcommunity.com/app/489830/discussions/0/3780245614661552114))
- **Profils = ensembles nommés, partageables, basculables en un clic** : r2modman met les profils au centre (switch rapide, export/import par fichier ou code). → Nos "Packs" sont des profils : le pack actif doit être visible **partout** (shell), activable/désactivable en un clic, avec description. ([r2modman sur Thunderstore](https://thunderstore.io/c/cult-of-the-lamb/p/ebkr/r2modman/v/3.0.28/), [fork r2modmanPlus](https://github.com/SprigWave/r2modmanPlus))
- **Staging vs déploiement** : Vortex distingue mods "staged" et "deployed". Notre équivalent est override actif/inactif ; le vocabulaire UI doit dire "Utilisé en jeu" plutôt que "actif".

### 1.2 Éditeurs pixel (Aseprite, Piskel, Lospec)
- Raccourcis canoniques : **B** crayon, **E** gomme, **Alt maintenu** = pipette temporaire ("quick tool"), **Espace maintenu** = main, **Ctrl+Z** undo. ([Aseprite keyboard shortcuts](https://aseprite.org/docs/keyboard-shortcuts/), [Aseprite community – quick eyedropper](https://community.aseprite.org/t/eye-drop-tool-active-only-when-alt-in-pressed/3374))
- **Couleur primaire (clic gauche) / secondaire (clic droit)**, la secondaire pouvant être "transparent" = gomme implicite (Piskel). ([Piskel tuto Udemy](https://www.udemy.com/tutorial/learn-to-create-pixel-art-for-your-game/piskel-image-editor/))
- **Palette issue de l'image** (Lospec met les palettes au cœur du workflow). → Notre palette doit être **extraite du sprite** (couleurs uniques de la feuille) + couleurs récentes + sélecteur libre. ([Lospec alternatives](https://alternativeto.net/software/lospec-pixel-editor))

### 1.3 Crop (react-easy-crop / Cropper)
- Interactions attendues : drag, zoom molette **centré sur le pointeur**, flèches clavier (`keyboardStep`), `restrictPosition` (pas de bords vides), retour `croppedAreaPixels` entiers (`roundCropAreaPixels`). ([react-easy-crop README](https://github.com/ValentinH/react-easy-crop))

### 1.4 Comparaison avant/après
- Deux patterns : **slider à poignée** (deux images empilées, révélation par glissement, accessible clavier) et **toggle maintenu** (afficher l'original tant qu'on presse). ([Framer before/after slider](https://www.framer.com/marketplace/plugins/before-after-slider/)) → Pour des images de 95×147 ou 30×30, le slider est peu lisible ; on retient **côte à côte + segmented control "Défaut | Custom"** pour le choix, et dans la modale de zoom un **"maintenir Espace/clic = voir l'original"** (zéro dépendance). Pour les pitches (782×452), slider de comparaison maison dans la modale de zoom (≈40 lignes, pas de lib).

### 1.5 Feedback, destruction, undo
- Les dialogues de confirmation préviennent peu d'erreurs (habituation, cf. Aza Raskin) ; préférer **undo pendant 5–10 s** pour le réversible, réserver la confirmation à l'irréversible et la rédiger spécifiquement (pas "Êtes-vous sûr ?"). ([dev.to – confirm vs undo vs soft delete](https://dev.to/137foundry/how-to-choose-between-confirmation-dialogs-undo-windows-and-soft-delete-patterns-1opj), [uxdesign.cc – microcopy confirmation](https://uxdesign.cc/are-you-sure-you-want-to-do-this-microcopy-for-confirmation-dialogues-1d94a0f73ac6))
- Sonner : `toast.promise`, bouton d'action (undo), thème sombre, accessibilité intégrée. ([sonner](https://sonner.emilkowal.ski/))

### 1.6 Command palette
- Ctrl+K, filtrage à chaque frappe, flèches + Entrée, récents en tête quand l'input est vide, raccourcis affichés à droite, groupes (Navigation / Actions), focus trap. ([Hubtel DS – Command palette](https://ux.hubtel.com/design-system/components/command-palette/), [techinterview – Cmd+K](https://www.techinterview.org/post/3233475212/build-command-palette-cmd-k/))

### 1.7 Electron / desktop
- Barre de titre custom possible via `titleBarOverlay` + `env(titlebar-area-*)` ; **non recommandé ici** (coût, peu de valeur pour un outil utilitaire). On garde le cadre natif Windows. ([Electron – Custom Title Bar](https://electronjs.org/docs/latest/tutorial/custom-title-bar))
- TanStack Query accepte n'importe quel `queryFn` asynchrone → l'IPC Electron est un cas d'usage direct ; invalidation dans `onSuccess`/`onSettled` des mutations. ([TanStack – invalidations from mutations](https://www.mintlify.com/tanstack/query/guides/invalidations-from-mutations))

---

## 2. Direction visuelle globale

### 2.1 Principe
"**Outil d'atelier sombre et dense**" : le contenu (sprites pixel art, portraits, terrains) est la seule chose colorée de l'écran. Chrome neutre gris-bleuté, **un seul accent d'action** (bleu) et **un seul accent d'état "utilisé en jeu"** (vert — on abandonne l'orange qui se confond avec warning). Pas de dégradés, pas de glassmorphism.

### 2.2 Tokens (variables CSS, HSL, prêts pour un thème clair)
Convention shadcn (paires `x` / `x-foreground`, `border`, `input`, `ring`) ([shadcn theming](https://ui.shadcn.com/docs/theming)). Valeurs HSL complètes dans la variable (compatible TW4 `@theme inline` et opacités via `color-mix`).

```css
:root, [data-theme="dark"] {
  /* surfaces (du plus profond au plus haut) */
  --background:        hsl(240 9% 10%);   /* ≈ #17171c actuel */
  --sidebar:           hsl(240 9% 11.5%);
  --surface:           hsl(240 9% 15%);   /* card  ≈ #23232b */
  --surface-raised:    hsl(240 9% 18%);   /* hover/selected */
  --well:              hsl(240 8% 7%);    /* fond derrière les images */
  --overlay:           hsl(240 10% 4% / 0.7);

  --foreground:        hsl(240 10% 92%);
  --muted-foreground:  hsl(240 5% 57%);
  --faint-foreground:  hsl(240 5% 40%);

  --border:            hsl(240 8% 23%);
  --border-strong:     hsl(240 8% 30%);
  --input:             hsl(240 8% 30%);
  --ring:              hsl(230 100% 70%);

  --primary:           hsl(231 99% 62%);  /* #3d5afe */
  --primary-hover:     hsl(231 100% 67%);
  --primary-foreground:hsl(0 0% 100%);

  --live:              hsl(142 69% 58%);  /* "utilisé en jeu" (ex-success) */
  --live-foreground:   hsl(142 80% 10%);
  --warning:           hsl(38 91% 55%);   /* pack actif, attention */
  --danger:            hsl(350 89% 60%);
  --danger-foreground: hsl(0 0% 100%);

  --checker-a: hsl(240 6% 14%);           /* damier transparence */
  --checker-b: hsl(240 6% 18%);

  --radius: 6px;
}
[data-theme="light"] { /* même liste, valeurs claires — non livré en v1, mais aucun hex en dur ne doit subsister */ }
```
Règles : **zéro hex/arbitrary color dans les composants** (règle `no-hardcoded-color` de `check-arch.mjs`, déjà en place pour les `.tsx`). ~~Les images transparentes sont toujours posées sur un **damier**~~ — **décision utilisateur (2026-10-04, #12) : pas de damier**, les images restent sur le fond uni `bg-well`.

### 2.3 Typographie : police système, pas de webfont
- `font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;` — l'app cible Windows (auto-détection), les autres OS retombent sur `system-ui`, Segoe UI Variable est sur toutes les Win11, hinting ClearType natif, 0 Ko, rendu identique aux dialogues natifs (sélection dossier/zip) qu'elle ouvre. Inter apporterait ~50–100 Ko de woff2 et un rendu moins net à 13 px sous Windows sans bénéfice produit. **@fontsource rejeté.**
- Mono : `"Cascadia Mono", Consolas, monospace` pour URLs d'assets, noms de fichiers MD5, tailles.
- `font-variant-numeric: tabular-nums` sur dimensions (`95×147 px`), compteurs, tailles fichiers.
- Échelle (px) : 11 (caption/badge) · 12 (secondaire) · **13 (corps, nouveau défaut — 14 actuel est trop gros pour la densité visée)** · 15 (titre de carte) · 18 (titre de page). Poids : 400 / 600 uniquement.

### 2.4 Espacement, rayon, élévation
- Grille 4 px : 4 · 8 · 12 · 16 · 24 · 32. Padding carte 16, gap sections 16, page 24. Hauteurs de contrôles : 28 (sm) / 32 (défaut, au lieu de 36) — densité "outil".
- Rayon : `--radius` 6 px (contrôles), 8 px (cartes), 10 px (dialogs). Vignettes d'assets : 4 px.
- Élévation sans ombres lourdes en sombre : niveaux par **luminosité de surface** (background → surface → surface-raised) + bordure 1 px ; ombre réservée aux overlays (popover, dialog, toast) : `0 8px 24px hsl(240 10% 2% / .5)`.

### 2.5 Iconographie
lucide-react systématique, taille 16 (inline) / 14 (dans boutons sm), `strokeWidth 1.75`. Mapping fixe (à centraliser dans `shared/ui/icons.ts`) :
Config `Settings` · Rosters `Users` · Terrains `LandPlot` (ou `Map`) · Packs `Package` · Orphelins `Trash2`/`Ghost` · Zoom `Maximize2` · Recadrer `Crop` · Supprimer `Trash2` · Importer `Upload`/`FileUp` · Exporter `Download` · Dossier `FolderOpen` · Prompt IA `Sparkles` · Copier `Copy` · Undo `Undo2` · Pipette `Pipette` · Crayon `Pencil` · Gomme `Eraser` · Répéter variante `CopyPlus` · Actif en jeu `CircleCheck` · Pack `Layers` · Erreur `TriangleAlert`. Tout bouton icône seule ⇒ `aria-label` + `Tooltip`. Les "✕" et "..." texte disparaissent.

### 2.6 Motion
Minimale, CSS uniquement, pilotée par `data-state` Radix : fade+scale 120 ms pour popover/dialog, slide 150 ms pour toasts (géré par sonner), `transition-colors 100ms` sur interactifs. `@media (prefers-reduced-motion: reduce)` → durées à 0. Plugin CSS `tw-animate-css` (zéro JS). **framer-motion/motion rejeté.**

### 2.7 Accessibilité (non négociable)
- Plus aucun `div role="button"` : nav = `<button>`/liste, slots = `ToggleGroup`, cellules = `<button>`.
- Focus visible unique : `outline: 2px solid var(--ring); outline-offset: 2px` via `:focus-visible` global.
- Pas de bouton dans un bouton (corrige D3).
- `aria-label` sur toute icône seule, `aria-live` via sonner pour les retours, `alt` sur toutes les `<img>` ("Portrait par défaut — Lineman, Humain").
- Contraste : muted-foreground ≥ 4.5:1 sur surface (57 % L sur 15 % L ≈ OK) ; faint réservé au non-essentiel.
- Navigation clavier complète des listes (flèches dans la liste de positions, `Home/End`).

### 2.8 États : vide / chargement / erreur
Composants partagés : `<EmptyState icon title description action/>`, `<Skeleton/>` (vignettes au ratio exact de l'asset → zéro layout shift), `<ErrorState error onRetry/>` (avec "Réessayer" branché sur `refetch` de react-query). Le "..." actuel dans les slots est remplacé par un skeleton damier animé.

### 2.9 Système de feedback
| Situation | Pattern |
|---|---|
| Mutation réversible (activer Défaut/Custom, supprimer override, répéter variante, enregistrer pixel/crop, supprimer orphelin) | **Toast succès + "Annuler"** (6 s). Pas de confirmation. |
| Irréversible et rare (supprimer un pack, purger tous les orphelins, changer de dossier cache) | **AlertDialog** au libellé spécifique ("Supprimer le pack « Nains rétro » (42 images) ?"), bouton destructif nommé ("Supprimer le pack"). |
| Opération longue (export/import zip, activation pack, détection registre) | Bouton en état `loading` (spinner + disabled) + `toast.promise`. |
| Erreur IPC | Toast erreur avec message + action "Détails"/"Réessayer". `alert()` banni. |
| Pack actif + modif ad hoc | Plus de modale : bannière persistante dans le shell + toast informatif "Le pack X a été détaché, vos modifs sont ad hoc" avec "Annuler". |

L'undo nécessite un appui main-process (voir carte #14) : sauvegarde de la version précédente de l'override avant écriture/suppression.

---

## 3. Navigation / shell

### 3.1 Proposition
```
┌──────────────────┬──────────────────────────────────────────────────────────┐
│ FUMBBL Assets    │  Rosters › Humain › Lineman            [Ctrl+K Rechercher]│ ← header de page (breadcrumb + actions)
│                  ├──────────────────────────────────────────────────────────┤
│ ⚙ Config         │                                                          │
│ 👥 Rosters    12 │                   contenu de l'onglet                    │
│ ▦ Terrains     3 │                                                          │
│ ▣ Packs          │                                                          │
│ 🗑 Orphelins   7 │                                                          │
│                  │                                                          │
│ ┌──────────────┐ │                                                          │
│ │▣ Pack actif  │ │                                                          │
│ │ Nains rétro  │ │                                                          │
│ │ [Détacher]   │ │                                                          │
│ └──────────────┘ │                                                          │
├──────────────────┴──────────────────────────────────────────────────────────┤
│ ● Cache : C:\Users\…\FUMBBL\cache (coach Breakyt) · 214 overrides  [Ouvrir] │ ← status bar 28px
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Sidebar 200 px**, `<nav>` avec `<button aria-current="page">`, icône + libellé + **badge compteur** : Rosters = nb d'overrides custom actifs portraits/iconsets, Terrains = nb de terrains custom actifs, Orphelins = nb d'éléments nettoyables (badge warning si > 0). Config n'a pas de badge sauf erreur (point rouge si cache invalide).
- **Carte "Pack actif"** en bas de sidebar (visible partout) : nom, nb d'images, bouton "Détacher" (= `clearActivePack`). Supprime le besoin de la modale de garde (D6).
- **Status bar** : santé du cache (point vert/rouge), chemin tronqué au milieu (tooltip chemin complet), coach, nb d'overrides, bouton "Ouvrir le dossier". Remplace le bloc texte en bas de sidebar.
- **Mémorisation** : dernier onglet + dernier roster/position/terrain persistés dans `AppConfig` (IPC `saveConfig` existant, champ `ui: { lastTab, lastRosterId, lastPosition, lastPitchKey }`). Au lancement : si cache valide → dernier onglet ; sinon → **onboarding** (Config plein écran, voir §4.1). Les autres onglets restent désactivés (pas cachés) avec tooltip "Configurez d'abord le cache".
- **Command palette Ctrl+K** (cmdk) : groupes "Rosters" (31 + spéciaux), "Positions" (index plat `Roster › Position`, alimenté par le cache react-query des rosters déjà chargés + préchargement en idle), "Terrains", "Packs" (activer), "Actions" (Ouvrir le dossier cache, Importer un pack, Changer de langue, Aller à Orphelins). Récents en tête.
- **Raccourcis globaux** : `Ctrl+K` palette, `Ctrl+1…5` onglets, `Ctrl+F` focus recherche de la vue courante, `Échap` ferme panneau/éditeur, `Ctrl+Z` undo de la dernière action toastée (hors éditeur pixel où il est local). Liste visible via `?` (dialog "Raccourcis").
- Fenêtre : passer `minWidth: 1000, minHeight: 680` et autoriser plus grand (maximiser utile pour pitches 782 px).

---

## 4. Par feature

Légende : Prio H/M/B · Effort S (≤½ j) / M (1–2 j) / L (3 j+).

### 4.1 config (F1, F2)
**Problème** : détection registre prend le 1er coach et prévient par `alert()` ; échec = `alert()` ; couleurs en dur ; guide statique déconnecté de l'état ; onglet par défaut même configuré.
**Proposition** :
- Onboarding (si pas de cache valide) en **stepper vertical vivant** : ① Lancer une fois le client FUMBBL ② Détecter (bouton) ③ Choisir le coach ④ Prêt → "Aller aux rosters". Chaque étape a un état (à faire / en cours / OK / erreur).
- Détection : résultat affiché **en liste de choix** (RadioGroup natif stylé ou liste de cartes) : `Coach · chemin · nb d'entrées map.json`. Un seul résultat → présélectionné, bouton "Utiliser". Zéro résultat → `EmptyState` avec "Choisir manuellement" + aide.
- Config (une fois configuré) devient une page **Paramètres** : Langue (Select), Cache (chemin + état + Changer…/Re-détecter), À propos/version. Changer de cache = AlertDialog (irréversible côté vue).
- Choix manuel invalide → message inline sous le champ (pas d'alert) expliquant ce qui manque (`map.json` introuvable).
**Composants** : Stepper (maison), RadioCards, InlineAlert, Button loading.
**Prio H · Effort M.**

```
┌ Bienvenue ─────────────────────────────────────────┐
│ ✓ 1  Lancez une fois le client FUMBBL              │
│ ● 2  Détecter le cache          [Détecter] [Manuel]│
│      ○ Breakyt   C:\…\Breakyt\cache  · 1 204 img  │
│      ○ Alt_coach C:\…\Alt\cache      ·   87 img   │
│ ○ 3  Terminé → Rosters                             │
└────────────────────────────────────────────────────┘
```

### 4.2 rosters (F3, F4)
**Problème** : Select de 31 items sans recherche, case "spéciaux" séparée, liste positions sans indicateur d'état, `max-h-[calc(100vh-220px)]` magique, résumé technique (`baseIconPath`) exposé.
**Proposition** : layout **maître-détail à 3 niveaux** dans la même vue :
```
┌ Rosters ───────────┬ Positions ──────────┬ Lineman ─────────────────────────────────┐
│ [🔍 Filtrer…    ]  │ Lineman      ● P I  │ Portrait                         [✨][⋯] │
│ BB2025 ▾ | Tous    │ Blitzer      ● P    │ ┌Défaut┐ ┌Custom┐  ( Défaut | Custom )   │
│ ▸ Amazon           │ Catcher             │ └──────┘ └──────┘   utilisé par 3 rosters│
│ ▸ Dwarf      ● 4   │ Thrower             │ Iconset                                  │
│ ▸ Human  ◀   ● 12  │ Ogre (big guy)      │ …                                        │
└────────────────────┴─────────────────────┴──────────────────────────────────────────┘
```
- Colonne rosters (220 px) : input filtre + `ToggleGroup` "BB2025 | Tous" (remplace la checkbox), liste virtuelle inutile (≤ 60 items). Badge = nb d'overrides actifs dans ce roster.
- Colonne positions (200 px) : nom, type, mini-pastilles **P** (portrait custom actif) / **I** (iconset custom actif). Navigation flèches.
- Détail : en-tête breadcrumb dans le header de page.
- Le Select roster disparaît (la palette Ctrl+K couvre la recherche globale).
- Rosters et positions mis en cache react-query (`staleTime: Infinity` pour la liste, 1 h pour un roster) → plus de refetch par onglet.
**Composants** : ListPane (liste filtrable accessible), ToggleGroup, StatusDot, Badge.
**Prio H · Effort M.**

### 4.3 asset-editor (F5, F6, F10, F11)
**Problème** : affordance d'activation faible (carte cliquable), bug loupe (D3), boutons imbriqués, ✕ texte rouge permanent, drop seulement (pas de "Parcourir…"), "Utilisé par" en texte brut, crop incohérent, logique dupliquée avec pitches.
**Proposition** : un composant unique `AssetSlotPair` (portrait, iconset, terrain) :
```
┌ Portrait ─────────────────────────────── 95×147 · #12345 ── [✨ Prompt] [⋯] ┐
│  ┌──────────┐    ┌──────────┐                                               │
│  │ défaut   │    │  custom  │   Utilisé en jeu :  ( Défaut | Custom✓ )      │
│  │  (img)   │    │  (img)   │                                               │
│  │       ⤢  │    │       ⤢  │   Partagé par : Human, Imperial Nobility +1 ⓘ │
│  └──────────┘    └──────────┘                                               │
│   Défaut          Custom  [↑ Remplacer] [✂ Recadrer] [🗑]                    │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **Choix explicite par `ToggleGroup` "Défaut | Custom"** (radio sémantique, `aria-label="Image utilisée en jeu"`). Option Custom désactivée tant qu'aucune image custom (tooltip). L'image sélectionnée reçoit un liseré `--live` + étiquette "En jeu". Les vignettes ne sont plus cliquables pour activer (corrige D3/D4).
- Vignettes : damier, `imageRendering: pixelated` seulement si l'image est plus petite que la vignette (portraits upscalés ok, pitches downscalés → `auto`).
- Zone custom vide = **dropzone + bouton "Choisir un fichier…"** (input file caché) ; drag-over = bordure primary pointillée + texte "Déposer pour remplacer". Drop sur une custom existante = remplacement **avec undo**.
- Actions secondaires en barre d'icônes sous la vignette custom (Remplacer, Recadrer, Supprimer) + menu `⋯` (DropdownMenu : "Afficher dans le dossier", "Copier l'URL de l'asset", "Exporter le PNG").
- "Partagé par" : chips tronquées + tooltip liste complète ; **avertissement explicite** quand > 1 roster : "Modifier cette image change aussi Human, Imperial Nobility" — c'est le vrai risque utilisateur.
- **Crop unifié** : toujours en **Dialog large** (max 90vw) — pour portraits et terrains — avec preview du rendu final à taille réelle à droite (95×147 rendu ×1 et ×2), zoom Slider Radix, molette centrée curseur, flèches clavier, "Ajuster / Remplir". Le panneau sticky à droite est libéré pour l'éditeur pixel uniquement. Moteur : react-easy-crop (§5).
- Prompt IA : Popover conservé, textarea en lecture seule mono, bouton "Copier" → toast "Prompt copié". Ajouter "Ouvrir dans le navigateur" non (hors scope).
- Zoom image : Dialog plein écran avec Slider de zoom stylé, boutons `−/+/Ajuster/1:1`, **maintenir Espace = afficher l'autre version (défaut/custom)**, "Afficher dans le dossier". Fix : `stopPropagation` devient inutile car plus de parent cliquable.
**Composants** : ToggleGroup, Dropzone, IconButton+Tooltip, DropdownMenu, Slider, Checkerboard, CropDialog, ImageViewer.
**Prio H · Effort L** (cœur de l'app ; factorise pitches).

### 4.4 iconset (F7, F8, F9)
**Problème** : vignettes 48 px sans état "modifié", labels anglais en dur, popover "répéter une variante" qui écrase sans prévenir, éditeur pixel minimal (palette fixe inadaptée, pas d'undo/pipette), sélection cellule par 2 Selects.
**Proposition** :
- **Grille atlas** = vrai tableau : en-têtes colonnes traduits ("Domicile repos", "Domicile mouvement", "Extérieur repos", "Extérieur mouvement"), en-tête ligne "Variante 1…N" avec, au survol de la ligne, une icône `CopyPlus` "Utiliser cette variante pour toutes" (remplace le popover+Select). Action → toast avec **Annuler** (pas de confirm). Cellules = `<button>` 56 px sur damier, focus clavier en grille (flèches), cellule ouverte dans l'éditeur surlignée.
- **Éditeur pixel** (panneau latéral sticky, conservé car on veut voir la grille à côté) :
```
┌ Éditeur — Variante 2 · Domicile repos ──────────── [✕] ┐
│ [✏ B][⌫ E][💧 I]  [↶][↷]   Zoom ─●──── ×12   [▦ Grille]│
│ ┌────────────────────────┐  ┌──────┐                    │
│ │                        │  │ 1:1  │ aperçu taille réelle│
│ │      canvas zoomé      │  │ ×2   │ sur damier + fond   │
│ │                        │  │      │ terrain (option)    │
│ └────────────────────────┘  └──────┘                    │
│ Couleurs du sprite: ■■■■■■■■■■■■  Récentes: ■■■■         │
│ ■ primaire  ■ secondaire(transparent)  [#a83c2e] [🎨]    │
│ ◀ cellule précédente   cellule suivante ▶               │
│                    [Annuler]  [Enregistrer  Ctrl+S]      │
└──────────────────────────────────────────────────────────┘
```
- Outils : Crayon (B), Gomme (E), Pipette (I, et **Alt maintenu** = pipette temporaire), clic gauche = primaire, clic droit = secondaire (transparent par défaut) — conventions Aseprite/Piskel.
- **Undo/redo** Ctrl+Z / Ctrl+Y (pile d'`ImageData` par trait, cap 50).
- Palette = **couleurs uniques extraites de la feuille** (triées par luminance, cap 32) + 8 récentes + picker libre (react-colorful dans Popover avec input hex).
- Zoom Slider ×4–×24 + grille de pixels on/off ; aperçu temps réel 1:1 et ×2.
- Navigation cellules ◀ ▶ (et `[` `]`) sans quitter l'éditeur ; édition multi-cellules accumulée, sauvegarde unique.
- Changement de cellule ou fermeture avec modifs non enregistrées → AlertDialog "Abandonner les modifications ?".
**Composants** : AtlasGrid, PixelCanvas, ToolToggleGroup, ColorSwatches, ColorPickerPopover, Slider, useUndoStack.
**Prio H (undo/pipette/palette) · Effort L.**

### 4.5 pitches (F12)
**Problème** : Select groupé, 5 lignes Défaut/Custom 391×226 empilées (scroll très long), duplication de F5, crop en Dialog seul cas.
**Proposition** :
- Même maître-détail que Rosters : colonne gauche liste filtrable groupée (Rosters / Spéciaux / Système) avec badge nb de météos custom.
- Détail : **sélecteur de météo en ToggleGroup** (Canicule · Ensoleillé · Beau · Pluie · Blizzard), chaque item avec pastille "custom actif". Une seule météo affichée à la fois, en grand, via `AssetSlotPair` (même composant que F5, ratio 782/452). Vue "Toutes les météos" optionnelle en bande de 5 miniatures cliquables au-dessus (filmstrip) qui sert aussi de vue d'ensemble.
- Action spécifique pitches : "Appliquer cette image à toutes les météos" (fréquent : un seul terrain custom) → toast + Annuler.
```
┌ Terrains ─────────┬ Human — Ensoleillé ─────────────────────────────┐
│ 🔍 Filtrer        │ [☀︎●][🌤][🌥][🌧●][❄]   ← filmstrip/ToggleGroup  │
│ ROSTERS           │ ┌──────── Défaut ────────┐┌──────── Custom ──────┐│
│  Human     ● 2    │ │                        ││                      ││
│  Dwarf            │ └────────────────────────┘└──────────────────────┘│
│ SPÉCIAUX …        │ ( Défaut | Custom✓ )  [Remplacer][Recadrer][🗑]   │
│ SYSTÈME …         │ [Appliquer à toutes les météos]                   │
└───────────────────┴───────────────────────────────────────────────────┘
```
**Prio M · Effort M** (une fois `AssetSlotPair` livré, surtout du layout).

### 4.6 packs (F13, F14)
**Problème** : export par champ nom isolé, cartes w-56 sans aperçu, pas de description (alors que l'IPC la supporte), pas de désactivation, pack actif invisible ailleurs, garde par modale à chaque modif.
**Proposition** :
- En-tête : boutons **"Créer un pack depuis mes customs…"** (Dialog : nom, description, récap "42 images : 30 portraits, 10 iconsets, 2 terrains", Exporter) et **"Importer…"** (aussi drop d'un .zip n'importe où sur la vue).
- Liste en **lignes** (pas cartes) : mosaïque 4 vignettes du pack · nom · description · nb images · date · état. Ligne active : badge "Actif" + bouton "Désactiver". Inactive : "Activer". Menu `⋯` : Exporter à nouveau, Afficher dans le dossier, Supprimer (AlertDialog spécifique).
- Activation : `toast.promise` ("Activation de Nains rétro…" → "42 images appliquées") ; pas de confirm si aucun override ad hoc ne sera écrasé, sinon AlertDialog chiffré ("12 images custom hors pack seront désactivées").
- Garde F14 : la modale bloquante disparaît. Remplacée par : carte "Pack actif" dans la sidebar + à la **première** modif ad hoc, toast warning "Pack « X » détaché : vos changements sont maintenant hors pack" + Annuler. `listPacks` mis en cache react-query (fini l'IPC par mutation).
**Composants** : PackRow, Thumbnail mosaic, Dialog form, Textarea, DropdownMenu, AlertDialog.
**Prio M (H pour la visibilité du pack actif) · Effort M.**

### 4.7 orphans (F15)
**Problème** : suppression unitaire immédiate sans filet, pas de sélection multiple, URLs brutes, deux sections empilées.
**Proposition** :
- `ToggleGroup`/segmented "Customs inactifs (N) | Fichiers orphelins du cache (M)" en haut.
- Grille de cartes compactes (vignette damier 96 px, libellé lisible : "Human › Lineman · portrait" au lieu de l'URL, URL en mono dans tooltip/⋯).
- **Sélection multiple** (checkbox au survol, Shift+clic plage, Ctrl+A) + **barre d'action flottante en bas** "3 sélectionnés · [Réactiver] [Supprimer]" (pattern Vortex).
- Customs inactifs : action principale **"Réactiver"** (plus utile que supprimer) ; suppression → toast + Annuler (soft delete #14).
- Fichiers orphelins du cache : suppression groupée → AlertDialog chiffré ("Supprimer 7 fichiers (412 Ko) du cache FUMBBL ? Ils seront re-téléchargés si nécessaire.") ; c'est irréversible côté app mais sans conséquence durable → confirmation + pas d'undo.
- État vide positif : "Rien à nettoyer" avec icône.
**Composants** : SelectableCard, BulkActionBar, Checkbox, AlertDialog, EmptyState.
**Prio M · Effort M.**

### 4.8 shared-ui (transverse)
- Tokens + Tailwind 4 + ESLint/arch rule anti-hex.
- Nouveaux composants `shared/ui` : `tooltip`, `slider`, `toggle-group`, `alert-dialog`, `dropdown-menu`, `input`, `textarea`, `badge`, `skeleton`, `kbd`, `icon-button`, `empty-state`, `command`, `toaster`. Button : variantes `secondary`, `loading`, tailles 28/32.
- `ConfirmDialogProvider` réécrit sur AlertDialog avec titre + description + libellé de bouton paramétrables (`confirm({ title, description, confirmLabel, destructive })`).
- i18n : clés pour colonnes atlas, météos, nouveaux toasts ; pluriels (`count`) — le système maison suffit, ajouter juste une règle `{count, plural}` minimale si absente.
**Prio H · Effort M.**

---

## 5. Librairies

Mesures bundlephobia (min / min+gz) relevées le 2026-10-04 ; "≈" = estimation (bundlephobia a renvoyé 429 pour ces paquets), à vérifier au build via `vite build --report`/`rollup-plugin-visualizer`.

### 5.1 Garder
| Lib | Taille | Usages | Justification |
|---|---|---|---|
| react / react-dom 18 | — | partout | Pas de gain à passer en 19 pour cette refonte (option ultérieure). |
| class-variance-authority | ≈1 kB gz | button, badge, toggle, icon-button, toast variants (~8 composants) | Variantes typées, déjà en place. |
| clsx + tailwind-merge | ≈0.5 + ≈7 kB gz | `cn()` partout | **Condition** : tailwind-merge v3 n'est compatible qu'avec Tailwind v4 ([release 3.0.0](https://newreleases.io/project/npm/tailwind-merge/release/3.0.0)) → impose la migration TW4 (ou retour à twMerge v2). Étendre `extendTailwindMerge` avec les tokens couleur custom. |
| lucide-react | 189 kB gz en import total, ≈0.3–0.6 kB/icone tree-shakée | ~30 icônes, tous les écrans | Généraliser (aujourd'hui seulement `Search`). Imports nommés uniquement. |
| adm-zip, fast-xml-parser | main process | packs, rosters | Hors renderer, hors refonte. |
| i18n maison | 0 | partout | 4 langues, besoins simples ; i18next serait surdimensionné. |

### 5.2 Ajouter
| Lib | Taille (min+gz) | Remplace dans le code actuel | Usages prévus (features / nb d'endroits) |
|---|---|---|---|
| **@tanstack/react-query** v5 | 13.4 kB | Tous les couples `useEffect`+`useState`+`refresh()` : `RosterView` (liste + roster), `PitchView` (rosters), `OrphansView` (2 listes + index), `PacksView.refresh`, `AssetPanel.refreshOverride` + `fetchAssetImage`, `PitchWeatherSlot` (dupliqué), `useActivePackGuard.listPacks`, `useCacheFolder`, le cache module-level de `shared/lib/rosters.ts` (`indexRosterUsage`/`getRosterUsageIndexReady`). | ~12 queries (config, rosters, roster(id), rosterUsageIndex, override(url), overrideImage(url), defaultAsset(url), overrides list (badges), packs, inactiveOverrides, orphanFiles, coaches) + ~10 mutations (save/activate/delete override, repeatRow, pixel save, crop save, pack import/export/activate/delete/clear, orphan delete). Invalidation ciblée → badges sidebar, pack actif, slots restent cohérents entre onglets. Utilisé par **toutes** les features. |
| **sonner** | 9.2 kB | Les 5 `alert()`, l'absence de feedback de succès, la modale de garde pack. | Config (détection), asset-editor (save/activate/delete/undo), iconset (repeat row/pixel save), pitches, packs (import/export/activate `toast.promise`), orphans (delete/undo), prompt (copie). ~25 appels, 7 features. |
| **cmdk** | 14.6 kB (dépend de radix dialog/primitive, mutualisés) | Le Select de rosters (F3), le Select de pitches (F12), rien de palette aujourd'hui. | (1) Command palette Ctrl+K, (2) liste filtrable Rosters, (3) liste filtrable Terrains groupée, (4) recherche positions. 4 usages, 3 features → passe la règle "plusieurs fonctionnalités". |
| **radix-ui** (paquet unifié, tree-shakable) | ≈ somme des primitives utilisées (déjà ~4 en place) | Les 5 paquets `@radix-ui/react-*` actuels (checkbox, dialog, popover, select, slot). | Un seul paquet versionné ([shadcn changelog 2026-02](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)). Primitives ajoutées ci-dessous. |
| ↳ Tooltip | ≈6 kB | `title=""` natifs (cellules atlas) | Tous les IconButton (~25 endroits), chemins tronqués, badges sidebar. |
| ↳ Slider | ≈5 kB | 1 `input type=range` natif (crop) + zoom implicite modal | Crop, zoom image, zoom pixel editor (3). |
| ↳ ToggleGroup | ≈3 kB | Slots cliquables `div role=button`, checkbox "spéciaux", sélection couleur/gomme | Défaut/Custom (portrait, iconset, pitch), météos, BB2025/Tous, outils pixel, onglets Orphelins (≥6). |
| ↳ AlertDialog | ≈1 kB au-dessus de Dialog | `ConfirmDialogProvider` sur Dialog | Suppression pack, purge orphelins, abandon édition pixel, changement cache, activation pack avec conflits (5). |
| ↳ DropdownMenu | ≈9 kB | — (actions éparpillées en boutons) | Menu `⋯` slot, pack, carte orphelin, header (4+). |
| **react-easy-crop** | 7.1 kB | `CropEditor.tsx` (≈100 lignes de drag/zoom/canvas math maison) | Portraits + terrains (+ "appliquer à toutes les météos"). Lib mono-fonction légère : autorisée. Apporte zoom centré curseur, clavier, `restrictPosition`, `croppedAreaPixels` arrondis ([README](https://github.com/ValentinH/react-easy-crop)). On garde le rendu final canvas maison (20 lignes). |
| **react-colorful** | 4.8 kB | `PALETTE` hex fixe | Picker libre de l'éditeur pixel (primaire/secondaire). Mono-fonction légère, accessible, sans dépendance. Préféré à `<input type=color>` dont le dialogue natif Windows jure avec l'UI et ne gère pas l'alpha. |
| **tw-animate-css** (dev, CSS seul) | 0 kB JS | — | Animations `data-state` des primitives Radix, toasts, skeleton. |
| **@tailwindcss/vite** (dev, avec TW4) | 0 kB runtime | `postcss` + `autoprefixer` + `tailwind.config.js` | Voir 5.4. |

### 5.3 Supprimer
| Lib | Raison |
|---|---|
| `@radix-ui/react-checkbox`, `-dialog`, `-popover`, `-select`, `-slot` | Remplacés par le paquet unifié `radix-ui`. |
| `@radix-ui/react-checkbox` (usage) | Le seul usage (checkbox "spéciaux") devient ToggleGroup ; Checkbox reste disponible via `radix-ui` pour la sélection multiple Orphelins. |
| `autoprefixer`, `postcss` (dev) | Inutiles avec `@tailwindcss/vite` (Lightning CSS intégré). |
| `@types/adm-zip` → devDependencies | Mal rangé en `dependencies` (chore). |

### 5.4 Rejeté
| Lib | Taille | Raison |
|---|---|---|
| zustand | 0.5 kB | Une fois l'état serveur dans react-query, il reste ~4 valeurs UI globales (onglet, roster/position/terrain sélectionnés, palette ouverte) → un `NavigationContext` de 40 lignes suffit et persiste via `saveConfig`. Ajouter un store pour ça viole "suffisamment utilisé". |
| jotai | 3.3 kB | Même raison. |
| motion / framer-motion | 46.5 kB | Lourd, une seule finalité (animations) couverte par CSS + `data-state`. |
| react-hotkeys-hook | ≈2–3 kB | Besoins = ~12 raccourcis à portée simple (global / éditeur pixel actif) ; un hook maison `useHotkey(combo, handler, { enabled, allowInInput })` de ~40 lignes suffit, cmdk gère son propre clavier. À réévaluer seulement si des scopes imbriqués apparaissent. |
| @radix-ui Tabs | 8.2 kB | ToggleGroup couvre les segmented controls ; aucune vue n'a besoin de vrais onglets ARIA avec panneaux montés/démontés. |
| @radix-ui ScrollArea | 6.9 kB | Chromium d'Electron permet de styler les scrollbars natives (`::-webkit-scrollbar`, `scrollbar-color`) : 10 lignes CSS, scroll natif plus fiable. |
| @radix-ui ContextMenu | ≈9 kB (partagé avec menu) | Clic droit peu découvrable pour ce public ; le clic droit est réservé à la couleur secondaire dans l'éditeur pixel. DropdownMenu `⋯` suffit. |
| @fontsource/* (Inter…) | 50–100 kB woff2 | Police système Segoe UI Variable (§2.3). |
| react-compare-slider | ≈2.5 kB | Comparaison réalisée par "maintenir pour voir l'original" + côte à côte ; slider pitches maison possible en 40 lignes si demandé. |
| i18next / react-i18next | ≈15 kB+ | i18n maison suffisante. |
| Base UI / Ark UI | — | Pas de raison de quitter Radix déjà en place. |

### 5.5 Tailwind 3 → 4 : **oui, en première carte**
- Coût : `npx @tailwindcss/upgrade` (Node 20+) + revue ; renommages (`rounded`→`rounded-sm`, `shadow`→`shadow-sm`, `outline-none`→`outline-hidden`, ring 3px→1px), `@import "tailwindcss"`, Vite plugin ([upgrade guide](https://tailwindcss.com/docs/upgrade-guide)). ~3 300 lignes de renderer → ½ à 1 jour.
- Bénéfices : tokens **directement en variables CSS** via `@theme inline` (exactement la cible §2.2), fin de `tailwind.config.js`, suppression postcss/autoprefixer, **remise en cohérence avec tailwind-merge v3 déjà installé** (D11). Exigence navigateur Chrome 111+ : Electron 33 embarque Chromium 130 → OK.
- Pourquoi maintenant : la refonte réécrit de toute façon tous les `className` ; migrer après doublerait le travail.

---

## 6. Plan de refonte — cartes ordonnées

Format : **#carte — Titre** · feature · type · prio · dépend de — objectif — checklist.

**#11 — Migrer vers Tailwind 4 + Vite plugin** · project · chore · H · —
Objectif : aligner Tailwind avec tailwind-merge v3 et préparer les tokens CSS-first. Supprimer postcss/autoprefixer.
- [ ] `npx @tailwindcss/upgrade` sur branche dédiée
- [ ] `@tailwindcss/vite` dans `vite.config`, supprimer `postcss.config`, `tailwind.config.js`
- [ ] Vérifier rings/rounded/shadows visuellement sur les 5 onglets
- [ ] `npm run verify` vert

**#12 — Design tokens HSL + thème sombre + garde-fou anti-hex** · shared-ui · refactor · H · #11
Objectif : un seul fichier de tokens (§2.2), aucune couleur en dur, damier transparence, focus-visible global, typo système 13 px.
- [ ] `src/renderer/styles/tokens.css` + `@theme inline`
- [ ] Remplacer `text-[#…]`, `body{background}` et classes legacy (`card-raised`, `accent-active`)
- [ ] Étendre la règle `no-hardcoded-color` de `check-arch.mjs` à `index.css` / fichiers CSS
- [ ] Scrollbars stylées, `prefers-reduced-motion`, `tabular-nums`

**#13 — Paquet unifié radix-ui + nouvelles primitives** · shared-ui · refactor · H · #12
Objectif : migrer vers `radix-ui` et créer tooltip, slider, toggle-group, alert-dialog, dropdown-menu, input, textarea, badge, skeleton, kbd, icon-button, empty-state.
- [ ] Migrer imports des 5 composants existants, retirer `@radix-ui/react-*`
- [ ] Ajouter les primitives + `tw-animate-css`
- [ ] `IconButton` impose `aria-label` (type requis) + Tooltip
- [ ] `extendTailwindMerge` avec les tokens custom

**#8 — Toasts sonner + ConfirmDialog v2 + bannissement d'alert()** · shared-ui · ux · H · #13
Objectif : système de feedback unique (§2.9) ; plus aucun `alert()`.
- [ ] `<Toaster/>` thémé dans App, helper `notify.success/error/promise/undoable`
- [ ] `confirm({title, description, confirmLabel, destructive})` sur AlertDialog
- [ ] Remplacer 5 `alert()` (Config, Packs) ; retirer les entrées baseline `no-native-dialog`
- [ ] Clés i18n 4 langues

**#14 — Soft-delete & historique d'override (support undo)** · main-ipc · feature · H · —
Objectif : permettre "Annuler" après suppression/remplacement/répétition de variante sans confirmation.
- [ ] Avant `saveOverride`/`deleteOverride` : copier la version précédente dans `overrides/.history/<hash>/<ts>` (cap 5/URL)
- [ ] IPC `restoreOverride(url, versionId)` + `restoreOrphanFile` (corbeille temporaire purgée au démarrage)
- [ ] Retourner `versionId` depuis les mutations
- [ ] Tests manuels : drop → annuler, delete → annuler

**#15 — Couche données @tanstack/react-query** · project · refactor · H · #14
Objectif : un hook par ressource IPC (`useRosters`, `useRoster`, `useOverride`, `usePacks`, …) et des mutations avec invalidation ; fin des refetch par onglet.
- [ ] `QueryClientProvider` (staleTime adaptés, pas de refetchOnWindowFocus)
- [ ] `shared/api/queries.ts` + `mutations.ts` ; supprimer cache module de `rosters.ts`
- [ ] `useActivePackGuard` → lit `usePacks()` (plus d'IPC par mutation)
- [ ] Mutations branchées sur `notify.undoable`

**#16 — Shell : sidebar à badges, carte pack actif, status bar** · shared-ui · ux · H · #8, #15
Objectif : navigation accessible, état global visible partout (§3.1).
- [ ] `<nav>` boutons + icônes lucide + `aria-current`, badges compteurs (queries)
- [ ] Carte "Pack actif" + action Détacher
- [ ] Status bar cache (santé, chemin tronqué, coach, nb overrides, Ouvrir)
- [ ] `minWidth/minHeight` fenêtre côté main

**#17 — Mémorisation de navigation + onboarding conditionnel** · config · ux · H · #16
Objectif : rouvrir sur le dernier onglet/roster/position ; Config uniquement si cache absent/invalide.
- [ ] `AppConfig.ui` (lastTab, lastRosterId, lastPosition, lastPitchKey) + `NavigationContext`
- [ ] Validation du cache au démarrage → onboarding sinon dernier onglet
- [ ] Onglets désactivés + tooltip tant que non configuré

**#18 — Config : onboarding stepper + choix du coach** · config · ux · H · #8, #17
Objectif : remplacer l'auto-sélection du 1er coach et les alertes par un flux guidé et une page Paramètres.
- [ ] Stepper vivant 3–4 étapes
- [ ] Liste de coachs détectés (radio cards, nb d'entrées map.json)
- [ ] Erreurs inline (dossier invalide), Button loading pendant détection
- [ ] Page Paramètres : langue, cache, version

**#19 — Raccourcis clavier maison + aide "?"** · shared-ui · feature · M · #16
Objectif : `useHotkey` (~40 lignes) et raccourcis globaux (Ctrl+K, Ctrl+1…5, Échap, Ctrl+Z global, ?).
- [ ] Hook avec `enabled`, ignore inputs sauf opt-in
- [ ] Dialog "Raccourcis" avec `<Kbd>`
- [ ] Affichage des raccourcis dans tooltips/menus

**#20 — Command palette Ctrl+K (cmdk)** · shared-ui · feature · M · #15, #19
Objectif : sauter à un roster / position / terrain / pack / action en 3 frappes.
- [ ] `shared/ui/command.tsx` (cmdk + Dialog)
- [ ] Sources : rosters, index positions (préchargement idle), terrains, packs, actions
- [ ] Récents (5) persistés ; navigation via `NavigationContext`

**#21 — Rosters : maître-détail 3 colonnes filtrable avec statuts** · rosters · ux · H · #15, #20
Objectif : remplacer Select + checkbox par listes filtrables (cmdk list) avec badges P/I et compteur par roster.
- [ ] Colonne rosters (filtre + ToggleGroup BB2025/Tous + badges)
- [ ] Colonne positions (pastilles P/I, flèches clavier, vrais boutons)
- [ ] Breadcrumb dans header ; suppression `max-h-[calc(...)]` magique

**#22 — AssetSlotPair unifié (fix loupe, toggle Défaut/Custom explicite)** · asset-editor · bug · H · #13, #8, #15
Objectif : un composant partagé portrait/iconset/terrain ; activation par ToggleGroup "En jeu" ; corrige le bug loupe et les boutons imbriqués.
- [ ] Extraire `useAssetSlot(url)` (queries/mutations) ; supprimer duplication `PitchWeatherSlot`
- [ ] Vignettes non cliquables, damier, skeleton au ratio, label "En jeu"
- [ ] Dropzone + "Choisir un fichier…", remplacement avec Undo
- [ ] Barre d'actions IconButton + menu ⋯ ; avertissement "partagé par N rosters"

**#23 — CropDialog unifié sur react-easy-crop** · asset-editor · refactor · H · #22
Objectif : même expérience de recadrage pour portraits et terrains, en Dialog, avec aperçu taille réelle.
- [ ] Remplacer `CropEditor` par `react-easy-crop` + rendu canvas final
- [ ] Slider zoom Radix, molette centrée, flèches, Ajuster/Remplir
- [ ] Aperçu 1:1 et ×2 ; `Ctrl+Entrée` enregistrer, Échap annuler
- [ ] Retirer le panneau crop sticky de `PlayerDetail`

**#24 — Visionneuse image : zoom stylé + maintenir pour comparer** · asset-editor · ux · M · #22
Objectif : modal pan/zoom avec Slider, boutons −/+/1:1/Ajuster, Espace maintenu = version alternative, "Afficher dans le dossier".
- [ ] Refonte `ImageZoomModal` sur Slider + IconButtons
- [ ] Prop `compareSrc` (défaut ↔ custom)
- [ ] Damier + rendu pixelated conditionnel

**#25 — Grille atlas iconset accessible + "répéter variante" avec undo** · iconset · ux · H · #14, #22
Objectif : tableau 4×N traduit, cellules boutons navigables, action par ligne, plus de popover.
- [ ] Colonnes/lignes traduites (supprimer `ATLAS_COLUMN_LABELS` anglais)
- [ ] Cellules `<button>` 56 px, focus grille (flèches), cellule en édition surlignée
- [ ] Action ligne "Utiliser pour toutes les variantes" → toast Annuler
- [ ] Indicateur cellule modifiée vs défaut

**#26 — Éditeur pixel v2 : outils, undo/redo, pipette, palette du sprite** · iconset · feature · H · #25, #19
Objectif : rendre la retouche réaliste (conventions Aseprite/Piskel).
- [ ] Outils Crayon/Gomme/Pipette (B/E/I, Alt = pipette temporaire), clic droit = secondaire
- [ ] Pile undo/redo (Ctrl+Z/Y, cap 50)
- [ ] Palette extraite du sprite + récentes + picker `react-colorful` (hex)
- [ ] Zoom Slider + grille + aperçu 1:1/×2 ; navigation cellules ◀ ▶ ; garde modifs non enregistrées

**#27 — Terrains : maître-détail + sélecteur de météo** · pitches · ux · M · #22, #23
Objectif : une météo à la fois via ToggleGroup/filmstrip, liste filtrable groupée, "appliquer à toutes les météos".
- [ ] Liste filtrable (Rosters/Spéciaux/Système) avec badges
- [ ] Filmstrip 5 météos avec pastille custom
- [ ] `AssetSlotPair` ratio 782/452 ; action "toutes les météos" + Undo

**#28 — Packs : création avec description, lignes avec aperçu, activer/désactiver** · packs · ux · M · #8, #15, #16
Objectif : exposer description (IPC existant), aperçu mosaïque, désactivation, feedback async.
- [ ] Dialog "Créer un pack" (nom, description, récap par type)
- [ ] `PackRow` mosaïque + état + menu ⋯ ; Désactiver = `clearActivePack`
- [ ] Import par bouton et drop .zip ; `toast.promise` pour import/export/activation
- [ ] AlertDialog chiffré sur suppression et sur activation écrasant des customs

**#29 — Remplacer la garde pack modale par détachement non bloquant** · packs · ux · H · #16, #28
Objectif : plus de confirmation à chaque modif ; toast warning + Annuler à la première modif ad hoc.
- [ ] `useActivePackGuard` → `useDetachPackOnEdit` (lecture cache query)
- [ ] Toast "Pack détaché" + Annuler (réactive le pack)
- [ ] Mise à jour carte sidebar en temps réel

**#30 — Orphelins : segmented, sélection multiple, réactiver, undo** · orphans · ux · M · #8, #14, #15
Objectif : nettoyage sûr et en masse.
- [ ] ToggleGroup "Customs inactifs | Fichiers du cache" avec compteurs
- [ ] Libellés lisibles (roster › position · type), URL en tooltip
- [ ] Sélection multiple (Shift/Ctrl+A) + barre d'actions flottante
- [ ] Réactiver ; supprimer → Undo (customs) / AlertDialog chiffré (fichiers cache)

**#31 — États vides/chargement/erreur systématiques** · shared-ui · ux · M · #13, #15
Objectif : chaque query a un skeleton au ratio, un EmptyState et un ErrorState avec Réessayer.
- [ ] Inventaire des vues (5 onglets + panneaux)
- [ ] Skeletons vignettes ; EmptyState illustrés lucide
- [ ] ErrorState branché sur `refetch`

**#32 — Passe accessibilité & i18n** · project · chore · M · #21–#30
Objectif : zéro `role="button"` sur div, `aria-label` sur toutes les icônes, `alt` sur images, toutes chaînes traduites (4 langues).
- [ ] Règle arch : interdire `role="button"` et `<img` sans `alt`
- [ ] Parcours clavier complet de chaque onglet
- [ ] Vérif contrastes muted/faint ; clés i18n manquantes (fr/es/de)

**#33 — Ranger dépendances et vérifier le poids du bundle** · project · chore · B · #11–#30
Objectif : `@types/adm-zip` en devDependencies, retirer paquets morts, mesurer le bundle.
- [ ] Déplacer/retirer dépendances
- [ ] `rollup-plugin-visualizer` ponctuel, vérifier tree-shaking lucide/radix
- [ ] Mettre à jour README (stack UI)

Ordre critique : #11 → #12 → #13 → #8 ; #14 en parallèle (main) → #15 → #16 → #17/#18 → #22 → #23/#24/#25 → #26, #21, #27, #28 → #29, #30 → #31, #32, #33.

---

## Sources
- Vortex : https://www.techspot.com/downloads/7759-vortex-mod-manager.html · https://forums.nexusmods.com/topic/8407498-vortex-doesnt-deploy-modslinks/
- MO2 flags/conflits : https://stepmodifications.org/forum/topic/2441-why-does-mod-organizer-have-so-many-flags/ · https://steamcommunity.com/app/489830/discussions/0/3780245614661552114
- r2modman : https://thunderstore.io/c/cult-of-the-lamb/p/ebkr/r2modman/v/3.0.28/ · https://github.com/SprigWave/r2modmanPlus
- Aseprite : https://aseprite.org/docs/keyboard-shortcuts/ · https://community.aseprite.org/t/eye-drop-tool-active-only-when-alt-in-pressed/3374
- Piskel / Lospec : https://www.udemy.com/tutorial/learn-to-create-pixel-art-for-your-game/piskel-image-editor/ · https://alternativeto.net/software/lospec-pixel-editor
- react-easy-crop : https://github.com/ValentinH/react-easy-crop
- Before/after : https://www.framer.com/marketplace/plugins/before-after-slider/
- Confirm vs undo : https://dev.to/137foundry/how-to-choose-between-confirmation-dialogs-undo-windows-and-soft-delete-patterns-1opj · https://uxdesign.cc/are-you-sure-you-want-to-do-this-microcopy-for-confirmation-dialogues-1d94a0f73ac6
- Sonner : https://sonner.emilkowal.ski/
- Command palette : https://ux.hubtel.com/design-system/components/command-palette/ · https://www.techinterview.org/post/3233475212/build-command-palette-cmd-k/
- Electron title bar : https://electronjs.org/docs/latest/tutorial/custom-title-bar
- TanStack Query invalidation : https://www.mintlify.com/tanstack/query/guides/invalidations-from-mutations
- shadcn theming / radix unifié : https://ui.shadcn.com/docs/theming · https://ui.shadcn.com/docs/changelog/2026-02-radix-ui
- Tailwind v4 upgrade : https://tailwindcss.com/docs/upgrade-guide
- tailwind-merge 3.0 : https://newreleases.io/project/npm/tailwind-merge/release/3.0.0
- Tailles : https://bundlephobia.com (API `/api/size`, relevé 2026-10-04)
