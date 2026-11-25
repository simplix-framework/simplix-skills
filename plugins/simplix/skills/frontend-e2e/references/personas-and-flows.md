# People and flows

## Find the people from the navigation

Read the menu and the routes of the application, not its code structure. Each area has an owner: the desk operator, the approver, the administrator, the ordinary member. Write down for each who they are, what they come to do, and which words they use for it. Those words are the standard the labels of their screens are held to.

## Write the flow before opening the browser

For each record in scope, write its life as steps a person takes: who creates it, who acts on it next, which states it passes, where it ends, and how it is reversed or cancelled. Include the branch a real user takes by mistake: a wrong value, a refusal, a second attempt.

- A flow ends where the record can no longer move. Stop there, not at the first screen that renders.
- A step that needs another role is taken as that role.
- A step nobody can take through the screens is recorded as a finding, not skipped.

## Several actors

Sign in as each actor in turn, in one tab or in tabs side by side. After each step, look at what the other actors now see: their list, their counter, their notification. Do not assume the screen of the counterpart works.

## Keep the coverage

Keep a table of role, flow, step and result as the audit runs. A cell that is empty at the end was not looked at, and the report says so.
