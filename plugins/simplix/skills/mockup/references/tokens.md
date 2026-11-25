# Tokens

## Where a simplix-react product's tokens come from

Read the product's app stylesheet and follow its imports; do not assume the list below is complete.
The usual stack, in cascade order:

1. `@simplix-react/ui/theme.css` → `theme/base.css` (light `:root` and `.dark`) and
   `theme/presets/*.css` (activated by `[data-color-theme]`). The mockup imports this itself.
2. The product's font file (`@theme { --font-sans … }`).
3. The product's own tone or accent system (seed variables plus slot classes derived with
   `color-mix`), if it has one.
4. The product's `@layer base` rules: body font size, empty-cell placeholder, heading font, scrollbar.

## Extraction

```bash
simplix-mockup extract-tokens --entry <product>/apps/<app>/src/index.css --out tokens \
  [--alias <specifier>=<dir>] [--stop-at <regex>] [--slot-pattern <regex>]
```

- It follows `@import` from the product stylesheet. An import matching `--stop-at` (default: the
  framework theme entry) is recorded and not inlined, because the mockup imports the framework theme
  itself; `tokens/` holds only what the product adds.
- It copies custom-property declarations per selector and at-rule (`:root`, `.dark`,
  `[data-color-theme=…]`, `@theme`) unchanged into `tokens/tokens.css`, and the same as JSON into
  `tokens/tokens.json`.
- It copies verbatim every rule that derives a paint from a seed with `color-mix`, every rule whose
  selector matches `--slot-pattern` (`^\.tone-` and the like), and the `@layer base` rules, because
  they must run in the browser exactly as in the product.
- It writes `tokens/source.lock.json` with each source file's path, its last commit and a content
  hash.
- `--alias` maps a package specifier to a directory when the product's packages are not installed
  next to the stylesheet (a workspace package, a framework checkout).

`src/index.css` imports `tailwindcss`, then `@simplix-react/ui/theme.css`, then
`tokens/tokens.css`, so product tokens override the framework's and Tailwind's `@theme` mapping
resolves `bg-primary`, `text-muted-foreground` and the rest to the same variables as the product.

## Design tokens

A design that changes tokens has `<design dir>/<design>/tokens.css` in the mockup root (a directory
`designDirs` names), written like the framework's
`theme/base.css` with top-level `:root` and `.dark` blocks only. The mockup plugin scopes it to the design, so
it overrides the framework base and the active colour preset in the same mode. When the framework
adopts the change (a new preset, a changed base token), the file is deleted from the root.

## What a screen, template or custom component may write

Only token-backed utilities and variables. A literal colour (`#…`, `oklch(…)`, `rgb(…)`) or an
arbitrary pixel value outside `tokens/` is a defect, except a value with no token, which is declared
as a new token in `tokens/extensions.css` with a comment naming the screen that needs it.

## Fonts

A font that needs a licence the environment lacks is substituted in `src/index.css` and reported as
a fidelity exception; a capture compared with the product uses the same substitute.
