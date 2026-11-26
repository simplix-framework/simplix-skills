# Translations, authentication, access control, tests and native apps

| Concern | What to know first | Framework page |
| --- | --- | --- |
| Translations | Each module keeps its own translation files, the provider loads them, and `simplix i18n-codegen` generates the key types from them | `simplix-react:docs/en/guides/internationalization.md`, `simplix-react:docs/en/core-concepts/internationalization.md` |
| Authentication | Schemes for bearer tokens, API keys and refresh are composed into one auth instance whose fetch function is passed to the contracts | `simplix-react:docs/en/guides/authentication.md`, `simplix-react:docs/en/core-concepts/authentication.md` |
| Access control | A policy holds the rules of the current user; components and routes ask it, and menus are filtered by it | `simplix-react:docs/en/guides/authorization.md`, `simplix-react:docs/en/core-concepts/authorization.md` |
| Tests | The testing package gives a query client, a wrapper and a mock client for unit tests; the mock handlers of a domain serve tests at the level of HTTP | `simplix-react:docs/en/guides/testing-with-mocks.md` |
| A custom fetch | A fetch function of the application is built with `createFetch` and passed to the contract | `simplix-react:docs/en/guides/custom-fetch.md` |
| A native app | `simplix add-app <name> --native` creates the application and `simplix scaffold <entity> --native` its entity screens | `simplix-react:docs/en/guides/cli-usage.md` |
