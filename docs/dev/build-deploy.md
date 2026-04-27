# Build & deploy

## Editor build

```bash
pnpm build
```

Produces a static SPA. The `build` script chains four steps:

1. `tsc -b` — full project typecheck.
2. `vite build` — bundles the editor into `dist/`.
3. `pnpm docs:build` — runs `docs:keybindings` + `docs:api` + `vitepress build docs` (see [Docs build](#docs-build)).
4. `cp -R docs/.vitepress/dist dist/docs` — folds the docs site under `dist/docs/`, so a single `dist/` ships both surfaces.

The bundle is fully client-side; no server is required. The editor's persistence is `localStorage` (UI prefs) and explicit XML download/upload.

## Docs build

```bash
pnpm docs:build
```

Runs three stages:

1. `pnpm docs:keybindings` — generates `docs/user/_keybindings-table.md` from `src/interaction/keybindings.ts`.
2. `pnpm docs:api` — runs TypeDoc against the public barrels (`src/{domain,state,notation}/index.ts`) and emits Markdown into `docs/api/`.
3. `vitepress build docs` — bundles the static site into `docs/.vitepress/dist/`.

Both `docs/api/` and `docs/user/_keybindings-table.md` are gitignored — regenerate on every build.

## Local docs preview

```bash
pnpm docs:dev      # live-reload dev server (separate VitePress process)
# or
pnpm docs:preview  # serves the production build (after pnpm docs:build)
```

VitePress is mounted under `base: '/docs/'` so internal links use `/docs/...` paths matching the production layout.

## Deployment — Vercel

The repo deploys to Vercel from the `v2` branch. Vercel auto-detects the Vite build and runs `pnpm install && pnpm build`, serving the resulting `dist/` directory.

After the `build` script extension above:

| URL | Served from |
|---|---|
| `https://er-editor.vercel.app/` | `dist/index.html` (editor SPA) |
| `https://er-editor.vercel.app/docs/` | `dist/docs/index.html` (docs landing) |
| `https://er-editor.vercel.app/docs/user/quick-start` | `dist/docs/user/quick-start/index.html` |
| `https://er-editor.vercel.app/some-spa-route` | falls back to `dist/index.html` (editor router) |

The fallback is configured in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/((?!docs/|docs$|assets/|.*\\.[\\w]+$).*)", "destination": "/index.html" }
  ]
}
```

The negative-lookahead pattern excludes:
- `docs/` and `docs` (the docs site)
- `assets/` (Vite-bundled JS/CSS/fonts at root)
- Any path with a file extension (so favicons, images, JSON files served from the filesystem)

Anything not matching those is rewritten to `/index.html` so the SPA router can handle it.

## Branch-deploy URLs

Each PR to `v2` gets a Vercel preview URL of the form `https://er-editor-git-<branch>-<account>.vercel.app/`. The same `/docs/` route works on previews.

## CI

`pnpm typecheck`, `pnpm lint`, and `pnpm test --run` run on every push (configured at the repository level — see CI workflows for details). Vercel builds run independently after the same pipeline succeeds locally.

## Where to next

- [Testing](./testing).
- [Contributing](./contributing).
