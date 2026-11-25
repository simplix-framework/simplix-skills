/**
 * The released versions the skills were verified against, in the shape the shipped detector reads.
 * It is derived from the lock, so a project can be told when it runs an older version.
 */
export function baselineOf(config, lock) {
  const baseline = {};
  for (const [id, spec] of Object.entries(config.frameworks)) {
    for (const [line, lineSpec] of Object.entries(spec.lines)) {
      if (lineSpec.track === "branch" || !lock[id]?.[line]) continue;
      baseline[id] = { ...(baseline[id] ?? {}), [line]: lock[id][line].ref.replace(/^v/, "") };
    }
  }
  return baseline;
}

export function baselineText(config, lock) {
  return `${JSON.stringify(baselineOf(config, lock), null, 2)}\n`;
}
