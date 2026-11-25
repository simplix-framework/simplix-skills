# Quality Checklist & Code Example Standards

## Code Example Principles

| # | Principle | Description |
| --- | --- | --- |
| 1 | **Copy-paste-runnable** | Include all imports, all declarations. No omissions. |
| 2 | **Show types** | Show `z.infer<>` result types as comments alongside Zod schemas |
| 3 | **Consistent domain data** | Use same domain in all examples (see below) |
| 4 | **Both success and error paths** | Mutation examples include onError handling |
| 5 | **Comment only non-obvious lines** | Comments explain "why", not "what" |
| 6 | **Minimal code for core concept** | Exclude extra config/styling |
| 7 | **Progressive complexity** | Order: basic → options → advanced |

## Standard Example Domain: Project Management

```
project (parent)
  └── task (child)
```

| Entity | Fields | Purpose |
| --- | --- | --- |
| `project` | id, name, description, status | Basic CRUD examples |
| `task` | id, title, completed, projectId | Parent-child relationship examples |

Use this domain consistently across ALL documentation.

## Canonical Code Example

```tsx
import { defineApi } from "@simplix-react/contract";
import { z } from "zod";

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]),
});

// Exclude id - server generates it
const createProjectSchema = projectSchema.omit({ id: true });

// All fields optional - partial update support
const updateProjectSchema = createProjectSchema.partial();

const api = defineApi({
  domain: "project",
  basePath: "https://api.example.com",
  entities: {
    project: {
      path: "/projects",
      schema: projectSchema,
      createSchema: createProjectSchema,
      updateSchema: updateProjectSchema,
    },
  },
});
```

## Individual Document Checklist

| # | Item | Check |
| --- | --- | --- |
| 1 | Clear one-sentence description of what this document covers? | ☐ |
| 2 | Falls into exactly ONE Diataxis type? | ☐ |
| 3 | Code examples are copy-paste-runnable? | ☐ |
| 4 | Uses consistent domain data (project/task)? | ☐ |
| 5 | Maintains terminology consistency? | ☐ |
| 6 | Has prev/next navigation? | ☐ |
| 7 | Follows markdown rules (blank lines, symbols, etc.)? | ☐ |

## Full Documentation Checklist

| # | Item | Check |
| --- | --- | --- |
| 1 | Root README.md enables first success within 5 minutes? | ☐ |
| 2 | All public exports have TSDoc? | ☐ |
| 3 | All packages have README.md? | ☐ |
| 4 | Cross-package references are complete? | ☐ |
| 5 | At least 1 tutorial exists? | ☐ |
| 6 | CONTRIBUTING.md is up to date? | ☐ |
| 7 | All diagrams generated with mermaid-to-ascii? | ☐ |
