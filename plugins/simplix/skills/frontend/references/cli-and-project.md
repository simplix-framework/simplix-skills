# The command line tool and the layout of a project

Framework pages: `simplix-react:docs/guides/cli-usage.md`, `simplix-react:docs/getting-started/installation.md`, `simplix-react:docs/core-concepts/extensions.md`.

## Layout

```text
<project>/
  simplix.config.ts          configuration of the command line tool
  packages/                  domain packages: contract, schemas, derived hooks, mocks
  modules/                   feature modules: features/, widgets/, shared/, a manifest, locales
  apps/                      applications that compose modules
```

- A domain package is generated. Its `src/generated/` folder is written again on every run; the files beside it belong to the project and are kept.
- A module is a feature area. `features/` does not import from `widgets/`, and `shared/` imports from neither.

## Commands

| Command | Does | Options a task usually needs |
| --- | --- | --- |
| `simplix init <name>` | creates the workspace | `--scope`, `--no-demo`, `--no-i18n`, `--no-auth`, `--no-access`, `--yes` |
| `simplix openapi <spec>` | generates domain packages from an API document, a file or a URL | `--domain`, `--entities`, `--output`, `--force`, `--no-http`, `--offline`, `--yes` |
| `simplix add-domain <name>` | adds the skeleton of a domain package to fill in by hand | `--no-i18n`, `--yes` |
| `simplix add-module <name>` | adds a feature module with its layers | `--no-i18n`, `--yes` |
| `simplix scaffold <entity>` | writes the list, form and detail of an entity into a module | `--module`, `--output`, `--native`, `--app` |
| `simplix add-app <name>` | adds an application | `--native`, `--yes` |
| `simplix init-ui` | initializes `@simplix-react/ui` in the project | `--yes` |
| `simplix i18n-codegen` | generates key types from the translation files of the modules | `--watch` |
| `simplix validate` | checks packages, contracts, layers, imports and translations | `--fix` |
| `simplix meta` | generates domain packages from SimpliX Meta | `--domain`, `--offline`, `--force` |
| `simplix meta-diff <domain>` | compares what a domain generates from the API document with what it generates from SimpliX Meta | `--root`, `--package`, `--expect`, `--json` |

- `simplix validate` ends with exit code 1 when it finds an error, which makes it a check for a pipeline.
- Without `--module`, `scaffold` picks the module only when the project has exactly one.
- A later run of `simplix openapi` compares the document with the snapshot of the last run and writes the generated folder again only when something changed. `--force` writes it regardless.

## Generating from an API document

```ts
import { defineConfig } from "@simplix-react/cli";

export default defineConfig({
  plugins: ["@simplix-react-ext/simplix-boot-cli-plugin"],
  packages: { prefix: "myapp" },
  openapi: [
    {
      spec: "./specs/api.json",
      profile: "simplix-boot",
      domains: {
        iam: ["IAM", "/^Auth.*/"],
        billing: ["Billing"],
      },
    },
  ],
});
```

- `openapi` is a list with one entry per document. `domains` maps a domain name to the tags of the operations that belong to it; a tag is matched exactly, or by a regular expression written between slashes.
- An entry that names a `profile` needs the plugin that registers it listed under `plugins`. Without the plugin the command stops instead of generating code for the wrong conventions.
- An operation whose tag matches no domain goes to a fallback that has no package, and is skipped. Read the summary of the run for skipped operations before assuming an entity is missing from the backend.
- The generated contract is adjusted with `customizeApi`, never by editing the generated folder.

## Starting from nothing

```bash
simplix init my-app -y
cd my-app
pnpm install
simplix openapi ./specs/api.json -y
simplix add-module catalog -y
simplix scaffold product --module catalog
simplix validate
```
