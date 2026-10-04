// Source de vérité de l'architecture, lue par scripts/check-arch.mjs et scripts/kanban.mjs.
// Toute nouvelle feature, lib ou exception passe par ce fichier (voir skill project-map).

export default {
  // Features du renderer : un dossier src/renderer/features/<nom>/ + un index.ts (API publique)
  // + un skill .claude/skills/feature-<nom>/SKILL.md. `dependsOn` = seules features importables
  // (toujours via leur index.ts). Le graphe doit rester acyclique.
  features: {
    config: { dependsOn: [] },
    rosters: { dependsOn: ["asset-editor", "iconset"] },
    "asset-editor": { dependsOn: ["iconset"] },
    iconset: { dependsOn: [] },
    pitches: { dependsOn: [] },
    packs: { dependsOn: [] },
    orphans: { dependsOn: [] },
  },

  // Zones transverses : chaque zone a un skill qui doit citer tous les fichiers de ses dossiers.
  areas: {
    "shared-ui": { skill: "shared-ui", dirs: ["src/renderer/shared", "src/renderer/app"] },
    "main-ipc": { skill: "main-ipc", dirs: ["src/main", "src/shared"] },
    project: { skill: "project-map", dirs: [] },
  },

  masterSkill: "project-map",

  // Couches du renderer : préfixe (relatif à src/renderer) -> préfixes importables.
  // Le préfixe le plus long l'emporte. "features" est géré à part (dependsOn + index.ts).
  rendererLayers: {
    "main.tsx": ["app", "index.css"],
    "global.d.ts": [],
    app: ["app", "features", "shared"],
    features: ["shared"],
    "shared/components": ["shared/components", "shared/ui", "shared/hooks", "shared/lib", "shared/i18n"],
    "shared/hooks": ["shared/hooks", "shared/components", "shared/lib", "shared/i18n"],
    "shared/ui": ["shared/ui", "shared/lib"],
    "shared/lib": ["shared/lib"],
    "shared/i18n": ["shared/i18n"],
  },

  // Imports inter-process autorisés (sinon : main <-> renderer interdit, src/shared pur).
  crossProcessExceptions: [
    { from: "src/renderer/global.d.ts", to: "src/main/preload.ts", reason: "typage de window.fumbblApi (import type uniquement)" },
  ],

  // window.fumbblApi interdit dans ces dossiers (composants purs).
  ipcForbiddenIn: ["src/renderer/shared/ui"],

  // Libs autorisées. scope : main | renderer | shared | build | types.
  // Ajouter une lib = l'ajouter ici avec sa raison (et la justifier dans la carte kanban).
  libraries: {
    // --- Process main
    "adm-zip": { scope: "main", reason: "lecture/écriture des zips de packs et de pitches" },
    "fast-xml-parser": { scope: "main", reason: "parsing des API XML FUMBBL (rosters, divisions)" },
    electron: { scope: "main", reason: "runtime desktop" },
    // --- Renderer
    react: { scope: "renderer", reason: "UI" },
    "react-dom": { scope: "renderer", reason: "UI" },
    "radix-ui": { scope: "renderer", reason: "primitives accessibles de shared/ui (paquet unifié : Dialog, AlertDialog, Popover, Select, Checkbox, Tooltip, Slider, ToggleGroup, DropdownMenu, Slot)" },
    "class-variance-authority": { scope: "renderer", reason: "variantes des composants shared/ui" },
    clsx: { scope: "renderer", reason: "cn()" },
    "tailwind-merge": { scope: "renderer", reason: "cn()" },
    "lucide-react": { scope: "renderer", reason: "icônes" },
    sonner: { scope: "renderer", reason: "toasts : succès/erreur/promesse/annuler (shared/lib/notify.ts), remplace alert()" },
    // --- Build / outillage
    vite: { scope: "build", reason: "bundler renderer" },
    "@vitejs/plugin-react": { scope: "build", reason: "bundler renderer" },
    tailwindcss: { scope: "build", reason: "styles (Tailwind 4, tokens CSS-first dans index.css)" },
    "tw-animate-css": { scope: "build", reason: "animations CSS data-state des primitives (importé dans index.css, zéro JS)" },
    "@tailwindcss/vite": { scope: "build", reason: "intégration Tailwind 4 dans Vite (remplace postcss + autoprefixer)" },
    typescript: { scope: "build", reason: "typage" },
    concurrently: { scope: "build", reason: "npm run dev" },
    "wait-on": { scope: "build", reason: "npm run dev" },
    "@types/node": { scope: "types", reason: "typage" },
    "@types/react": { scope: "types", reason: "typage" },
    "@types/react-dom": { scope: "types", reason: "typage" },
    "@types/adm-zip": { scope: "types", reason: "typage" },
  },

  kanban: {
    dir: "kanban",
    columns: ["1_idee", "2_a_implementer", "3_en_cours", "4_a_valider", "5_complete", "6_annule"],
    wipLimit: { "3_en_cours": 2 },
    // Colonnes où la checklist doit être entièrement cochée.
    checklistComplete: ["4_a_valider", "5_complete"],
    types: ["ux", "bug", "refactor", "feature", "chore", "doc"],
    priorities: ["haute", "moyenne", "basse"],
  },

  // Projet PERSO : on commit et on push uniquement avec le compte perso, jamais le compte pro.
  // Vérifié par scripts/check-git-identity.mjs (hooks pre-commit et pre-push).
  gitIdentity: {
    allowedNames: ["Breakyt", "Breakfasttt"],
    allowedEmails: ["jeaneaut@gmail.com"],
    forbiddenPatterns: ["ludicius", "succubus", "yannsucc"],
    githubAccount: "Breakfasttt",
  },

  // Violations connues tolérées, chacune rattachée à la carte qui doit la corriger.
  // `count` = nombre exact de violations tolérées : plus (nouveau code) ou moins (count à baisser) fait échouer.
  baseline: [
    { rule: "ipc-unused", file: "src/main/preload.ts", card: 22, count: 4 },
  ],
};
