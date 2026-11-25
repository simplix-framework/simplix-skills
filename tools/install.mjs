#!/usr/bin/env node
/**
 * Makes the plugins of this checkout available to Claude Code and to Codex, and removes them again.
 *
 *   node tools/install.mjs status
 *   node tools/install.mjs claude [--plugin <name>] [--marketplace]
 *   node tools/install.mjs codex  [--plugin <name>] [--marketplace]
 *   node tools/install.mjs remove claude|codex [--plugin <name>]
 *
 * By default a plugin is linked, so an edit in the checkout is live:
 *   Claude Code  <claude home>/skills/<plugin>          -> plugins/<plugin>  (a skill folder loaded as a plugin)
 *   Codex        <agents home>/skills/<plugin>-<skill>  -> plugins/<plugin>/skills/<skill>
 * A linked Codex skill carries no hooks. With --marketplace the checkout is registered as a
 * marketplace and the plugin is installed by the harness itself, which copies it.
 *
 * --claude-home and --agents-home name the folders to link into (defaults: the Claude Code
 * configuration folder and ~/.agents).
 */
import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readlinkSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, listPlugins, readJson } from "./lib/model.mjs";

/** Where a link points, as an absolute path, or null when the path is not a link. */
function linkTarget(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
  return stat.isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : null;
}

/**
 * Points a link at a target. An existing link is replaced; anything else in its place is left
 * alone and reported.
 *
 * @returns {{ path: string, result: "linked" | "relinked" | "current" | "occupied", was?: string }}
 */
export function link(path, target) {
  const current = linkTarget(path);
  if (current === null) return { path, result: "occupied" };
  if (current === target) return { path, result: "current" };
  if (current !== undefined) rmSync(path);
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path);
  return current === undefined ? { path, result: "linked" } : { path, result: "relinked", was: current };
}

/** Removes a link only when it points into the given root. */
export function unlink(path, root) {
  const current = linkTarget(path);
  if (typeof current !== "string" || !current.startsWith(`${root}/`)) return { path, result: "kept" };
  rmSync(path);
  return { path, result: "removed" };
}

/** The links one plugin needs in each harness. */
export function linksOf(plugin, { claudeHome, agentsHome }) {
  return {
    claude: [{ path: join(claudeHome, "skills", plugin.name), target: plugin.dir }],
    codex: plugin.skills.map((skill) => ({
      path: join(agentsHome, "skills", skill.name === plugin.name || skill.name.startsWith(`${plugin.name}-`) ? skill.name : `${plugin.name}-${skill.name}`),
      target: skill.dir,
    })),
  };
}

function main(argv) {
  const value = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const homes = {
    claudeHome: resolve(value("--claude-home") ?? process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")),
    agentsHome: resolve(value("--agents-home") ?? join(homedir(), ".agents")),
  };
  const valued = new Set(["--plugin", "--claude-home", "--agents-home"]);
  const words = argv.filter((arg, i) => !arg.startsWith("--") && !valued.has(argv[i - 1]));
  const only = value("--plugin");
  const plugins = listPlugins(ROOT).filter((plugin) => !only || plugin.name === only);
  if (only && plugins.length === 0) throw new Error(`no plugin named ${only}`);
  const market = readJson(join(ROOT, ".claude-plugin", "marketplace.json")).name;
  const run = (command, args) => console.log(execFileSync(command, args, { encoding: "utf8" }).trim());
  const [action, harness] = words;

  if (action === "status") {
    for (const plugin of plugins) {
      const links = linksOf(plugin, homes);
      for (const [name, entries] of Object.entries(links)) {
        const linked = entries.filter((entry) => linkTarget(entry.path) === entry.target).length;
        console.log(`${plugin.name} in ${name}: ${linked} of ${entries.length} links point at this checkout`);
      }
    }
    return;
  }
  const remove = action === "remove";
  const target = remove ? harness : action;
  if (target !== "claude" && target !== "codex") throw new Error("usage: node tools/install.mjs status | claude | codex | remove claude|codex [--plugin <name>] [--marketplace]");

  if (argv.includes("--marketplace")) {
    for (const plugin of plugins) {
      const id = `${plugin.name}@${market}`;
      if (target === "claude") {
        if (!remove) run("claude", ["plugin", "marketplace", "add", ROOT]);
        run("claude", ["plugin", remove ? "uninstall" : "install", id]);
      } else {
        if (!remove) run("codex", ["plugin", "marketplace", "add", ROOT]);
        run("codex", ["plugin", remove ? "remove" : "add", id]);
      }
    }
    return;
  }
  for (const plugin of plugins) {
    for (const entry of linksOf(plugin, homes)[target]) {
      const done = remove ? unlink(entry.path, ROOT) : link(entry.path, entry.target);
      console.log(`${done.result.padEnd(9)} ${done.path}${done.was ? ` (was ${done.was})` : ""}`);
      if (done.result === "occupied") process.exitCode = 1;
    }
  }
}

// The script may be run through a link, so both paths are resolved before they are compared.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
