# Setup, settings and errors

Framework pages: `searchable-jpa:docs/en/installation.md`, `searchable-jpa:docs/en/auto-configuration.md`, `searchable-jpa:docs/en/errors-and-messages.md`, `searchable-jpa:docs/en/openapi-integration.md`, `searchable-jpa:docs/en/upgrade.md`, `searchable-jpa:docs/en/faq.md`.

## Modules

| Artifact | Use it when |
| --- | --- |
| `spring-boot-starter-searchable-jpa` | A Spring MVC application. Holds both modules below and the auto-configuration |
| `searchable-jpa-openapi` | The API document of search parameters, without the auto-configuration |
| `searchable-jpa-core` | Conditions, validation, queries and services with no web or SpringDoc dependency |

```groovy
repositories {
    mavenCentral()
    maven {
        url = uri('https://maven.pkg.github.com/simplix-framework/searchable-jpa')
        credentials {
            username = System.getenv('GITHUB_USERNAME')
            password = System.getenv('GITHUB_TOKEN')
        }
    }
}

dependencies {
    implementation 'dev.simplecore.searchable:spring-boot-starter-searchable-jpa:<version>'
}
```

- The group is `dev.simplecore.searchable`. Use one version for every module, and the line that matches the Spring Boot generation of the application.
- A published version comes from GitHub Packages, which needs a token that may read packages. Keep the credentials outside committed files.
- An application built on the SimpliX framework receives the library through the framework and does not declare a version of its own.

## Settings

Every setting starts with `searchable` and is listed with its default in `searchable-jpa:docs/en/auto-configuration.md`. The ones a task usually touches:

| Setting | Decides |
| --- | --- |
| `searchable.default-page-size`, `searchable.max-page-size` | The page size without `size`, and the largest size accepted |
| `searchable.pattern-matching.case-insensitive` | Whether the pattern operators ignore case |
| `searchable.date-time.default-timezone` | The zone a value without an offset is read in |
| `searchable.params.ignore-unknown` | Whether a query parameter that is not a search parameter is left out instead of refused |
| `searchable.web.argument-resolver.enabled` | Whether a `@SearchableParams SearchCondition<D>` parameter is resolved from the query string |
| `searchable.web.problem-details.enabled` | Whether an invalid search is answered with status 400 and a problem detail |
| `searchable.swagger.enabled` | Whether search parameters are written into the API document |
| `searchable.write.require-filter` | Whether a write without a condition and a scope is refused |

A page size or a batch size that is not positive, or a default page size over the maximum, stops the start of the application.

## Errors

Every exception extends `SearchableException`.

| Exception | The cause lies in |
| --- | --- |
| `SearchableValidationException` | The request: an undeclared field, operator or sort, a violated constraint, a limit, an invalid cursor |
| `SearchableParseException` | The request: a value that cannot be converted, a malformed sort or parameter |
| `SearchableConfigurationException` | Server code: a projection type, a scope that joins a collection |
| `SearchableJoinException` | Server code or the DTO declaration: a path that cannot be resolved on the entity |
| `SearchableOperationException` | Server code: an error while running |

- With `searchable.web.problem-details.enabled` the starter answers the two request exceptions with status 400. Its handler has the lowest precedence, so a handler of the application for the same exceptions is chosen instead.
- With the setting off the exceptions are passed on. An application with its own error format maps them itself.
- An error in a JSON body arises in the message conversion of Spring MVC, before the library is called.
- Messages follow the locale of the request. A key defined in the messages of the application replaces the text of the library.

## When something fails

`searchable-jpa:docs/en/faq.md` is ordered by symptom: a dependency or startup failure, a refused request, an unexpected AND and OR result, a slow search, composite keys, time buckets. Read it before changing code around a symptom it names.
