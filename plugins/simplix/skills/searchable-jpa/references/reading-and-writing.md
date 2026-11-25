# Reading results and writing by condition

Framework pages: `searchable-jpa:docs/en/reading-results.md`, `searchable-jpa:docs/en/server-scope-and-limits.md`, `searchable-jpa:docs/en/bulk-write.md`, `searchable-jpa:docs/en/two-phase-query-optimization.md`, `searchable-jpa:docs/en/advanced-features.md`.

## Choosing a read

| Result needed | Method | Returns | How it runs |
| --- | --- | --- | --- |
| A page and the total | `findAllWithSearch(condition)` | `Page<T>` | A page query and a count |
| The first row of the sort | `findFirstWithSearch(condition)` | `Optional<T>` | Reads one row and counts nothing |
| The only matching row | `findOneWithSearch(condition)` | `Optional<T>` | Fails when two or more rows match |
| A count | `countWithSearch(condition)` | `long` | Runs the count only |
| Whether a row exists | `existsWithSearch(condition)` | `boolean` | Runs the existence check only |
| The next window, without a total | `scrollWithSearch(condition, position)` | `Window<T>` | Reads one window |
| Some columns | `projectWithSearch(condition, type)` | `Page<P>` | Selects only the columns the projection reads |
| An interface over the entity | `findAllWithSearch(condition, type)` | `Page<P>` | Loads entities, then wraps them |

- Every method has an overload that takes a server scope after the condition.
- `SearchableService` declares the reads, counts, updates and deletes without a scope. The scope overloads, scrolling and column projections are on `SearchableServiceSupport` and `SearchableServiceDelegate`, which `DefaultSearchableService` provides.
- A count and an existence check do not use the page, the sort or the fetch settings of the condition.
- Without `page` and `size` the first page is read with the default size. `searchable.default-page-size` and `searchable.max-page-size` set the default and the largest size accepted.

## Scrolling

- A scroll returns one `Window` and whether another follows. It counts no total.
- A keyset position continues after the sort values and the primary key of the last row, so a late window costs what the first one costs and rows inserted between two reads do not shift it.
- `scrollPosition(cursor)` turns the cursor text a client hands back into a position; null or blank is the first position. `SearchCursor.encode` and `SearchCursor.decode` convert between a position and text that fits a URL.
- An invalid cursor raises `SearchableValidationException`.

## Server scope

```java
Specification<Post> ownTenant = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
Page<Post> page = service.findAllWithSearch(fromClient, ownTenant);
```

- The scope is combined with AND outside the whole expression of the client, so an OR condition of the client cannot reach a row outside it.
- Reads, counts, scrolls, projections, updates, deletes, aggregates and time buckets all take a scope.
- A scope applies to the entity row itself. Write a restriction on a collection as a subquery: a scope that joins a collection or adds a fetch is refused.

## Limits of a request

| Subject | Setting |
| --- | --- |
| Page size | `searchable.max-page-size` |
| Conditions and groups of one request | `searchable.limits.max-nodes` |
| Nesting of groups | `searchable.limits.max-depth` |
| Listed values of one condition | `searchable.limits.max-in-values` |
| Sort fields | `searchable.limits.max-sort-fields` |

A request over a limit is refused before any query runs. Body size, text length, request rate and query timeout are controls the application adds.

## Update and delete by condition

- `updateWithSearch(condition, patch)` and `deleteWithSearch(condition)` read the matching entities in primary-key order, chunk by chunk, and apply the change to each entity. `searchable.write.chunk-size` sets the chunk.
- A patch object holds only the attributes to change. An attribute that is null is left unchanged, so nothing expresses "set to null". A primitive attribute counts as sent even when it is 0 or false: declare a reference type to tell an omitted value apart.
- Identifier, version and audit fields, columns that are not updatable and collection attributes are left unchanged.
- With `searchable.write.require-filter` on, a write that neither a condition nor a scope narrows is refused with `SearchableValidationException`.

## Transactions

A read joins a transaction in progress or starts a read-only one. An update or a delete joins a transaction in progress or runs the whole operation in one. An application with JTA, or with a transaction manager that spans several datasources, passes its `PlatformTransactionManager` to the constructor of the service or the delegate.
