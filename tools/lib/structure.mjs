/**
 * Checks that need nothing but this repository: a skill both harnesses can load, manifests that
 * agree, paths that exist, and text that reads the same in Claude Code and in Codex.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { codeSpans, listPlugins, parseFrontmatter, readJson, readMarkdown, walk } from "./model.mjs";

const ALLOWED_KEYS = new Set(["name", "description", "license", "allowed-tools", "metadata"]);
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const MAX_ENTRY_LINES = 500;

/** Status and arrow symbols a document may carry; every other pictograph is a finding. */
const ALLOWED_SYMBOLS = new Set([
  ..."✔✖⚠ℹ●◐○→←↑↓▶▷★◆◇◈•‣☐☑☒※§≠≤≥≈─│├└┌┐┘┤",
]);

/**
 * Terms that name a mechanism of one harness. A line may carry one only when it also names the
 * harness, so a reader on the other harness knows the sentence is not about it.
 */
const HARNESS_TERMS = [
  { term: /CLAUDE_PLUGIN_ROOT|\bSkill tool\b|\bAgent tool\b|AskUserQuestion|\bTodoWrite\b|\bsubagent_type\b/, harness: /Claude Code/ },
  { term: /\bapply_patch\b|\bopenai\.yaml\b|\bCODEX_HOME\b/, harness: /Codex/ },
];

const EM_DASH = String.fromCodePoint(0x2014);
const BACKTICK = "\u0060";

function finding(file, line, check, message) {
  return { file, line, check, message };
}

function checkSkill(root, skill, out) {
  const entry = join(skill.dir, "SKILL.md");
  const rel = (p) => relative(root, p);
  if (!existsSync(entry)) {
    out.push(finding(rel(skill.dir), 0, "frontmatter", "the skill has no SKILL.md"));
    return;
  }
  const text = readFileSync(entry, "utf8");
  const { fields, problems } = parseFrontmatter(text);
  for (const problem of problems) out.push(finding(rel(entry), 1, "frontmatter", problem));
  for (const key of Object.keys(fields)) {
    if (!ALLOWED_KEYS.has(key)) out.push(finding(rel(entry), 1, "frontmatter", `key ${key} is not read by both harnesses`));
  }
  if (fields.name !== skill.name) {
    out.push(finding(rel(entry), 1, "frontmatter", `name is ${fields.name ?? "missing"}, the folder is ${skill.name}`));
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) || skill.name.length > MAX_NAME) {
    out.push(finding(rel(entry), 1, "frontmatter", `the skill name is lowercase words joined by hyphens, at most ${MAX_NAME} characters`));
  }
  const description = fields.description ?? "";
  if (!description) out.push(finding(rel(entry), 1, "frontmatter", "description is missing"));
  if (description.length > MAX_DESCRIPTION) {
    out.push(finding(rel(entry), 1, "frontmatter", `description is ${description.length} characters, the limit is ${MAX_DESCRIPTION}`));
  }
  if (text.split("\n").length > MAX_ENTRY_LINES) {
    out.push(finding(rel(entry), 1, "entry-size", `SKILL.md is over ${MAX_ENTRY_LINES} lines; move detail into references/`));
  }

  const files = walk(skill.dir);
  const markdown = files.filter((f) => f.endsWith(".md")).map((f) => readMarkdown(join(skill.dir, f)));
  const mentioned = new Set();
  for (const doc of markdown) {
    doc.lines.forEach((line, i) => {
      if (doc.info[i].fence) {
        // A command of a code block that names a file of the skill reaches it.
        for (const m of line.matchAll(/(?:^|[\s"'(])((?:references|scripts|assets)\/[A-Za-z0-9_.\/-]+)/g)) {
          if (existsSync(join(skill.dir, m[1]))) mentioned.add(m[1]);
        }
        return;
      }
      // Markdown links to files of this repository.
      for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = m[1].split("#")[0];
        if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        const abs = resolve(dirname(doc.path), target);
        if (!existsSync(abs)) out.push(finding(rel(doc.path), i + 1, "dead-path", `link target ${target} does not exist`));
        else mentioned.add(relative(skill.dir, abs));
      }
      // Paths of the skill written as code.
      for (const span of codeSpans(line)) {
        const command = span.replace(/^node\s+/, "");
        // A path into a sibling skill of the same plugin.
        const sibling = /^(\.\.\/[A-Za-z0-9_.\/-]+)(?:\s.*)?$/.exec(command);
        if (sibling && !existsSync(join(skill.dir, sibling[1]))) out.push(finding(rel(doc.path), i + 1, "dead-path", `${sibling[1]} does not exist beside the skill`));
        const m = /^((?:references|scripts|assets)\/[A-Za-z0-9_.\/-]+)(?:\s.*)?$/.exec(command);
        // Without that folder in the skill, the path is one of the project the skill is used in.
        if (!m || !existsSync(join(skill.dir, m[1].split("/")[0]))) continue;
        const abs = join(skill.dir, m[1]);
        if (!existsSync(abs)) out.push(finding(rel(doc.path), i + 1, "dead-path", `${m[1]} does not exist in the skill`));
        else mentioned.add(m[1]);
      }
    });
  }
  for (const file of files) {
    if (!/^(references|scripts|assets)\//.test(file)) continue;
    // A helper module imported by a script, or a test beside it, is reached through that script.
    if (/^scripts\/(lib|tests)\//.test(file)) continue;
    if (![...mentioned].some((m) => m === file || file.startsWith(`${m}/`))) {
      out.push(finding(rel(join(skill.dir, file)), 0, "orphan", "no file of the skill names this path"));
    }
  }
}

function checkText(root, file, out, { instruction }) {
  const doc = readMarkdown(join(root, file));
  const spanPattern = new RegExp(BACKTICK + "[^" + BACKTICK + "]*" + BACKTICK, "g");
  doc.lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) out.push(finding(file, i + 1, "character", "em dash"));
    for (const ch of line) {
      if (/\p{Extended_Pictographic}/u.test(ch) && !ALLOWED_SYMBOLS.has(ch)) {
        out.push(finding(file, i + 1, "character", `pictograph ${ch}`));
        break;
      }
    }
    if (!instruction || doc.info[i].fence) return;
    // Hangul may be quoted (a screen label, a trigger phrase), never the language of the sentence.
    const prose = line.replace(spanPattern, "").replace(/\u300c[^\u300d]*\u300d/g, "").replace(/"[^"]*"/g, "");
    if (/[\uac00-\ud7a3]/.test(prose)) out.push(finding(file, i + 1, "hangul-prose", "an instruction file is written in English"));
    for (const { term, harness } of HARNESS_TERMS) {
      if (term.test(line) && !harness.test(line)) {
        out.push(finding(file, i + 1, "harness-term", `${term.exec(line)[0]} belongs to one harness; name the harness on the line or say it without the term`));
      }
    }
  });
}

