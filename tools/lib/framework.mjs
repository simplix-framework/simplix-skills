/**
 * Read access to one framework repository at a fixed commit. Everything goes through git objects,
 * so a check never switches a branch and never reads a file somebody is editing in the checkout.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const MAX_BUFFER = 256 * 1024 * 1024;

/** Runs git in a directory. A non-zero exit returns null when the caller asked for that. */
export function git(dir, args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (allowFail && typeof error.status === "number") return null;
    throw error;
  }
}

export class Framework {
  constructor(id, config, root, baseDir) {
    this.id = id;
    this.config = config;
    this.path = baseDir ? join(baseDir, id) : resolve(root, config.path);
    this.cache = new Map();
  }

  exists() {
    return existsSync(join(this.path, ".git"));
  }

  memo(key, compute) {
    if (!this.cache.has(key)) this.cache.set(key, compute());
    return this.cache.get(key);
  }

  /** The commit a ref names, or null. */
  commitOf(ref) {
    const out = git(this.path, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { allowFail: true });
    return out ? out.trim() : null;
  }

  isAncestor(older, newer) {
    return git(this.path, ["merge-base", "--is-ancestor", older, newer], { allowFail: true }) !== null;
  }

  /** The branch as the remote has it when the checkout tracks one, else the local branch. */
  branchRef(branch) {
    return this.commitOf(`origin/${branch}`) ? `origin/${branch}` : branch;
  }

  /** The newest ref of a release line: its newest tag, or the tip of its branch. */
  latest(line) {
    const spec = this.config.lines[line];
    const branch = this.branchRef(spec.branch);
    if (spec.track === "branch") return { ref: spec.branch, commit: this.commitOf(branch) };
    const tags = git(this.path, ["tag", "--merged", branch, "--list", spec.tagPattern ?? "v*", "--sort=-v:refname"]).split("\n").filter(Boolean);
    return tags.length ? { ref: tags[0], commit: this.commitOf(tags[0]) } : { ref: null, commit: null };
  }

  tags() {
    return this.memo("tags", () => new Set(git(this.path, ["tag", "--list"]).split("\n").filter(Boolean)));
  }

  files(commit) {
    return this.memo(`files:${commit}`, () => git(this.path, ["ls-tree", "-r", "--name-only", commit]).split("\n").filter(Boolean));
  }

  hasPath(commit, path) {
    const clean = path.replace(/\/$/, "");
    const files = this.files(commit);
    return this.memo(`path:${commit}:${clean}`, () => files.includes(clean) || files.some((f) => f.startsWith(`${clean}/`)));
  }

  show(commit, path) {
    return this.memo(`show:${commit}:${path}`, () => git(this.path, ["show", `${commit}:${path}`], { allowFail: true }));
  }

  /** Whether a literal text occurs in the commit, under the given pathspecs when there are any. */
  hasText(commit, text, pathspecs = []) {
    return this.memo(`text:${commit}:${text}:${pathspecs.join("|")}`, () => {
      const args = ["grep", "-q", "-F", "-e", text, commit];
      if (pathspecs.length) args.push("--", ...pathspecs);
      return git(this.path, args, { allowFail: true }) !== null;
    });
  }

  /** The files of the commit that contain a literal text. */
  filesWithText(commit, text, pathspecs = []) {
    const args = ["grep", "-l", "-F", "-e", text, commit];
    if (pathspecs.length) args.push("--", ...pathspecs);
    const out = git(this.path, args, { allowFail: true });
    return out ? out.split("\n").filter(Boolean).map((l) => l.slice(commit.length + 1)) : [];
  }

