<!-- simplix:routing:start -->
## SimpliX handbooks

This repository is built on the SimpliX stack. Each part below has a handbook skill. Load it before the first read, change, review or explanation of a file of that part, and do not work from memory of what it holds. Once loaded in a session it does not need loading again.

| Path | Part | Handbook |
| --- | --- | --- |
| `<backend directory>/` | Java on the SimpliX Spring Boot framework | `simplix:backend` |
| `<backend directory>/` | Search, sort and paging with Searchable JPA | `simplix:searchable-jpa` |
| `<frontend directory>/` | React on simplix-react | `simplix:frontend` |

- Load the handbook before the edit, not after.
- Work that spans the backend and the frontend loads both and is done in order: the backend and its contract, then the generated client, then the screens.
- A screen is complete once it was driven in a browser under `simplix:frontend-e2e`, with the screens that show the same record.
- `simplix:simplix` reports which parts and versions this repository uses and reads the framework documents at those versions.
<!-- simplix:routing:end -->
