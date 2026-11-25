/**
 * Drift checks: every claim a skill makes about a framework is resolved against that framework's
 * sources at a fixed commit of each release line the skill describes.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { baselineText } from "./baseline.mjs";
import { Framework, generatorRegistry, git, reactCliRegistry } from "./framework.mjs";
import { listPlugins, loadFrameworks, loadLock, readMarkdown, walk } from "./model.mjs";
import { createExtractor } from "./tokens.mjs";

function finding(file, line, check, message) {
  return { file, line, check, message };
}

/** Names that belong to no SimpliX repository: the language, the JDK, Spring, React and the like. */
export function loadExternalNames(root) {
  const path = join(root, "tools", "external-names.txt");
  if (!existsSync(path)) return new Set();
  return new Set(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.replace(/#.*$/, "").trim())
      .filter(Boolean),
  );
}

/**
 * The commit of every release line: the locked one, or the newest one when asked. A lock that no
 * longer names what it recorded is a finding, since every later reading would be of another tree.
 */
function resolveCommits(config, lock, frameworks, mode, out) {
  const commits = {};
  for (const [id, framework] of Object.entries(frameworks)) {
    commits[id] = {};
    if (!framework.exists()) {
      out.push(finding("frameworks.json", 0, "framework", `no checkout of ${id} at ${framework.path}`));
      continue;
    }
    for (const [line, spec] of Object.entries(config.frameworks[id].lines)) {
      const locked = lock[id]?.[line];
      const newest = framework.latest(line);
      if (!locked) {
        out.push(finding("frameworks.lock.json", 0, "lock", `${id} ${line} is not locked`));
      } else if (!framework.commitOf(locked.commit)) {
        out.push(finding("frameworks.lock.json", 0, "lock", `${id} ${line}: commit ${locked.commit.slice(0, 10)} is not in the checkout`));
      } else if (spec.track === "branch" ? !framework.isAncestor(locked.commit, framework.branchRef(spec.branch)) : framework.commitOf(locked.ref) !== locked.commit) {
        out.push(finding("frameworks.lock.json", 0, "lock", `${id} ${line}: ${locked.ref} no longer leads to the locked commit ${locked.commit.slice(0, 10)}`));
      }
      if (mode === "latest") {
        if (!newest.commit) {
          out.push(finding("frameworks.json", 0, "framework", `${id} ${line} has no ref to read`));
          continue;
        }
        commits[id][line] = newest;
        if (locked && framework.commitOf(locked.commit) && locked.commit !== newest.commit) {
          const count = git(framework.path, ["rev-list", "--count", `${locked.commit}..${newest.commit}`]).trim();
          out.push(finding("frameworks.lock.json", 0, "behind", `${id} ${line} is locked at ${locked.ref} and the newest is ${newest.ref} (${count} commits later)`));
        }
      } else if (locked && framework.commitOf(locked.commit)) {
        commits[id][line] = locked;
      }
    }
  }
  return commits;
}

/**
 * Runs the drift checks.
 *
 * @param {string} root the repository of the skills
 * @param {{ mode?: "lock" | "latest", frameworksDir?: string, lock?: object, baselineFile?: false }} options a lock given
 *   here is read instead of the file; baselineFile false leaves the shipped baseline unchecked while the lock moves
 * @returns {{ findings: object[], commits: object }}
 */
export function checkDrift(root, options = {}) {
  const mode = options.mode ?? "lock";
  const config = loadFrameworks(root);
  const lock = options.lock ?? loadLock(root);
  const external = loadExternalNames(root);
  const out = [];
  const frameworks = Object.fromEntries(Object.entries(config.frameworks).map(([id, spec]) => [id, new Framework(id, spec, root, options.frameworksDir)]));
  const commits = resolveCommits(config, lock, frameworks, mode, out);
  const frameworkIds = Object.keys(frameworks);
  const extractTokens = createExtractor(config.vocabulary, frameworkIds);
  const registries = { generator: generatorRegistry, "react-cli": reactCliRegistry };
  const checkoutsComplete = Object.values(frameworks).every((framework) => framework.exists());
  const allTags = new Set();
  for (const framework of Object.values(frameworks)) if (framework.exists()) for (const tag of framework.tags()) allTags.add(tag);

  if (config.baselineFile && mode === "lock" && options.baselineFile !== false) {
    const path = join(root, config.baselineFile);
    const written = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (written !== baselineText(config, lock)) out.push(finding(config.baselineFile, 0, "baseline", "the file does not match the lock; node tools/lock.mjs writes it"));
  }

  const skills = listPlugins(root).flatMap((plugin) => plugin.skills);
  for (const key of Object.keys(config.skills)) {
    if (!skills.some((skill) => skill.key === key)) out.push(finding("frameworks.json", 0, "mapping", `${key} is mapped and is not a skill folder`));
  }

  for (const skill of skills) {
    const mapping = config.skills[skill.key];
    if (!mapping) {
      out.push(finding(relative(root, skill.dir), 0, "mapping", "the skill is not listed under skills in frameworks.json"));
      continue;
    }
    /** The framework lines a token is checked against: the mapped ones, narrowed by a [line] marker. */
    const targets = (token, ids = Object.keys(mapping)) =>
      ids.flatMap((id) => {
        const lines = (mapping[id] ?? []).filter((line) => commits[id]?.[line] && (token.markers.length === 0 || token.markers.includes(line)));
        return lines.length ? [{ id, lines }] : [];
      });
    const where = (id, line) => `${id} ${line} (${commits[id][line].ref})`;

    const docs = walk(skill.dir).filter((f) => f.endsWith(".md")).map((f) => readMarkdown(join(skill.dir, f)));
    const tokens = docs.flatMap((doc) => extractTokens(doc).map((token) => ({ ...token, file: relative(root, doc.path) })));

    // The entry file states the released versions it was verified against, and they are the locked ones.
    const released = Object.entries(mapping).flatMap(([id, lines]) =>
      lines.filter((line) => config.frameworks[id]?.lines[line]?.track !== "branch" && commits[id]?.[line]).map((line) => commits[id][line].ref.replace(/^v/, "")),
    );
    const entry = docs.find((doc) => doc.path.endsWith("SKILL.md"));
    if (released.length && entry) {
      const at = entry.lines.findIndex((line) => line.startsWith("Verified against "));
      const stated = at < 0 ? [] : [...entry.lines[at].matchAll(/\d+\.\d+\.\d+/g)].map((m) => m[0]);
      if (at < 0) {
        out.push(finding(relative(root, entry.path), 0, "baseline", 'the entry file has no line that starts with "Verified against" and names the framework versions'));
      } else if (released.some((v) => !stated.includes(v)) || stated.some((v) => !released.includes(v))) {
        out.push(finding(relative(root, entry.path), at + 1, "baseline", `the line names ${stated.join(", ") || "no version"} and the checked refs are ${released.join(", ")}`));
      }
    }

    // One search per framework line for every name the skill writes.
    const names = [...new Set(tokens.filter((t) => t.kind === "name" || t.kind === "member").map((t) => t.name))];
    const known = {};
    for (const id of Object.keys(mapping)) {
      known[id] = {};
      for (const line of mapping[id]) if (commits[id]?.[line]) known[id][line] = frameworks[id].identifiers(commits[id][line].commit, names);
    }
    const hasName = (id, line, name) => known[id][line].has(name) || frameworks[id].javaTypes(commits[id][line].commit).has(name);

    /** Resolves a claim that one framework must hold in each of its lines. */
    const settle = (token, label, holds, ids) => {
      const scope = targets(token, ids);
      if (scope.length === 0) return;
      let partial = null;
      for (const { id, lines } of scope) {
        const missing = lines.filter((line) => !holds(id, line));
        if (missing.length === 0) return;
        if (missing.length < lines.length) partial = { id, missing };
      }
      if (partial) {
        out.push(finding(token.file, token.line, "drift", `${label} is missing in ${partial.missing.map((line) => where(partial.id, line)).join(", ")}; correct it or mark the line with the release line it holds for`));
      } else {
        out.push(finding(token.file, token.line, "drift", `${label} is not in ${scope.map(({ id, lines }) => lines.map((line) => where(id, line)).join(", ")).join(", ")}`));
      }
    };

    for (const token of tokens) {
      if (token.kind === "name") {
        if (external.has(token.name)) continue;
        settle(token, `${token.name}`, (id, line) => hasName(id, line, token.name));
      } else if (token.kind === "member") {
        if (external.has(token.type)) continue;
        settle(token, `${token.type}.${token.name}`, (id, line) => {
          const commit = commits[id][line].commit;
          const declared = frameworks[id].javaTypes(commit).get(token.type);
          if (!declared) return known[id][line].has(token.type) && known[id][line].has(token.name);
          return declared.some((entry) => new RegExp(`\\b${token.name}\\b`).test(frameworks[id].show(commit, entry.file) ?? ""));
        });
      } else if (token.kind === "fqn") {
        settle(token, token.name, (id, line) => {
          const types = frameworks[id].javaTypes(commits[id][line].commit);
          const parts = token.name.split(".");
          // A static import or a nested type names a member after the type; walk back to the type.
          for (let end = parts.length; end > 2; end--) {
            const fqn = parts.slice(0, end).join(".");
            if ((types.get(parts[end - 1]) ?? []).some((entry) => entry.fqn === fqn)) return true;
          }
          // A package is named by the prefix its types share.
          for (const entries of types.values()) if (entries.some((entry) => entry.fqn.startsWith(`${token.name}.`))) return true;
          return false;
        });
      } else if (token.kind === "property") {
        settle(token, token.name, (id, line) => {
          const framework = frameworks[id];
          const commit = commits[id][line].commit;
          if (framework.hasText(commit, token.name)) return true;
          // A reference table may print the key under its prefix: accept the longest prefix written
          // out somewhere with every remaining segment present in a file that carries the prefix.
          const parts = token.name.split(".");
          for (let cut = parts.length - 1; cut >= 2; cut--) {
            const prefix = parts.slice(0, cut).join(".");
            const files = framework.filesWithText(commit, prefix);
            if (files.length === 0) continue;
            const rest = parts.slice(cut);
            return rest.every((segment) => {
              const camel = segment.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
              return files.some((file) => new RegExp(`\\b(${segment}|${camel})\\b`).test(framework.show(commit, file) ?? ""));
            });
          }
          return false;
        });
      } else if (token.kind === "pointer") {
        if (!mapping[token.framework]) {
          out.push(finding(token.file, token.line, "drift", `${token.framework} is not a framework this skill is mapped to`));
          continue;
        }
        settle(token, `${token.framework}:${token.path}`, (id, line) => frameworks[id].hasPath(commits[id][line].commit, token.path), [token.framework]);
      } else if (token.kind === "package") {
        const anywhere = frameworkIds.some((id) => Object.values(commits[id] ?? {}).some((entry) => frameworks[id].packages(entry.commit).has(token.name)));
        if (!anywhere) out.push(finding(token.file, token.line, "drift", `package ${token.name} is in no framework repository`));
      } else if (token.kind === "import") {
        settle(token, `import from ${token.package}${token.subpath ? `/${token.subpath}` : ""}`, (id, line) => {
          const framework = frameworks[id];
          const commit = commits[id][line].commit;
          const pkg = framework.packages(commit).get(token.package);
          if (!pkg) return false;
          if (token.subpath && !pkg.exports.includes(`./${token.subpath}`)) return false;
          const found = framework.identifiers(commit, token.names, [`${pkg.dir}/src`]);
          return token.names.every((name) => found.has(name));
        });
      } else if (token.kind === "cli") {
        const tool = config.vocabulary.commands[token.tool];
        const id = tool.framework;
        const registryOf = registries[tool.registry];
        if (!frameworks[id] || !registryOf) {
          out.push(finding("frameworks.json", 0, "mapping", `command ${token.tool} names a framework or a registry that is not defined`));
          continue;
        }
        // A command line names the tool whichever skill prints it, so every locked line of the tool counts.
        const lines = Object.keys(commits[id] ?? {}).filter((line) => (mapping[id] ? mapping[id].includes(line) : true) && (token.markers.length === 0 || token.markers.includes(line)));
        for (const line of lines) {
          const registry = registryOf(frameworks[id], commits[id][line].commit);
          if (registry.error) {
            out.push(finding(token.file, token.line, "framework", registry.error));
            break;
          }
          const flags = registry.commands[token.command];
          if (!flags) out.push(finding(token.file, token.line, "drift", `${token.tool} has no command ${token.command} in ${where(id, line)}`));
          else for (const flag of token.flags) if (!flags.has(flag)) out.push(finding(token.file, token.line, "drift", `${token.tool} ${token.command} has no ${flag} in ${where(id, line)}`));
        }
      } else if (token.kind === "version") {
        // Without every checkout the set of tags is incomplete, and the missing checkout is already a finding.
        if (checkoutsComplete && !allTags.has(`v${token.name}`) && !external.has(token.name)) {
          out.push(finding(token.file, token.line, "drift", `${token.name} is not a released tag of a framework and not in tools/external-names.txt`));
        }
      }
    }
  }
  return { findings: out, commits };
}
