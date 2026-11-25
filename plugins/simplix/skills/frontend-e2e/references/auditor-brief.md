# Brief for the auditor of one cluster

Give this to the agent that audits a cluster, with the three items it cannot find itself: the record and its cluster, the roles with their development accounts, and how the project starts.

## The task

Audit one cluster to its end: every surface that shows or moves the record, as every role that uses it, through the whole life of the record.

1. Load the handbooks `frontend-e2e` and `frontend`, and read the code of the cluster.
2. Start the application and its API as the project documents.
3. Write the flows, then drive them in the browser as each role.
4. Run the screen checklist on every screen and the agreement check across the cluster.
5. Fix what you find where the fault is, and drive the fixed screens again.
6. Stop what you started.

## Limits

- Stay inside the cluster you were given. A defect outside it is reported, not fixed.
- Do not commit, push or change configuration outside the project.
- Delete only data you created.

## What to return

Return conclusions, never page contents.

| Section | Holds |
| --- | --- |
| Coverage | the roles, flows and screens that were driven, and what was not reached and why |
| Defects fixed | each with its anchor, the file that changed and how it was verified |
| Defects open | each with its anchor, where it shows and why it was not fixed here |
| Agreement | each difference between two surfaces, with both places |
| Backend gaps | what the API lacks for a screen to be right |
| Data | what was created and removed, and anything seeded outside the screens |
| Verification | the checks that were run after the fixes, with their results |
| Captures | paths of the files that support a finding |
