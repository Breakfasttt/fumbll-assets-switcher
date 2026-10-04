#!/usr/bin/env node
// Vérifie que le projet respecte architecture.config.mjs. Zéro dépendance.
// Usage : npm run check-arch [-- --rule=<id>] [-- --quiet] [-- --verbose (détaille la baseline)]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCards, CARD_NAME } from "./lib/kanban-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = (await import(pathToFileURL(path.join(ROOT, "architecture.config.mjs")).href)).default;
const args = process.argv.slice(2);
const onlyRule = args.find((a) => a.startsWith("--rule="))?.slice(7);
const quiet = args.includes("--quiet");
const verbose = args.includes("--verbose");

// ---------------------------------------------------------------- utilitaires

const posix = (p) => p.split(path.sep).join("/");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

function walk(relDir, filter = () => true) {
  const out = [];
  if (!exists(relDir)) return out;
  for (const entry of fs.readdirSync(path.join(ROOT, relDir), { withFileTypes: true })) {
    const rel = posix(path.join(relDir, entry.name));
    if (entry.isDirectory()) out.push(...walk(rel, filter));
    else if (filter(rel)) out.push(rel);
  }
  return out;
}

// Remplace les commentaires par des espaces (conserve les sauts de ligne pour lineOf).
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\/|(?<![:"'`])\/\/.*$/gm, (c) => c.replace(/[^\n]/g, " "));
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const startsWithDir = (file, dir) => file === dir || file.startsWith(dir + "/");

const findings = [];
function report(rule, severity, file, line, message) {
  if (onlyRule && rule !== onlyRule) return;
  findings.push({ rule, severity, file, line, message });
}

// ---------------------------------------------------------------- sources

const SOURCES = walk("src", (f) => /\.(ts|tsx)$/.test(f));
const sourceText = Object.fromEntries(SOURCES.map((f) => [f, read(f)]));

const IMPORT_RE = /(?:import|export)\s+(type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function resolveSpecifier(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = "src/renderer/" + spec.slice(2);
  else if (spec.startsWith("@common/")) base = "src/shared/" + spec.slice(8);
  else if (spec.startsWith(".")) base = posix(path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec)));
  else return { package: spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0] };
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (exists(base + ext) && fs.statSync(path.join(ROOT, base + ext)).isFile()) return { file: base + ext };
  }
  return { file: base, unresolved: true };
}

const imports = [];
for (const file of SOURCES) {
  const text = sourceText[file];
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[2] ?? m[3];
    imports.push({ from: file, spec, typeOnly: !!m[1], line: lineOf(text, m.index), ...resolveSpecifier(file, spec) });
  }
}

const processOf = (file) =>
  startsWithDir(file, "src/main") ? "main" : startsWithDir(file, "src/renderer") ? "renderer" : startsWithDir(file, "src/shared") ? "shared" : "other";
