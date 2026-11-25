# Lists, forms and detail views

Framework pages: `simplix-react:docs/guides/ui-components.md`, `simplix-react:docs/core-concepts/ui-components.md`, `simplix-react:docs/guides/consumer-styling-setup.md`, `simplix-react:docs/guides/consumer-design-customization.md`.

`@simplix-react/ui` gives compound components for the screens of an entity. `simplix scaffold <entity>` writes a first version of them into a module; edit what it wrote rather than building the same screens by hand.

## The pieces

| Piece | Use it for |
| --- | --- |
| `UIProvider` | wraps the application; replaces base components such as inputs and selects everywhere through its overrides |
| `CrudList` with `useCrudList` | a list with search, filters, sort, pages, selection and bulk actions |
| `CrudForm` with `useCrudFormSubmit` | a create and edit form, with its save button and unsaved-change handling |
| `CrudDetail` | the read view of one record |
| `CrudDelete` | the delete confirmation |
| `CrudTree` | a tree of records with expansion, reorder and move |
| `ListDetail` | a list with the detail of the chosen record beside it |
| `CrudProvider` with `createReactRouterAdapter` | connects the screens to the router of the application |
| `CrudErrorBoundary`, `QueryFallback` | what a screen shows while it loads and when it fails |

```tsx
import { CrudList, useCrudList } from "@simplix-react/ui";
```

## What decides whether a list is right

- `useCrudList` takes the list hook of the entity and returns the rows with the state of the filters, the sort, the pages and the selection. Its `stateMode` option decides whether they are applied by the server or in the browser.
- `emptyReason` says why a list shows no rows: no data, no match for the filter, no match for the search, an error, or unavailable. A query that is paused or waiting to retry is unavailable, not empty. Render the reason the hook gives rather than a single "no data" text.

## Forms

- `useCrudFormSubmit` takes the create and the update mutation, decides which applies from the presence of an id, and returns the field errors a server answered with.
- The field components of the UI package take explicit value and change props.
- `useUnsavedChanges` and `useBeforeUnload` are the hooks for a form that must not lose unsaved changes.

## Changing the design

The scope of a change decides where it is made: colours, fonts and radius through the design tokens; one component through an override; one instance through its props. `simplix-react:docs/guides/consumer-design-customization.md` has the decision tree. Copying a component into the project is the last case of that page, for changing the structure of the component itself.
