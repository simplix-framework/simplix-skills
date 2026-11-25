# The code generator

Framework pages: `simplix:simplix-cli/docs/en/getting-started.md`, `simplix:simplix-cli/docs/en/command-reference.md`, `simplix:simplix-cli/docs/en/configuration-reference.md`, `simplix:simplix-cli/docs/en/updating-generated-code.md`, `simplix:simplix-cli/docs/en/customizing-templates.md`, `simplix:simplix-cli/docs/en/template-reference.md`, `simplix:simplix-cli/docs/en/managing-versions.md`, `simplix:simplix-cli/docs/en/troubleshooting.md`.

`simplix-boot` reads a JPA entity and writes the service, REST controller, DTOs and tests that expose it. Install the generator of the release line the project's SimpliX belongs to; the templates of one line call framework classes of that line.

## The workflow

```bash
simplix-boot init                               # once: creates .simplix
simplix-boot version --write                    # once: records the generator version the project uses
simplix-boot config Author                      # writes .simplix/entity/Author.yml from the entity
simplix-boot generate Author                    # renders the templates into the generated tree
simplix-boot promote Author --module catalog    # moves the files into the module, where they are edited
simplix-boot generated                          # reports the state of every promoted file
```

- A command other than `init`, `version` and `help` runs inside a project: the nearest folder at or above the current one that holds `.simplix`.
- `init` does not write `.simplix/generator-simplix.json`. That file is written by hand and says where the entities are, where generated code goes and which components are generated.
- The module folder has to exist before `promote` runs.
- An option a command does not declare stops the command before it does anything. `simplix-boot <command> --help` prints the options of one command.

## The entity yml

`config` writes one entry per field. The file is edited by hand and decides which DTOs each field appears in, how it can be searched and how it is validated.

| Key | Decides |
| --- | --- |
| `modulePath` | the sub-path and package segment of the generated classes |
| `thymeleafBaseDir` | the request path of the controller |
| `permissionGroup` | the group named in the permission checks |
| `idField`, `nameField` | the identifier and the field a record is named by |
| `views` of a field | the DTOs the field is part of: `list`, `detail`, `edit`, `batchUpdate` |
| `searchOperators` of a field | the operators a search may use on it; an empty list makes it unsearchable |
| `sortable`, `required`, `unique`, `maxLength` of a field | sorting and validation |

- `config <Entity> --force` overwrites an existing yml, edits included. After the entity changed, run it and restore the edits, or add the new field to the yml by hand.
- A value shown as `<__MODIFY__>` is a blank to fill in.

## Taking a change

```bash
simplix-boot generate Author --force
simplix-boot promote Author --module catalog
simplix-boot generated
```

Run this after the entity yml, a template or the generator changed. `promote` merges the fresh render into the file a developer edited, using the render it stored when the file was first promoted.

| Result of `promote` | Meaning |
| --- | --- |
| `written` | the file was absent or never edited, and the fresh render was written |
| `merged` | the template change was merged into the edits |
| `current` | the file already holds the template change |
| `removed` | the file was deleted on purpose and stays deleted |
| `conflict` | the edits and the template changed the same lines. The file was kept and the marked merge was written under `generated/conflicts/` |
| `no-base` | the file has no stored render to merge from. `promote --adopt` keeps its content and stores this render as the base |

- A `conflict` leaves the module file without any template change of that run. Resolve it in the conflict file as the framework page describes, not by copying parts of the generated tree by hand.
- `promote --force` overwrites every file with the fresh render, edits included. Use it only when the edits are meant to be discarded.
- `generated` ends with exit code 1 while any file is `stale`, `conflict` or `no-base`, which makes it a check for a pipeline.

## Templates and application classes

- Templates come with the generator. A file of the same relative path under `.simplix/templates` replaces the built-in one; `simplix-boot templates` lists which is in use and `simplix-boot templates --eject` copies built-in templates into the project.
- A class the application writes for itself and generated code calls is named by the project under `supportClasses` in `.simplix/generator-simplix.json`. A built-in template refuses a yml key whose generated code needs a class that is not configured.

## Versions

- `simplix-boot version` reports the running version, the version the project recorded and the newest one of the same release line.
- With a recorded version, a generator that is older stops before it writes anything, so everyone generates the same code.
- A project whose `.simplix` folder was written by the earlier generator moves to this one as `simplix:simplix-cli/docs/en/migrating-from-generator-simplix.md` describes.
