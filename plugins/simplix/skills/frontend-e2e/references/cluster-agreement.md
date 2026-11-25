# The cluster of a record, and what its screens must agree on

## Build the cluster

For the record under audit, list every surface that shows or moves it.

- Every screen and component that reads its list, its detail or its counts.
- Every surface of another role that acts on it.
- Dashboards, summaries and menu counters that count it.
- Dialogs, pickers and embedded lists on other pages that show it.

Find them from the code as well as from the navigation: search for the hooks of the entity and for its type, since a surface that is not in the menu is still a surface.

## What has to agree

| Subject | The same on every surface |
| --- | --- |
| The record | its name, its key values and their format |
| Its state | the label, the tone and the order of states |
| Counts | a counter, a total and the rows behind them |
| Terms | the word for the record, for each state and for each action |
| Actions | which actions a state and a role allow |
| Freshness | a change made on one surface shows on the others without a manual reload |

## Run it

1. Put one record into a known state and open every surface of the cluster.
2. Compare each subject of the table across the surfaces, and record each difference with the two places it shows.
3. Change the state on one surface. Look at every other surface again without reloading, then after a reload.
4. Repeat as each role that can see the record.

A difference between two surfaces is one finding, reported with both, and fixed where the shared source should have been: one label map, one tone map, one count query.
