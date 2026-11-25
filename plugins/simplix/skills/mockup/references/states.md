# States and global settings

A mockup shows how a screen behaves, so states are implemented, not drawn side by side.

## Every state is a story

- A screen is one `screens/<screen>.stories.tsx`; each state is one story of it, set by args
  (`{ openId: 1 }`, `{ tiles: "collapsed" }`, `{ approval: "returned" }`).
- A state changes on the same gesture as in the product (click a chevron, select a row, close a
  panel); the story's args only fix the state it opens in.
- A screen's first story opens it the way the product does when a reader arrives: a list screen on
  the list alone, never with a record already open. The open record is the next story (`상세`), and
  the menu links to the first.
- Every story has a URL (`iframe.html?id=<story id>`), so a capture and a reviewer reach a state
  directly; the capture script reads the story list from Storybook's `index.json`, never from a
  hand-kept list.
- One fixture record is in one lifecycle state. A story that shows a record before a command and
  a story that shows it after use different fixture ids; reusing one id across states draws the
  second story with the first state's buttons.
- A journey step that runs a command points at a story where that command is enabled. A story
  that demonstrates a blocked precondition ("버튼이 비활성인 상태") is its own story and is never
  the one a journey step presses. Where the specification is data, check both rules by machine
  across every journey.

## Every action works on the sample data

A mockup shows what pressing a button does, not only the button. The screen holds its fixture rows
in the UI kit's mock store (`useMockRecords`), and every action changes them the way the product's
API would: a form adds or saves a row, a dialog closes a record or revokes a grant, a tab narrows
the list, a figure counts the rows it summarises, and a toast (`announce`) says it finished.

- Adding and editing are `renderNew` and `renderEdit` forms (`RecordForm`), each with a story of
  its own; a dialog that takes input finishes through its `submit`, which checks required fields.
- A census that counts more rows than the fixture lists moves by the rows the session changed.
- A destination outside the mockup is drawn disabled with the reason
  (`disabled: "<screen> 화면은 <deliverable> 목업에서 엽니다"`), never as a button that does nothing.
- Data that no source gives is not invented to fill another record: the record opens on an empty
  state instead.

## Global settings are not states

Detail presentation, colour theme, mode, frame and locale are toolbar values that apply to every screen at
once (`references/architecture.md`). A screen never hardcodes one and never adds a story per value;
a capture takes them with `--globals "detailPresentation:drawer;colorTheme:<preset>;locale:ko"`.

A list screen with a detail passes `useMockupSettings().detailPresentation` to the UI kit's list page
type, which presents the record beside the list (`panel`), from the right edge (`drawer`), over the
list (`dialog`) or in the list's place (`page`), and keeps the record's close control as the way back to the list in every
one. The open record is the page's address (`?id=`), so a story opens on a record through its
`search` args.

## Collapse and expand that a simplix-react product usually has

Find each in the product and reproduce its exact behaviour (which element toggles, what remains
visible when collapsed, whether the choice persists):

| Surface | Where to look in the product or framework | States |
| --- | --- | --- |
| Card / tile group | the UI kit's tile row and its fold | collapsed · expanded |
| Alert / notice box | the UI kit's notice card; a hidden one comes back from the page header's list | open · hidden · shown again |
| Section | `crud/shared/section-shell.tsx`, `CrudDetail.Section` | collapsed · expanded |
| List and detail | `crud/patterns/list-detail.tsx` (`activePanel`, `detailWidth`) | list · detail |
| List width | `CrudList.Table` `cardBreakpoint`; the UI kit's list type defaults it to the width its columns need | table · cards |
| Side navigation | the product's sidebar-collapse | expanded · icon-only |
| Tree | `crud/tree/use-tree-expansion.ts` | per-node expanded |
| Filter bar | `crud/filters/filter-bar.tsx` | badges only · popover open |

A capture is taken at rest, after the transition ends; the capture script runs with reduced motion.

## Screen-level states

Data states (empty, loading, error, partial failure) and workflow states (an approval's stages, a
job's progress) are fixture variants, each a story. One screen file covers all of them; a document
that needs "the same screen in another state" names the story, it does not get a new screen.
