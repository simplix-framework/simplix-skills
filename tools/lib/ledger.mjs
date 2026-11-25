/**
 * The change ledger: what each framework release line gained between the locked commit and its
 * newest ref, limited to the commits whose type can change a statement of a handbook.
 */
import { Framework, git } from "./framework.mjs";

/** Commit types whose subject can change a statement of a handbook. */
const REVIEWED = ["feat", "fix", "perf", "security", "revert"];

/**
 * @param {object} config the content of frameworks.json
 * @param {object} lock the content of frameworks.lock.json
 * @param {{ root: string, frameworksDir?: string, fetch?: boolean }} options
 * @returns {object[]} one entry per release line: its state and, when it moved, its commits
 */
export function ledger(config, lock, { root, frameworksDir, fetch = false }) {
  const entries = [];
  for (const [id, spec] of Object.entries(config.frameworks)) {
    const framework = new Framework(id, spec, root, frameworksDir);
    if (!framework.exists()) {
      entries.push({ id, line: null, state: "missing", path: framework.path });
      continue;
    }
    if (fetch) git(framework.path, ["fetch", "--quiet", "--tags", "origin"]);
    for (const line of Object.keys(spec.lines)) {
      const locked = lock[id]?.[line];
      const newest = framework.latest(line);
      const skills = Object.entries(config.skills).filter(([, mapping]) => mapping[id]?.includes(line)).map(([key]) => key);
      if (!locked) {
        entries.push({ id, line, state: "not-locked", to: newest.ref, skills });
        continue;
      }
      if (locked.commit === newest.commit) {
        entries.push({ id, line, state: "current", from: locked.ref, skills });
        continue;
      }
      const range = `${locked.commit}..${newest.commit}`;
      // Each record: hash, date, subject, body, then the files the commit touched.
      const commits = git(framework.path, ["log", "--no-merges", "--reverse", "--format=%x1e%h%x1f%ad%x1f%s%x1f%b%x1f", "--date=short", "--name-only", range])
        .split("\x1e")
        .filter((record) => record.trim())
        .map((record) => {
          const [hash, date, subject, body, files] = record.split("\x1f");
          const type = /^([a-z]+)(?:\([^)]*\))?(!)?:/.exec(subject);
          const areas = [...new Set((files ?? "").split("\n").filter(Boolean).map((file) => file.split("/")[0]))];
          return { hash, date, subject, type: type?.[1] ?? "other", breaking: Boolean(type?.[2]) || /BREAKING CHANGE/.test(body ?? ""), areas };
        });
      const reviewed = commits.filter((commit) => commit.breaking || REVIEWED.includes(commit.type));
      const others = {};
      for (const commit of commits) if (!reviewed.includes(commit)) others[commit.type] = (others[commit.type] ?? 0) + 1;
      const changelogs = framework.files(newest.commit).filter((file) => /(^|\/)(CHANGELOG\.md|docs\/en\/changelog\.md)$/.test(file));
      const changelog = changelogs.length
        ? git(framework.path, ["diff", "--unified=0", range, "--", ...changelogs]).split("\n").filter((l) => /^\+(?!\+\+)/.test(l) && l.trim() !== "+").map((l) => l.slice(1))
        : [];
      entries.push({ id, line, state: "moved", from: locked.ref, to: newest.ref, count: commits.length, skills, reviewed, others, changelog });
    }
  }
  return entries;
}
