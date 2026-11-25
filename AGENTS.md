# Working in this repository

This repository holds skills for the SimpliX stack. Claude Code and Codex load the same files, so everything here is written for both.

## What a change has to keep true

- A skill is a folder with `SKILL.md`. Its frontmatter has `name` and `description` only, the name equals the folder, and the description is one double-quoted string of at most 1024 characters. Both harnesses must parse it the same way.
- A plugin carries two manifests with the same name, version and description: `plugin.json` and `.claude-plugin/plugin.json`. Both marketplace files list every plugin.
- Skill text is English and names no mechanism of one harness without naming the harness on the same line. Say "load the handbook", not which tool loads it.
- A path a skill names exists. A file under `references/`, `scripts/` or `assets/` is named by the skill that owns it.
- A script of a skill lives inside the skill folder and is run by its path relative to that folder. A skill reaches a sibling skill of the same plugin through `../<skill>/`.
- Every fact a handbook states about a framework resolves at the locked commits: a type, an attribute, a setting, a command with its options, a package, an import, a version, a file pointer written `<repository>:<path>`. A fact that holds for one release line carries the name of the line in square brackets on its line.
- The entry file of a handbook that describes released versions has one line that starts with "Verified against" and names exactly the locked versions.
- A document states the final state. No history, no account of how the text was reached, no count of the items a list shows, no em dash, no emoji.

`node tools/check.mjs` checks all of the above and has to end with no findings. `node --test` has to pass.

## Writing a handbook

- Write what changes a decision. Leave out what an agent already knows and what the framework documents say in full: point to the page instead.
- Take a fact from the sources or the documents of the framework at the locked commit, never from memory and never from an earlier handbook. Where a page and the source disagree, the source decides, and the handbook says which pages are stale.
- Keep the entry file short: the rules that decide most reviews, a table that routes a task to a reference, how to verify. Put detail into `references/`.
- A rule says what to do and gives its reason in the same sentence or the next.

## Changing the check

A new kind of claim gets a check in `tools/lib/` with a test that proves it on a wrong form and on a right form. What counts as a claim (property roots, Java packages, npm scopes, command line tools) is configuration in `frameworks.json`, not code.

## Framework changes

Load `simplix-dev:sync-skills` and follow it. The lock moves only through `node tools/lock.mjs`.

## Versions and commits

- A change to a plugin raises its version in both manifests, and the version of the marketplace.
- Commit messages are English, in the form `type(scope): description`, with no signature of a tool.
- Commit and push when asked.
