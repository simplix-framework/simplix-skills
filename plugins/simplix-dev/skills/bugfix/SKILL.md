---
name: bugfix
description: "Routine for fixing a bug inside the simplix-react repository: reproduce, find the cause through every layer, fix, and verify the fix and what surrounds it. Use when asked to fix a defect in a package, an extension or the command line tool of simplix-react."
---

# Fixing a bug in simplix-react

1. Reproduce the bug first: read the code it runs through and follow the data from the screen to the API and to what is stored. A bug that was not reproduced is not understood.
2. Find the cause, not the place where it shows. Trace every layer the value passes.
3. Apply the fix at the cause.
4. Verify:
   - the original bug is gone;
   - the operations around it still work: reload, save, delete and what a delete cascades to;
   - no reference between records is left broken;
   - the workspace still passes its checks.
5. When a check fails, fix it before reporting.

The checks are the scripts of the repository, run from its root:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

A fix in a package other packages depend on is verified in those packages as well.
