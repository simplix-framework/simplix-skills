import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkDrift } from "../lib/drift.mjs";
import { frameworkRepo, git, lockOf, put, skillsRepo } from "./helpers.mjs";

const demo = frameworkRepo();

/** The drift messages for one skill body, read against the scratch framework. */
function drift(body, { lines = ["1.x"], external = "", mode = "lock", framework = demo } = {}) {
  const root = skillsRepo({ body: "# Demo\n\nRead `references/guide.md`.\n\n" + body, framework: framework.name, lines });
  if (external) put(root, "tools/external-names.txt", external);
  return checkDrift(root, { frameworksDir: framework.base, lock: lockOf(framework), mode }).findings.map((f) => `${f.check}: ${f.message}`);
}

test("a name the framework declares passes, one it does not is a finding", () => {
  assert.deepEqual(drift("Extend `DemoThing` and call `useDemo`."), []);
  const found = drift("Extend `GhostThing` and call `useGhost`.");
  assert.equal(found.length, 2);
  assert.match(found[0], /drift: GhostThing is not in demo 1\.x \(v1\.0\.0\)/);
});

test("a name listed as external passes", () => {
  assert.deepEqual(drift("Wrap it in `ResponseEntity`.", { external: "# Spring\nResponseEntity\n" }), []);
});

test("a member and an annotation attribute are read in the file of their type", () => {
  assert.deepEqual(drift("Call `DemoThing.runDemo()` under `@DemoMark(level = 2)`."), []);
  assert.deepEqual(drift("Call `DemoThing.vanish()` under `@DemoMark(depth = 2)`."), [
    "drift: DemoThing.vanish is not in demo 1.x (v1.0.0)",
    "drift: DemoMark.depth is not in demo 1.x (v1.0.0)",
  ]);
});

test("an import of a framework class is resolved by its package", () => {
  assert.deepEqual(drift("```java\nimport dev.simplecore.demo.DemoThing;\nimport java.util.List;\n```"), []);
  assert.deepEqual(drift("```java\nimport dev.simplecore.other.DemoThing;\n```"), ["drift: dev.simplecore.other.DemoThing is not in demo 1.x (v1.0.0)"]);
});

test("a property passes when the framework writes it, whole or under its prefix", () => {
  assert.deepEqual(drift("Set `simplix.demo.enabled` and `simplix.demo.cache.time-to-live`."), []);
  assert.deepEqual(drift("Set `simplix.demo.nope`."), ["drift: simplix.demo.nope is not in demo 1.x (v1.0.0)"]);
  assert.deepEqual(drift("```yaml\nsimplix:\n  demo:\n    enabled: true\n    nope: 1\n```"), ["drift: simplix.demo.nope is not in demo 1.x (v1.0.0)"]);
});

test("a package of the framework is named by its prefix", () => {
  assert.deepEqual(drift("The group is `dev.simplecore.demo`."), []);
  assert.deepEqual(drift("The group is `dev.simplecore.ghost`."), ["drift: dev.simplecore.ghost is not in demo 1.x (v1.0.0)"]);
});

test("the entry file names the versions it was verified against", () => {
  const stale = skillsRepo({ baseline: "Verified against 0.9.0." });
  const found = checkDrift(stale, { frameworksDir: demo.base, lock: lockOf(demo) }).findings.map((f) => `${f.check}: ${f.message}`);
  assert.deepEqual(found, ["baseline: the line names 0.9.0 and the checked refs are 1.0.0", "drift: 0.9.0 is not a released tag of a framework and not in tools/external-names.txt"]);
  const silent = skillsRepo({ baseline: "" });
  assert.deepEqual(checkDrift(silent, { frameworksDir: demo.base, lock: lockOf(demo) }).findings.map((f) => f.check), ["baseline"]);
});

test("a pointer names a file of the framework", () => {
  assert.deepEqual(drift("Read `demo:docs/en/guide.md`."), []);
  assert.deepEqual(drift("Read `demo:docs/en/none.md`."), ["drift: demo:docs/en/none.md is not in demo 1.x (v1.0.0)"]);
  // A name of the same form without a path is a skill of a plugin, not a file.
  assert.deepEqual(drift("Load `demo:handbook`."), []);
});

