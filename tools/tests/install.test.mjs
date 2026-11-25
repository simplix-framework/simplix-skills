import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readlinkSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { link, linksOf, unlink } from "../install.mjs";

const scratch = () => mkdtempSync(join(tmpdir(), "install-"));

test("a link is created, left alone when current, and replaced when it points elsewhere", () => {
  const home = scratch();
  const first = join(scratch(), "plugin");
  const second = join(scratch(), "plugin");
  mkdirSync(first);
  mkdirSync(second);
  const path = join(home, "skills", "demo");
  assert.equal(link(path, first).result, "linked");
  assert.equal(link(path, first).result, "current");
  assert.deepEqual(link(path, second), { path, result: "relinked", was: first });
  assert.equal(readlinkSync(path), second);
});

test("a folder in the place of a link is never replaced", () => {
  const home = scratch();
  mkdirSync(join(home, "skills", "demo"), { recursive: true });
  assert.equal(link(join(home, "skills", "demo"), scratch()).result, "occupied");
});

test("only a link that points into the checkout is removed", () => {
  const home = scratch();
  const root = scratch();
  mkdirSync(join(root, "plugins", "demo"), { recursive: true });
  mkdirSync(join(home, "skills"));
  symlinkSync(join(root, "plugins", "demo"), join(home, "skills", "mine"));
  symlinkSync(scratch(), join(home, "skills", "other"));
  assert.equal(unlink(join(home, "skills", "mine"), root).result, "removed");
  assert.equal(unlink(join(home, "skills", "other"), root).result, "kept");
  assert.equal(unlink(join(home, "skills", "absent"), root).result, "kept");
});

test("a plugin is one link for Claude Code and one link per skill for Codex", () => {
  const plugin = { name: "simplix", dir: "/repo/plugins/simplix", skills: [{ name: "simplix", dir: "/repo/plugins/simplix/skills/simplix" }, { name: "backend", dir: "/repo/plugins/simplix/skills/backend" }] };
  const links = linksOf(plugin, { claudeHome: "/c", agentsHome: "/a" });
  assert.deepEqual(links.claude, [{ path: "/c/skills/simplix", target: "/repo/plugins/simplix" }]);
  assert.deepEqual(links.codex.map((entry) => entry.path), ["/a/skills/simplix", "/a/skills/simplix-backend"]);
});
