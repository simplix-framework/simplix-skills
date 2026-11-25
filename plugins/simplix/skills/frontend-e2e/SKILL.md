---
name: frontend-e2e
description: "Browser-driven audit of the screens of a simplix-react application, used before a screen is called complete and whenever a feature area is reviewed as a user would use it. Use it to walk a record through its whole life across every screen that shows or moves it, to check that connected screens agree on values, states, counts and terms, to find what is confusing, missing or unusable, and to verify a delivered feature in a real browser. Not for unit tests, type checks or lint runs."
---

# Browser audit of screens

A screen is not done because it builds. The defects this audit finds survive a green build and a correct diff: a filter that returns nothing, an empty state that never draws, a dialog that cannot be dismissed, two screens that disagree about the same record. A change that touched a screen is complete once that screen and its neighbours were driven here.

Verified against 0.3.11.

## The unit is the cluster

Audit every surface that shows or moves a record together: its list, its detail and its form, the screens of the other roles that act on it, the dashboards and counters that count it, the dialogs on other pages that show it. A screen that passes alone and disagrees with its neighbour is the defect that reaches the user.

## Ground rules

1. Drive the browser, not the API. Every action a user would take is taken in the page. A direct API call may observe what the server stored; it never creates, moves or repairs state a user could produce through the screens. A state a user should reach and cannot is the finding.
2. Judge as the person the area is for. An area for ordinary staff that shows administrator terms, internal ids or configuration fields is defective by that fact.
3. Walk a flow, not a screen. Take the record from its creation to the state where it can no longer move, through every role that acts on it. A state with no exit is a defect even when every screen renders.
4. Play every actor for real. When a flow needs a second person, sign in as that person and take the step.
5. Look at every element. Each field, column, button, badge, filter and empty area is asked: does it mean something to this person, is something they need missing, is something here that should not be.
6. Settle by interaction what an interaction can settle. Scroll it, click it, submit it, break it on purpose. A reading of the accessibility tree that looks wrong is checked against the painted page before it becomes a finding.
7. Anchor every finding: a rule of the `frontend` handbook, a screen of the same project that does it right, what the server contract says, or the step a person could not take. A finding with no anchor is a proposal.
8. A stale build reads as a defect. When a screen disagrees with the source, rebuild or restart and look again before writing anything down.

## How to run it

1. Load the `frontend` handbook. Its rules are the standard a screen is judged by.
2. Name the people who use the area and the flows each takes from start to end: `references/personas-and-flows.md`.
3. Build the cluster of each record in scope: `references/cluster-agreement.md`.
4. Start the application as the project documents and drive it: `references/driving.md`.
5. Take every screen of the cluster through `references/screen-checklist.md`, exhaustively and not by sample.
6. Check that the screens of the cluster agree: `references/cluster-agreement.md`.
7. Fix what was found, under the handbook of the part that is at fault, and drive the fixed screens again.
8. Report: `references/auditor-brief.md` gives the shape.

## One auditor per cluster

Screenshots, page trees, console output and network logs fill a context quickly, and an audit abandoned partway reads the same as one that passed. Where the harness can hand work to a sub-agent, give each cluster to a fresh one with `references/auditor-brief.md` and take back conclusions only.

- One cluster, one auditor. Start a new one for the next cluster.
- One at a time in one working tree. An auditor edits code and drives the development server, so two of them collide over files and ports.
- The auditor writes captures to files and reports their paths. The session that coordinates does not open them.
- A single screen whose whole cluster is that one surface is audited directly.

In Claude Code the plugin provides the sub-agent `screen-auditor` for this.

## Fixing

- A defect of a screen is fixed under the `frontend` handbook. A defect whose cause is the API (a field that is missing, a relation that arrives as an id only, an operation that does not exist) is fixed in the backend under the `backend` handbook, and the frontend is generated again. Do not work around a backend gap in a component.
- After a fix, look for the same defect on the other screens of the same kind before closing it.
- Do not commit during the audit. Report, and leave the commit to the person who asked.
