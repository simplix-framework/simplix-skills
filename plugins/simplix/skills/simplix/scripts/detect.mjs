#!/usr/bin/env node
/**
 * Reports which parts of the SimpliX stack a project uses, at which versions, and which handbook
 * covers each part. It reads build files only and changes nothing.
 *
 *   node detect.mjs [dir]          a table for the directory (default: the working directory)
 *   node detect.mjs [dir] --json   the same as JSON
 */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKIPPED = new Set(["node_modules", ".git", "build", "dist", "target", "out", ".gradle", ".idea", ".turbo", ".next", "coverage"]);
const MAX_DEPTH = 3;
const MAX_DIRECTORIES = 2000;
const JAVA_FILES = ["build.gradle", "build.gradle.kts", "pom.xml", "gradle.properties", join("gradle", "libs.versions.toml")];

const read = (path) => (existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : "");

/** The directories to inspect: the root and its folders down to a fixed depth. */
function directories(root, dir = root, depth = 0, out = []) {
  out.push(dir);
  // A folder tree this wide is a home or a workspace of many projects, not one project.
  if (depth >= MAX_DEPTH || out.length >= MAX_DIRECTORIES) return out;
  for (const name of readdirSync(dir).sort()) {
    if (SKIPPED.has(name) || name.startsWith(".")) continue;
    const path = join(dir, name);
    // A link is not followed: it may point outside the project or at nothing.
    if (lstatSync(path).isDirectory()) directories(root, path, depth + 1, out);
  }
  return out;
}

/** The build texts that can define a version for a directory: its own and those of its ancestors. */
function javaScope(root, dir) {
  const texts = [];
  for (let current = dir; ; current = dirname(current)) {
    for (const file of JAVA_FILES) texts.push(read(join(current, file)));
    if (current === root || dirname(current) === current) break;
  }
  return texts.join("\n");
}

/** Resolves a version written as a literal, a property or a version catalog key. */
export function resolveVersion(raw, scope) {
  if (!raw) return null;
  const name = /^\$\{?([A-Za-z_][A-Za-z0-9_.-]*)\}?$/.exec(raw)?.[1];
  if (!name) return /^[0-9]/.test(raw) ? raw : null;
  const escaped = name.replace(/[.]/g, "\\.");
  const patterns = [
    new RegExp(`(?:^|[\\s(,])(?:set\\(\\s*['"])?${escaped}['"]?\\s*[=,]\\s*['"]([^'"\\s]+)['"]`, "m"),
    new RegExp(`^\\s*${escaped}\\s*=\\s*([^\\s'"]+)\\s*$`, "m"),
    new RegExp(`<${escaped}>\\s*([^<\\s]+)\\s*</${escaped}>`),
  ];
  for (const pattern of patterns) {
    const m = pattern.exec(scope);
    if (m) return m[1];
  }
  return null;
}

/** Framework coordinates a set of Java build texts declares, with the version each resolves to. */
export function javaDependencies(own, scope) {
  const found = new Map();
  const add = (framework, version) => {
    if (!found.has(framework) || (version && !found.get(framework))) found.set(framework, version ?? null);
  };
  const frameworkOf = (group) => (group === "dev.simplecore.searchable" ? "searchable-jpa" : "simplix");
  // Gradle notation: group:artifact[:version]
  for (const m of own.matchAll(/(dev\.simplecore\.(?:simplix|searchable)):([a-z][a-z0-9-]*)(?::([^'"\s)]+))?/g)) {
    const framework = frameworkOf(m[1]);
    let version = resolveVersion(m[3], scope);
    if (!version) {
      // A version catalog names the version beside the module: version = "x" or version.ref = "key".
      const line = own.split("\n").find((l) => l.includes(`${m[1]}:${m[2]}`)) ?? "";
      const literal = /version\s*=\s*"([^"]+)"/.exec(line)?.[1];
      const key = /version\.ref\s*=\s*"([^"]+)"/.exec(line)?.[1];
      version = literal ?? (key ? resolveVersion(`$${key}`, scope) : null);
    }
    add(framework, version);
  }
  // Maven notation.
  for (const m of own.matchAll(/<groupId>\s*(dev\.simplecore\.(?:simplix|searchable))\s*<\/groupId>\s*<artifactId>\s*([a-z][a-z0-9-]*)\s*<\/artifactId>(?:\s*<version>\s*([^<\s]+)\s*<\/version>)?/g)) {
    add(frameworkOf(m[1]), resolveVersion(m[3], scope));
  }
  return found;
}

