// Lecture des cartes kanban (partagé par check-arch.mjs et kanban.mjs). Zéro dépendance.
import fs from "node:fs";
import path from "node:path";

export const CARD_NAME = /^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

// Frontmatter minimal : `clé: valeur`, `clé: [a, b]`, commentaires `#` ignorés.
export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: null, body: text, bodyStartLine: 1 };
  const data = {};
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((v) => v.trim()).filter(Boolean);
    } else if (/^\d+$/.test(value)) {
      value = Number(value);
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    data[key] = value;
  }
  return { data, body: text.slice(match[0].length), bodyStartLine: match[0].split("\n").length };
}

export function loadCards(root, kanbanConfig) {
  const cards = [];
  const strays = [];
  const kanbanDir = path.join(root, kanbanConfig.dir);
  if (!fs.existsSync(kanbanDir)) return { cards, strays };
  for (const entry of fs.readdirSync(kanbanDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      if (entry.name !== "README.md") strays.push(path.posix.join(kanbanConfig.dir, entry.name));
      continue;
    }
    if (!kanbanConfig.columns.includes(entry.name)) {
      strays.push(path.posix.join(kanbanConfig.dir, entry.name) + "/");
      continue;
    }
    for (const file of fs.readdirSync(path.join(kanbanDir, entry.name))) {
      if (file === ".gitkeep") continue;
      const rel = path.posix.join(kanbanConfig.dir, entry.name, file);
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      const { data, body, bodyStartLine } = parseFrontmatter(text);
      const nameMatch = file.match(CARD_NAME);
      cards.push({
        file: rel,
        fileName: file,
        column: entry.name,
        nameId: nameMatch ? Number(nameMatch[1]) : null,
        data,
        body,
        bodyStartLine,
      });
    }
  }
  cards.sort((a, b) => (a.nameId ?? 0) - (b.nameId ?? 0));
  return { cards, strays };
}

export function nextCardId(cards) {
  return cards.reduce((max, c) => Math.max(max, c.nameId ?? 0, Number(c.data?.id) || 0), 0) + 1;
}
