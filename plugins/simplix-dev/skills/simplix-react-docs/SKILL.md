---
name: simplix-react-docs
description: "Documentation standards of the simplix-react repository, based on the Diataxis document types and TSDoc. Use when writing or editing a README of the repository or of a package, a TSDoc comment of a public export, a tutorial, a how-to guide, a reference or an explanation, the contributing guide or the changelog, a code example for the documents, or when reviewing the quality of its documentation. Korean triggers: 문서 작성, README 작성, TSDoc 추가, 문서화."
---

# simplix-react Documentation Guidelines

Principle: "Define once, derive everything" applies to documentation too.

## Document Classification (Diataxis)

Classify every document into exactly ONE type. Never mix types.

| Type | Reader State | Purpose | Example |
| --- | --- | --- | --- |
| **Tutorial** | Learning | Step-by-step success experience | "Build a Project Manager" |
| **How-to Guide** | Working | Solve specific problem | "Add parent-child entities" |
| **Reference** | Looking up | Precise API info | `defineApi()` signature |
| **Explanation** | Understanding | Architecture/design intent | "Contract Derivation internals" |

## Workflow

1. **Identify document type** → select template from [references/document-templates.md](references/document-templates.md)
2. **Write content** following style rules below
3. **For TSDoc** → follow patterns in [references/tsdoc-patterns.md](references/tsdoc-patterns.md)
4. **Validate** using [references/quality-checklist.md](references/quality-checklist.md)

## Terminology (strict - no synonyms)

| Official Term | DO NOT use |
| --- | --- |
| contract | schema definition, API definition, spec |
| entity | model, resource, table |
| operation | action, procedure, endpoint |
| derive | generate, create, produce |
| hook | query hook, mutation hook (only when specifying) |
| mock handler | fake handler, stub, interceptor |

## Writing Style

- **2nd person**: "You define a contract" not "The developer defines a contract"
- **Result first, mechanism later**: "Generates type-safe hooks for all entities" not "Iterates config.entities and..."
- **Active voice**: "defineApi returns a client" not "A client is returned by defineApi"
- **No colloquial language**: Formal but approachable

## Language Policy

| Target | Language |
| --- | --- |
| README.md (root + packages) | English, with the Korean `README.ko.md` beside it |
| docs/ documents | English under `docs/en/`, Korean under `docs/ko/`, with the same file names |
| TSDoc comments | English |
| Inline code comments | English |
| CONTRIBUTING.md | English, with the Korean `CONTRIBUTING.ko.md` beside it |
| CHANGELOG.md | English |
| Internal docs (CLAUDE.md, .plans/) | Korean |

The two documents of a pair have the same headings, the same fenced blocks and the same link targets apart from the language. A document is changed in both languages in one change. Korean follows the `simplecore:korean-docs` skill and `.claude/GLOSSARY.md`.

`node scripts/check-docs.mjs all` checks that every relative link resolves, that the pairs agree, and that the names a code example imports exist in the packages.

## Markdown Rules

- Blank line required between headings and tables
- Language tag required on all code blocks (`ts`, `tsx`, `bash`, `json`)
- Use allowed symbols only (no emojis): ✔ ✖ ⚠ ℹ → ← etc.
- Relative paths for links (`./guides/parent-child.md`)
- Left-align table headers by default

## Cross-Package Navigation

- Tutorials show the full pipeline (contract → react → mock), never split by package
- Only API Reference is split by package
- Each package doc has "Prerequisites" at top and "Next Step" at bottom:

```markdown
> **Prerequisites:** This package requires a contract defined with `@simplix-react/contract`.
> See [Defining Contracts](../contract/README.md) first.
```

```markdown
> **Next Step:** Pass this contract to `deriveEntityHooks()` from `@simplix-react/react`.
> See [Deriving Hooks](../react/README.md).
```

## Diagrams

A diagram is an SVG figure, drawn once per language by a module under `docs/figures/` with the document-figure library of the `simplecore:svg-diagrams` skill.

1. Write the claim the figure proves as one sentence, then draw it in the module of its documentation area
2. Build and verify as `docs/figures/README.md` says; the files are `docs/assets/figures/<id>.en.svg` and `<id>.ko.svg`
3. Place the figure as an image whose alt text states the claim; never edit an SVG by hand

A directory tree is not a diagram and stays a fenced `text` block.

## References

- **Templates for each document type**: [references/document-templates.md](references/document-templates.md)
- **TSDoc patterns and priority**: [references/tsdoc-patterns.md](references/tsdoc-patterns.md)
- **Quality checklists and code example standards**: [references/quality-checklist.md](references/quality-checklist.md)
