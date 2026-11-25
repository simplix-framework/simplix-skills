# TSDoc Patterns

## Required Tags

| Tag | Purpose | Where |
| --- | --- | --- |
| (first line) | Summary - one sentence describing "what this is" | All public exports |
| `@remarks` | Detailed explanation after summary | Complex functions/types |
| `@typeParam` | Generic parameter description | Generic functions/types |
| `@param` | Function parameter description | All public functions |
| `@returns` | Return value description | All public functions |
| `@example` | Code example (fenced code block) | All public exports |
| `@see` | Cross-reference to related APIs | Cross-package connections |
| `@throws` | Possible exceptions | Functions that throw |

## Forbidden Tags

- `@deprecated` - project rule: delete deprecated code immediately
- `@author` - use git blame
- `@since` - use CHANGELOG

## Writing Rules

1. Start summary with 3rd-person present-tense verb: "Derives...", "Defines...", "Creates..."
2. `@example` code MUST be executable - include all imports, no omissions
3. Explain "why", not "what": `@param config` → "Configuration defining API structure" (O) / "config object" (X)
4. Only comment non-obvious behavior - do not repeat what type signatures already show
5. Use `@see` for cross-package references: between the contract, react and mock packages
6. Never use `@` tags in inline comments - TSDoc tags only in block comments (`/** */`)

## Priority Order

Document APIs exposed via IDE tooltips first:

| Priority | File | Reason |
| --- | --- | --- |
| 1 | `contract/src/types.ts` | Root of all type definitions |
| 2 | `contract/src/define-api.ts` | Framework entry point |
| 3 | `react/src/derive-hooks.ts` | Most frequently used function |
| 4 | `react/src/types.ts` | Hook type patterns |
| 5 | `mock/src/derive-mock-handlers.ts` | Mock setup entry point |
| 6 | `mock/src/msw.ts` | Worker setup |
| 7 | `i18n/src/adapter.ts` | i18n interface |
| 8 | `i18n/src/create-i18n-config.ts` | i18n config entry point |
| 9 | All other public exports | |

## Function Example

```typescript
/**
 * Derives type-safe React Query hooks from an API contract.
 *
 * @remarks
 * For each entity, generates 5 hooks (useList, useGet, useCreate, useUpdate, useDelete).
 * For each operation, generates a useMutation hook.
 * Mutation hooks automatically invalidate related queries.
 *
 * @typeParam TEntities - Mapping from entity names to EntityDefinition
 * @typeParam TOperations - Mapping from operation names to OperationDefinition
 *
 * @param contract - Return value of `defineApi()` (includes config, client, queryKeys)
 * @returns Mapping object from entity/operation names to hook sets
 *
 * @example
 * ```tsx
 * import { defineApi } from "@simplix-react/contract";
 * import { deriveEntityHooks } from "@simplix-react/react";
 *
 * const api = defineApi({ domain: "project", basePath: "/api", entities: { ... } });
 * const hooks = deriveEntityHooks(api);
 *
 * // Entity hooks
 * const { data } = hooks.projects.useList("");
 *
 * // Operation hooks
 * const { mutate } = hooks.publishProject.useMutation();
 * ```
 *
 * @see {@link defineApi} - contract creation
 * @see {@link EntityHooks} - shape of entity hook sets
 */
```

## Interface/Type Example

```typescript
/**
 * Defines CRUD schemas and routing for an API entity.
 *
 * @remarks
 * `schema` defines the full shape of entities returned by the API.
 * `createSchema` and `updateSchema` define mutation input shapes.
 * TypeScript types are inferred automatically via `z.infer<>`.
 *
 * @typeParam TSchema - Entity's Zod schema type
 * @typeParam TCreate - Creation input Zod schema type
 * @typeParam TUpdate - Update input Zod schema type
 *
 * @example
 * ```ts
 * const projectEntity: EntityDefinition<typeof projectSchema, typeof createSchema, typeof updateSchema> = {
 *   path: "/projects",
 *   schema: projectSchema,
 *   createSchema: createSchema,
 *   updateSchema: updateSchema,
 *   parent: { param: "orgId", path: "/orgs" }, // optional
 * };
 * ```
 */
```

## Constant/Enum Example

```typescript
/**
 * Load state of translation resources.
 *
 * @example
 * ```ts
 * const state = adapter.getLoadState("ko", "common");
 * if (state === TRANSLATION_LOAD_STATES.LOADED) {
 *   // translations are ready
 * }
 * ```
 */
```
