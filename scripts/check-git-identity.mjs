#!/usr/bin/env node
// Vérifie qu'on commit/push avec le compte PERSO (architecture.config.mjs > gitIdentity). Zéro dépendance.
// Usage : node scripts/check-git-identity.mjs          -> identité de commit (user.name / user.email)
//         node scripts/check-git-identity.mjs --push   -> + compte GitHub actif (gh) pour le push
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { gitIdentity: rules } = (await import(pathToFileURL(path.join(ROOT, "architecture.config.mjs")).href)).default;
const checkPush = process.argv.includes("--push");

const run = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    return null;
  }
};
const lower = (s) => (s ?? "").toLowerCase();
const errors = [];

// Les variables GIT_AUTHOR_* / GIT_COMMITTER_* priment sur la config : on vérifie la valeur effective.
const author = run("git var GIT_AUTHOR_IDENT") ?? "";
const committer = run("git var GIT_COMMITTER_IDENT") ?? "";
for (const [label, ident] of [["auteur", author], ["committer", committer]]) {
  const match = ident.match(/^(.*) <(.*)> /);
  const name = match?.[1] ?? "";
  const email = match?.[2] ?? "";
  if (!rules.allowedNames.some((n) => lower(n) === lower(name))) {
    errors.push(`${label} "${name}" n'est pas un compte perso (${rules.allowedNames.join(", ")})`);
  }
  if (!rules.allowedEmails.some((e) => lower(e) === lower(email))) {
    errors.push(`${label} email "${email}" n'est pas un email perso (${rules.allowedEmails.join(", ")})`);
  }
  const forbidden = rules.forbiddenPatterns.find((p) => lower(name + email).includes(p));
  if (forbidden) errors.push(`${label} "${name} <${email}>" contient "${forbidden}" (compte pro)`);
}

if (checkPush) {
  const status = run("gh auth status --active --hostname github.com 2>&1") ?? run("gh auth status --hostname github.com 2>&1");
  if (status === null) {
    errors.push("impossible de lire le compte GitHub actif (gh absent ou non connecté)");
  } else {
    const active = status.match(/account (\S+)[^\n]*\n(?:[^\n]*\n)*?\s*- Active account: true/)?.[1] ?? status.match(/account (\S+)/)?.[1];
    if (lower(active) !== lower(rules.githubAccount)) {
      errors.push(`compte GitHub actif "${active}" ≠ "${rules.githubAccount}"`);
    }
  }
}

if (errors.length) {
  console.error("\n✗ Mauvais compte git pour ce projet PERSO :");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`
Corriger avant de continuer :
  git config user.name "Breakyt"
  git config user.email "${rules.allowedEmails[0]}"${checkPush ? `\n  gh auth switch --hostname github.com --user ${rules.githubAccount}` : ""}
`);
  process.exit(1);
}
console.log(`✓ identité git perso OK${checkPush ? ` (push via ${rules.githubAccount})` : ""}`);