const rendererRel = (file) => file.slice("src/renderer/".length);
const featureOf = (file) => {
  const m = file.match(/^src\/renderer\/features\/([^/]+)\//);
  return m ? m[1] : null;
};

// ---------------------------------------------------------------- règle : imports-resolve

for (const imp of imports) {
  if (imp.unresolved && !imp.file.endsWith(".css")) {
    report("imports-resolve", "error", imp.from, imp.line, `import introuvable "${imp.spec}"`);
  }
}

// ---------------------------------------------------------------- règle : process-boundary

for (const imp of imports) {
  if (!imp.file) continue;
  const from = processOf(imp.from);
  const to = processOf(imp.file);
  if (from === to || to === "shared") continue;
  const exception = config.crossProcessExceptions.find((e) => e.from === imp.from && e.to === imp.file);
  if (exception && imp.typeOnly) continue;
  report("process-boundary", "error", imp.from, imp.line, `${from} ne doit pas importer ${to} (${imp.file}) — passer par src/shared ou l'IPC`);
}
// src/shared doit rester pur (chargé par main ET renderer).
for (const imp of imports) {
  if (processOf(imp.from) === "shared" && imp.package) {
    report("process-boundary", "error", imp.from, imp.line, `src/shared ne doit importer aucun paquet (${imp.package})`);
  }
}

// ---------------------------------------------------------------- règle : renderer-layers

const layerKeys = Object.keys(config.rendererLayers).sort((a, b) => b.length - a.length);
const layerOf = (rel) => layerKeys.find((k) => rel === k || rel.startsWith(k + "/"));

for (const imp of imports) {
  if (processOf(imp.from) !== "renderer" || !imp.file || processOf(imp.file) !== "renderer") continue;
  const fromRel = rendererRel(imp.from);
  const toRel = rendererRel(imp.file);
  const fromLayer = layerOf(fromRel);
  if (!fromLayer) {
    report("renderer-layers", "error", imp.from, imp.line, `fichier hors couche déclarée (rendererLayers)`);
    continue;
  }
  const fromFeature = featureOf(imp.from);
  const toFeature = featureOf(imp.file);
  if (toFeature) {
    if (fromFeature === toFeature) continue;
    if (fromLayer !== "app" && fromLayer !== "features") {
      report("renderer-layers", "error", imp.from, imp.line, `${fromLayer} ne doit importer aucune feature (${toFeature})`);
      continue;
    }
    if (!/^features\/[^/]+\/index\.tsx?$/.test(toRel)) {
      report("feature-public-api", "error", imp.from, imp.line, `import de "${toFeature}" hors de son index.ts (${toRel})`);
    }
    if (fromFeature && !config.features[fromFeature]?.dependsOn.includes(toFeature)) {
      report("feature-deps", "error", imp.from, imp.line, `"${fromFeature}" importe "${toFeature}" sans le déclarer dans dependsOn`);
    }
    continue;
  }
  const allowed = config.rendererLayers[fromLayer];
  if (!allowed.some((prefix) => toRel === prefix || toRel.startsWith(prefix + "/"))) {
    report("renderer-layers", "error", imp.from, imp.line, `couche "${fromLayer}" ne peut pas importer "${toRel}" (autorisé : ${allowed.join(", ") || "rien"})`);
  }
}

// ---------------------------------------------------------------- règle : feature-structure

const featureDirs = exists("src/renderer/features")
  ? fs.readdirSync(path.join(ROOT, "src/renderer/features"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
const skillPath = (name) => `.claude/skills/${name}/SKILL.md`;
const masterText = exists(skillPath(config.masterSkill)) ? read(skillPath(config.masterSkill)) : "";
if (!masterText) report("feature-structure", "error", skillPath(config.masterSkill), 1, "skill maître absent");

for (const dir of featureDirs) {
  if (!config.features[dir]) report("feature-structure", "error", `src/renderer/features/${dir}`, 1, `feature non déclarée dans architecture.config.mjs`);
}
for (const [name, feature] of Object.entries(config.features)) {
  const dir = `src/renderer/features/${name}`;
  if (!featureDirs.includes(name)) {
    report("feature-structure", "error", "architecture.config.mjs", 1, `feature "${name}" déclarée mais dossier ${dir} absent`);
    continue;
  }
  if (!exists(`${dir}/index.ts`) && !exists(`${dir}/index.tsx`)) report("feature-structure", "error", dir, 1, "index.ts (API publique) absent");
  for (const dep of feature.dependsOn) {
    if (!config.features[dep]) report("feature-structure", "error", "architecture.config.mjs", 1, `"${name}" dépend de "${dep}" qui n'existe pas`);
  }
  checkSkillCoversFiles(`feature-${name}`, walk(dir));
}
for (const area of Object.values(config.areas)) {
  checkSkillCoversFiles(area.skill, area.dirs.flatMap((d) => walk(d)));
}

function checkSkillCoversFiles(skill, files) {
  const rel = skillPath(skill);
  if (!exists(rel)) {
    report("feature-structure", "error", rel, 1, `skill "${skill}" absent`);
    return;
  }
  const text = read(rel);
  if (!/^---[\s\S]*?\bname:\s*\S+[\s\S]*?\bdescription:\s*\S+[\s\S]*?---/m.test(text)) {
    report("feature-structure", "error", rel, 1, "frontmatter name/description manquant");
  }
  if (skill !== config.masterSkill && !masterText.includes(skill)) {
    report("feature-structure", "error", skillPath(config.masterSkill), 1, `le skill maître ne référence pas "${skill}"`);
  }
  for (const file of files) {
    if (path.posix.basename(file) === "index.ts") continue;
    if (!text.includes(path.posix.basename(file))) {
      report("skill-coverage", "error", rel, 1, `${file} n'est pas documenté dans ce skill`);
    }
  }
}

// Graphe dependsOn acyclique.
(function checkCycles() {
  const state = {};
  const visit = (name, stack) => {
    if (state[name] === "done") return;
    if (state[name] === "visiting") {
      report("feature-deps", "error", "architecture.config.mjs", 1, `cycle de dépendances : ${[...stack, name].join(" -> ")}`);
      return;
    }
    state[name] = "visiting";
    for (const dep of config.features[name]?.dependsOn ?? []) visit(dep, [...stack, name]);
    state[name] = "done";
  };
  Object.keys(config.features).forEach((n) => visit(n, []));
})();

// ---------------------------------------------------------------- règle : ipc-*

const mainChannels = new Map();
const preloadChannels = new Map();
for (const file of SOURCES.filter((f) => startsWithDir(f, "src/main"))) {
  for (const m of sourceText[file].matchAll(/ipcMain\.handle\(\s*["']([^"']+)["']/g)) mainChannels.set(m[1], { file, line: lineOf(sourceText[file], m.index) });
  for (const m of sourceText[file].matchAll(/ipcRenderer\.invoke\(\s*["']([^"']+)["']/g)) preloadChannels.set(m[1], { file, line: lineOf(sourceText[file], m.index) });
}
for (const [channel, at] of mainChannels) {
  if (!preloadChannels.has(channel)) report("ipc-parity", "error", at.file, at.line, `handler "${channel}" jamais exposé par le preload`);
}
for (const [channel, at] of preloadChannels) {
  if (!mainChannels.has(channel)) report("ipc-parity", "error", at.file, at.line, `preload invoque "${channel}" sans handler côté main`);
}
// Méthodes de window.fumbblApi jamais utilisées par le renderer.
if (exists("src/main/preload.ts")) {
  const preload = read("src/main/preload.ts");
  const apiBlock = preload.match(/const api = \{([\s\S]*?)\n\};/);
  const rendererText = SOURCES.filter((f) => processOf(f) === "renderer").map((f) => sourceText[f]).join("\n");
  for (const m of (apiBlock?.[1] ?? "").matchAll(/^\s{2}(\w+):/gm)) {
    if (!new RegExp(`fumbblApi\\s*\\.\\s*${m[1]}\\b`).test(rendererText)) {
      report("ipc-unused", "warning", "src/main/preload.ts", lineOf(preload, preload.indexOf(m[0])), `fumbblApi.${m[1]} jamais utilisé par le renderer`);
    }
  }
}
for (const file of SOURCES.filter((f) => config.ipcForbiddenIn.some((d) => startsWithDir(f, d)))) {
  const idx = sourceText[file].indexOf("fumbblApi");
  if (idx >= 0) report("ipc-forbidden", "error", file, lineOf(sourceText[file], idx), "window.fumbblApi interdit dans cette couche (composant pur)");
}

// ---------------------------------------------------------------- règles UI

// Tokens de couleur : déclarés uniquement dans ce fichier (--color-<nom>), seule source de couleurs brutes.
const TOKENS_FILE = "src/renderer/shared/styles/tokens.css";
const colorTokens = new Set(exists(TOKENS_FILE) ? [...read(TOKENS_FILE).matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]) : []);
const TW_PALETTE = "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// Suffixes non-couleur des préfixes surveillés (tailles, styles, positions…).
const NON_COLOR = new Set(("transparent current inherit none xs sm base lg xl 2xl 3xl 4xl 5xl 6xl 7xl 8xl 9xl left center right justify start end " +
  "wrap nowrap balance pretty ellipsis clip solid dashed dotted double hidden collapse separate x y t b l r s e inset fixed local scroll " +
  "no-repeat repeat repeat-x repeat-y cover contain auto top bottom offset").split(" "));
const COLOR_CLASS_RE = /(?:^|[\s"'`:])(?:text|bg|border|ring|fill|stroke|from|to|via|outline|divide|placeholder|decoration|accent|caret)(?:-[xytblrse])?-([a-z][a-z0-9-]*?)(?:\/\d+)?(?=$|[\s"'`])/gm;

for (const file of SOURCES.filter((f) => processOf(f) === "renderer" && f.endsWith(".tsx"))) {
  const text = stripComments(sourceText[file]);
  for (const m of text.matchAll(/(?:\b(?:text|bg|border|ring|fill|stroke|from|to|via|shadow|outline)-\[#[0-9a-fA-F]{3,8}\]|(?:color|background|backgroundColor|borderColor)\s*:\s*["']#[0-9a-fA-F]{3,8}["'])/g)) {
    report("no-hardcoded-color", "error", file, lineOf(text, m.index), `couleur en dur "${m[0]}" — utiliser un token (${TOKENS_FILE})`);
  }
  for (const m of text.matchAll(new RegExp(`(?:^|[\\s"'\`:])(?:text|bg|border|ring|fill|stroke|from|to|via|outline)-(?:${TW_PALETTE})(?:-\\d+)?(?:/\\d+)?(?=$|[\\s"'\`])`, "gm"))) {
    report("no-hardcoded-color", "error", file, lineOf(text, m.index), `couleur de la palette Tailwind "${m[0].trim().replace(/^["'`:]/, "")}" — utiliser un token (${TOKENS_FILE})`);
  }
  // Classe de couleur vers un token inexistant : Tailwind ne génère rien, sans erreur.
  for (const m of text.matchAll(COLOR_CLASS_RE)) {
    const name = m[1];
    if (colorTokens.has(name) || NON_COLOR.has(name) || /^\d/.test(name) || new RegExp(`^(?:${TW_PALETTE})(?:-\\d+)?$`).test(name)) continue;
    if (/^(?:opacity|offset|gradient|clip|origin|size|blend|linear|radial|conic|position|style|width|x|y)-/.test(name)) continue;
    report("unknown-color-token", "error", file, lineOf(text, m.index), `"${m[0].trim().replace(/^["'`:]/, "")}" : token de couleur "${name}" inconnu (${TOKENS_FILE})`);
  }
}
// tailwind-merge doit connaître exactement les tokens (sinon cn() fusionne mal sans erreur).
const UTILS_FILE = "src/renderer/shared/lib/utils.ts";
if (exists(UTILS_FILE)) {
  const block = read(UTILS_FILE).match(/COLOR_TOKENS = \[([\s\S]*?)\]/)?.[1] ?? "";
  const merged = new Set([...block.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
  for (const t of colorTokens) if (!merged.has(t)) report("twmerge-tokens", "error", UTILS_FILE, 1, `token "${t}" absent de COLOR_TOKENS (tailwind-merge)`);
  for (const t of merged) if (!colorTokens.has(t)) report("twmerge-tokens", "error", UTILS_FILE, 1, `"${t}" dans COLOR_TOKENS mais absent de ${TOKENS_FILE}`);
}
// CSS : aucune couleur littérale hors du fichier de tokens.
for (const file of walk("src/renderer", (f) => f.endsWith(".css") && f !== TOKENS_FILE)) {
  const text = stripComments(read(file));
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/g)) {
    report("no-hardcoded-color", "error", file, lineOf(text, m.index), `couleur littérale "${m[0]}" hors de ${TOKENS_FILE}`);
  }
}
for (const file of SOURCES.filter((f) => processOf(f) === "renderer")) {
  const text = stripComments(sourceText[file]);
  // `confirm` nu est souvent une variable locale (useConfirm) : seul `window.confirm(` est visé.
  for (const m of text.matchAll(/(?<![\w.])(?:window\.(alert|confirm|prompt)|(alert))\(/g)) {
    report("no-native-dialog", "error", file, lineOf(text, m.index), `${m[1] ?? m[2]}() natif interdit (bloque l'event loop) — utiliser useConfirm / feedback UI`);
  }
}

// ---------------------------------------------------------------- règle : i18n

const I18N_FILE = "src/renderer/shared/i18n/translations.ts";
if (exists(I18N_FILE)) {
  const text = read(I18N_FILE);
  const dicts = {};
  for (const m of text.matchAll(/const (\w+): Dictionary = \{([\s\S]*?)\n\};/g)) {
    dicts[m[1]] = new Set([...m[2].matchAll(/^\s*"([^"]+)"\s*:/gm)].map((k) => k[1]));
  }
  const langs = Object.keys(dicts);
  const reference = dicts.en ?? dicts[langs[0]];
  for (const lang of langs) {
    for (const key of reference) if (!dicts[lang].has(key)) report("i18n-parity", "error", I18N_FILE, 1, `clé "${key}" absente en ${lang}`);
    for (const key of dicts[lang]) if (!reference.has(key)) report("i18n-parity", "error", I18N_FILE, 1, `clé "${key}" présente en ${lang} mais pas en en`);
  }
  const used = new Set();
  const dynamicPrefixes = new Set();
  for (const file of SOURCES.filter((f) => processOf(f) === "renderer" && f !== I18N_FILE)) {
    const src = sourceText[file];
    for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g)) {
      used.add(m[1]);
      if (!reference.has(m[1])) report("i18n-missing-key", "error", file, lineOf(src, m.index), `clé i18n inconnue "${m[1]}"`);
    }
    for (const m of src.matchAll(/\bt\(\s*`([^`$]*)\$\{/g)) dynamicPrefixes.add(m[1]);
  }
  for (const key of reference) {
    if (!used.has(key) && ![...dynamicPrefixes].some((p) => key.startsWith(p))) {
      report("i18n-unused-key", "warning", I18N_FILE, lineOf(text, text.indexOf(`"${key}"`)), `clé "${key}" jamais utilisée`);
    }
  }
}

// ---------------------------------------------------------------- règle : libraries

const pkg = JSON.parse(read("package.json"));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const importedPackages = new Map();
for (const imp of imports.filter((i) => i.package && !i.package.startsWith("node:"))) {
  if (!importedPackages.has(imp.package)) importedPackages.set(imp.package, new Set());
  importedPackages.get(imp.package).add(processOf(imp.from));
}
const NODE_BUILTINS = new Set(["fs", "path", "os", "crypto", "child_process", "util", "url", "stream", "events", "zlib", "http", "https"]);
for (const name of Object.keys(allDeps)) {
  const lib = config.libraries[name];
  if (!lib) {
    report("libraries", "error", "package.json", 1, `"${name}" n'est pas déclarée dans architecture.config.mjs (libraries)`);
    continue;
  }
  if ((lib.scope === "types" || lib.scope === "build") && pkg.dependencies?.[name]) {
    report("types-in-dev-deps", "error", "package.json", 1, `"${name}" (${lib.scope}) doit être dans devDependencies`);
  }
  if ((lib.scope === "main" || lib.scope === "renderer") && name !== "react-dom" && !importedPackages.has(name)) {
    report("libraries", "warning", "package.json", 1, `"${name}" déclarée (${lib.scope}) mais jamais importée`);
  }
}
for (const name of Object.keys(config.libraries)) {
  if (!allDeps[name]) report("libraries", "error", "architecture.config.mjs", 1, `"${name}" déclarée mais absente de package.json`);
}
for (const [name, processes] of importedPackages) {
  if (NODE_BUILTINS.has(name)) continue;
  const lib = config.libraries[name];
  if (!lib) {
    if (!allDeps[name]) report("libraries", "error", "package.json", 1, `"${name}" importée mais absente de package.json`);
    continue;
  }
  for (const proc of processes) {
    if (lib.scope === "main" && proc === "renderer") report("libraries", "error", "package.json", 1, `"${name}" (main) importée par le renderer`);
    if (lib.scope === "renderer" && proc === "main") report("libraries", "error", "package.json", 1, `"${name}" (renderer) importée par le main`);
  }
}

// ---------------------------------------------------------------- règle : kanban

const kb = config.kanban;
const { cards, strays } = loadCards(ROOT, kb);
const knownScopes = new Set([...Object.keys(config.features), ...Object.keys(config.areas)]);
const byId = new Map();
for (const s of strays) report("kanban", "error", s, 1, `élément hors colonne (colonnes : ${kb.columns.join(", ")})`);
for (const card of cards) {
  if (!card.fileName.match(CARD_NAME)) report("kanban", "error", card.file, 1, "nom attendu : <id>-<slug-kebab>.md");
  if (!card.data) {
    report("kanban", "error", card.file, 1, "frontmatter absent");
    continue;
  }
  const { id, title, feature, type, priority } = card.data;
  if (id !== card.nameId) report("kanban", "error", card.file, 1, `id ${id} ≠ préfixe du nom de fichier`);
  if (byId.has(id)) report("kanban", "error", card.file, 1, `id ${id} déjà utilisé par ${byId.get(id).file}`);
  byId.set(id, card);
  if (!title) report("kanban", "error", card.file, 1, "title manquant");
  if (!knownScopes.has(feature)) report("kanban", "error", card.file, 1, `feature "${feature}" inconnue (${[...knownScopes].join(", ")})`);
  if (!kb.types.includes(type)) report("kanban", "error", card.file, 1, `type "${type}" invalide (${kb.types.join(", ")})`);
  if (!kb.priorities.includes(priority)) report("kanban", "error", card.file, 1, `priority "${priority}" invalide (${kb.priorities.join(", ")})`);
  if (kb.checklistComplete.includes(card.column)) {
    const lines = card.body.split("\n");
    lines.forEach((l, i) => {
      if (/^\s*- \[ \]/.test(l)) report("kanban", "error", card.file, card.bodyStartLine + i, `checklist non cochée en ${card.column}`);
    });
    if (!lines.some((l) => /^\s*- \[[ x]\]/i.test(l))) report("kanban", "error", card.file, 1, `aucune checklist en ${card.column}`);
  }
}
for (const card of cards) {
  for (const dep of [].concat(card.data?.depends ?? [])) {
    const target = byId.get(Number(dep));
    if (!target) report("kanban", "error", card.file, 1, `depends ${dep} : carte inexistante`);
    else if (["3_en_cours", "4_a_valider", "5_complete"].includes(card.column) && target.column !== "5_complete") {
      report("kanban-deps", "warning", card.file, 1, `dépend de la carte ${dep} encore en ${target.column}`);
    }
  }
}
for (const [column, limit] of Object.entries(kb.wipLimit)) {
  const count = cards.filter((c) => c.column === column).length;
  if (count > limit) report("kanban", "error", `${kb.dir}/${column}`, 1, `${count} cartes (limite WIP ${limit})`);
}

// ---------------------------------------------------------------- baseline

// Chaque entrée tolère au plus `count` violations : une violation de plus (nouveau code) échoue.
const tolerated = [];
const activeFindings = [];
const usedBaseline = new Map();
for (const f of findings) {
  const entryIndex = config.baseline.findIndex((b) => b.rule === f.rule && b.file === f.file);
  const used = usedBaseline.get(entryIndex) ?? 0;
  if (entryIndex >= 0 && used < config.baseline[entryIndex].count) {
    usedBaseline.set(entryIndex, used + 1);
    tolerated.push({ ...f, card: config.baseline[entryIndex].card });
  } else {
    activeFindings.push(entryIndex >= 0 ? { ...f, message: f.message + " (au-delà de la baseline)" } : f);
  }
}
if (!onlyRule) {
  config.baseline.forEach((b, i) => {
    const card = byId.get(b.card);
    if (!card) activeFindings.push({ rule: "baseline", severity: "error", file: "architecture.config.mjs", line: 1, message: `baseline ${b.rule} ${b.file} : carte ${b.card} inexistante` });
    else if (["5_complete", "6_annule"].includes(card.column)) activeFindings.push({ rule: "baseline", severity: "error", file: "architecture.config.mjs", line: 1, message: `baseline ${b.rule} ${b.file} : carte ${b.card} close (${card.column}) mais violation toujours tolérée` });
    const used = usedBaseline.get(i) ?? 0;
    if (used === 0) activeFindings.push({ rule: "baseline", severity: "error", file: "architecture.config.mjs", line: 1, message: `baseline obsolète : ${b.rule} ${b.file} ne viole plus rien — retirer l'entrée` });
    else if (used < b.count) activeFindings.push({ rule: "baseline", severity: "error", file: "architecture.config.mjs", line: 1, message: `baseline ${b.rule} ${b.file} : ${used} violation(s) restante(s), baisser count (${b.count}) à ${used}` });
  });
}

// ---------------------------------------------------------------- sortie

const errors = activeFindings.filter((f) => f.severity === "error");
const warnings = activeFindings.filter((f) => f.severity === "warning");
const fmt = (f) => `  ${f.file}:${f.line}  [${f.rule}] ${f.message}`;
if (errors.length) console.log(`\n✗ ${errors.length} erreur(s)\n` + errors.map(fmt).join("\n"));
if (warnings.length) console.log(`\n⚠ ${warnings.length} avertissement(s)\n` + warnings.map(fmt).join("\n"));
if (tolerated.length && !quiet) {
  const byCard = {};
  for (const t of tolerated) (byCard[t.card] ??= []).push(t);
  console.log(`\n· ${tolerated.length} violation(s) tolérée(s) (baseline)`);
  for (const [card, list] of Object.entries(byCard)) {
    console.log(`  carte ${card} : ${list.length} × ${[...new Set(list.map((t) => t.rule))].join(", ")}`);
    if (verbose) list.forEach((t) => console.log("  " + fmt(t)));
  }
}
console.log(`\n${errors.length ? "✗ check-arch : ÉCHEC" : "✓ check-arch : OK"} — ${SOURCES.length} fichiers, ${imports.length} imports, ${cards.length} cartes\n`);
process.exit(errors.length ? 1 : 0);
