import assert from "node:assert/strict";
import { test } from "node:test";
import { checkStructure } from "../lib/structure.mjs";
import { put, skillsRepo } from "./helpers.mjs";

const SKILL = "plugins/demo-plugin/skills/demo-skill";
const checksOf = (root) => checkStructure(root).map((f) => f.check);
const entry = (frontmatter, body = "# Demo\n\nRead `references/guide.md`.\n") => `---\n${frontmatter}\n---\n\n${body}`;

test("a clean repository has no structure finding", () => {
  assert.deepEqual(checkStructure(skillsRepo()), []);
});

test("frontmatter: a description both parsers read differently is refused, a quoted one passes", () => {
  const root = skillsRepo();
  put(root, `${SKILL}/SKILL.md`, entry("name: demo-skill\ndescription: Use when testing: the demo skill."));
  assert.deepEqual(checksOf(root), ["frontmatter", "frontmatter"]);
  put(root, `${SKILL}/SKILL.md`, entry('name: demo-skill\ndescription: "Use when testing: the demo skill."'));
  assert.deepEqual(checksOf(root), []);
});

test("frontmatter: the name is the folder, the keys are the shared ones, the description has a limit", () => {
  const root = skillsRepo();
  put(root, `${SKILL}/SKILL.md`, entry('name: other-name\ndescription: "x"'));
  assert.match(checkStructure(root)[0].message, /the folder is demo-skill/);
  put(root, `${SKILL}/SKILL.md`, entry('name: demo-skill\ndescription: "x"\ndisable-model-invocation: true'));
  assert.match(checkStructure(root)[0].message, /disable-model-invocation is not read by both harnesses/);
  put(root, `${SKILL}/SKILL.md`, entry(`name: demo-skill\ndescription: "${"x".repeat(1025)}"`));
  assert.match(checkStructure(root)[0].message, /1025 characters/);
});

test("dead-path: a link or a code path to a file the skill does not have", () => {
  const root = skillsRepo({ body: "# Demo\n\nRead `references/guide.md`, [more](references/missing.md) and `references/none.md`." });
  assert.deepEqual(checksOf(root), ["dead-path", "dead-path"]);
});

test("dead-path: a path under a folder the skill does not have belongs to the project it is used in", () => {
  const root = skillsRepo({ body: "# Demo\n\nRead `references/guide.md`, then run `node scripts/build.mjs` of the project." });
  assert.deepEqual(checksOf(root), []);
  put(root, `${SKILL}/scripts/real.mjs`, "");
  assert.deepEqual(checksOf(root), ["dead-path", "orphan"]);
});

test("dead-path: a path into a sibling skill has to exist", () => {
  const root = skillsRepo({ body: "# Demo\n\nRead `references/guide.md` and run `node ../other-skill/scripts/run.mjs --flag`." });
  assert.deepEqual(checksOf(root), ["dead-path"]);
  put(root, "plugins/demo-plugin/skills/other-skill/scripts/run.mjs", "");
  put(root, "plugins/demo-plugin/skills/other-skill/SKILL.md", '---\nname: other-skill\ndescription: "x"\n---\n\nRun `scripts/run.mjs`.\n');
  assert.deepEqual(checksOf(root), []);
});

test("orphan: a reference no file of the skill names", () => {
  const root = skillsRepo();
  put(root, `${SKILL}/references/unnamed.md`, "# Unnamed\n");
  assert.deepEqual(checksOf(root), ["orphan"]);
  put(root, `${SKILL}/references/guide.md`, "# Guide\n\nSee `references/unnamed.md`.\n");
  assert.deepEqual(checksOf(root), []);
});

test("character: the em dash and a pictograph are refused, a status symbol passes", () => {
  const root = skillsRepo({ reference: "# Guide\n\nDone ✔ and next → step.\n" });
  assert.deepEqual(checksOf(root), []);
  put(root, `${SKILL}/references/guide.md`, `# Guide\n\nA dash ${String.fromCodePoint(0x2014)} here.\n\nA face ${String.fromCodePoint(0x1f600)} here.\n`);
  assert.deepEqual(checksOf(root), ["character", "character"]);
});

test("hangul-prose: a Korean sentence in an instruction file is refused, a quoted label passes", () => {
  const root = skillsRepo({ reference: "# Guide\n\nThe first action of a row is \u300c\ubcf4\uae30\u300d and the button reads `\uc800\uc7a5`.\n" });
  assert.deepEqual(checksOf(root), []);
  put(root, `${SKILL}/references/guide.md`, "# Guide\n\n\ubc84\ud2bc\uc744 \ub204\ub985\ub2c8\ub2e4.\n");
  assert.deepEqual(checksOf(root), ["hangul-prose"]);
});

test("harness-term: a mechanism of one harness needs the harness named on the line", () => {
  const root = skillsRepo({ reference: "# Guide\n\nIn Claude Code, load the handbook with the Skill tool.\n" });
  assert.deepEqual(checksOf(root), []);
  put(root, `${SKILL}/references/guide.md`, "# Guide\n\nLoad the handbook with the Skill tool.\n");
  assert.deepEqual(checksOf(root), ["harness-term"]);
});

test("manifest: the two manifests agree and both marketplaces list the plugin", () => {
  const root = skillsRepo();
  put(root, "plugins/demo-plugin/.claude-plugin/plugin.json", JSON.stringify({ name: "demo-plugin", version: "0.2.0", description: "Demo plugin" }));
  assert.match(checkStructure(root)[0].message, /version differs/);
  const other = skillsRepo();
  put(other, ".agents/plugins/marketplace.json", JSON.stringify({ name: "demo", plugins: [] }));
  assert.match(checkStructure(other)[0].message, /demo-plugin is not listed/);
});
