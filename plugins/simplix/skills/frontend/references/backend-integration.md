# Connecting to a SimpliX Spring Boot backend

Framework pages: `simplix-react:docs/guides/extensions.md`, `simplix-react:docs/core-concepts/extensions.md`.

The packages under the scope `@simplix-react-ext` adapt the framework to a SimpliX backend. They are separate from the core packages and are installed where the backend is a SimpliX application.

| Package | Gives |
| --- | --- |
| `@simplix-react-ext/simplix-boot-cli-plugin` | the `simplix-boot` profile for generation from the API document of the backend |
| `@simplix-react-ext/simplix-boot-auth` | sign-in, token refresh and revocation against the token endpoints of the backend |
| `@simplix-react-ext/simplix-boot-access` | access rules built from the permissions the backend answers with |
| `@simplix-react-ext/simplix-boot-utils` | helpers for the response envelope and its errors |

## Generation

- List the plugin under `plugins` in `simplix.config.ts` and name the profile `simplix-boot` on the entry of the document.
- The profile reads the conventions of a generated SimpliX controller: the tag of an operation, its operation id, and the paths `/search`, `/create`, `/{id}`, `/{id}/edit` and `/batch`.
- The backend wraps every answer in an envelope with `type`, `message`, `body`, `timestamp`, `errorCode` and `errorDetail`. The profile unwraps it, so a generated type is the type of the body and a derived hook returns the body.
- An answer whose `type` is not a success is turned into an `ApiResponseError` that carries the code and the detail. Read the code from the error instead of parsing a message.

## Authentication

```ts
import { createBootAuth } from "@simplix-react-ext/simplix-boot-auth";
```

`createBootAuth` wires bearer tokens with refresh before expiry, one shared refresh for concurrent failures and sign-out across tabs. It returns the auth instance, a client for sign-in, refresh, revocation and the current user, and the fetch functions to pass to the generated contracts.

## Access control

- `createSpringAccessAdapter` reads the permissions of the signed-in user from an endpoint of the backend and turns them into access rules. The backend answers with a map from a resource to its actions, the roles and whether the user is a super administrator.
- The resource and action names are the ones the backend checks: the permission group of an entity and the actions `list`, `view`, `create`, `edit` and `delete`. A screen hides what the user may not do, and the backend still refuses it.
- The permission endpoints belong to the application, not to the framework. Find the paths the backend serves before configuring the adapter.

## What a backend change means here

- A new, renamed or removed field or operation reaches the frontend only after the API document was fetched again and the domain generated again.
- A renamed controller or method renames the generated operation and every hook derived from it.
- A field the backend does not let a client sort or search by cannot sort or filter a list.