function checkManifests(root, plugins, out) {
  const claudeMarket = join(root, ".claude-plugin", "marketplace.json");
  const codexMarket = join(root, ".agents", "plugins", "marketplace.json");
  const names = plugins.map((p) => p.name);
  for (const [path, sourceOf] of [
    [claudeMarket, (entry) => entry.source],
    [codexMarket, (entry) => (typeof entry.source === "string" ? entry.source : entry.source?.path)],
  ]) {
    const file = relative(root, path);
    if (!existsSync(path)) {
      out.push(finding(file, 0, "manifest", "the marketplace file is missing"));
      continue;
    }
    const market = readJson(path);
    const listed = (market.plugins ?? []).map((entry) => entry.name);
    for (const name of names) if (!listed.includes(name)) out.push(finding(file, 0, "manifest", `plugin ${name} is not listed`));
    for (const entry of market.plugins ?? []) {
      if (!names.includes(entry.name)) out.push(finding(file, 0, "manifest", `${entry.name} is listed and has no folder under plugins/`));
      else if (sourceOf(entry) !== `./plugins/${entry.name}`) out.push(finding(file, 0, "manifest", `${entry.name} must have the source ./plugins/${entry.name}`));
    }
  }
  for (const plugin of plugins) {
    const portable = join(plugin.dir, "plugin.json");
    const claude = join(plugin.dir, ".claude-plugin", "plugin.json");
    const file = relative(root, plugin.dir);
    if (!existsSync(portable) || !existsSync(claude)) {
      out.push(finding(file, 0, "manifest", "a plugin carries plugin.json and .claude-plugin/plugin.json"));
      continue;
    }
    const a = readJson(portable);
    const b = readJson(claude);
    for (const key of ["name", "version", "description"]) {
      if (a[key] !== b[key]) out.push(finding(file, 0, "manifest", `${key} differs between plugin.json and .claude-plugin/plugin.json`));
    }
    if (a.name !== plugin.name) out.push(finding(file, 0, "manifest", `the manifest name is ${a.name}, the folder is ${plugin.name}`));
    if (!/^\d+\.\d+\.\d+$/.test(a.version ?? "")) out.push(finding(file, 0, "manifest", "version is three numbers joined by dots"));
    if (plugin.skills.length === 0) out.push(finding(file, 0, "manifest", "the plugin has no skill"));
  }
}

/** Every structure finding of the repository. */
export function checkStructure(root) {
  const out = [];
  const plugins = listPlugins(root);
  checkManifests(root, plugins, out);
  for (const plugin of plugins) for (const skill of plugin.skills) checkSkill(root, skill, out);
  const texts = walk(root).filter((f) => /\.(md|mjs|json|yml|yaml|txt)$/.test(f) && !f.startsWith("tools/tests/fixtures/"));
  for (const file of texts) {
    if (!file.endsWith(".md")) {
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (line.includes(EM_DASH)) out.push(finding(file, i + 1, "character", "em dash"));
        });
      continue;
    }
    const instruction = file.startsWith("plugins/") || file === "AGENTS.md" || file === "CLAUDE.md";
    checkText(root, file, out, { instruction });
  }
  return out;
}
