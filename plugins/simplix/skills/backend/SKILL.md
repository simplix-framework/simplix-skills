---
name: backend
description: "Handbook for Java work in an application built on the SimpliX Spring Boot framework. Use it before writing, reviewing or explaining code in a project that depends on dev.simplecore.simplix, extends SimpliXBaseEntity, SimpliXBaseRepository, SimpliXBaseService or SimpliXBaseController, returns SimpliXApiResponse, or has a .simplix folder; when adding an entity, a CRUD or search endpoint, a permission check, a login, a module such as cache, messaging, file, email, excel, stream, scheduler or license; when running the simplix-boot code generator; and when a SimpliX application fails to start or answers with an unexpected error. Covers the 2.x line on Spring Boot 4 and the 1.x line on Spring Boot 3."
---

# SimpliX backend

SimpliX is a set of Spring Boot modules. A starter configures the web layer, JPA, messages, validation, dates and the API document so that every endpoint answers, fails and is described in one way, and a command line tool writes the service, controller and DTOs of an entity on the base classes of the framework.

Verified against 2.0.4 and 1.3.3 with Searchable JPA 2.1.1 and 1.2.1.

## Release lines

| Line | Spring Boot | Modules | Generator |
| --- | --- | --- | --- |
| 2.x | 4 | `dev.simplecore.simplix:*:2.*` | `@simplix-boot/cli` (dist-tag `latest`) |
| 1.x | 3 | `dev.simplecore.simplix:*:1.*` | `@simplix-boot/cli@spring-boot-3x` |

The Spring Boot generation of the application decides the line, and the modules and the generator of one release carry the same version. Read the version from the build file first. The two lines offer the same modules, types and documents, so everything below holds for both. A project on a version older than the ones above may lack what a page describes: check `simplix:docs/en/changelog.md` before relying on it.

## Rules

1. Generate the CRUD of an entity with `simplix-boot`. Write the entity and its repository by hand, describe the fields in the entity yml, and let the generator write the service, the REST controller, the DTOs and the service test. Write a controller by hand only for an endpoint that is not the CRUD of one entity.
2. Edit generated code where `promote` put it, never in the generated tree. When the entity, its yml or a template changes, run `simplix-boot generate <Entity> --force` and `simplix-boot promote <Entity> --module <module>` again: the merge keeps the edits. `simplix-boot generated` has to end with exit code 0 before the work is called done.
3. An entity extends `SimpliXBaseEntity` and names its identifier through `getId` and `setId`. A repository extends `SimpliXBaseRepository`. The application class sets `SimpliXRepositoryFactoryBean` as the repository factory once.
4. Every endpoint answers with a `SimpliXApiResponse`. A method that returns another type is sent as it is and breaks the contract a client reads.
5. Report an error by throwing `SimpliXGeneralException` with an `ErrorCode`. The exception handler of the starter builds the response and its HTTP status. An application cannot add a code: throw the `BIZ_` code that fits and put its own reason into the detail.
6. Serve REST controllers under `/api`. Access tokens are checked on paths under `/api/`; a path outside it is treated as a web page and sends a caller without a session to the login page.
7. The generated endpoints are guarded by `hasPermission('<GROUP>', '<action>')` with the actions `create`, `view`, `edit`, `delete` and `list`. The application provides the `PermissionEvaluator` bean that answers; without it every call is answered with status 403.
8. A service on `SimpliXBaseService` implements `hasOwnerPermission`, which is abstract.
9. An invalid search condition is answered with status 200 and `type` `ERROR`, with a `SEARCH_` code. A client of a search endpoint reads `type`, not only the status.
10. The message of an unexpected exception is written to the log and not to the response. Do not rely on a client seeing it, and do not put secrets into exception messages for the sake of a log.
11. Validate input on the request class with Bean Validation. A request that fails is answered with status 400, the code `VAL_VALIDATION_FAILED` and one entry per failing field.
12. The token key is a private key. Keep it out of the repository, and rotate keys in production.

## Find the reference

| Task | Read |
| --- | --- |
| Add SimpliX to a project, choose modules, configure the application class | `references/project-setup.md` |
| Write an entity, a repository, a service, a controller; shape responses and errors | `references/crud-api.md` |
| Generate code, edit the entity yml, take a template change, repair a conflict | `references/generator.md` |
| Add a login, open paths, check permissions, encrypt data | `references/security.md` |
| Use cache, messaging, sync, stream, scheduler, file, email, excel, MyBatis, eGovFrame, license | `references/modules.md` |
| Trees, translated fields, type conversion, dates and time zones, messages, metadata for clients | `references/core-topics.md` |

Searching, sorting and paging come from Searchable JPA, which the starter brings. Its handbook is the sibling skill `searchable-jpa`: load it before declaring search fields or changing a search endpoint.

## Verify

- Build and run the tests of the module that changed with the build tool of the project, and read the result of the run rather than the diff.
- Call a changed endpoint: once with a valid token and a valid body, once with a body that must fail validation, once as a caller the permission check must refuse. Read `type`, `errorCode` and the status of each answer.
- After any generator run, `simplix-boot generated` lists every promoted file. `stale`, `conflict` and `no-base` are unfinished work.
- A change to the API is a change to the contract a frontend generates its client from. Say so, and regenerate the client where the project has one.

## Reading the framework documents

A name written as `simplix:<path>` is a file of the SimpliX repository at the version the project uses. Every module keeps its documents under `<module>/docs/en/`, with the same file names in Korean under `<module>/docs/ko/`: a getting started page, guides by task, a configuration reference, a page on how the module works and a troubleshooting page ordered by symptom.

- With the sibling handbook installed, `node ../simplix/scripts/framework-doc.mjs simplix:simplix-auth/docs/en/troubleshooting.md --version <version>` prints the page for that version.
- Without it, read `https://raw.githubusercontent.com/simplix-framework/simplix/v<version>/<path>`.
