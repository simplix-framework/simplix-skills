---
name: sync-skills
description: "Procedure that carries changes of the SimpliX framework repositories into the handbooks of the simplix-skills repository. Use inside a checkout of simplix-skills after a framework release, when its check reports that the lock is behind or that a handbook drifted, when a handbook is found to disagree with a framework, and before publishing a new version of the plugins."
---

# Carrying framework changes into the handbooks

The handbooks state facts about four framework repositories. Each fact is tied to a commit of each release line: `frameworks.lock.json` records the commits the handbooks were verified against, and the check resolves every name, setting, command, package, version and file pointer of a handbook at those commits. A framework that moved past its lock is a change to review, never a reason to edit the lock by hand.

Run every command from the root of the simplix-skills checkout, with the framework repositories checked out where `frameworks.json` says, or under one folder passed with `--frameworks`.

## When

- After a release of a framework: a new tag on one of its lines.
- When `node tools/check.mjs --latest` reports `behind` or `drift`, by hand or from the scheduled run.
- When work in a project showed that a handbook disagrees with the framework.

## Procedure

1. List what changed.

   ```bash
   node tools/changes.mjs --fetch
   ```

   For each release line that moved, the ledger prints the commits whose type can change a statement of a handbook, the folders each touched, the lines its changelog gained, and the handbooks that describe the framework.

2. Judge every entry of the ledger, one by one. An entry changes a handbook when it adds, renames or removes something the handbook names (a type, an attribute, a setting, a command, an option, a package), changes a default or a behaviour a rule states, fixes a defect a handbook works around, or adds a capability a task of the handbook would use. Write the decision beside the entry, including the entries that change nothing.

3. Edit the handbooks the ledger names. State the fact as it is at the new version. Where it holds for one release line only, put the name of the line in square brackets on that line, such as `[2.x]`. Point to the page of the framework that holds the detail instead of copying it.

4. Check against the newest commits.

   ```bash
   node tools/check.mjs --latest
   ```

   A `drift` finding is a statement the framework no longer supports: correct the statement. A name that belongs to no framework, such as a class of the platform, is listed in `tools/external-names.txt`, one per line, only after confirming that it is not a misspelled framework name. A `baseline` finding is the sentence of an entry file that names the verified versions: update it to the versions being locked.

5. Move the lock.

   ```bash
   node tools/lock.mjs --latest
   ```

   The lock moves only when the check passes at the new commits. The same run writes the baseline the detector of the `simplix` handbook ships, so a project is told when it runs an older version than a handbook describes.

6. Raise the version of each plugin that changed, in both of its manifests, and the version of the marketplace. Then run the whole check and the tests.

   ```bash
   node tools/check.mjs
   node --test
   ```

7. Commit the handbooks, the lock and the baseline in one change, with the ledger decisions in the description of the change.

## What a name check cannot see

A change of behaviour that renames nothing passes the check. Read the changelog and the upgrade notes of each release for those, and read the page a rule was taken from when its commit touched that page. A rule of a handbook that no page and no source supports is removed, not kept because it was once observed.

## A handbook that was wrong

When a handbook disagreed with the framework at the locked commit, correct it, then ask why the check let it through: a name written without code formatting, a statement about behaviour, a pointer to a page that was itself stale. Where a check can see that kind of statement, add it to `tools/` with a test that proves it on the wrong form and on the right form.
