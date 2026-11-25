#!/usr/bin/env node
/**
 * Checks this repository: the structure both harnesses need, and every claim the skills make
 * about a framework against that framework's sources.
 *
 *   node tools/check.mjs                 structure, then drift against the locked commits
 *   node tools/check.mjs --structure     structure only; needs no framework checkout
 *   node tools/check.mjs --latest        drift against the newest ref of every release line, and
 *                                        which lines the lock is behind
 *   node tools/check.mjs --frameworks <dir>   the folder that holds the framework checkouts by
 *                                        name, instead of the paths in frameworks.json
 *   node tools/check.mjs --json          the findings as JSON
 *
 * Exits 1 while any finding stands.
 */
import { resolve } from "node:path";
import { checkDrift } from "./lib/drift.mjs";
import { ROOT } from "./lib/model.mjs";
import { checkStructure } from "./lib/structure.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const root = value("--root") ? resolve(value("--root")) : ROOT;
const findings = checkStructure(root);
let commits = {};
let notes = [];
if (!flag("--structure")) {
  const drift = checkDrift(root, {
    mode: flag("--latest") ? "latest" : "lock",
    frameworksDir: value("--frameworks") ?? process.env.SIMPLIX_FRAMEWORKS_DIR,
  });
  findings.push(...drift.findings);
  commits = drift.commits;
  notes = drift.notes;
}

if (flag("--json")) {
  process.stdout.write(`${JSON.stringify({ commits, notes, findings }, null, 2)}\n`);
} else {
  for (const [id, lines] of Object.entries(commits)) {
    for (const [line, entry] of Object.entries(lines)) console.log(`read ${id} ${line} at ${entry.ref} (${entry.commit.slice(0, 10)})`);
  }
  for (const note of notes) console.log(`note: ${note}`);
  const byCheck = new Map();
  for (const item of findings) byCheck.set(item.check, [...(byCheck.get(item.check) ?? []), item]);
  for (const [check, items] of [...byCheck].sort()) {
    console.log(`\n${check} (${items.length})`);
    for (const item of items) console.log(`  ${item.file}${item.line ? `:${item.line}` : ""}  ${item.message}`);
  }
  console.log(findings.length ? `\n${findings.length} finding(s)` : "\nno findings");
}
process.exit(findings.length ? 1 : 0);