test("a package and an import are resolved in the workspace", () => {
  assert.deepEqual(drift('Install `@simplix-react/demo`.\n\n```ts\nimport { useDemo, DemoPanel } from "@simplix-react/demo";\nimport { useDemo as other } from "@simplix-react/demo/extra";\n```'), []);
  assert.deepEqual(drift("Install `@simplix-react/ghost`."), ["drift: package @simplix-react/ghost is in no framework repository"]);
  assert.deepEqual(drift('```ts\nimport { useGhost } from "@simplix-react/demo";\nimport { useDemo } from "@simplix-react/demo/nope";\n```'), [
    "drift: import from @simplix-react/demo is not in demo 1.x (v1.0.0)",
    "drift: import from @simplix-react/demo/nope is not in demo 1.x (v1.0.0)",
  ]);
});

test("a version is a released tag", () => {
  assert.deepEqual(drift("Since 1.0.0."), []);
  assert.deepEqual(drift("Since 9.9.9."), ["drift: 9.9.9 is not a released tag of a framework and not in tools/external-names.txt"]);
});

test("a fact of one release line passes when its line is marked", () => {
  const both = { lines: ["1.x", "next"] };
  assert.deepEqual(drift("Use `LaterThing`.", both), [
    "drift: LaterThing is missing in demo 1.x (v1.0.0); correct it or mark the line with the release line it holds for",
  ]);
  assert.deepEqual(drift("Use `LaterThing`. [next]", both), []);
});

test("the generator and the simplix-react tool answer for their commands and flags", () => {
  const generator = frameworkRepo("simplix");
  assert.deepEqual(drift("Run `simplix-boot generate Book --force`.", { framework: generator }), []);
  assert.deepEqual(drift("Run `simplix-boot generate Book --fast`, then `simplix-boot vanish`.", { framework: generator }), [
    "drift: simplix-boot generate has no --fast in simplix 1.x (v1.0.0)",
    "drift: simplix-boot has no command vanish in simplix 1.x (v1.0.0)",
  ]);
  const react = frameworkRepo("simplix-react");
  assert.deepEqual(drift("```bash\npnpm exec simplix build --watch --out dist\n```", { framework: react }), []);
  assert.deepEqual(drift("Run `simplix build --fast`.", { framework: react }), ["drift: simplix build has no --fast in simplix-react 1.x (v1.0.0)"]);
});

test("the newest refs: a release the lock has not followed is a finding, a branch that moved is a note", () => {
  const framework = frameworkRepo();
  const root = skillsRepo({ framework: framework.name, lines: ["1.x", "next"] });
  const lock = lockOf(framework);
  lock.demo.next.commit = framework.tagCommit;
  const moved = checkDrift(root, { frameworksDir: framework.base, lock, mode: "latest" });
  assert.deepEqual(moved.findings, []);
  assert.deepEqual(moved.notes, ["demo next is locked at main and the newest is main (1 commits later)"]);
  git(framework.dir, "tag", "v1.1.0", "HEAD");
  const released = checkDrift(root, { frameworksDir: framework.base, lock, mode: "latest" }).findings.map((f) => `${f.check}: ${f.message}`);
  assert.deepEqual(released, [
    "behind: demo 1.x is locked at v1.0.0 and the newest is v1.1.0 (1 commits later)",
    "baseline: the line names 1.0.0 and the checked refs are 1.1.0",
  ]);
});

test("a lock whose tag was moved is a finding", () => {
  const framework = frameworkRepo();
  const root = skillsRepo({ framework: framework.name });
  const lock = lockOf(framework);
  git(framework.dir, "tag", "-f", "v1.0.0", "HEAD");
  const found = checkDrift(root, { frameworksDir: framework.base, lock }).findings.map((f) => f.message);
  assert.equal(found.length, 1);
  assert.match(found[0], /demo 1\.x: v1\.0\.0 no longer leads to the locked commit/);
});

test("a skill outside the map and a missing checkout are findings", () => {
  const root = skillsRepo();
  put(root, "plugins/demo-plugin/skills/unmapped/SKILL.md", '---\nname: unmapped\ndescription: "x"\n---\n');
  const found = checkDrift(root, { frameworksDir: demo.base, lock: lockOf(demo) }).findings.map((f) => f.check);
  assert.deepEqual(found, ["mapping"]);
  const empty = mkdtempSync(join(tmpdir(), "no-frameworks-"));
  assert.deepEqual(checkDrift(skillsRepo(), { frameworksDir: empty, lock: lockOf(demo) }).findings.map((f) => f.check), ["framework"]);
});
