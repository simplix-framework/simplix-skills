#!/usr/bin/env node
/**
 * Moves the lock: records the commit of each release line the skills were verified against.
 * The lock moves only when the drift checks pass at the new commits.
 *
 *   node tools/lock.mjs --latest                    every line to its newest ref
 *   node tools/lock.mjs <framework> <line> <ref>    one line to a ref
 *   node tools/lock.mjs --frameworks <dir> ...      the folder that holds the framework checkouts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { baselineText } from "./lib/baseline.mjs";
import { checkDrift } from "./lib/drift.mjs";
import { Framework } from "./lib/framework.mjs";
import { ROOT, loadFrameworks, loadLock } from "./lib/model.mjs";

const argv = process.argv.slice(2);
const at = argv.indexOf("--frameworks");
const baseDir = at >= 0 ? argv[at + 1] : process.env.SIMPLIX_FRAMEWORKS_DIR;
const positional = argv.filter((arg, i) => !arg.startsWith("--") && (at < 0 || i !== at + 1));
const config = loadFrameworks(ROOT);
const next = structuredClone(loadLock(ROOT));

function fail(message) {
  console.error(message);
  process.exit(2);
}

function record(id, line, ref) {
  const spec = config.frameworks[id];
  if (!spec?.lines[line]) fail(`${id} ${line} is not a release line in frameworks.json`);
  const framework = new Framework(id, spec, ROOT, baseDir);
  if (!framework.exists()) fail(`no checkout of ${id} at ${framework.path}`);
  const target = ref ? { ref, commit: framework.commitOf(spec.lines[line].track === "branch" ? framework.branchRef(ref) : ref) } : framework.latest(line);
  if (!target.commit) fail(`${id} ${line}: ${ref ?? "no ref"} does not resolve`);
  next[id] = { ...(next[id] ?? {}), [line]: { ref: target.ref, commit: target.commit } };
}

if (argv.includes("--latest")) {
  for (const [id, spec] of Object.entries(config.frameworks)) for (const line of Object.keys(spec.lines)) record(id, line);
} else if (positional.length === 3) {
  record(...positional);
} else {
  fail("usage: node tools/lock.mjs --latest | <framework> <line> <ref>");
}

const { findings } = checkDrift(ROOT, { mode: "lock", lock: next, frameworksDir: baseDir, baselineFile: false });
if (findings.length) {
  for (const item of findings) console.error(`${item.file}${item.line ? `:${item.line}` : ""}  [${item.check}] ${item.message}`);
  fail(`\nthe lock stays where it is: ${findings.length} finding(s) at the new commits`);
}
writeFileSync(join(ROOT, "frameworks.lock.json"), `${JSON.stringify(next, null, 2)}\n`);
// The baseline the detector ships follows the lock.
if (config.baselineFile) writeFileSync(join(ROOT, config.baselineFile), baselineText(config, next));
for (const [id, lines] of Object.entries(next)) for (const [line, entry] of Object.entries(lines)) console.log(`${id} ${line}: ${entry.ref} (${entry.commit.slice(0, 10)})`);
