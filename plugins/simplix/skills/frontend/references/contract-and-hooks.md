# Contracts and what is derived from them

Framework pages: `simplix-react:docs/guides/custom-operations.md`, `simplix-react:docs/guides/custom-fetch.md`, `simplix-react:docs/guides/mock-handlers.md`, `simplix-react:docs/core-concepts/cache-invalidation.md`, `simplix-react:docs/core-concepts/mock-data-layer.md`.

## The contract

```ts
import { defineApi, simpleQueryBuilder } from "@simplix-react/contract";

export const shopApi = defineApi({
  domain: "shop",
  basePath: "/api/v1",
  entities: {
    product: {
      schema: productSchema,
      operations: {
        list: { method: "GET", path: "/products" },
        get: { method: "GET", path: "/products/:id" },
        create: { method: "POST", path: "/products", input: createProductSchema },
        update: { method: "PATCH", path: "/products/:id", input: updateProductSchema },
        delete: { method: "DELETE", path: "/products/:id" },
      },
    },
  },
  queryBuilder: simpleQueryBuilder,
});
```

- `defineApi` returns the configuration, a typed client and the query key factories of the domain.
- `domain` is the namespace of the query keys and `basePath` is prepended to every operation path.
- An entity has `schema`, `operations`, and optionally `identity`, `parent`, `queries` and `filterSchema`. `identity` names the fields a record is identified by for cache keys; it defaults to `id`.
- An operation has a `method` and a `path` with `:name` placeholders. It may carry `input`, `output`, `role`, `contentType`, `responseType`, `invalidates`, `transformRequest` and `transformResponse`. The role is inferred from the name of the operation when it is left out.
- `CRUD_OPERATIONS` holds the method of each standard operation, to spread into an operation instead of repeating it.
- Without a `queryBuilder` the filters, the sort and the page of a list call are not added to the URL.
- An endpoint that belongs to no entity is a top-level operation of the contract, with its input and output schemas.

Pages of this version that still show an entity with `path`, `createSchema` and `updateSchema` describe a shape the contract types no longer have: the quick start, the overview, the pages on defining entities, form hooks, the hooks reference and the tutorials. Follow the shape above and the type `EntityDefinition` of the installed package.

## Changing a generated contract

```ts
import { customizeApi } from "@simplix-react/contract";
```

`customizeApi` takes a contract and a patch and returns a contract with operations added, replaced or removed. It is the way to adjust a contract that was generated from an API document, since the generated files are written again on the next run.

## Query hooks

```ts
import { deriveEntityHooks } from "@simplix-react/react";

export const shopHooks = deriveEntityHooks(shopApi);
```

Each entity receives `useList`, `useGet`, `useCreate`, `useUpdate`, `useDelete` and `useInfiniteList`, as far as the contract declares the operation behind each. They return the results of the query library the framework builds on, and a mutation invalidates the queries its operation names.

## Form hooks

```ts
import { deriveEntityFormHooks } from "@simplix-react/form";
```

`deriveEntityFormHooks` takes the contract and the derived hooks and gives each entity `useCreateForm` and `useUpdateForm`. Validation comes from the input schema of the operation, and `mapServerErrorsToForm` puts the errors a server answers with onto the fields.

## Mocks

```ts
import { deriveMockHandlers, setupMockWorker } from "@simplix-react/mock";
```

`deriveMockHandlers` builds request handlers from the configuration of a contract, backed by in-memory stores, and `setupMockWorker` starts them in the browser with seed data per domain. The same handlers serve development and tests.

## Relations between entities

A child entity names its parent with `parent`, which nests its URLs under the parent and passes the parent id through the client, the query keys and the hooks. `simplix-react:docs/guides/parent-child.md` walks through it; read its contract listings with the note above in mind.
