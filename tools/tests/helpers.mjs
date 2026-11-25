/**
 * Builds a scratch repository of skills and a scratch framework repository for the tests.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function put(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

export function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, "-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args], { encoding: "utf8" }).trim();
}

const skillText = (name, description, body) => `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${body}\n`;

/** A repository of skills with one plugin and one skill, clean on every structure check. */
export function skillsRepo({ body = "# Demo\n\nRead `references/guide.md`.", reference = "# Guide\n\nNothing framework specific.\n", framework = "demo", lines = ["1.x"], baseline = "Verified against 1.0.0." } = {}) {
  const root = mkdtempSync(join(tmpdir(), "skills-repo-"));
  const manifest = { name: "demo-plugin", version: "0.1.0", description: "Demo plugin" };
  put(root, "plugins/demo-plugin/plugin.json", JSON.stringify(manifest));
  put(root, "plugins/demo-plugin/.claude-plugin/plugin.json", JSON.stringify(manifest));
  put(root, ".claude-plugin/marketplace.json", JSON.stringify({ name: "demo", plugins: [{ name: "demo-plugin", source: "./plugins/demo-plugin" }] }));
  put(root, ".agents/plugins/marketplace.json", JSON.stringify({ name: "demo", plugins: [{ name: "demo-plugin", source: { source: "local", path: "./plugins/demo-plugin" } }] }));
  put(root, "plugins/demo-plugin/skills/demo-skill/SKILL.md", skillText("demo-skill", "Use when testing: the demo skill.", `${body}\n\n${baseline}`));
  put(root, "plugins/demo-plugin/skills/demo-skill/references/guide.md", reference);
  put(root, "frameworks.json", JSON.stringify({
    vocabulary: {
      propertyRoots: ["simplix"],
      javaPackages: ["dev.simplecore"],
      packageScopes: ["@simplix-react"],
      commands: { "simplix-boot": { framework: "simplix", registry: "generator" }, simplix: { framework: "simplix-react", registry: "react-cli" } },
    },
    frameworks: { [framework]: { path: "unused", sources: [":(glob)**/src/**"], lines: { "1.x": { branch: "main", track: "tags", tagPattern: "v1.*" }, next: { branch: "main", track: "branch" } } } },
    skills: { "plugins/demo-plugin/skills/demo-skill": { [framework]: lines } },
  }));
  return root;
}

/**
 * A framework repository under <base>/<name>: a Java type, an annotation, a documented property, a
 * workspace package and a command line tool, tagged v1.0.0, with one later commit on main.
 */
export function frameworkRepo(name = "demo") {
  const base = mkdtempSync(join(tmpdir(), "frameworks-"));
  const dir = join(base, name);
  mkdirSync(dir);
  git(dir, "init", "-q", "-b", "main");
  put(dir, "core/src/main/java/dev/simplecore/demo/DemoThing.java", "package dev.simplecore.demo;\npublic class DemoThing { public void runDemo() {} }\n");
  put(dir, "core/src/main/java/dev/simplecore/demo/DemoMark.java", "package dev.simplecore.demo;\npublic @interface DemoMark { int level() default 0; }\n");
  put(dir, "docs/en/guide.md", "# Guide\n\n| Property | Default |\n| --- | --- |\n| `simplix.demo.enabled` | true |\n\nKeys under `simplix.demo.cache`: `time-to-live`.\n");
  put(dir, "packages/demo/package.json", JSON.stringify({ name: "@simplix-react/demo", exports: { ".": "./src/index.ts", "./extra": "./src/extra.ts" } }));
  put(dir, "packages/demo/src/index.ts", "export function useDemo() { return 1; }\nexport const DemoPanel = () => null;\n");
  put(dir, "packages/cli/src/commands/build.ts", 'export const buildCommand = new Command("build")\n  .option("--watch", "Watch")\n  .option(\n    "-o, --out <dir>", "Output");\n');
  put(dir, "simplix-cli/bin/simplix-boot.js", [
    "const [command, option] = process.argv.slice(2);",
    'if (command === "help") console.log("Demo\\n\\nCommands:\\n  generate   Generate code\\n\\nMore text");',
    'else if (option === "--help") console.log("Usage:\\n  simplix-boot generate <Entity> [--force]\\n\\nOptions:\\n  --force");',
    "",
  ].join("\n"));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "feat: first");
  git(dir, "tag", "v1.0.0");
  put(dir, "core/src/main/java/dev/simplecore/demo/LaterThing.java", "package dev.simplecore.demo;\npublic class LaterThing {}\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "feat(core): add LaterThing");
  // The generator registry runs the exported tool with the dependencies of the checkout.
  mkdirSync(join(dir, "simplix-cli", "node_modules"), { recursive: true });
  return { name, base, dir, tagCommit: git(dir, "rev-parse", "v1.0.0^{commit}"), headCommit: git(dir, "rev-parse", "HEAD") };
}

/** A lock with the released line at the tag and the next line at the tip of the branch. */
export function lockOf(framework) {
  return { [framework.name]: { "1.x": { ref: "v1.0.0", commit: framework.tagCommit }, next: { ref: "main", commit: framework.headCommit } } };
}
