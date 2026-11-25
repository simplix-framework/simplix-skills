#!/usr/bin/env node
/**
 * Skill gate: refuses a source edit until the handbook of that part of the project was loaded in
 * the session. The handbooks hold conventions that differ from the stock frameworks, so an edit
 * written from memory produces defects a reviewer then has to find.
 *
 *   PostToolUse (a skill load, a shell command) : skill-gate.mjs mark
 *   UserPromptSubmit                             : skill-gate.mjs mark-prompt
 *   PreToolUse (a file edit)                     : skill-gate.mjs check
 *
 * Nothing is gated until the project declares the gate in .claude/simplix.json:
 *
 *   { "skillGate": { "skills": ["simplix:frontend"], "sourceDirs": ["modules/", "apps/"] } }
 *
 * Only edits made through the editing tool of the harness are seen; a file changed by a shell
 * command is not. SIMPLIX_SKILL_GATE=off switches the check off for a scripted migration.
 */
import { dirname, relative, resolve } from "node:path";
import { editedFiles, loadedSkill, readEvent, typedSkill } from "./lib/event.mjs";
import { hasMarker, setMarker } from "./lib/markers.mjs";
import { findProjectConfig, underAny } from "./lib/project-config.mjs";

const SOURCE_FILE = /\.(tsx|ts|css|java|kt)$/;
const NEVER_GATED = ["/.claude/", "/generated/", "/node_modules/", "/dist/", "/build/", ".gen.ts", ".d.ts"];

const mode = process.argv[2];
const event = readEvent();
if (!event?.session_id) process.exit(0);

if (mode === "mark") {
  const skill = loadedSkill(event);
  if (skill) setMarker("skill", event.session_id, skill);
} else if (mode === "mark-prompt") {
  const skill = typedSkill(event);
  if (skill) setMarker("skill", event.session_id, skill);
} else if (mode === "check" && process.env.SIMPLIX_SKILL_GATE !== "off") {
  for (const file of editedFiles(event)) {
    if (!SOURCE_FILE.test(file) || NEVER_GATED.some((part) => file.includes(part))) continue;
    const absolute = resolve(event.cwd || process.cwd(), file);
    const found = findProjectConfig(dirname(absolute));
    const gate = found?.config?.skillGate;
    if (!Array.isArray(gate?.skills) || gate.skills.length === 0) continue;
    const inProject = relative(found.root, absolute);
    if (inProject.startsWith("..") || !underAny(inProject, gate.sourceDirs)) continue;
    if (gate.skills.some((skill) => hasMarker("skill", event.session_id, skill))) continue;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Source edit refused: none of ${gate.skills.join(", ")} was loaded in this session. Load the handbook of this part of the project, then repeat the edit. File: ${inProject}`,
        },
      }),
    );
    break;
  }
}
