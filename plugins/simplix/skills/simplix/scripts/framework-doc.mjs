#!/usr/bin/env node
/**
 * Prints one file of a SimpliX framework repository at the version a project uses.
 *
 *   node framework-doc.mjs <framework>:<path> --version <x.y.z>
 *   node framework-doc.mjs <framework>:<path> --ref <branch or tag>
 *   node framework-doc.mjs <framework>:<path> --version <x.y.z> --checkout <dir>
 *
 * <framework> is the repository name: simplix, searchable-jpa, simplix-react or
 * simplix-react-ui-kits. With --checkout the file is read from a local clone; otherwise it is
 * downloaded from the public repository.
 */
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OWNER = "simplix-framework";
const FRAMEWORKS = ["simplix", "searchable-jpa", "simplix-react", "simplix-react-ui-kits"];

/**
 * Reads the command line.
 *
 * @param {string[]} argv
 * @returns {{ framework: string, path: string, ref: string, checkout?: string }}
 */
export function parseArguments(argv) {
  const value = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const pointer = argv.find((arg) => /^[a-z][a-z0-9-]*:.+/.test(arg));
  if (!pointer) throw new Error("name the file as <framework>:<path>, for example searchable-jpa:docs/en/search-fields.md");
  const framework = pointer.slice(0, pointer.indexOf(":"));
  const path = pointer.slice(pointer.indexOf(":") + 1);
  if (!FRAMEWORKS.includes(framework)) throw new Error(`unknown framework ${framework}; use one of ${FRAMEWORKS.join(", ")}`);
  const version = value("--version");
  const ref = value("--ref") ?? (version ? `v${version.replace(/^v/, "")}` : undefined);
  if (!ref) throw new Error("pass --version with the version the project depends on, or --ref with a branch or a tag");
  return { framework, path, ref, checkout: value("--checkout") };
}

/** The address the file is downloaded from. */
export function rawUrl({ framework, path, ref }) {
  return `https://raw.githubusercontent.com/${OWNER}/${framework}/${encodeURIComponent(ref)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function read(request) {
  if (request.checkout) {
    return execFileSync("git", ["-C", request.checkout, "show", `${request.ref}:${request.path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  }
  const response = await fetch(rawUrl(request));
  if (response.status === 404) {
    throw new Error(`${request.framework} has no ${request.path} at ${request.ref}: check the version and the path`);
  }
  if (!response.ok) throw new Error(`${rawUrl(request)} answered ${response.status}`);
  return response.text();
}

// The script may be run through a link, so both paths are resolved before they are compared.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(await read(parseArguments(process.argv.slice(2))));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
