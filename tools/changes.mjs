#!/usr/bin/env node
/**
 * Prints the change ledger: what each framework release line gained since the commit the
 * handbooks were last verified against, as a checklist with the handbooks that describe it.
 *
 *   node tools/changes.mjs                    every release line
 *   node tools/changes.mjs --frameworks <dir> the folder that holds the framework checkouts by name
 *   node tools/changes.mjs --fetch            fetch each checkout first
 *
 * Exits 1 while any line has moved, is not locked or has no checkout.
 */
import { ledger } from "./lib/ledger.mjs";
import { ROOT, loadFrameworks, loadLock } from "./lib/model.mjs";

const argv = process.argv.slice(2);
const at = argv.indexOf("--frameworks");
const entries = ledger(loadFrameworks(ROOT), loadLock(ROOT), {
  root: ROOT,
  frameworksDir: at >= 0 ? argv[at + 1] : process.env.SIMPLIX_FRAMEWORKS_DIR,
  fetch: argv.includes("--fetch"),
});

for (const entry of entries) {
  if (entry.state === "missing") console.log(`## ${entry.id}\n\nNo checkout at ${entry.path}.\n`);
  else if (entry.state === "not-locked") console.log(`## ${entry.id} ${entry.line}\n\nNot locked. Newest ref: ${entry.to ?? "none"}.\n`);
  else if (entry.state === "current") console.log(`## ${entry.id} ${entry.line}\n\nUp to date at ${entry.from}.\n`);
  else {
    console.log(`## ${entry.id} ${entry.line}: ${entry.from} to ${entry.to} (${entry.count} commits)\n`);
    console.log(`Handbooks that describe it: ${entry.skills.join(", ") || "none"}\n`);
    for (const commit of entry.reviewed) console.log(`- [ ] ${commit.date} ${commit.hash} ${commit.breaking ? "BREAKING " : ""}${commit.subject} (${commit.areas.join(", ")})`);
    if (entry.reviewed.length === 0) console.log("No commit of a reviewed type.");
    const others = Object.entries(entry.others);
    if (others.length) console.log(`\nNot listed: ${others.map(([type, n]) => `${type} ${n}`).join(", ")}`);
    if (entry.changelog.length) console.log(`\nChangelog lines added:\n\n${entry.changelog.map((l) => `    ${l}`).join("\n")}`);
    console.log("");
  }
}
process.exit(entries.some((entry) => entry.state !== "current") ? 1 : 0);
