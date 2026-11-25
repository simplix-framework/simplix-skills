/**
 * The gate configuration a project declares in .claude/simplix.json. A project that declares none
 * is never gated: which folders hold sources, which handbooks bind and what counts as a screen
 * are the project's to state.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const CONFIG_NAME = join(".claude", "simplix.json");

/**
 * Walks up from a directory to the nearest configuration, stopping at the repository boundary.
 *
 * @returns {{ root: string, config: object } | null} the folder that owns the file and its content
 */
export function findProjectConfig(startDir) {
  const home = homedir();
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, CONFIG_NAME);
    if (existsSync(candidate)) {
      try {
        return { root: dir, config: JSON.parse(readFileSync(candidate, "utf8")) };
      } catch (error) {
        // A configuration that cannot be read never blocks anything.
        if (error instanceof SyntaxError) return null;
        throw error;
      }
    }
    if (existsSync(join(dir, ".git")) || dir === home) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Whether a path relative to the project sits under one of the declared prefixes. */
export function underAny(relativePath, prefixes) {
  return Array.isArray(prefixes) && prefixes.some((prefix) => relativePath.startsWith(prefix));
}
