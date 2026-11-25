# Screen types: UI kit, framework, design overrides

A screen is composed of UI kit types only. Everything else is where those types come from.

| Layer | Where | Meaning for the developer |
| --- | --- | --- |
| UI kit type | the UI kit package (`uiKit`), imported by the screen | use it as is; a type added for the mockup is new UI kit work |
| simplix-react | `@simplix-react/*`, imported by the UI kit | what the kit types are built on; a screen never imports it |
| design override | `<design dir>/<design>/ds/<framework path>` in the mockup root | a proposed change to a framework component's own design |

Before writing anything, grep the UI kit (`src/**`) for the shape: a type that exists is used, never
written a second time.

## Adding a screen type to the UI kit

- Derive it from the product: the CLI page template, the screens that already draw the shape, the
  product's page pattern. Name its props after what the screen declares (columns and rows, sections
  of labelled values, the page spec), not after the framework components inside it.
- Build it on simplix-react and the kit's own parts. It reads product values (permission subjects,
  the brand mark) through the kit's provider, never from a product import.
- A presentation the installation chooses (detail beside the list, as a drawer, as a dialog, as a page) is a prop
  defaulting to the framework's `UIProvider` default, and every presentation keeps its way back to
  the list.
- Build it in the area's core kit, never in one design kit, so every design kit of the area has it;
  a design kit draws it differently only through its stylesheet.
- A whole screen shape also gets its CLI template in the core kit's `templates/`, so a product
  generates it with `simplix add-page` or `simplix scaffold` in whichever design it draws.
- Typecheck it in the core kit and in every design kit, run the kit repository's template gate when
  a template changed, then render it in the mockup in every presentation and mode.

## Design overrides

A design override replaces one framework file, at its own path under `@simplix-react/ui` src,
for every importer while its design is active.

```bash
simplix-mockup new-override --design <design> --file base/controls/button.tsx
```

`new-override` copies the framework file into `<design dir>/<design>/ds/` (the root's first
`designDirs` entry, or `--designs <dir>`) and records its hash and
revision in `design.json`. Edit the copy to make the change. It reaches the original through
`@kit-base/<path>`. `check-designs` reports an override identical to the framework file (adopted:
delete it), one whose framework file changed since it was recorded, and one with no framework file
at its path. A design that changes only tokens has `tokens.css` and no `ds/`.

## Hand-off table

The hand-off table lists, per screen, the UI kit types it uses, the types added to the UI kit for it,
its declared `ui-kit-exception`s, and the active design's overrides. Added types are UI kit work,
overrides are framework work, exceptions are the next types to add.
