# Architecture of a mockup

## Layout

```
<mockup-root>/
├ package.json            the UI kit, the mockup package (`@simplix-react-ui-kits/mockup`), the framework (through the workspace pin or a version) and the libraries the framework's lockfile pins
├ designs/<design>/       only where a framework component is to look different: `design.json`, `tokens.css`, `ds/<framework path>`; named in `designDirs`
├ mockup.config.json      uiKit, framework, design, design directories, locales, default detail presentation, viewports
├ .storybook/             main.ts (stories, the mockup preset) · preview.tsx (createMockupPreview with the UI kit's decorators)
├ src/index.css           the UI kit's stylesheet → tokens/tokens.css, @source for screens
├ tokens/                 generated only: tokens.css · tokens.json · source.lock.json
├ fixtures/               sample data per screen, citing its source
├ locales/<code>/*.json   translations of the mockup's own copy
├ screens/                one *.stories.tsx per screen, one story per state
└ captures/               generated PNGs, one per story, mode and captured global setting
```

Create it with the mockup package's generator (`simplix-mockup` is the package's command; a root
runs it from its own install, and a first run uses a checkout of the kits repository or
`pnpm dlx @simplix-react-ui-kits/mockup`):

```bash
simplix-mockup init-mockup --root . --name <name> --ui-kit <ui kit package> \
  [--framework <simplix-react checkout>] [--workspace <pnpm workspace root>] \
  [--framework-version <x.y.z>] [--ui-kit-version <spec>] [--mockup-version <spec>]
pnpm install
```

The root depends on the UI kit and on the mockup package the same way: `workspace:*` inside a
workspace that holds the kits repository, a `link:` path to a checkout beside the product, or a
published version. Both come from one repository and one release, so they are moved together.

Inside a product's pnpm workspace (`--workspace`), the root takes the framework and every library the
workspace catalog pins through `catalog:`, so it renders exactly what the product's apps render.
Outside one, `mockup.config.json` `framework` names a simplix-react checkout, or `--framework-version`
names a published version. The mockup preset renders the framework from that source and
resolves libraries from the root's `node_modules`. Outside a workspace the root's library versions
are the ones the framework checkout's lockfile resolves; `init-mockup` writes them and
`check-versions` compares them.

`<mockup-root>` is a directory of the product repository (in its workspace) or its own repository.
`tokens/` is product-level; `screens/` and `fixtures/` belong to one deliverable. Screen types live in
the UI kit, never in the root.

## The mockup package

`@simplix-react-ui-kits/mockup` names no product and holds no design. A value true of one product is
in that root's `mockup.config.json`; code that draws one product's screens is in that root.

| Part | Role |
| --- | --- |
| `@simplix-react-ui-kits/mockup/preset` | the Storybook addon: reads `mockup.config.json` and adds the Vite plugin (framework source, the root's design overrides and design tokens) |
| `@simplix-react-ui-kits/mockup/preview` | `createMockupPreview()`: framework providers and the global settings toolbar |
| `@simplix-react-ui-kits/mockup/settings` | `useMockupSettings()` for a screen |
| `simplix-mockup <command>` | `init-mockup`, `extract-tokens`, `new-override`, `check-screens`, `check-designs`, `check-imports`, `check-versions`, `console-menu`, `screen-design`, `run-stages`, `capture`, `story-digest` |

One Storybook serves one design (`KIT_DESIGN` or `mockup.config.json` `design`), because an override
replaces a module at build time.

## Global settings

The preview's toolbar sets, for every screen at once:

| Setting | Values | Applied through |
| --- | --- | --- |
| Detail | `panel` · `drawer` · `dialog` · `page` | `UIProvider` `defaults.detailPresentation` for `panel`, `drawer` and `dialog`; `useMockupSettings()` for `page` |
| Theme | the framework's `THEMES` | `data-color-theme` on `<html>` |
| Mode | `light` · `dark` | `dark` class on `<html>` |
| Frame | `full` · `content` | `useMockupSettings().frame`; the root's decorator passes the UI kit's window chrome to its preview frame for `full` |
| Locale | `mockup.config.json` `locales` | the framework i18n adapter |

The theme goes on `<html>` so drawers, dialogs and popovers, which portal to `<body>`, take it too.

## Screen shapes and the shell

Screen shapes (a list page with its record, a tabbed list, a settings page, a report, a tree, a
wizard, an editor) are UI kit types. Derive the list from the product: its CLI templates (the
project's `.simplix/templates` over the UI kit's, which the area's core kit holds), its screen
inventory script, and its page pattern (a console page fed a
page spec: header, figures, notices, help, tabs, body). A shape the UI kit lacks is added to the UI
kit, built from the product's own page pattern and simplix-react, and the screen then uses it.

The shell (side nav, top bar, status strip) is a UI kit type too. The page frame a screen renders in
during a mockup comes from the UI kit's preview frame, mounted by the root's preview decorators with
fixture values for the console identity. Under `frame: full` the frame draws the whole window: the
root fills the chrome from the product's own menu tree, icons and catalogues (read, never copied),
marks the destination each screen file is, and links each menu row that has a screen to that
screen's first story.

- A menu row opens its story in Storybook itself (`SELECT_STORY` on the preview channel), so the
  address, the sidebar and the toolbar move with it; a plain link would change only the iframe.
- The bar's language and light/dark buttons change the toolbar's globals (`useGlobals`). The
  product's own pickers keep their choice in local storage and reapply it on mount, which overrules
  the toolbar: a dark capture comes out light.

## Rendering for print

`captures/` is produced by `simplix-mockup capture` from the running Storybook: one PNG per story and
mode, under the global settings passed with `--globals`. Masking for an evaluation copy (logo
removed, names replaced by `***`) is a fixture variant, never an edit to a PNG.
