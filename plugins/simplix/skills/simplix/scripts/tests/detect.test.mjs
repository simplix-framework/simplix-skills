import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { compareVersions, detect, javaDependencies, nodeDependency, resolveVersion } from "../detect.mjs";

function project(files) {
  const root = mkdtempSync(join(tmpdir(), "detect-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const summary = (root) => detect(root).parts.map((p) => `${p.dir} ${p.framework} ${p.version} ${p.line} ${p.handbook}`);

test("a version is a literal, a Gradle property, a properties entry or a Maven property", () => {
  assert.equal(resolveVersion("2.0.2", ""), "2.0.2");
  assert.equal(resolveVersion("$" + "{simplixVersion}", "ext {\n  simplixVersion = '1.3.1'\n}"), "1.3.1");
  assert.equal(resolveVersion("$simplixVersion", "simplixVersion=2.0.0-SNAPSHOT\n"), "2.0.0-SNAPSHOT");
  assert.equal(resolveVersion("$" + "{simplix.version}", "<simplix.version>1.2.4</simplix.version>"), "1.2.4");
  assert.equal(resolveVersion("$missing", "other = '1'"), null);
});

test("Gradle, a version catalog and Maven all name the framework and its version", () => {
  const gradle = "implementation 'dev.simplecore.simplix:spring-boot-starter-simplix:2.0.2'\nimplementation \"dev.simplecore.searchable:searchable-jpa-core:$" + "{searchableVersion}\"";
  assert.deepEqual([...javaDependencies(gradle, gradle + "\nsearchableVersion = '2.1.0'")], [["simplix", "2.0.2"], ["searchable-jpa", "2.1.0"]]);
  const catalog = '[versions]\nsimplix = "1.2.5-SNAPSHOT"\n[libraries]\nsimplix-core = { module = "dev.simplecore.simplix:simplix-core", version.ref = "simplix" }\n';
  assert.deepEqual([...javaDependencies(catalog, catalog)], [["simplix", "1.2.5-SNAPSHOT"]]);
  const pom = "<dependency><groupId>dev.simplecore.simplix</groupId><artifactId>simplix-auth</artifactId><version>1.3.1</version></dependency>";
  assert.deepEqual([...javaDependencies(pom, pom)], [["simplix", "1.3.1"]]);
});

test("a package.json names simplix-react, through the pnpm catalog when it says so", () => {
  assert.deepEqual(nodeDependency('{"dependencies":{"@simplix-react/ui":"^0.3.9"}}', ""), { version: "0.3.9" });
  assert.deepEqual(nodeDependency('{"dependencies":{"@simplix-react/ui":"catalog:"}}', "catalog:\n  '@simplix-react/ui': 0.3.7\n"), { version: "0.3.7" });
  assert.deepEqual(nodeDependency('{"dependencies":{"@simplix-react/ui":"workspace:*"}}', ""), { version: "workspace:*" });
  assert.equal(nodeDependency('{"dependencies":{"react":"19.0.0"}}', ""), null);
  assert.equal(nodeDependency("not json", ""), null);
});

test("a project with a backend and a frontend folder reports both parts", () => {
  const root = project({
    "server/build.gradle": "dependencies { implementation \"dev.simplecore.simplix:spring-boot-starter-simplix:$" + "{simplixVersion}\" }\n",
    "server/gradle.properties": "simplixVersion=1.3.1\n",
    "web/pnpm-workspace.yaml": "catalog:\n  '@simplix-react/ui': 0.3.11\n",
    "web/apps/admin/package.json": '{"dependencies":{"@simplix-react/ui":"catalog:"}}',
    "web/apps/admin/simplix.config.ts": "export default {};\n",
    "web/node_modules/@simplix-react/ui/package.json": '{"dependencies":{"@simplix-react/contract":"0.3.11"}}',
  });
  assert.deepEqual(summary(root), ["server simplix 1.3.1 1.x backend", "web simplix-react 0.3.11 0.x frontend"]);
});

test("another group that starts the same way is not the framework, and a dangling link is skipped", () => {
  const root = project({ "build.gradle": "group = 'dev.simplecore.stagevoice'\ndependencies { implementation 'dev.simplecore.other:simplix-like:1.0.0' }\n" });
  symlinkSync(join(root, "nowhere"), join(root, "broken-link"));
  assert.deepEqual(summary(root), []);
});

test("a project without the stack reports nothing", () => {
  assert.deepEqual(summary(project({ "package.json": '{"dependencies":{"react":"19.0.0"}}', "build.gradle": "plugins { id 'java' }\n" })), []);
});

test("a version is placed against the verified one, and a snapshot is older than its release", () => {
  assert.equal(compareVersions("1.2.5", "1.3.1"), "older");
  assert.equal(compareVersions("2.0.2", "2.0.2"), "same");
  assert.equal(compareVersions("2.0.2-SNAPSHOT", "2.0.2"), "older");
  assert.equal(compareVersions("2.1.0", "2.0.2"), "newer");
  assert.equal(compareVersions("workspace:*", "0.3.11"), "unknown");
  assert.equal(compareVersions("1.0.0", null), "unknown");
});

test("each part carries the verified version of its line and where it stands", () => {
  const root = project({ "build.gradle": "dependencies { implementation 'dev.simplecore.simplix:simplix-core:1.2.4' }\n" });
  const [part] = detect(root, { simplix: { "1.x": "1.3.1", "2.x": "2.0.2" } }).parts;
  assert.deepEqual([part.verified, part.standing], ["1.3.1", "older"]);
});
