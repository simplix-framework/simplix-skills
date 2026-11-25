# Login, paths, permissions and data protection

Framework pages: `simplix:docs/en/securing-an-application.md`, `simplix:simplix-auth/docs/en/securing-paths.md`, `simplix:simplix-auth/docs/en/issuing-and-refreshing-tokens.md`, `simplix:simplix-auth/docs/en/revoking-tokens.md`, `simplix:simplix-auth/docs/en/rotating-keys.md`, `simplix:simplix-auth/docs/en/accepting-external-tokens.md`, `simplix:simplix-auth/docs/en/signing-in-with-social-accounts.md`, `simplix:simplix-auth/docs/en/configuration-reference.md`, `simplix:simplix-core/docs/en/protecting-sensitive-data.md`, `simplix:simplix-encryption/docs/en/encrypting-columns.md`.

## Putting an application behind a login

1. Implement `SimpliXUserDetailsService`. Once that bean exists, the framework registers its security configuration, the token filter and the token endpoints.
2. Store password hashes produced by the `PasswordEncoder` bean the framework registers.
3. Provide a `PermissionEvaluator` bean. The generated controllers ask `hasPermission('<GROUP>', '<action>')` and this bean answers.

| Endpoint | Send | Answers |
| --- | --- | --- |
| `POST /auth/token/issue` | user name and password as HTTP Basic | an access token and a refresh token |
| `POST /auth/token/refresh` | the refresh token in `X-Refresh-Token` | a new access token and refresh token |
| `POST /auth/token/revoke` | the access token as `Bearer`, the refresh token in `X-Refresh-Token`, or both | a `SimpliXApiResponse` |

## Which chain answers a request

| Paths | Authentication | A caller without credentials receives |
| --- | --- | --- |
| paths containing `/auth/token/` | the endpoint checks the credentials it is sent | status 401 as JSON |
| `/api/**` | the access token | status 401 as JSON |
| every other path | the login form | a redirect to the login page |

- A `SecurityFilterChain` bean of the application needs a `securityMatcher` and an order below the chain it should precede. A chain ordered after the web chain, which accepts every request, stops the start of the application.
- `simplix.auth.security.permit-all-patterns` opens paths without a login, added to the built-in ones. The API document and Swagger UI need a login until they are listed there.
- A browser client served from another origin needs that origin in `simplix.auth.cors.allowed-origins`.

## Settings a task usually touches

| Setting | Decides |
| --- | --- |
| `simplix.auth.jwe.encryption-key-location` | the key that encrypts the tokens |
| `simplix.auth.token.access-token-lifetime`, `simplix.auth.token.refresh-token-lifetime` | seconds each token is valid |
| `simplix.auth.security.permit-all-patterns` | paths open without a login |
| `simplix.auth.cors.allowed-origins` | origins a browser client may call from |
| `simplix.auth.jwe.key-rolling.enabled` | keys kept in the database and rotated, which needs a `JweKeyStore` bean and `simplix-encryption` |

## Data protection

- Encrypt a column that holds personal data with the converter of `simplix-encryption`, and make the column wide enough for the encrypted value. An encrypted column cannot be searched by its text: keep a hash of the normalised value beside it to find a row.
- Mask and sanitise values before they reach a log or a screen with the utilities of `simplix-core`. The framework page says which tool fits which risk.
- A static key suits development. Production uses a key provider and rotation as `simplix:simplix-encryption/docs/en/choosing-a-key-provider.md` and `simplix:simplix-encryption/docs/en/rotating-keys.md` describe.

## When a login or a token fails

`simplix:simplix-auth/docs/en/troubleshooting.md` is ordered by symptom. `simplix:simplix-auth/docs/en/how-it-works.md` explains the filters and the token format when the symptom is not listed.
