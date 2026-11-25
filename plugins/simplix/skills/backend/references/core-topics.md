# Topics of the core and the starter

| Topic | What to know first | Framework page |
| --- | --- | --- |
| Trees | A tree entity implements `TreeEntity`, its repository extends `SimpliXTreeRepository`, and the generator writes a tree service for it | `simplix:simplix-core/docs/en/tree-structures.md` |
| Translated fields | A field that holds one text per language is translated on the way out with `@I18nTrans` | `simplix:simplix-core/docs/en/translating-fields.md` |
| Type conversion | Boolean, date and enum values are converted by the converters of the core, which the Excel import uses as well | `simplix:simplix-core/docs/en/converting-types.md` |
| Dates and time zones | `simplix.date-time.default-timezone` is the zone of a value that carries none, and `simplix.date-time.use-utc-for-database` decides how times are stored | `simplix:spring-boot-starter-simplix/docs/en/working-with-dates-and-time-zones.md` |
| Messages and locales | The messages of the application and of the framework are combined, and an answer follows the language of the request | `simplix:spring-boot-starter-simplix/docs/en/messages-and-locales.md` |
| Auditing | The starter switches JPA auditing on and supplies the current user and time; the project writes the base class with the audit fields | `simplix:spring-boot-starter-simplix/docs/en/auditing-entities.md` |
| Describing entities for screens | Annotations on an entity say how a screen names, formats and links its fields | `simplix:simplix-core/docs/en/describing-entities-for-screens.md` |
| Metadata for clients | Development endpoints describe the DTOs, operations and entities of an application so a frontend build can generate types, forms and labels. They are off by default and never registered under a production profile | `simplix:spring-boot-starter-simplix/docs/en/publishing-metadata-for-clients.md`, `simplix:spring-boot-starter-simplix/docs/en/metadata-reference.md` |
| The API document | The starter corrects what the document generator cannot see, so a code generator can build a typed client from `/v3/api-docs` | `simplix:spring-boot-starter-simplix/docs/en/documenting-the-api.md` |
| Events | An entity publishes an event when it is created, changed or deleted, and a module publishes its own events through one interface without knowing who delivers them | `simplix:simplix-core/docs/en/publishing-events.md` |
| Resilience | A circuit breaker, a rate limiter, a deduplicator and a backpressure guard: small in-memory classes created where they are needed | `simplix:simplix-core/docs/en/resilience-utilities.md` |

## The contract a frontend reads

A frontend built on simplix-react generates its client from what the backend publishes: the API document, and SimpliX Meta where the project uses it. Three things follow for backend work.

- The name of an operation in the document comes from its controller and method. Renaming either changes the generated client.
- `simplix.dev.meta.enabled` and `simplix.dev.i18n.enabled` switch the development endpoints on. They belong in a development profile.
- A field, an operation or a permission that changed is a change the frontend has to regenerate from. Report it with the change.
