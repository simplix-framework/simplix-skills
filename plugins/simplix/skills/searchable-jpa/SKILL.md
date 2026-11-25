---
name: searchable-jpa
description: "Handbook for Searchable JPA, the library that adds searching, sorting and paging to Spring Data JPA from a search DTO. Use it before writing or reviewing code that declares @SearchableField, takes a SearchCondition, extends DefaultSearchableService or depends on dev.simplecore.searchable; when adding a list or search endpoint, a keyword search, a scroll, a column projection, an aggregate, time buckets or a bulk update by condition; and when a search request is refused, returns unexpected rows or runs slowly. Covers the 2.x line on Spring Boot 4 and the 1.x line on Spring Boot 3."
---

# Searchable JPA

Searchable JPA runs a search a client describes (conditions, sort, page) as JPA queries, and runs only what a search DTO declares. The DTO is the contract: a field, an operator or a sort it does not declare is refused before any query runs.

Verified against 2.1.0 and 1.2.0.

## Release lines

| Line | Spring Boot | Artifact version to look for | Branch |
| --- | --- | --- | --- |
| 2.x | 4 | `dev.simplecore.searchable:*:2.*` | `master` |
| 1.x | 3 | `dev.simplecore.searchable:*:1.*` | `spring-boot-3x` |

Read the version from the build file of the project before using anything below. The two lines share every type, annotation attribute and setting this handbook names. A project on an older version than the ones above may lack keyword search, scrolling, column projections, server scope overloads and per-field case handling: check the installed version against `searchable-jpa:docs/en/upgrade.md` before relying on them.

## Rules

1. The search DTO is the allow-list. Declare every searchable field with `@SearchableField` and list its `operators` on any endpoint a client reaches. An empty `operators` allows every operator. Declare a separate DTO for each endpoint that exposes a different set.
2. Keep the type argument. `SearchCondition<PostSearchDTO>` is validated against `PostSearchDTO`. A raw `SearchCondition`, or one typed with another DTO, is validated against the wrong declaration.
3. A condition the server decides is a scope, never a DTO field. Pass tenant, owner and visibility as a `Specification` after the condition: it is combined with AND outside the whole expression of the client. Take its values from the authentication, never from the request. A scope that joins a collection or adds a fetch is refused with `SearchableConfigurationException`.
4. GET parameters express AND only. OR and nested groups need a JSON body or `SearchConditionBuilder`. A list of conditions is combined from the left in the order written, not by SQL precedence: `A, or B, and C` is `(A OR B) AND C`.
5. Pick the read by the result needed. A page with its total, the first row, the only row, a count, an existence check, a scroll window and a column projection are separate methods with separate costs. `findOneWithSearch` fails when two rows match; it is not "the first row".
6. A late page is expensive and a scroll is not. An offset page reads and skips every row before it. Walk a large result with `scrollWithSearch`.
7. Answer the errors of a request as client errors. `SearchableValidationException` and `SearchableParseException` come from the request. Either set `searchable.web.problem-details.enabled` or map them to status 400 in the error handling of the application. The other exceptions of the library point at server code or at the DTO declaration.
8. Return a response type, not the entity. Serializing an entity exposes every attribute and loads lazy associations.
9. A bulk write is not one SQL statement. `updateWithSearch` and `deleteWithSearch` load the matching entities chunk by chunk, so callbacks, cascades and optimistic locking apply. An empty condition targets the whole table unless `searchable.write.require-filter` is on.
10. Ignoring case changes the index a search needs. A field or a setting that ignores case compares the lower-cased column, so the index is built on the same expression.

## Find the reference

| Task | Read |
| --- | --- |
| Add the dependency, choose modules, answer errors, change a setting, document the API | `references/setup-and-settings.md` |
| Declare search fields: operators, sort, entity path, keyword, case, collections | `references/search-dto.md` |
| Write a request as GET parameters, a JSON body or with the builder; operators and value formats | `references/requests.md` |
| Read pages, single rows, counts, scroll windows and projections; add a server scope; update or delete by condition | `references/reading-and-writing.md` |
| Count per value, sum, average, count per slice of a period | `references/aggregates-and-buckets.md` |

## Verify

A search endpoint is verified by requests, not by reading its code.

- Send one request per declared operator of a field and one sort per sortable field, against rows whose result you can predict.
- Send a request the declaration must refuse (an undeclared field, an operator the field does not list, a sort on a field that is not sortable) and confirm the status the client receives.
- Send the request a client may not narrow away: with a scope in place, an OR condition must still return no row outside it.
- For a list that will grow, read the SQL the search runs before calling it done. `searchable-jpa:docs/en/two-phase-query-optimization.md` shows how to read it and what each strategy costs.

## Reading the framework documents

A name written as `searchable-jpa:<path>` is a file of the Searchable JPA repository at the version the project uses. Each reference names the pages that hold the full detail, with listings the library's own tests compile and run.

- With the sibling handbook installed, `node ../simplix/scripts/framework-doc.mjs searchable-jpa:docs/en/search-fields.md --version <version>` prints the page for that version.
- Without it, read `https://raw.githubusercontent.com/simplix-framework/searchable-jpa/v<version>/<path>`.
- Korean pages have the same file names under `docs/ko/`.
