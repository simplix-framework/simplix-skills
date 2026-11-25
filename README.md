# SimpliX Skills

English | [한국어](README.ko.md)

Skills for agents that build on the SimpliX stack: the SimpliX Spring Boot framework, Searchable JPA, simplix-react and its UI kits. Claude Code and Codex read the same files.

## Plugins

| Plugin | For | Skills |
| --- | --- | --- |
| `simplix` | work in an application built on the stack | `simplix` (entry point), `backend`, `searchable-jpa`, `frontend`, `frontend-e2e`, `mockup`, `init` |
| `simplix-dev` | work inside the framework repositories and this one | `framework-docs`, `simplix-react-docs`, `bugfix`, `sync-skills` |

A skill is named `<plugin>:<skill>` in both harnesses, for example `simplix:backend`.

## Install

From a checkout, link the plugins. An edit in the checkout is then live.

```bash
node tools/install.mjs claude        # links each plugin into the skills folder of Claude Code
node tools/install.mjs codex         # links each skill into ~/.agents/skills
node tools/install.mjs status
```

Or let the harness install a copy from the checkout as a marketplace:

```bash
node tools/install.mjs claude --marketplace
node tools/install.mjs codex --marketplace
```

`node tools/install.mjs remove claude` and `node tools/install.mjs remove codex` take the links away again. `--plugin <name>` limits a command to one plugin.

| | Claude Code | Codex |
| --- | --- | --- |
| Skills | ✔ | ✔ |
| Session start note that names the parts of a project | ✔ | where the harness runs the hooks of a plugin |
| Gates that refuse an edit made without the handbook | ✔ | where the harness runs the hooks of a plugin |
| Sub-agent for the browser audit | ✔ (`screen-auditor`) | the brief of the skill, given to a sub-agent |

The hooks are written for the events of both harnesses and tested with the input shapes each one documents. They were observed running in Claude Code. The Codex command line tool did not run the hooks of a plugin when this was measured (version 0.171.0, `codex exec`), so a project worked on from it is guided by the routing block `simplix:init` writes.

## How the handbooks stay true

A handbook states facts about a framework: type names, annotation attributes, settings, commands and their options, packages, versions, and the pages that hold the detail. Every such fact is checked against the framework's sources at a fixed commit of each release line.

| File | Holds |
| --- | --- |
| `frameworks.json` | the framework repositories, their release lines, and which handbook describes which |
| `frameworks.lock.json` | the commit of each release line the handbooks were verified against |
| `tools/external-names.txt` | names a handbook writes that belong to no framework |

```bash
node tools/check.mjs            # structure, then every claim against the locked commits
node tools/check.mjs --latest   # the same against the newest commits, and which lines the lock is behind
node tools/changes.mjs --fetch  # what each framework gained since the lock, as a checklist
node tools/lock.mjs --latest    # moves the lock, only when the check passes at the new commits
```

The check reads the frameworks through Git objects, so it needs their checkouts and never switches a branch in them. By default they are the folders beside this one, named as the repositories are; `--frameworks <dir>` names another folder that holds them. The generator of SimpliX prints its own help for the check, which needs `npm ci` run once in `simplix-cli` of the SimpliX checkout.

When a framework releases, the scheduled check reports the lock as behind. `simplix-dev:sync-skills` is the procedure that follows: read the ledger, change the handbooks, check, move the lock.

## Layout

```text
.claude-plugin/marketplace.json     marketplace of Claude Code
.agents/plugins/marketplace.json    marketplace of Codex
plugins/<plugin>/
  plugin.json                       manifest both harnesses can read
  .claude-plugin/plugin.json        manifest of Claude Code, the same identity
  skills/<skill>/SKILL.md           a skill, with references/, scripts/ and assets/ as it needs
  hooks/                            the session start note and the gates
  agents/                           sub-agents of Claude Code
tools/                              the check, the ledger, the lock and the installer
```

## Development

```bash
node --test            # tools, hooks and the scripts of the skills
node tools/check.mjs   # has to end with no findings
```

`AGENTS.md` holds the rules for changing this repository.

## License

Apache License 2.0. The frameworks the handbooks describe have their own licenses.
