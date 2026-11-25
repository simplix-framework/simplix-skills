import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { editedFiles, loadedSkill, typedSkill } from "../lib/event.mjs";

const HOOKS = join(dirname(fileURLToPath(import.meta.url)), "..");
let sessions = 0;
const session = () => `test-${process.pid}-${Date.now()}-${sessions++}`;

function project(config) {
  const root = mkdtempSync(join(tmpdir(), "gate-project-"));
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, ".claude"));
  writeFileSync(join(root, ".claude", "simplix.json"), JSON.stringify(config));
  return root;
}

function run(script, mode, event, env = {}) {
  const result = spawnSync(process.execPath, [join(HOOKS, script), mode], { input: JSON.stringify(event), encoding: "utf8", env: { ...process.env, ...env } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

const gates = { skillGate: { skills: ["simplix:frontend"], sourceDirs: ["modules/"] }, e2eGate: { skill: "simplix:frontend-e2e", uiDirs: ["modules/"] } };
const claudeEdit = (cwd, sessionId, file) => ({ session_id: sessionId, cwd, tool_name: "Edit", tool_input: { file_path: file } });
const codexEdit = (cwd, sessionId, file) => ({ session_id: sessionId, cwd, tool_name: "apply_patch", tool_input: { command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch` } });

test("an edit event names its files in both harness shapes", () => {
  assert.deepEqual(editedFiles({ tool_name: "Write", tool_input: { file_path: "a/b.ts" } }), ["a/b.ts"]);
  assert.deepEqual(editedFiles({ tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Add File: x/new.tsx\n+a\n*** Update File: x/old.ts\n*** Move to: x/renamed.ts\n*** Delete File: x/gone.css\n*** End Patch" } }), ["x/new.tsx", "x/old.ts", "x/renamed.ts", "x/gone.css"]);
  assert.deepEqual(editedFiles({ tool_name: "Bash", tool_input: { command: "ls" } }), []);
});

test("a skill load is read from a tool call that names it, a shell read of its entry file and a typed prompt", () => {
  assert.equal(loadedSkill({ tool_name: "Skill", tool_input: { skill: "simplix:backend" } }, "simplix"), "simplix:backend");
  assert.equal(loadedSkill({ tool_name: "Bash", tool_input: { command: "cat /home/u/.codex/plugins/cache/market/simplix/3.0.0/skills/frontend/SKILL.md" } }, "simplix"), "simplix:frontend");
  assert.equal(loadedSkill({ tool_name: "Bash", tool_input: { command: "cat /repo/other/skills/frontend/SKILL.md" } }, "simplix"), null);
  assert.equal(typedSkill({ prompt: "/simplix:backend add an entity" }), "simplix:backend");
  assert.equal(typedSkill({ prompt: "$simplix:frontend-e2e check the list" }), "simplix:frontend-e2e");
  assert.equal(typedSkill({ prompt: "please use simplix:backend" }), null);
});

for (const [harness, edit] of [["Claude Code", claudeEdit], ["Codex", codexEdit]]) {
  test(`${harness}: a source edit is refused until the handbook was loaded, then allowed`, () => {
    const root = project(gates);
    const id = session();
    const refused = run("skill-gate.mjs", "check", edit(root, id, "modules/catalog/src/list.tsx"));
    assert.equal(refused.hookSpecificOutput.permissionDecision, "deny");
    assert.match(refused.hookSpecificOutput.permissionDecisionReason, /simplix:frontend .*modules\/catalog\/src\/list\.tsx/);
    run("skill-gate.mjs", "mark", { session_id: id, cwd: root, tool_name: "Skill", tool_input: { skill: "simplix:frontend" } });
    assert.equal(run("skill-gate.mjs", "check", edit(root, id, "modules/catalog/src/list.tsx")), null);
  });

  test(`${harness}: a session that changed a screen is stopped once without the browser audit`, () => {
    const root = project(gates);
    const id = session();
    run("e2e-gate.mjs", "touch", edit(root, id, "modules/catalog/src/list.tsx"));
    const stopped = run("e2e-gate.mjs", "check", { session_id: id, cwd: root });
    assert.equal(stopped.decision, "block");
    assert.match(stopped.reason, /modules\/catalog\/src\/list\.tsx.*simplix:frontend-e2e/);
    assert.equal(run("e2e-gate.mjs", "check", { session_id: id, cwd: root }), null);
  });
}

test("what the project did not declare is never gated", () => {
  const root = project(gates);
  const id = session();
  assert.equal(run("skill-gate.mjs", "check", claudeEdit(root, id, "docs/guide.tsx")), null, "outside the declared folders");
  assert.equal(run("skill-gate.mjs", "check", claudeEdit(root, id, "modules/catalog/README.md")), null, "not a source file");
  assert.equal(run("skill-gate.mjs", "check", claudeEdit(root, id, "modules/catalog/src/generated/api.ts")), null, "a generated file");
  assert.equal(run("skill-gate.mjs", "check", claudeEdit(project({}), id, "modules/catalog/src/list.tsx")), null, "no gate declared");
  assert.equal(run("skill-gate.mjs", "check", claudeEdit(root, id, "modules/catalog/src/list.tsx"), { SIMPLIX_SKILL_GATE: "off" }), null, "switched off");
});

test("a session that drove the screens, or changed none, ends without a stop", () => {
  const root = project(gates);
  const audited = session();
  run("e2e-gate.mjs", "touch", claudeEdit(root, audited, "modules/catalog/src/list.tsx"));
  run("skill-gate.mjs", "mark", { session_id: audited, cwd: root, tool_name: "Skill", tool_input: { skill: "simplix:frontend-e2e" } });
  assert.equal(run("e2e-gate.mjs", "check", { session_id: audited, cwd: root }), null);
  const untouched = session();
  run("e2e-gate.mjs", "touch", claudeEdit(root, untouched, "modules/catalog/src/util.ts"));
  assert.equal(run("e2e-gate.mjs", "check", { session_id: untouched, cwd: root }), null);
  assert.equal(run("e2e-gate.mjs", "mark-audit", { session_id: untouched, cwd: root, tool_name: "Bash", tool_input: { command: "node audit.mjs" } }), null);
});

test("a session start names the parts of a project and stays silent elsewhere", () => {
  const root = mkdtempSync(join(tmpdir(), "start-project-"));
  writeFileSync(join(root, "build.gradle"), "dependencies { implementation 'dev.simplecore.simplix:spring-boot-starter-simplix:1.2.4' }\n");
  const announced = run("session-start.mjs", "", { session_id: session(), cwd: root });
  assert.match(announced.hookSpecificOutput.additionalContext, /simplix 1\.2\.4 -> simplix:backend/);
  assert.match(announced.hookSpecificOutput.additionalContext, /Older than its handbook/);
  assert.equal(run("session-start.mjs", "", { session_id: session(), cwd: mkdtempSync(join(tmpdir(), "plain-project-")) }), null);
});
