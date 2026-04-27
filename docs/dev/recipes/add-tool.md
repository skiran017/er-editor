# Recipe: add a new tool

We'll add a hypothetical **comment** tool that places a sticky-note comment node on the canvas. The recipe touches every layer that knows about tools: the FSM, the keybinding registry, the toolbar, and the i18n strings.

## 1. Add the tool to the `Tool` union

```diff
// src/interaction/events.ts
 export type Tool =
   | 'select'
   | 'pan'
   | 'entity'
   | 'relationship'
   | 'attribute'
   | 'isa'
   | 'connect'
   | 'quickRelationship11'
   | 'quickRelationship1N'
   | 'quickRelationshipNN'
   | 'quickGeneralization'
   | 'quickGeneralizationTotal'
+  | 'comment'
```

`PICK_TOOL` is now valid for the new tool — every FSM transition that handles `PICK_TOOL` accepts it via the union.

## 2. Add the placement state to the machine

```diff
// src/interaction/machine.ts
 placing: {
   states: {
     entity: {/* ... */},
     relationship: {/* ... */},
     attribute: {/* ... */},
     isa: {/* ... */},
+    comment: {
+      on: {
+        CANVAS_POINTER_UP: { actions: 'placeComment', target: '#editor.selecting.idle' }
+      }
+    }
   }
 }
```

And add the `placeComment` action in `src/interaction/actions.ts`:

```diff
+export const placeComment = (_ctx, event: { type: 'CANVAS_POINTER_UP', point: Point }) => {
+  useDiagramStore.getState().addNode({
+    kind: 'comment', text: '', position: event.point, size: { width: 160, height: 80 },
+  })
+}
```

(Adding the `comment` node kind itself is a different recipe — see [Add an edge / node](./add-edge).)

## 3. Register a keybinding

```diff
// src/interaction/keybindings.ts
 export const keybindings: readonly Keybinding[] = Object.freeze([
   tool('comment-tool', ['C'], { type: 'PICK_TOOL', tool: 'comment' }),
   /* existing entries */
 ])
```

The `tool()` helper sets `category: 'tool'`, `when: 'notInTextField'`. The keybindings table on `/user/shortcuts` regenerates on the next `pnpm docs:keybindings`.

## 4. Add the toolbar button

```diff
// src/notation/chen/toolbar.ts
 export const chenToolbar: ToolbarConfig = {
   groups: [
     { id: 'select', labelKey: 'toolbar.group.select', tools: ['select', 'pan'] },
     {
       id: 'elements',
       labelKey: 'toolbar.group.elements',
-      tools: ['entity', 'relationship', 'attribute'],
+      tools: ['entity', 'relationship', 'attribute', 'comment'],
     },
     /* connections group unchanged */
   ],
 }
```

```diff
// src/ui/toolbar/icons.tsx
+import { MessageSquare } from 'lucide-react'

 export const ICONS: Record<string, ReactNode> = {
   /* existing */
+  comment: <MessageSquare size={18} aria-hidden />,
 }
```

## 5. Add i18n strings

```diff
// src/platform/i18n/locales/en/toolbar.json
 "tool": {
   /* existing */
+  "comment": "Comment"
 }
```

```diff
// src/platform/i18n/locales/it/toolbar.json
 "tool": {
   /* existing */
+  "comment": "Commento"
 }
```

## 6. Add a test

```typescript
// src/interaction/machine.test.ts
it('PICK_TOOL=comment then CANVAS_POINTER_UP places a comment', () => {
  const actor = createActor(editorMachine).start()
  actor.send({ type: 'PICK_TOOL', tool: 'comment' })
  actor.send({ type: 'CANVAS_POINTER_DOWN', point: { x: 100, y: 100 }, modifiers: NO_MODIFIERS, button: 'left' })
  actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })
  expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
  expect(actor.getSnapshot().value).toEqual({ selecting: 'idle' })
})
```

## 7. Verify

```bash
pnpm typecheck && pnpm lint && pnpm test --run
pnpm dev   # try the new tool in the browser
```

The new tool appears in the toolbar, has the keybinding **C**, and places a comment node on click.

## Where to next

- [Add an edge or node kind](./add-edge) — for the underlying `comment` node-kind work this recipe assumed.
- [Concepts: Interaction FSM](../concepts/interaction-fsm).
