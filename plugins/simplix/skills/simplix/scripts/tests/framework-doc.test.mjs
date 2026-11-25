import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseArguments, rawUrl } from "../framework-doc.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "framework-doc.mjs");

test("a version becomes its tag and a ref is taken as written", () => {
  assert.deepEqual(parseArguments(["searchable-jpa:docs/en/faq.md", "--version", "2.1.0"]), { framework: "searchable-jpa", path: "docs/en/faq.md", ref: "v2.1.0", checkout: undefined });
  assert.equal(parseArguments(["simplix:README.md", "--ref", "spring-boot-3x"]).ref, "spring-boot-3x");
  assert.equal(rawUrl({ framework: "simplix", path: "simplix-auth/docs/en/a b.md", ref: "v2.0.2" }), "https://raw.githubusercontent.com/simplix-framework/simplix/v2.0.2/simplix-auth/docs/en/a%20b.md");
});

test("a missing version, a missing pointer and an unknown framework are refused", () => {
  assert.throws(() => parseArguments(["simplix:README.md"]), /pass --version/);
  assert.throws(() => parseArguments(["--version", "1.0.0"]), /name the file as/);
  assert.throws(() => parseArguments(["other:README.md", "--version", "1.0.0"]), /unknown framework other/);
});

test("a local clone answers for the tagged version", () => {
  const clone = mkdtempSync(join(tmpdir(), "framework-doc-"));
  const git = (...args) => execFileSync("git", ["-C", clone, "-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args], { encoding: "utf8" });
  git("init", "-q", "-b", "main");
  mkdirSync(join(clone, "docs", "en"), { recursive: true });
  writeFileSync(join(clone, "docs", "en", "guide.md"), "# Tagged guide\n");
  git("add", "-A");
  git("commit", "-q", "-m", "docs: guide");
  git("tag", "v1.0.0");
  writeFileSync(join(clone, "docs", "en", "guide.md"), "# Later guide\n");
  const out = execFileSync(process.execPath, [SCRIPT, "simplix:docs/en/guide.md", "--version", "1.0.0", "--checkout", clone], { encoding: "utf8" });
  assert.equal(out, "# Tagged guide\n");
});
