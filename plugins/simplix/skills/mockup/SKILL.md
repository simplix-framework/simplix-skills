---
name: mockup
description: "Build a mockup of a simplix-react product as a Storybook of screens drawn with one UI kit (screen types built on simplix-react), adding to the UI kit any screen type it lacks, and keeping the framework design changes a product proposes in its own mockup root until the framework adopts them. Use when asked for screen mockups, design hand-off screens, or design variants of a simplix-react product (목업, 화면 목업, 디자인 시안, 화면 설계, 핸드오프)."
---

# simplix-mockup

A mockup is a Storybook project (the mockup root) whose stories are a simplix-react product's
screens and their states. Every screen is drawn with the UI kit the product uses (a package of screen
types built on simplix-react, named in `mockup.config.json` `uiKit`), so a screen looks like the
product because it is built from the same screen types, components, tokens and CSS. It is the design source
for screens that do not exist yet and the hand-off a developer implements from.

Three rules decide every choice below:

1. **A screen is drawn with the UI kit and nothing else.** It imports the UI kit, React, Storybook
   types, its fixtures and locales, and `useMockupSettings`; it places no framework component and
   writes no `className` or `style`. `check-screens` enforces it. A truly unavoidable exception is
   a `// ui-kit-exception: <reason>` line above the import, counted on every run.
2. **A screen type the UI kit lacks is added to the UI kit, built on simplix-react.** Whole screens
   (a list page with its record, a settings page, a report) and parts (a list, a record, a header
   action) are all UI kit types. A type goes into the area's core kit (`<area>-core`), which every
   design kit of the area re-exports, so every design has it; a design kit adds only its look.
   Generic non-visual code belongs in simplix-react, not in the kit.
   A change to a framework component's own design goes in the mockup root as a design override,
   in a directory the root's `mockup.config.json` `designDirs` names.
3. **A framework design change lives in the mockup root that proposes it until the framework
   adopts it, then it is deleted.** The mockup package holds no design. `check-designs` reports an
   override identical to the framework file, which is the signal that it was adopted.

## When the work starts

Before writing anything, settle these with the user in one batch (the answer changes the work):

- the **source product** (a simplix-react monorepo path) and the **framework** it uses: a checkout
  path, or a published `@simplix-react/*` version
- which app's shell the screens sit in (admin, worker, kiosk) and the viewport(s)
- the **screen list** and where its sample values come from (a tender's reference screens, fixtures)
- the locales, and the detail presentation a list screen opens with by default
- whether any framework component is to look different (a design of the root), and fonts that need a
  licence the mockup may not have, with the substitute

## Procedure

| Step | Produces | Read first | Done when |
| --- | --- | --- | --- |
| 1 Root | the mockup root depending on the mockup package (`@simplix-react-ui-kits/mockup`), the UI kit named | `references/architecture.md` | `pnpm storybook` serves, `check-versions --root .` passes |
| 2 Tokens | `tokens/` from the product stylesheet by script | `references/tokens.md` | token lock written, no hand-edited token |
| 3 Design changes | the root's design overrides, if any were asked for | `references/components.md` | `check-designs` and `check-imports` pass |
| 4 UI kit screen types | the screen types the screens need, added to the UI kit | `references/components.md` | each new type typechecks in the UI kit and renders in the mockup |
| 5 Screens | `screens/*.stories.tsx` = UI kit types + fixtures, one story per state | `references/states.md` | `check-screens` 0 violations, every state is a story |
| 6 Capture and hand-off | PNGs per state and global setting, the hand-off table | `references/checks.md` | capture count equals the story count times the settings captured |

Every step ends with the checks in `references/checks.md` that apply to it.

## Rules that are easy to break

- **Never compose framework components in a screen.** Use the UI kit's type; when it has none, add
  it to the UI kit. If a framework component must look different, that is a design
  override in the mockup root, at the framework file's own path, started with `new-override`.
- **The UI kit's providers come in through the preview, never through a screen.** The root's
  `.storybook/preview.tsx` passes them to `createMockupPreview({ decorators })` with fixture values
  (the product values the kit reads, the console identity, the page frame).
- **An override reaches the original through `@kit-base/<path>`,** never through `@simplix-react/*`,
  which routes back to the override.
- **Tokens are generated.** `tokens/*.css` is the output of `extract-tokens`; a value is fixed by
  changing the source or the script, never the output.
- **A state is a story, a global setting is a toolbar value.** Collapsed, expanded, empty, error and
  approval stages are stories of one screen. Detail presentation, colour theme, mode and locale are
  global settings that apply to every screen at once; a screen never hardcodes them.
- **A detail presentation is read, not chosen.** A list screen passes
  `useMockupSettings().detailPresentation` to the UI kit's list page type, which presents the record
  beside the list, as a drawer, as a dialog, or as a page with its way back to the list.
- **A screen's sample values are real.** No empty table and no lorem ipsum; fixtures carry the values
  the source documents print (the product's seed story, a tender's reference screens), cite the
  source in a comment, and leave out a value no source gives rather than invent it.
- **A fact is said once, on the surface that acts on it.** No tab note, info notice, tile caption,
  form note or help lead that restates a label, the page description or another tab; no record
  link that opens what a tab of the same record already shows; no tab, chip and group splitting a
  list on the same field. A help card keeps its table and drops the paragraphs around it. A
  reference wireframe's explanatory text is a source of facts, not of copy.
- **Labels name what the user does, not the mechanism.** `미사용 시 자동 로그아웃`, not `유휴 만료`;
  `권한 부여`, not `역할 · 권한 범위 부여`; a filter control is `필터`. Keep a kit or framework label
  that misnames its control out of the screen by fixing the label where it is defined.
- **Copy is quoted, not invented.** Screen labels come from the product's locale files or from the
  source document, character for character.

## Reporting

At the end of a step, report: the layer finished, the checks run with their counts (stories captured
out of N, designs and overrides checked, version pins compared), the custom components by `kind`,
the root's design overrides with the framework file each replaces, and every fidelity exception (a
substituted font, an animation captured at rest) with its reason.
