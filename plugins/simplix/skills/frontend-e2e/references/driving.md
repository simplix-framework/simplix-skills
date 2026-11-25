# Driving the application

## Environment

- Take the commands that start the application and its API from the project: its package scripts, its build tasks, its own instruction files. Do not start it from memory of another project.
- Read the port from the output of the server. A development server whose usual port is taken moves to another one without saying so.
- Drive a server on the local machine only. A remote, shared or production host is out of scope.
- Stop what this audit started when it ends, and say what was left running and why.

## The driver

Use the browser automation the session provides. It has to open an address, run a script in the page, click and type, capture the page, and read the console and the network. Say which driver the run used, because captures from different drivers differ in pixel ratio, fonts and scrollbar width.

## Signing in

Sign in through the sign-in screen with a development account of each role. Take the accounts from the development configuration or the seed data of the project. Never write a password into a report, a capture or a file.

## Reading a screen

- Read a state once it stands. Wait for the request to settle before judging a list as empty or a save as failed.
- The text of a page is not what the page shows: text can be clipped, covered or drawn in a colour that cannot be read. Judge what is painted.
- Watch the console and the network while driving. An error there with a screen that looks fine is a finding.
- Judge a width by loading the page at that width, not by resizing a page that is already drawn.

## Test data

Create the records the audit needs through the screens, name them so they can be told apart from real data, and remove them at the end. Delete only what the audit created. State that no user can produce through the screens, such as the passage of time or a device event, may be seeded outside them, and each such case is named in the report with the reason.

## Evidence

Record what was observed, not what was expected. A finding names the role, the step, what the screen showed and what it should have shown. Where a capture supports a finding, save it to a file and report the path.