/** The simplix-react version a package.json depends on, read through the pnpm catalog when it says so. */
export function nodeDependency(manifestText, catalogText) {
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return null;
  }
  const all = { ...manifest.peerDependencies, ...manifest.devDependencies, ...manifest.dependencies };
  const names = Object.keys(all).filter((name) => name.startsWith("@simplix-react/"));
  if (names.length === 0) return null;
  const specs = names.map((name) => {
    const spec = all[name];
    if (!spec.startsWith("catalog:")) return spec;
    const escaped = name.replace(/[/]/g, "\\/");
    return new RegExp(`['"]?${escaped}['"]?\\s*:\\s*['"]?([^'"\\s#]+)`).exec(catalogText)?.[1] ?? spec;
  });
  const released = specs.find((spec) => /\d/.test(spec));
  return { version: released ? released.replace(/^[\^~>=<\s]+/, "") : specs[0] };
}

function lineOf(framework, version) {
  if (framework === "simplix-react") return "0.x";
  const major = /^(\d+)\./.exec(version ?? "")?.[1];
  return major ? `${major}.x` : null;
}

const HANDBOOK = { simplix: "backend", "searchable-jpa": "searchable-jpa", "simplix-react": "frontend" };

/** The versions the handbooks were verified against, written beside this script when they are locked. */
function readBaseline() {
  const text = read(join(dirname(fileURLToPath(import.meta.url)), "baseline.json"));
  return text ? JSON.parse(text) : {};
}

/**
 * Compares two versions by their numbers. A snapshot of a version is older than that version.
 *
 * @returns {"older" | "same" | "newer" | "unknown"} how the first stands to the second
 */
export function compareVersions(used, verified) {
  const parse = (text) => /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(text ?? "");
  const a = parse(used);
  const b = parse(verified);
  if (!a || !b) return "unknown";
  for (let i = 1; i <= 3; i++) {
    if (Number(a[i]) !== Number(b[i])) return Number(a[i]) < Number(b[i]) ? "older" : "newer";
  }
  if (a[4] && !b[4]) return "older";
  if (!a[4] && b[4]) return "newer";
  return "same";
}

/**
 * Inspects a project.
 *
 * @param {string} root
 * @param {Record<string, Record<string, string>>} [baseline] the verified version of each framework line
 * @returns {{ root: string, parts: { dir: string, framework: string, version: string | null, line: string | null, handbook: string, evidence: string, verified: string | null, standing: string }[] }}
 */
export function detect(root, baseline = readBaseline()) {
  const parts = [];
  for (const dir of directories(root)) {
    const label = relative(root, dir) || ".";
    const sources = JAVA_FILES.map((file) => [file, read(join(dir, file))]).filter(([, text]) => text);
    if (sources.length) {
      const own = sources.map(([, text]) => text).join("\n");
      for (const [framework, version] of javaDependencies(own, javaScope(root, dir))) {
        const evidence = sources.find(([, text]) => /dev\.simplecore\.(?:simplix|searchable)[:<]/.test(text))?.[0] ?? sources[0][0];
        parts.push({ dir: label, framework, version, line: lineOf(framework, version), handbook: HANDBOOK[framework], evidence });
      }
    }
    const manifest = read(join(dir, "package.json"));
    if (manifest) {
      let catalog = "";
      for (let current = dir; ; current = dirname(current)) {
        catalog += read(join(current, "pnpm-workspace.yaml"));
        if (current === root || dirname(current) === current) break;
      }
      const dependency = nodeDependency(manifest, catalog);
      if (dependency) {
        // One row per workspace: the nearest folder that holds the framework configuration or the workspace file.
        let home = dir;
        let marker = "package.json";
        for (let current = dir; ; current = dirname(current)) {
          const found = ["simplix.config.ts", "pnpm-workspace.yaml"].find((file) => existsSync(join(current, file)));
          if (found) {
            home = current;
            marker = found;
          }
          if (current === root || dirname(current) === current) break;
        }
        const homeLabel = relative(root, home) || ".";
        if (!parts.some((part) => part.framework === "simplix-react" && part.dir === homeLabel)) {
          parts.push({ dir: homeLabel, framework: "simplix-react", version: dependency.version, line: "0.x", handbook: "frontend", evidence: marker });
        }
      }
    }
  }
  for (const part of parts) {
    part.verified = baseline[part.framework]?.[part.line] ?? null;
    part.standing = compareVersions(part.version, part.verified);
  }
  return { root, parts };
}

// The script may be run through a link, so both paths are resolved before they are compared.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const root = resolve(argv.find((arg) => !arg.startsWith("--")) ?? ".");
  const report = detect(root);
  if (argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.parts.length === 0) {
    console.log(`${root}: no SimpliX dependency found in the build files`);
  } else {
    console.log("directory | framework | version | release line | handbook | handbook verified against | read from");
    for (const part of report.parts) {
      console.log([part.dir, part.framework, part.version ?? "not resolved", part.line ?? "unknown", part.handbook, part.verified ?? "no baseline", part.evidence].join(" | "));
    }
    const older = report.parts.filter((part) => part.standing === "older");
    if (older.length) {
      console.log(`\nOlder than the handbook: ${older.map((part) => `${part.framework} ${part.version} in ${part.dir}`).join(", ")}. A page may describe what that version lacks: check the changes between the two versions first.`);
    }
  }
}
