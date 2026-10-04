#!/usr/bin/env node
// Lance chaque scénario de scripts/e2e/ sur l'app buildée, en bac à sable (données jetables).
// Usage : npm run build && npm run e2e [-- <filtre>]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "e2e");
const filter = process.argv[2] ?? "";
const scenarios = fs.readdirSync(DIR).filter((f) => f.endsWith(".mjs") && f.includes(filter));
let failed = 0;
for (const file of scenarios) {
  console.log(`\n▶ ${file}`);
  const res = spawnSync(process.execPath, [path.join(DIR, file)], { stdio: "inherit" });
  if (res.status !== 0) failed++;
}
console.log(`\n${failed ? "✗" : "✓"} e2e : ${scenarios.length - failed}/${scenarios.length} scénario(s) OK`);
process.exit(failed ? 1 : 0);
