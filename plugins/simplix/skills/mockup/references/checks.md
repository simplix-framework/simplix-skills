# Machine checks

The mockup package ships the checks in the first table, run as `simplix-mockup <check>`; the root's own checks in the second are scripts under
the root's `checks/`, written when the step that needs them starts. All run from one `pnpm check`.
Prove every check on a broken form and a fixed form before relying on it.

## Package checks

| Check | Fails when | Applies from step |
| --- | --- | --- |
| check-screens | a screen imports anything but the UI kit, React, Storybook types, its fixtures and locales and `useMockupSettings`, or writes `className`/`style`, without a `// ui-kit-exception: <reason>` line above it; a button it declares (a verb, a row action, a `PageAction`, a notice's `actionLabel`) has neither an `onClick`/`onAction` nor a `disabled` reason. Only an object that is the value of an action key (`action`, `actions`, `verbs`, `rowActions`, `buttons`, `commands`, and `mockup.config.json` `buttonKeys`) is judged as a button: a type literal (`{ readonly label: string }`) and a value object elsewhere (a badge fallback `{ label: "" }`) are not, and reading every `label` object as a button buries the real ones under hundreds of false reports; every exception is counted. Every lane's check list runs it, not only `pnpm check` | 5 |
| typecheck (`tsc --noEmit`) | a screen passes a prop the UI kit type does not take, or a fixture does not fit the type (rebuild the UI kit first: a stale build reads as a screen error) | 5 |
| check-versions (`--root .`) | the framework checkout is not found (`--framework`, `mockup.config.json` `framework`, `SIMPLIX_FRAMEWORK`); a library pin is inexact or differs from the framework lockfile's resolved version, or a library the framework's UI packages need is missing | 1 |
| check-designs | an override has no framework file at its path, is not recorded in `design.json`, is identical to the framework file (adopted: delete it), or its framework file changed since it was recorded; a `colorTheme` is not a framework preset; a `tokens.css` has blocks other than `:root` and `.dark` | 3 |
| check-imports | a design override imports `@simplix-react/*` instead of `@kit-base/<path>` | 3 |
| capture | a story fails to render, or a badge is wider than its table cell and shows as a stray `…` (reported per story and mode) | 6 |

## Root checks

| Check | Fails when | Applies from step |
| --- | --- | --- |
| token-literal | a literal colour or arbitrary value appears in `screens/` or `fixtures/` (outside `tokens/`) | 2 |
| token-drift | a source file's hash differs from `tokens/source.lock.json` | 2 |
| fixture-source | a fixture file names no source document | 5 |
| global-settings | a screen sets a detail presentation, `data-color-theme`, `dark` or a locale itself. Passing the value read from `useMockupSettings()` is reading it, not setting it, and must not fail. A screen whose specification opens its record as a page (no list beside it) states the page with a `global-setting-exception: <reason>` comment on the line above, counted on every run | 5 |
| form-text | a string a form sheet shows (a cell label, a static cell's source text, a section or block title, a column head, a note) keeps a paper mark: a tick box 「□」, blank parentheses 「( )」 or 「( / / )」, letters spaced to fill a ruled cell 「업 체 명」, a signing note 「(서명)」, date blanks 「20 년 월 일」 or a placeholder 「2026. 00. 00.」, a lead bullet, a trailing colon, a transcribed table row 「\|」; a section title is repeated by the line right under it; a select offers no options. The control is the box, so the mark is noise; prove the check on one broken string before trusting a zero | 5 |
| shape-match | a UI kit type filled with a real product screen's data differs from that screen captured from the product's dev server | 4 |
| flows | driving a screen's actions in the running Storybook leaves the sample data unchanged where the screen shows it (a row, a figure, a tab count, the toast), or the page throws | 6 |
| capture-count | the number of PNGs differs from stories × modes × captured global settings | 6 |

## The dev server serves the file you edited

A capture, a browser check or a layout measurement reads what the Storybook dev server serves, so
an edit the server has not picked up is checked as if it had never been made. This has happened
with a mockup root whose file watcher raised no event: every story kept the content it had when
the server started, with no error in the log, and each capture after an edit showed the old screen.

- After the first edit of a session, fetch the edited module from the server
  (`curl -s <storybook url>/<path from the root> | grep <a string you just wrote>`) before trusting
  what the next capture shows.
- When the module is stale, set `server.watch.usePolling` in `.storybook/main.ts` `viteFinal` and
  restart once. The environment variable `CHOKIDAR_USEPOLLING` does not turn polling on; the
  setting in the Vite config does.
- A capture that is byte-identical to the one before an edit that should have changed it is the
  same signal, so compare hashes across runs when a fix seems to change nothing.

## Comparing with the product

- Same browser, same viewport, same device pixel ratio, same fonts (substitutes included),
  animations at rest. Say which browser driver was used.
- A difference in a screen built from UI kit types is a difference in the type or the data, fixed
  in the UI kit or the fixture, never in the screen.
- A UI kit moved out of the directories an app's stylesheet scans drops its Tailwind classes with
  no type error; compare the built stylesheet's class set before and after any move of the kit.

## Reporting a run

One line per check: name, items checked, failures. A check that did not run is reported as not run,
with the reason, never as passed.

## The dev server serves every file the kit's stylesheet names

A UI kit linked from another workspace names font files installed in that workspace's
`node_modules`. Vite refuses a file outside the roots it was told about with a 403, the page still
renders, and the text falls back to another font: every width measured and every capture taken is
then of the wrong font, and nothing on the screen says so.

- Open one story with a response listener and list every response of 400 or above. The count is zero.
- The mockup plugin allows the workspace of every library linked into the root from outside it,
  found by walking up from the linked package to its workspace file. Where a font file is still
  refused, the library is not a dependency of the root's `package.json`: declare it there, never
  write a path into the config.
- Keep the check running: a layout audit that collects `console` errors per story reports the
  refusal as a problem of every page.
