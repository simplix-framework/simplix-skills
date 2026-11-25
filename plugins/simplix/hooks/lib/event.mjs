/**
 * One hook event in the shape the gates read, whichever harness sent it. Claude Code and Codex
 * use the same event names and the same envelope; they differ in how a file edit and the loading
 * of a skill appear.
 */
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The name of this plugin, which prefixes the names of its skills. */
export function pluginName() {
  return JSON.parse(readFileSync(join(PLUGIN_ROOT, "plugin.json"), "utf8")).name;
}

/** The event sent on standard input, or null when there is none to read. */
export function readEvent() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError || error.code === "EAGAIN" || error.code === "EOF") return null;
    throw error;
  }
}

/**
 * The files an edit event writes. Claude Code names one file per call. Codex sends a patch whose
 * headers name every file it adds, updates, deletes or moves to.
 */
export function editedFiles(event) {
  const input = event?.tool_input ?? {};
  if (typeof input.file_path === "string" && input.file_path) return [input.file_path];
  if (event?.tool_name !== "apply_patch") return [];
  const patch = Array.isArray(input.command) ? input.command.join("\n") : String(input.command ?? "");
  return [...patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map((m) => m[1].trim());
}

/**
 * The skill an event loaded, as <plugin>:<skill>. Claude Code loads a skill through a tool call
 * that names it. Codex reads the entry file of the skill with a shell command.
 */
export function loadedSkill(event, plugin = pluginName()) {
  const input = event?.tool_input ?? {};
  if (typeof input.skill === "string" && input.skill) return input.skill;
  const command = Array.isArray(input.command) ? input.command.join(" ") : String(input.command ?? "");
  const entry = new RegExp(`/${plugin}/(?:[^/\\s'"]+/)*skills/([a-z0-9-]+)/SKILL\\.md`).exec(command);
  return entry ? `${plugin}:${entry[1]}` : null;
}

/** The skill a prompt names when it starts with the typed form of a skill: /plugin:skill or $plugin:skill. */
export function typedSkill(event) {
  const typed = /^\s*[\/$]([\w-]+:[\w-]+)(?![\w:-])/.exec(String(event?.prompt ?? ""));
  return typed ? typed[1] : null;
}

export { PLUGIN_ROOT, basename };
