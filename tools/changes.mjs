#!/usr/bin/env node
/**
 * The change ledger: what each framework release line has gained since the commit the skills were
 * last verified against. One entry per commit that can change what a skill says, with the skills
 * that describe the framework, printed as a checklist.
 *
 *   node tools/changes.mjs                    every release line
 *   node tools/changes.mjs --frameworks <dir> the folder that holds the framework checkouts by name
 *   node tools/changes.mjs --fetch            fetch each checkout first
 */
import { Framework, git } from "./lib/framework.mjs";
import { ROOT, loadFrameworks, loadLock } from "./lib/model.mjs";

const argv = process.argv.slice(2);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const baseDir = value("--frameworks") ?? process.env.SIMPLIX_FRAMEWORKS_DIR;
const config = loadFrameworks(ROOT);
const lock = loadLock(ROOT);

/** Commit types whose subject can change a statement of a skill. */
const REVIEWED = ["feat", "fix", "perf", "security", "revert"];

let pending = 0;
for (const [id, spec] of Object.entries(config.frameworks)) {
  const framework = new Framework(id, spec, ROOT, baseDir);
  if (!framework.exists()) {
    console.log(`## ${id}\n\nNo checkout at ${framework.path}.\n`);
    pending += 1;
    continue;
  }
  if (argv.includes("--fetch")) git(framework.path, ["fetch", "--quiet", "--tags", "origin"]);
  const skills = Object.entries(config.skills).filter(([, mapping]) => mapping[id]);
  for (const line of Object.keys(spec.lines)) {
    const locked = lock[id]?.[line];
    const newest = framework.latest(line);
    if (!locked) {
      console.log(`## ${id} ${line}\n\nNot locked. Newest ref: ${newest.ref ?? "none"}.\n`);
      pending += 1;
      continue;
    }
    if (locked.commit === newest.commit) {
      console.log(`## ${id} ${line}\n\nUp to date at ${locked.ref}.\n`);
      continue;
    }
    const range = `${locked.commit}..${newest.commit}`;
    const commits = git(framework.path, ["log", "--no-merges", "--reverse", "--format=%x1e%h%x1f%ad%x1f%s%x1f%b", "--date=short", "--name-only", range])
      .split("\x1e")
      .filter((entry) => entry.trim())
      .map((entry) => {
        const [hash, date, subject, rest] = entry.split("\x1f");
        const files = (rest ?? "").split("\n").filter((l) => l && /^[^\s].*[\/.]/.test(l) && !l.includes(": "));
        const type = /^([a-z]+)(?:\([^)]*\))?(!)?:/.exec(subject);
        const breaking = Boolean(type?.[2]) || /BREAKING CHANGE/.test(rest ?? "");
        const areas = [...new Set(files.map((f) => f.split("/")[0]))].slice(0, 6);
        return { hash, date, subject, type: type?.[1] ?? "other", breaking, areas };
      });
    const reviewed = commits.filter((c) => c.breaking || REVIEWED.includes(c.type));
    const others = commits.filter((c) => !reviewed.includes(c));
    pending += 1;
    console.log(`## ${id} ${line}: ${locked.ref} to ${newest.ref} (${commits.length} commits)\n`);
    console.log(`Skills that describe it: ${skills.filter(([, mapping]) => mapping[id].includes(line)).map(([key]) => key).join(", ") || "none"}\n`);
    for (const commit of reviewed) {
      console.log(`- [ ] ${commit.date} ${commit.hash} ${commit.breaking ? "BREAKING " : ""}${commit.subject} (${commit.areas.join(", ")})`);
    }
    if (reviewed.length === 0) console.log("No commit of a reviewed type.");
    const counts = {};
    for (const commit of others) counts[commit.type] = (counts[commit.type] ?? 0) + 1;
    if (others.length) console.log(`\nNot listed: ${Object.entries(counts).map(([type, n]) => `${type} ${n}`).join(", ")}`);
    const changelogs = framework.files(newest.commit).filter((f) => /(^|\/)(CHANGELOG\.md|docs\/en\/changelog\.md)$/.test(f));
    if (changelogs.length) {
      const diff = git(framework.path, ["diff", "--unified=0", range, "--", ...changelogs]);
      const added = diff.split("\n").filter((l) => /^\+(?!\+\+)/.test(l) && l.trim() !== "+").map((l) => l.slice(1));
      if (added.length) console.log(`\nChangelog lines added:\n\n${added.map((l) => `    ${l}`).join("\n")}`);
    }
    console.log("");
  }
}
process.exit(pending ? 1 : 0);
