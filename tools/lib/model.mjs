/**
 * The repository model: where the plugins and skills are, what each skill file says, and which
 * framework repositories and release lines a skill describes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Every file under a directory, as paths relative to it. */
export function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (name === ".git" || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, base, out);
    else out.push(relative(base, path));
  }
  return out;
}

/** The plugins of the repository: name, directory and the skills each one carries. */
export function listPlugins(root = ROOT) {
  const pluginsDir = join(root, "plugins");
  if (!existsSync(pluginsDir)) return [];
  return readdirSync(pluginsDir)
    .sort()
    .filter((name) => statSync(join(pluginsDir, name)).isDirectory())
    .map((name) => {
      const dir = join(pluginsDir, name);
      const skillsDir = join(dir, "skills");
      const skills = existsSync(skillsDir)
        ? readdirSync(skillsDir)
            .sort()
            .filter((s) => statSync(join(skillsDir, s)).isDirectory())
            .map((s) => ({ name: s, dir: join(skillsDir, s), key: `plugins/${name}/skills/${s}` }))
        : [];
      return { name, dir, skills };
    });
}

/**
 * The frontmatter of a SKILL.md as the two harnesses must both be able to read it: one key per
 * line, the value either a bare word or a double-quoted string that is also valid JSON.
 *
 * @returns {{ fields: Record<string, string>, problems: string[], bodyStart: number }}
 */
export function parseFrontmatter(text) {
  const lines = text.split("\n");
  const problems = [];
  const fields = {};
  if (lines[0] !== "---") return { fields, problems: ["the first line is not ---"], bodyStart: 0 };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end < 0) return { fields, problems: ["the frontmatter is not closed by ---"], bodyStart: 0 };
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s?(.*)$/.exec(line);
    if (!match) {
      problems.push(`line ${i + 1} is not "key: value"`);
      continue;
    }
    const [, key, raw] = match;
    if (raw.startsWith('"')) {
      try {
        fields[key] = JSON.parse(raw);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        problems.push(`${key} is not a double-quoted string both YAML and JSON read the same way`);
      }
    } else if (/^[A-Za-z0-9._-]+$/.test(raw)) {
      fields[key] = raw;
    } else {
      problems.push(`${key} must be a bare word or one double-quoted string`);
    }
  }
  return { fields, problems, bodyStart: end + 1 };
}

/**
 * A Markdown file split into what a check needs: the lines, which of them are inside a code fence
 * (with the fence language), and the code spans of every prose line.
 */
export function readMarkdown(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");
  const info = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = /^\s*(```+|~~~+)\s*([A-Za-z0-9_+-]*)/.exec(line);
    if (fence === null && open) {
      fence = { marker: open[1], lang: open[2].toLowerCase() };
      info.push({ fence: true, lang: fence.lang, boundary: true });
    } else if (fence !== null && line.trim().startsWith(fence.marker) && line.trim().replace(/[`~]/g, "") === "") {
      info.push({ fence: true, lang: fence.lang, boundary: true });
      fence = null;
    } else {
      info.push({ fence: fence !== null, lang: fence?.lang ?? null, boundary: false });
    }
  }
  return { path, text, lines, info };
}

/** The code spans of one prose line. */
export function codeSpans(line) {
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

/** The release line markers a Markdown line carries, such as [2.x]. */
export function lineMarkers(line) {
  return [...line.matchAll(/\[([0-9]+\.x|next)\]/g)].map((m) => m[1]);
}

export function loadFrameworks(root = ROOT) {
  return readJson(join(root, "frameworks.json"));
}

export function loadLock(root = ROOT) {
  const path = join(root, "frameworks.lock.json");
  return existsSync(path) ? readJson(path) : {};
}
