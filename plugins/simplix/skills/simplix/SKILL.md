---
name: simplix
description: "Entry point for work in a project built on the SimpliX stack: the SimpliX Spring Boot framework, Searchable JPA, simplix-react and its UI kits. Use it first in such a project to find out which parts and versions the project uses and which handbook covers the part you are about to touch; for work that spans the backend and the frontend, such as adding an entity with its API and its screens; and to read a page of the framework documentation at the version a project depends on. A project is on the stack when its build depends on dev.simplecore.simplix or dev.simplecore.searchable, when it has a simplix.config.ts or @simplix-react packages, or when it holds a .simplix folder."
---

# SimpliX

SimpliX is a stack for building business applications: a Spring Boot framework with a code generator, a search library for JPA, and a React framework that derives its client from the contract the backend publishes. Each part has its own handbook. This skill finds the parts a project uses and routes to them.

Verified against 2.0.2, 1.3.1, 2.1.0, 1.2.0 and 0.3.11.

## The parts

| Part | Repository | What it gives | Handbook |
| --- | --- | --- | --- |
| SimpliX | `simplix` | Spring Boot modules, a starter and the `simplix-boot` code generator | `backend` |
| Searchable JPA | `searchable-jpa` | searching, sorting and paging from a search DTO | `searchable-jpa` |
| simplix-react | `simplix-react` | a contract per domain, and the client, hooks, forms and mocks derived from it | `frontend` |
| UI kits | `simplix-react-ui-kits` | screen types and templates built on simplix-react | `mockup` |

Two handbooks cover a way of working rather than a part: `frontend-e2e` drives screens in a browser before they are called done, and `init` writes the routing of these handbooks into a project.

## Start here

1. Run `node scripts/detect.mjs <project directory>`. It reads the build files and prints each part the project uses, its version, its release line, the handbook that covers it and the version that handbook was verified against, which it takes from `scripts/baseline.json`.
2. Load the handbook of a part before reading, changing or explaining its files. Work that touches two parts loads both.
3. Where the report says a part is older than its handbook, a page may describe what that version lacks. The handbook of the part names the changelog or the upgrade notes to check.

## Release lines

| Part | Line | Runs on | Verified version |
| --- | --- | --- | --- |
| SimpliX | 2.x | Spring Boot 4 | 2.0.2 |
| SimpliX | 1.x | Spring Boot 3 | 1.3.1 |
| Searchable JPA | 2.x | Spring Boot 4 | 2.1.0 |
| Searchable JPA | 1.x | Spring Boot 3 | 1.2.0 |
| simplix-react | 0.x | React 18 and later | 0.3.11 |

The Spring Boot generation of a backend decides its line. The two lines of a Java part offer the same types, settings and documents.

## Work that spans the layers

An entity that needs an API and screens is built in this order, and each step is verified before the next starts.

1. Backend: write the entity and its repository, describe it in the entity yml, and generate the service, the controller and the DTOs with `simplix-boot`. The handbook is `backend`; the fields a list may search and sort by are declared there, on the search DTO.
2. Contract: the backend publishes its API document, and SimpliX Meta where the project uses it. Both are read by the frontend build, so the backend has to run with the change in it.
3. Frontend: generate the domain package again with `simplix openapi <spec>`, then write the screens of the entity with `simplix scaffold <entity> --module <module>`. The handbook is `frontend`.
4. Browser: drive the screens under `frontend-e2e`.

What has to agree across the layers:

- The backend checks a permission as a group and an action, such as `list`, `view`, `create`, `edit` and `delete`. The access rules of the frontend are built from what the backend answers for the signed-in user, under the names the backend uses.
- A list can sort and filter only by fields the search DTO of the backend declares.
- The backend wraps every answer in one envelope, and reports an error by a code. The frontend reads the body through the generated client and the code through its error type.
- A field, an operation or a permission that changed on the backend reaches the frontend only after generation ran again. Report the change with the backend work, and do not patch generated frontend files to match.

## Reading the framework documents

A name written as `<repository>:<path>` in a handbook is a file of that framework repository at the version the project uses.

```bash
node scripts/framework-doc.mjs simplix:simplix-auth/docs/en/troubleshooting.md --version 2.0.2
node scripts/framework-doc.mjs searchable-jpa:docs/en/faq.md --version 2.1.0 --checkout ../searchable-jpa
```

- `--version` takes the version the project depends on. A snapshot version has no tag: pass `--ref` with the branch of its line instead.
- `--checkout` reads from a local clone of the framework instead of the network.
- The Java parts keep Korean pages under `docs/ko/` with the same file names.
- For reading by a person, each part has a site at `https://simplix-framework.github.io/<repository>/` with a version and a language switch.
