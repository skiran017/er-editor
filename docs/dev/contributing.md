# Contributing

## Branching

- Branch from `main`. Use a descriptive prefix: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.
- Commit messages follow conventional-style: `type(scope): subject` (e.g. `feat(canvas): add pinch-to-zoom`).
- Don't squash commits before review — keep the work-in-progress history; reviewers can squash on merge.

## Test-driven development

The codebase is written test-first. For any non-trivial change:

1. Write the failing test that captures the behavior you want.
2. Run it. Confirm it fails for the expected reason (not a typo, not a missing import).
3. Write the minimal code to make it pass.
4. Run the full test suite (`pnpm test --run`).
5. Commit.

Trivial changes — typos, single-line fixes, formatting — don't need a new test. When in doubt, write the test.

## Layer rules

The codebase enforces strict import directionality:

```
domain → state → interaction → canvas → ui
```

Each layer can only import from layers to its left. The rule is enforced by `eslint.config.js`:

<<< ../../eslint.config.js#layer-rule

If you're tempted to break the rule, the abstraction is wrong — surface the question on the PR instead of working around the lint.

## Before pushing

```bash
pnpm typecheck && pnpm lint && pnpm test --run
```

All three must pass. CI runs the same gate; failing pushes get bounced.

## Pull request expectations

- **Title:** matches the conventional-commit format of the merge commit.
- **Description:** a one-paragraph "what changed and why," plus a manual-test checklist if the change is UI-visible.
- **Tests:** included in the PR. New behavior gets new tests; bug fixes get regression tests.
- **No drive-by refactors.** Keep the change scoped. Side cleanups go in a follow-up PR.
- **Screenshots / GIFs** for any visible UI changes.

## Reviewer expectations

Reviewers will check:
- Test coverage of the new behavior.
- Layer rules respected.
- Type strictness preserved (no new `any`, no `// @ts-ignore` without an explanation comment).
- No regressions in `pnpm test --run`.
- Markdown / docs touched if the change affects the public surface.

Bigger changes (a new subsystem, a non-trivial refactor) start with a design discussion in `docs/superpowers/specs/` — see existing specs for the format.
