# What every screen is checked for

Run every item on every screen of the cluster. Record the screens an item was run on, so an item that was skipped is visible.

## A list

- It loads with rows, with no rows, with a filter that matches nothing, and after a failed request, and says which of these it is.
- Every filter narrows the rows and can be cleared. Every sortable column sorts on the server, across pages.
- The search finds a record by the words its user would type, and by part of them.
- Paging reaches the last page, and the total matches the rows.
- A row opens its record. The first column is the name a person knows the record by, never an id.
- A status is drawn the same way here as on every other screen that shows it.
- Selection and bulk actions act on what is selected, and say what they did.

## A detail

- Its title is the name of the record, not an identifier.
- Every value is formatted for a reader: dates in the zone and form of the application, amounts with their unit, a related record by its name.
- Its actions are the ones the current state and the current user allow, and no others.
- It opens from every place that links to it and closes back to where the user came from.

## A form

- It can be completed by its user: a related record is chosen from a picker that shows names, never typed as an id.
- A required field is marked, an invalid value is refused beside its field in the language of the user, and an error the server answers with lands on the field it belongs to.
- Saving twice does not create two records. Leaving with unsaved changes asks first.
- The edit form opens with the stored values, and saving without a change changes nothing.

## Page chrome

- The page has one title, in the place the application puts titles.
- The primary action of the page is where the application puts primary actions. The actions of a detail or a form are in its footer.
- Nothing is clipped, overlapped or scrolling inside a frozen page, at each width the application supports.

## State and life

- Each state of the record has a way out, or is an end state on purpose.
- An action performed here is reflected on the other screens of the cluster without a manual reload.
- An action the current user may not take is not offered, and the server refuses it when it is forced.

## Language

- Every text a user reads is translated in every language the application ships, including messages, empty states and errors.
- One thing has one name across the cluster.

## Errors and empty paths

- A request that fails says so, in words the user can act on, and offers a way to try again.
- A record that was deleted or that the user may not see answers with a page that says which, not with a blank screen.
