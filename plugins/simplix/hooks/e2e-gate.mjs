#!/usr/bin/env node
/**
 * Completion gate: a session that changed screens does not end without the browser audit handbook
 * having been loaded. A screen whose states were never driven is unverified however green the
 * build is, and the defects that hides are the ones a type checker cannot see.
 *
 *   PostToolUse (a file edit) : e2e-gate.mjs touch
 *   Stop                      : e2e-gate.mjs check
 *
 * It stops a session at most once, naming the last screen file that changed. The session then
 * drives the screens, or states why the change has none to drive, and ends.
 *
 * Nothing is gated until the project declares the gate in .claude/simplix.json:
 *
 *   { "e2eGate": { "skill": "simplix:frontend-e2e", "uiDirs": ["modules/", "apps/"] } }
 *
 * uiExtensions replaces the file endings that count as a screen (the default is .tsx).
 * SIMPLIX_E2E_GATE=off switches the check off.
 */
import { dirname, relative, resolve } from "node:path";
import { editedFiles, readEvent } from "./lib/event.mjs";
import { hasMarker, readMarker, setMarker } from "./lib/markers.mjs";
import { findProjectConfig, underAny } from "./lib/project-config.mjs";

const DEFAULT_UI_EXTENSIONS = [".tsx"];

const mode = process.argv[2];
const event = readEvent();
if (!event?.session_id) process.exit(0);

if (mode === "touch") {
  for (const file of editedFiles(event)) {
    const absolute = resolve(event.cwd || process.cwd(), file);
    const found = findProjectConfig(dirname(absolute));
    const gate = found?.config?.e2eGate;
    if (!gate?.skill) continue;
    const extensions = Array.isArray(gate.uiExtensions) ? gate.uiExtensions : DEFAULT_UI_EXTENSIONS;
    if (!extensions.some((extension) => file.endsWith(extension))) continue;
    const inProject = relative(found.root, absolute);
    if (inProject.startsWith("..") || !underAny(inProject, gate.uiDirs)) continue;
    // The marker carries the last screen file, so the stop can name something concrete.
    setMarker("e2e-touched", event.session_id, "", `${gate.skill}\n${inProject}`);
  }
} else if (mode === "check" && process.env.SIMPLIX_E2E_GATE !== "off") {
  const touched = readMarker("e2e-touched", event.session_id);
  if (touched && !event.stop_hook_active && !hasMarker("e2e-warned", event.session_id)) {
    const [skill, lastFile] = touched.split("\n");
    if (!hasMarker("skill", event.session_id, skill)) {
      setMarker("e2e-warned", event.session_id);
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason: `This session changed screens (last: ${lastFile}) and ${skill} was never loaded. Load it and drive the changed screens in a browser, or state why this change has no screen to drive. This reminder is given once.`,
        }),
      );
    }
  }
}
// Any other mode, such as one a session started under an earlier manifest still sends, does nothing.
