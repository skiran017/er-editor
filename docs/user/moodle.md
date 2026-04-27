# Embedding in Moodle

Embed ER Editor as an iframe inside a Moodle activity. Students see the editor; their work is loaded from and saved back into Moodle. This guide is for instructors / admins setting up the activity.

## Iframe snippet

The simplest possible embed:

```html
<iframe
  src="https://your-er-editor.example/?embed=true&parentOrigin=https://moodle.example.org"
  width="100%"
  height="800"
  style="border: 1px solid #ccc"
  allow="clipboard-read; clipboard-write"
></iframe>
```

Recommended sizing: at least **800×600** for desktop, **600×800** (portrait) on tablets. The editor adapts internally; below ~375px width it switches to a single-button collapsed toolbar.

## URL flags

| Flag | Values | What it does |
|---|---|---|
| `embed` | `true` | Hides the menu and toolbar chrome; the editor becomes the canvas only. Required for postMessage integration. |
| `examMode` | `true` / `false` | Disables Save/Export and forces validation off. **Defaults to `true` when `embed=true`** — so just adding `embed=true` is enough for an exam-style embed. |
| `readonly` | `true` | Disables all mutation. Students can view but not edit. |
| `lang` | `en` / `it` | Initial interface language. |
| `validation` | `on` / `off` | Initial state of the validation toggle. |
| `parentOrigin` | a URL origin | Locks the postMessage origin to this exact value. **Strongly recommended for production embeds.** |

## Recommended flag combinations

| Scenario | URL |
|---|---|
| **Quiz / homework** (student edits, autosaves to Moodle) | `?embed=true&parentOrigin=https://moodle.example.org` |
| **Exam** (student edits, validation hidden) | `?embed=true&parentOrigin=...` (`examMode=true` is implied) |
| **Worked example** (read-only, viewing only) | `?embed=true&readonly=true&parentOrigin=...` |
| **Italian-only** | append `&lang=it` to any of the above |

## postMessage host integration

Moodle (the parent page) and the editor (the iframed child) communicate via `window.postMessage`. The host loads a starting diagram into the editor and receives autosave snapshots back. Below is a complete host-side example.

```html
<iframe id="er-editor"
        src="https://your-er-editor.example/?embed=true&parentOrigin=https://moodle.example.org">
</iframe>
<script>
  const iframe = document.getElementById('er-editor');
  const editorOrigin = 'https://your-er-editor.example';
  let latestXml = '';

  // Receive messages from the editor.
  window.addEventListener('message', (event) => {
    if (event.origin !== editorOrigin) return;
    const data = event.data;
    if (!data || data.source !== 'er-editor') return;

    switch (data.type) {
      case 'ready':
        // Editor is up — push the student's saved XML (or empty for a fresh attempt).
        iframe.contentWindow.postMessage(
          { source: 'moodle-er-host', type: 'init', xml: studentSavedXml || '' },
          editorOrigin
        );
        break;
      case 'autosave':
      case 'save':
        latestXml = data.xml;
        // Persist to Moodle gradebook / submission storage.
        await fetch('/save', { method: 'POST', body: data.xml });
        break;
      case 'error':
        console.error('ER Editor reported:', data.message);
        break;
    }
  });
</script>
```

### Message reference

**From the editor (`source: "er-editor"`):**

| Type | When | Payload |
|---|---|---|
| `ready` | Once, on mount | — |
| `autosave` | 800 ms after the latest diagram change (debounced) | `xml: string` |
| `save` | On `pagehide` / `beforeunload` (final flush) | `xml: string` |
| `error` | Serialization or parsing fails | `message: string` |

**To the editor (`source: "moodle-er-host"`):**

| Type | When | Payload |
|---|---|---|
| `init` | Initial load (response to `ready`) | `xml: string` (empty/whitespace = blank diagram) |
| `load` | Subsequent load (alias for `init`) | same |

The editor silently ignores messages with unknown `source`, `type`, or shape — invalid hosts simply have no effect.

## Common gotchas

- **Missing `parentOrigin`** → the editor falls back to `*` (any origin) and logs a `console.warn`. Works but is insecure for production. Always set `parentOrigin` to your Moodle origin.
- **Cross-origin iframes blocked by CSP / X-Frame-Options** → the editor must serve `Content-Security-Policy: frame-ancestors https://moodle.example.org` (or `*` during testing). Vercel / Cloudflare Pages allow setting headers per route.
- **Autosave not firing** → autosave only runs in embed mode (`?embed=true`). Visit the editor outside an iframe and autosaves don't happen.
- **Wrong origin received in handler** → `event.origin` reports the editor's origin, not Moodle's. Compare against your editor's origin.
- **Browser strips referrer** → the bridge falls back to `*` if `document.referrer` is empty (e.g. when launched from an HTTPS Moodle with `referrer-policy: no-referrer`). Always pass `parentOrigin` explicitly to defend against this.

## What students see

With `?embed=true`, the menu (☰) and surrounding chrome are hidden. Students see only the canvas + toolbar. They can build the diagram exactly like the standalone editor, but Save/Open/Export are not available — the host is responsible for persistence.
