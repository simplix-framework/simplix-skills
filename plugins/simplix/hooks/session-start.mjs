#!/usr/bin/env node
/**
 * Announces the SimpliX parts of the project a session starts in, with the handbook that covers
 * each. It prints nothing in a project that uses none.
 */
import { detect } from "../skills/simplix/scripts/detect.mjs";
import { pluginName, readEvent } from "./lib/event.mjs";

const event = readEvent();
const report = detect(event?.cwd || process.cwd());
if (report.parts.length > 0) {
  const plugin = pluginName();
  const lines = [
    "This project uses the SimpliX stack. Load the handbook of a part before reading, changing or explaining its files:",
    ...report.parts.map((part) => `- ${part.dir}: ${part.framework} ${part.version ?? "version not resolved"} -> ${plugin}:${part.handbook}`),
  ];
  const older = report.parts.filter((part) => part.standing === "older");
  if (older.length) lines.push(`Older than its handbook (verified against ${[...new Set(older.map((part) => `${part.framework} ${part.verified}`))].join(", ")}): check the changes between the versions before relying on a page.`);
  if (report.parts.some((part) => part.handbook === "frontend")) lines.push(`Drive changed screens in a browser under ${plugin}:frontend-e2e before calling them done.`);
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: lines.join("\n") } }));
}
