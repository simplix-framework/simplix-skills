/**
 * Per-session markers the gates share. A gate has to know what already happened in a session, and
 * hooks are separate processes without memory, so each fact is a file in the temporary directory
 * keyed by the session. A marker that outlives its session keeps a gate open for an id that does
 * not come back.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PREFIX = "simplix-gate";

export function markerPath(kind, sessionId, name = "") {
  const safe = `${kind}-${name}`.replace(/[^\w.-]/g, "_");
  return join(tmpdir(), `${PREFIX}-${safe}-${sessionId}`);
}

export function setMarker(kind, sessionId, name = "", body = "1") {
  writeFileSync(markerPath(kind, sessionId, name), body);
}

export function hasMarker(kind, sessionId, name = "") {
  return existsSync(markerPath(kind, sessionId, name));
}

export function readMarker(kind, sessionId, name = "") {
  const path = markerPath(kind, sessionId, name);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}