  /** Which of the names occur as whole words in the sources of the commit. */
  identifiers(commit, names, pathspecs = this.config.sources ?? []) {
    const wanted = [...new Set(names)].filter((n) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n));
    const found = new Set();
    for (let i = 0; i < wanted.length; i += 200) {
      const batch = wanted.slice(i, i + 200);
      const args = ["grep", "-h", "-o", "-w", "-E", "-e", `(${batch.join("|")})`, commit];
      if (pathspecs.length) args.push("--", ...pathspecs);
      const out = git(this.path, args, { allowFail: true });
      if (out) for (const name of out.split("\n")) if (name) found.add(name);
    }
    return found;
  }

  /** Java files of the main source sets, keyed by the simple name of the type they declare. */
  javaTypes(commit) {
    return this.memo(`java:${commit}`, () => {
      const types = new Map();
      for (const file of this.files(commit)) {
        const m = /\/src\/main\/java\/(.+)\/([A-Za-z0-9_]+)\.java$/.exec(file);
        if (!m) continue;
        const entry = { file, fqn: `${m[1].replaceAll("/", ".")}.${m[2]}` };
        if (!types.has(m[2])) types.set(m[2], []);
        types.get(m[2]).push(entry);
      }
      return types;
    });
  }

  /** Workspace packages of the commit: name, directory and the subpaths each one exports. */
  packages(commit) {
    return this.memo(`packages:${commit}`, () => {
      const packages = new Map();
      for (const file of this.files(commit)) {
        if (!/(^|\/)package\.json$/.test(file) || file.includes("node_modules/")) continue;
        const text = this.show(commit, file);
        if (!text) continue;
        let manifest;
        try {
          manifest = JSON.parse(text);
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
          continue;
        }
        if (typeof manifest.name !== "string") continue;
        const dir = file === "package.json" ? "" : file.slice(0, -"/package.json".length);
        packages.set(manifest.name, { dir, exports: Object.keys(manifest.exports ?? {}) });
      }
      return packages;
    });
  }
}

/**
 * The commands and flags of the SimpliX Boot generator at a commit, read from its own help. The
 * generator is exported to a scratch directory and run with the dependencies of the checkout.
 */
export function generatorRegistry(framework, commit) {
  return framework.memo(`generator:${commit}`, () => {
    const modules = join(framework.path, "simplix-cli", "node_modules");
    if (!existsSync(modules)) return { error: `run npm ci in ${join(framework.path, "simplix-cli")} so the generator can print its help` };
    const scratch = mkdtempSync(join(tmpdir(), "simplix-cli-"));
    try {
      execFileSync("sh", ["-c", 'git -C "$1" archive "$2" simplix-cli | tar -x -C "$3"', "sh", framework.path, commit, scratch]);
      const cli = join(scratch, "simplix-cli");
      symlinkSync(modules, join(cli, "node_modules"));
      const run = (args) => execFileSync(process.execPath, [join(cli, "bin", "simplix-boot.js"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const listed = /^Commands:\n((?: {2}\S.*\n)+)/m.exec(run(["help"]));
      if (!listed) return { error: "the generator help prints no Commands block" };
      const commands = {};
      for (const line of listed[1].split("\n").filter(Boolean)) {
        const name = /^ {2}([a-z][a-z0-9-]*)\b/.exec(line)[1];
        commands[name] = new Set([...run([name, "--help"]).matchAll(/(?:^|[\s[|])(--[a-z][a-z0-9-]*)/gm)].map((m) => m[1]));
      }
      return { commands };
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}

/** The commands and flags of the simplix-react command line tool at a commit, read from its sources. */
export function reactCliRegistry(framework, commit) {
  return framework.memo(`react-cli:${commit}`, () => {
    const commands = {};
    for (const file of framework.files(commit)) {
      if (!/^packages\/cli\/src\/commands\/[^/]+\.ts$/.test(file)) continue;
      const text = framework.show(commit, file) ?? "";
      const name = /new Command\(\s*"([a-z][a-z0-9-]*)"\s*\)/.exec(text);
      if (!name) continue;
      const flags = new Set();
      for (const m of text.matchAll(/\.(?:option|requiredOption)\(\s*"([^"]+)"/g)) {
        for (const flag of m[1].matchAll(/--(?:no-)?[a-z][a-z0-9-]*/g)) flags.add(flag[0]);
      }
      commands[name[1]] = flags;
    }
    return Object.keys(commands).length ? { commands } : { error: "no command is declared under packages/cli/src/commands" };
  });
}
