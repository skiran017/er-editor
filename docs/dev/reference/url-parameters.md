# URL parameters reference

The editor reads several URL flags at boot. Implementer view — see [user docs: Embedding in Moodle](../../user/moodle) for the host-side perspective.

## Where they're parsed

`src/app/queryParams.ts`:

```typescript
export interface QueryParams {
  readonly lang: 'en' | 'it' | null
  readonly validation: 'on' | 'off' | null
  readonly readonly: boolean
  readonly embed: boolean
  readonly examMode: boolean
}
```

`parseQueryParams(window.location.search)` returns these once at boot.

## Where each flag goes

| Flag | Set into | Subscriber |
|---|---|---|
| `?lang` | `useUiStore.setLanguage` (via `src/app/applyLanguage.ts`) | `bootstrap.ts` syncs to i18next |
| `?validation` | `useValidationStore.setEnabled` (via `src/app/applyValidation.ts`) | `bootstrap.ts` recomputes errors when toggled |
| `?readonly` | `useUiStore.setReadonly` (via `src/app/applyMode.ts`) | UI components read `useUiStore.readonly` and gate mutations |
| `?embed` | `useUiStore.setEmbed` (via `src/app/applyMode.ts`) | Menu + Toolbar return `null` when `embed === true`; `installMoodleBridge` activates |
| `?examMode` | `useUiStore.setExamMode` (via `src/app/examMode.ts`) | Forces `validation` off; Menu disables Save/Export/Validation toggle |
| `?parentOrigin` | Read by `installMoodleBridge` only — not stored | Used to compute `targetOrigin` for postMessage |

## Defaults

- `?examMode=true` is the default when `?embed=true`. Override with `?examMode=false`.
- All other flags default to off / null.

## Bootstrapping order

`src/main.tsx` calls in this order:
1. `installSubscribers()` — wires reactive subscribers from `bootstrap.ts`.
2. `installThemeSubscriber()`.
3. `applyExamModeFromUrl()`.
4. `applyLanguageFromUrl(window.location.search)`.
5. `applyValidationFromUrl(window.location.search)`.
6. `applyModeFromUrl(window.location.search)`.
7. `installMoodleBridge()`.

Order matters — `applyMode` sets `embed`, which `installMoodleBridge` then reads.

## Where to next

- [Moodle integration reference](./moodle-integration) — implementer view of the postMessage layer.
- [Concepts: State](../concepts/state) — what each store owns.
