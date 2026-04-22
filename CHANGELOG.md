# Changelog

All notable changes to this project will be documented in this file.

## [v2 / Phase 1] — 2026-04-22

### Added

- Pure domain layer: `Diagram` indexed container, `ERNode` / `ERLink` discriminated unions, branded `NodeId` / `EdgeId`, geometry and graph utilities ([src/domain/](src/domain/)).
- 9 structural invariants ([src/domain/invariants.ts](src/domain/invariants.ts)) as pure predicates returning `InvariantViolation[]`.
- Chen validation catalog: 33 rules across entity (10), relationship (7), attribute (12), generalization (3), structural (1) categories, each a pure `(Diagram) => ValidationError[]` ([src/notation/chen/rules/](src/notation/chen/rules/)).
- English + Italian (English-fallback) i18n message bundles for all 33 rule keys ([src/platform/i18n/locales/](src/platform/i18n/locales/)).
- Diagram fixture factories ([tests/fixtures/diagrams/](tests/fixtures/diagrams/)) + `@fixtures` vitest alias.
- Coverage thresholds enforced via `vitest.config.ts`: ≥95% in `src/domain/**`, ≥90% in `src/notation/chen/rules/**`. Current state: domain 97%, rules 100%.

### Notes

- No React, Zustand, XState, or React Flow imports in any Phase 1 file.
- `src/canvas/ERCanvas.tsx` and `src/app/` intentionally untouched — Phase 2 (state) and Phase 4 (rendering) own those changes.
- 178 unit tests passing; build, typecheck, and lint clean.
