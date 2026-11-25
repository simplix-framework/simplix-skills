/**
 * What a skill file claims about a framework: the names, properties, commands, packages, versions
 * and file pointers written in it. Each claim becomes one token a drift check can resolve.
 *
 * Which words count as a claim comes from the vocabulary in frameworks.json: the roots of the
 * configuration properties, the Java packages, the npm scopes and the command line tools.
 */
import { codeSpans, lineMarkers } from "./model.mjs";

const SHELL_LANGS = new Set(["", "bash", "sh", "shell", "zsh", "console", "text"]);
const JAVA_LANGS = new Set(["java", "kotlin", "groovy"]);
const SCRIPT_LANGS = new Set(["ts", "tsx", "typescript", "js", "jsx", "javascript", "mjs"]);
const YAML_LANGS = new Set(["yaml", "yml"]);
const FILE_SUFFIX = /\.(ts|tsx|js|mjs|json|yml|yaml|md|properties|java|hbs|ejs|txt)$/;

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const anyOf = (words) => words.map(escape).join("|");

/** A name with two or more capitals and a lowercase letter, the shape of a type or a component. */
export function isCompound(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && /[a-z]/.test(name) && (name.match(/[A-Z]/g) ?? []).length >= 2;
}

/** Leaf keys of a YAML block as dotted paths, with the line each one is on. */
function yamlPaths(lines) {
  const stack = [];
  const out = [];
  lines.forEach((raw, i) => {
    const m = /^(\s*)([A-Za-z0-9_-]+):(?:\s+(.*))?$/.exec(raw);
    if (!m) return;
    const indent = m[1].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    stack.push({ indent, key: m[2] });
    const value = (m[3] ?? "").replace(/\s+#.*$/, "").trim();
    if (value !== "") out.push({ path: stack.map((s) => s.key).join("."), line: i });
  });
  return out;
}

/**
 * Builds the extractor for one vocabulary.
 *
 * @param {{ propertyRoots: string[], javaPackages: string[], packageScopes: string[], commands: Record<string, object> }} vocabulary
 * @param {string[]} frameworkIds the framework names a file pointer may start with
 * @returns {(doc: object) => object[]} every claim of one Markdown file
 */
export function createExtractor(vocabulary, frameworkIds) {
  const roots = anyOf(vocabulary.propertyRoots);
  const tools = anyOf(Object.keys(vocabulary.commands).sort((a, b) => b.length - a.length));
  const javaRoots = anyOf(vocabulary.javaPackages);
  const scopes = anyOf([...vocabulary.packageScopes].sort((a, b) => b.length - a.length));
  const property = new RegExp(`^(?:${roots})(?:\\.[a-z0-9-]+)+(?:\\.\\*)?$`);
  const propertyLine = new RegExp(`^\\s*((?:${roots})(?:\\.[A-Za-z0-9_-]+)+)\\s*[=:]`);
  const propertyPath = new RegExp(`^(?:${roots})\\.`);
  const fqn = new RegExp(`^(?:${javaRoots})(?:\\.[A-Za-z_][A-Za-z0-9_]*)+$`);
  const javaImport = new RegExp(`^\\s*import\\s+(?:static\\s+)?((?:${javaRoots})\\.[A-Za-z0-9_.]+?)(?:\\.\\*)?;?\\s*$`);
  const scriptImport = new RegExp(`import\\s+(?:type\\s+)?([^;'"]*?)\\s+from\\s+["']((?:${scopes})/[^"']+)["']`, "g");
  const packageName = new RegExp(`(?:${scopes})/[a-z0-9-]+`, "g");
  const cli = new RegExp(`(?<![\\w@/.-])(${tools})\\s+([a-z][a-z0-9-]*)((?:\\s+[^\\s|;&]+)*)`);
  const cliSpan = new RegExp(`^(?:(?:npx|pnpm exec|pnpm)\\s+)?(?:${tools})\\s`);

  const cliToken = (text) => {
    const m = cli.exec(text);
    if (!m) return null;
    return { kind: "cli", tool: m[1], command: m[2], flags: [...m[3].matchAll(/(?<![\w-])--[a-z][a-z0-9-]*/g)].map((f) => f[0]) };
  };

  const spanTokens = (span) => {
    const pointer = /^([a-z][a-z0-9-]*):([A-Za-z0-9_.@\/-]+)$/.exec(span);
    if (pointer && frameworkIds.includes(pointer[1]) && /[\/.]/.test(pointer[2])) return [{ kind: "pointer", framework: pointer[1], path: pointer[2] }];
    if (cliSpan.test(span)) {
      const token = cliToken(span);
      return token ? [token] : [];
    }
    if (property.test(span) && !FILE_SUFFIX.test(span)) return [{ kind: "property", name: span.replace(/\.\*$/, "") }];
    if (fqn.test(span)) return [{ kind: "fqn", name: span }];
    const annotation = /^@([A-Z][A-Za-z0-9_]*)\((.*)\)$/.exec(span);
    if (annotation) {
      const out = [{ kind: "name", name: annotation[1] }];
      for (const m of annotation[2].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g)) out.push({ kind: "member", type: annotation[1], name: m[1] });
      return out;
    }
    const typed = /^(@?)([A-Z][A-Za-z0-9_]*)(?:<[^>]*>)?(?:[.#]([A-Za-z_][A-Za-z0-9_]*))?(?:\(.*\))?$/.exec(span);
    if (typed && (typed[1] === "@" || isCompound(typed[2]))) {
      const out = [{ kind: "name", name: typed[2] }];
      if (typed[3]) out.push({ kind: "member", type: typed[2], name: typed[3] });
      return out;
    }
    const camel = /^([a-z][a-z0-9]*[A-Z][A-Za-z0-9_]*)(?:\(.*\))?$/.exec(span);
    return camel ? [{ kind: "name", name: camel[1] }] : [];
  };

  const fenceTokens = (block, add) => {
    const text = block.lines.join("\n");
    if (JAVA_LANGS.has(block.lang)) {
      block.lines.forEach((line, i) => {
        const m = javaImport.exec(line);
        if (m) add(block.start + i, { kind: "fqn", name: m[1] });
      });
    } else if (SCRIPT_LANGS.has(block.lang)) {
      for (const m of text.matchAll(scriptImport)) {
        const line = block.start + text.slice(0, m.index).split("\n").length - 1;
        const parts = m[2].split("/");
        const names = [];
        const braces = /\{([^}]*)\}/.exec(m[1]);
        for (const part of braces ? braces[1].split(",") : []) {
          const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
          if (name) names.push(name);
        }
        add(line, { kind: "import", package: parts.slice(0, 2).join("/"), subpath: parts.slice(2).join("/"), names });
      }
    } else if (YAML_LANGS.has(block.lang)) {
      for (const { path, line } of yamlPaths(block.lines)) if (propertyPath.test(path)) add(block.start + line, { kind: "property", name: path });
    } else if (block.lang === "properties") {
      block.lines.forEach((line, i) => {
        const m = propertyLine.exec(line);
        if (m) add(block.start + i, { kind: "property", name: m[1] });
      });
    } else if (SHELL_LANGS.has(block.lang)) {
      block.lines.forEach((line, i) => {
        const token = cliToken(line);
        if (token) add(block.start + i, token);
      });
    }
  };

  return (doc) => {
    const tokens = [];
    const add = (index, token) => tokens.push({ ...token, line: index + 1, markers: lineMarkers(doc.lines[index]) });
    let block = null;
    doc.lines.forEach((line, i) => {
      const info = doc.info[i];
      for (const m of line.matchAll(packageName)) add(i, { kind: "package", name: m[0] });
      if (info.boundary) {
        if (block) {
          fenceTokens(block, add);
          block = null;
        } else {
          block = { lang: info.lang, start: i + 1, lines: [] };
        }
        return;
      }
      if (info.fence) {
        block?.lines.push(line);
        return;
      }
      for (const span of codeSpans(line)) for (const token of spanTokens(span)) add(i, token);
      for (const m of line.matchAll(/(?<![\w.])v?(\d+\.\d+\.\d+)(?![\w.]*\d)/g)) add(i, { kind: "version", name: m[1] });
    });
    return tokens;
  };
}
