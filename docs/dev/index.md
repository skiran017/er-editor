# Getting started

You'll be running the editor locally in 60 seconds.

## Prerequisites

- **Node.js 20+**
- **pnpm 9+** (`npm install -g pnpm` if you don't have it)

## First run

```bash
git clone https://github.com/skiran017/er-editor.git
cd er-editor
pnpm install
pnpm dev          # starts the editor at http://localhost:5173
```

## Verifying everything works

```bash
pnpm typecheck    # tsc strict
pnpm lint         # eslint with the project config
pnpm test --run   # vitest unit + integration suite (~1k tests)
```

All three should pass on a clean clone.

## Building the docs site locally

```bash
pnpm docs:dev     # http://localhost:5173 (separate VitePress port)
pnpm docs:build   # static build into docs/.vitepress/dist/
```

The docs site auto-generates the API reference from public barrels and the keybindings table from `src/interaction/keybindings.ts` — see [Build & deploy](./build-deploy) for the pipeline.

## Where to next

- **First contribution?** [Contributing](./contributing).
- **Big-picture mental model?** [Architecture overview](./architecture/overview).
- **Diving into a specific subsystem?** [Concepts](./concepts/domain).
