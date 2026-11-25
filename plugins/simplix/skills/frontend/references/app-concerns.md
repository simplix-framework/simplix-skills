# Translations, authentication, access control, tests and native apps

| Concern | What to know first | Framework page |
| --- | --- | --- |
| Translations | Each module keeps its own translation files, the provider loads them, and `simplix i18n-codegen` turns the keys into types so a missing key fails the type check | `simplix-react:docs/guides/internationalization.md`, `simplix-react:docs/core-concepts/internationalization.md` |
| Authentication | Schemes for bearer tokens, API keys and refresh are composed into one auth instance whose fetch function is passed to the contracts | `simplix-react:docs/guides/authentication.md`, `simplix-react:docs/core-concepts/authentication.md` |
| Access control | A policy holds the rules of the current user; components and routes ask it, and menus are filtered by it | `simplix-react:docs/guides/authorization.md`, `simplix-react:docs/core-concepts/authorization.md` |
| Tests | The testing package gives a query client, a wrapper and a mock client for unit tests; the mock handlers of a domain serve tests at the level of HTTP | `simplix-react:docs/guides/testing-with-mocks.md` |
| A custom fetch | Headers, a base URL and error conversion are added through `createFetch`, not inside components | `simplix-react:docs/guides/custom-fetch.md` |
| A native app | `simplix add-app <name> --native` creates the application and `simplix scaffold <entity> --native` its entity screens | `simplix-react:docs/guides/cli-usage.md` |

## Rules that hold across them

- Text a user reads is a translation key, in every language the project ships. A text written into a component is a defect even when it reads correctly in one language.
- A permission is checked where the action is offered and again by the backend. Hiding a button is not access control.
- The fetch function with the tokens is created once and handed to the contracts. A component never reads a token.
- A test mocks at the contract or at HTTP, not by replacing a derived hook with a hand-written one.
