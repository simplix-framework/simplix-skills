---
name: init
description: "Sets a project up so that every agent session finds the SimpliX handbooks: detects the parts of the stack the project uses, writes the routing of the handbooks into the instruction file of the project, and on request declares the gates that refuse an edit made without the handbook. Use it only when asked to set up, refresh or remove the SimpliX skill routing or the gates of a project."
---

# Setting a project up for the handbooks

A handbook helps only when a session loads it before touching the code. This skill writes that routing into the project, where it travels with the repository, and declares the gates a harness can enforce.

## Steps

1. Run `node ../simplix/scripts/detect.mjs <project directory>` and read the parts it reports. Stop when it reports none: the project is not on the stack.
2. Choose the instruction file. Use the one the project already has. A project that has both `AGENTS.md` and an instruction file of one harness keeps the block in `AGENTS.md` and refers to it from the other. A project that has none receives `AGENTS.md` at its root.
3. Insert the block of `assets/routing-block.md`, with one table row per part the detector reported. The block sits between its two marker comments: when the markers are already in the file, replace what is between them and leave the rest of the file untouched.
4. When the person asked for the gates, write the gate configuration below for each part. Merge into an existing file; never replace keys it already holds.
5. Read the result back and report which files changed and what each now holds.

## The gates

A gate is declared in `.claude/simplix.json` of the folder that holds a part. It is read by the hooks of this plugin, which run in Claude Code when the plugin is installed there. A project without the file is never gated.

```json
{
  "skillGate": { "skills": ["simplix:frontend"], "sourceDirs": ["apps/", "modules/", "packages/"] },
  "e2eGate": { "skill": "simplix:frontend-e2e", "uiDirs": ["apps/", "modules/"] }
}
```

| Key | Meaning |
| --- | --- |
| `skillGate.skills` | the handbooks of which one has to be loaded before a source file under `sourceDirs` is edited |
| `skillGate.sourceDirs` | the folders of the part that hold sources, relative to the folder of the file |
| `e2eGate.skill` | the handbook that has to be loaded before a session that changed a screen ends |
| `e2eGate.uiDirs` | the folders that hold screens |
| `e2eGate.uiExtensions` | the file endings that count as a screen, when they differ from the default |

- A backend part declares `skillGate` with the `backend` handbook and no `e2eGate`.
- Take the folder names from the project. Do not declare a folder the project does not have.
- A gate sees edits made through the editing tool of the harness. A file changed by a shell command is not seen.
- A harness that does not run the hooks of the plugin is guided by the routing block alone. Say so when the project is also worked on from such a harness.

## Removing

Remove the block between its markers and the two keys of the gate configuration. Leave every other line of both files as it is.
