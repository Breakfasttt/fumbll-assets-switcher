#!/usr/bin/env node
// Petit CLI kanban. Zéro dépendance.
//   npm run kanban                                  -> affiche le tableau
//   npm run kanban -- new "<titre>" --feature=<f> [--type=ux] [--priority=moyenne] [--column=1_idee]
//   npm run kanban -- move <id> <colonne>           -> déplace (ex : move 12 3_en_cours)
//   npm run kanban -- next-id
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCards, nextCardId } from "./lib/kanban-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = (await import(pathToFileURL(path.join(ROOT, "architecture.config.mjs")).href)).default;
const kb = config.kanban;
const [command = "board", ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const positional = rest.filter((a) => !a.startsWith("--"));
const { cards } = loadCards(ROOT, kb);

const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (command === "board") {
  for (const column of kb.columns) {
    const list = cards.filter((c) => c.column === column);
    const limit = kb.wipLimit[column];
    console.log(`\n${column} (${list.length}${limit ? `/${limit}` : ""})`);
    for (const c of list) {
      const d = c.data ?? {};
      const done = (c.body.match(/^\s*- \[x\]/gim) ?? []).length;
      const total = done + (c.body.match(/^\s*- \[ \]/gm) ?? []).length;
      console.log(`  #${String(d.id).padEnd(3)} [${d.feature}] ${d.title}  · ${d.type}/${d.priority}${total ? `  ☑ ${done}/${total}` : ""}`);
    }
  }
  console.log("");
} else if (command === "next-id") {
  console.log(nextCardId(cards));
} else if (command === "new") {
  const title = positional[0];
  if (!title) fail('titre manquant : npm run kanban -- new "<titre>" --feature=<feature>');
  const feature = flags.feature;
  const scopes = [...Object.keys(config.features), ...Object.keys(config.areas)];
  if (!scopes.includes(feature)) fail(`--feature requis parmi : ${scopes.join(", ")}`);
  const column = flags.column ?? kb.columns[0];
  if (!kb.columns.includes(column)) fail(`colonne inconnue "${column}"`);
  const id = nextCardId(cards);
  const file = path.join(ROOT, kb.dir, column, `${id}-${slugify(title)}.md`);
  const content = `---
id: ${id}
title: ${title}
feature: ${feature}
type: ${flags.type ?? "feature"}
priority: ${flags.priority ?? "moyenne"}
depends: []
---

## Objectif

## Conception

## Hors périmètre

## Checklist
- [ ]
- [ ] \`npm run typecheck\` + \`npm run check-arch\` OK
`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`✓ carte #${id} créée : ${path.relative(ROOT, file)}`);
} else if (command === "move") {
  const [idArg, column] = positional;
  const card = cards.find((c) => c.nameId === Number(idArg));
  if (!card) fail(`carte ${idArg} introuvable`);
  if (!kb.columns.includes(column)) fail(`colonne inconnue "${column}" (${kb.columns.join(", ")})`);
  if (card.column === "5_complete") fail("une carte complétée ne bouge plus : créer une nouvelle carte avec depends");
  const target = path.join(ROOT, kb.dir, column, card.fileName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(path.join(ROOT, card.file), target);
  console.log(`✓ #${card.nameId} : ${card.column} -> ${column}`);
} else {
  fail(`commande inconnue "${command}" (board | new | move | next-id)`);
}
