import assert from "node:assert/strict";
import { test } from "node:test";
import { ledger } from "../lib/ledger.mjs";
import { readJson } from "../lib/model.mjs";
import { frameworkRepo, git, lockOf, put, skillsRepo } from "./helpers.mjs";
import { join } from "node:path";

test("a line at its lock is current, and a line that moved lists the commits to review", () => {
  const framework = frameworkRepo();
  const root = skillsRepo({ framework: framework.name, lines: ["1.x", "next"] });
  const lock = lockOf(framework);
  lock.demo.next.commit = framework.tagCommit;
  put(framework.dir, "docs/en/changelog.md", "# Changelog\n\n- Added LaterThing\n");
  put(framework.dir, "core/src/main/java/dev/simplecore/demo/Note.java", "package dev.simplecore.demo;\nclass Note {}\n");
  git(framework.dir, "add", "-A");
  git(framework.dir, "commit", "-q", "-m", "docs: describe LaterThing\n\nThe page docs/en/guide.md says more.\nSee core/README for the rest: nothing else changed.");
  const entries = ledger(readJson(join(root, "frameworks.json")), lock, { root, frameworksDir: framework.base });
  const released = entries.find((entry) => entry.line === "1.x");
  assert.equal(released.state, "current");
  const next = entries.find((entry) => entry.line === "next");
  assert.equal(next.state, "moved");
  assert.equal(next.count, 2);
  assert.deepEqual(next.reviewed.map((commit) => [commit.subject, commit.areas]), [["feat(core): add LaterThing", ["core"]]]);
  assert.deepEqual(next.others, { docs: 1 });
  assert.deepEqual(next.changelog, ["# Changelog", "- Added LaterThing"]);
  assert.deepEqual(next.skills, ["plugins/demo-plugin/skills/demo-skill"]);
});

test("a breaking commit of any type is listed, and a line without a lock or a checkout is named", () => {
  const framework = frameworkRepo();
  const root = skillsRepo({ framework: framework.name, lines: ["1.x", "next"] });
  put(framework.dir, "docs/en/guide.md", "# Guide\n");
  git(framework.dir, "add", "-A");
  git(framework.dir, "commit", "-q", "-m", "chore!: drop the old guide");
  const lock = { demo: { next: { ref: "main", commit: framework.tagCommit } } };
  const entries = ledger(readJson(join(root, "frameworks.json")), lock, { root, frameworksDir: framework.base });
  assert.equal(entries.find((entry) => entry.line === "1.x").state, "not-locked");
  assert.deepEqual(entries.find((entry) => entry.line === "next").reviewed.map((commit) => [commit.subject, commit.breaking]), [["feat(core): add LaterThing", false], ["chore!: drop the old guide", true]]);
  assert.equal(ledger(readJson(join(root, "frameworks.json")), lock, { root, frameworksDir: join(framework.base, "nowhere") })[0].state, "missing");
});
