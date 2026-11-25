# The modules

Each module keeps a getting started page, guides by task, a configuration reference, a page on how it works and a troubleshooting page under `<module>/docs/en/`. Read the getting started page of a module before adding it, and its troubleshooting page before changing code around a failure.

## Part of the starter

| Module | Use it for | Start at |
| --- | --- | --- |
| `simplix-core` | base entities and repositories, trees, the response and error model, validators, data protection, type conversion, field translation | `simplix:simplix-core/docs/en/getting-started.md` |
| `simplix-auth` | sign-in, encrypted tokens, their renewal and revocation, the Spring Security configuration around them | `simplix:simplix-auth/docs/en/getting-started.md` |
| `simplix-cache` | explicit cache calls and Spring's cache annotations on a store chosen by configuration | `simplix:simplix-cache/docs/en/getting-started.md` |
| `simplix-hibernate` | a second-level cache that stays correct after bulk updates, and events for entity changes | `simplix:simplix-hibernate/docs/en/getting-started.md` |
| `simplix-encryption` | encryption of columns and values with versioned keys | `simplix:simplix-encryption/docs/en/getting-started.md` |
| `simplix-messaging` | messages between parts of a system through a broker that keeps each message until it was handled | `simplix:simplix-messaging/docs/en/getting-started.md` |
| `simplix-scheduler` | a record of every run of the scheduled jobs of the application | `simplix:simplix-scheduler/docs/en/getting-started.md` |
| `simplix-file` | checked uploads stored on a local disk or in an S3-compatible bucket, with image processing | `simplix:simplix-file/docs/en/getting-started.md` |
| `simplix-email` | mail through one service, whichever provider delivers it, with templates | `simplix:simplix-email/docs/en/getting-started.md` |
| `simplix-excel` | export to Excel and CSV and import of uploaded files from one annotated row class | `simplix:simplix-excel/docs/en/getting-started.md` |
| `simplix-mybatis` | MyBatis mappers beside the JPA repositories on the same data source and transactions | `simplix:simplix-mybatis/docs/en/getting-started.md` |
| `simplix-egov` | eGovFrame-style services without XML configuration | `simplix:simplix-egov/docs/en/getting-started.md` |

## Added as their own dependency

| Module | Use it for | Start at |
| --- | --- | --- |
| `simplix-stream` | live data pushed to browsers over Server-Sent Events or WebSocket | `simplix:simplix-stream/docs/en/getting-started.md` |
| `simplix-sync` | in-memory state kept in step across application instances, fast and best-effort | `simplix:simplix-sync/docs/en/getting-started.md` |
| `simplix-license` | running under a license: registration, scheduled verification, enforcement at the request, the feature and the quantity | `simplix:simplix-license/docs/en/getting-started.md` |

## Choosing between modules that look alike

- A message that must not be lost goes through `simplix-messaging`. State another instance can reload, such as a cache entry to drop, goes through `simplix-sync`.
- `simplix-cache` caches what the application computes. `simplix-hibernate` caches entities at the level of the persistence provider. They are configured separately.
- A scheduled job that must run on one instance at a time needs a lock, and the lock needs its store. `simplix:simplix-scheduler/docs/en/running-on-several-instances.md` lists what to add.
- A choice between stores, brokers or providers is a page of the module: `simplix:simplix-cache/docs/en/choosing-a-store.md`, `simplix:simplix-messaging/docs/en/choosing-a-broker.md`, `simplix:simplix-email/docs/en/choosing-a-provider.md`, `simplix:simplix-encryption/docs/en/choosing-a-key-provider.md`.

## Several instances

A deployment with more than one instance changes what a module needs: a shared cache store, a broker for streams, a lock for schedulers, a key store for tokens. Read `simplix:simplix-stream/docs/en/running-several-instances.md`, `simplix:simplix-sync/docs/en/keeping-state-consistent.md` and the rotation page of `simplix-auth` before calling such a deployment done.
