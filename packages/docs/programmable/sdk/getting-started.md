---
title: SDK Getting Started
description: Set up @openweave/react with createEditor, provideEditor, and a canvas.
---

# SDK Getting Started

## Installation

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

The SDK lives in the monorepo today and is also published as `@openweave/react`.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Mental model

There are three layers:

1. `@openweave/core` — framework-agnostic editor engine
2. `@openweave/react` — Vue composables and headless primitives
3. your app — styling, routing, file flows, product-specific UI

## Minimal setup

### 1. Create an editor

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Provide it to Vue

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

You can think of this as the provider layer for the editor tree. The docs prefer `provideEditor()` directly because that is the current real API surface.

### 3. Attach a canvas

```tsx
import { useRef } from 'react'
import { useCanvas, useEditor } from '@openweave/react'

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const editor = useEditor()

  useCanvas(canvasRef, editor)

  return <canvas ref={canvasRef} className="size-full" />
}
```

## Using composables

Once the editor is provided, child components can read selection and issue commands:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Basic example

```tsx
import { useRef } from 'react'
import { useCanvas, useEditor, useSelectionState } from '@openweave/react'

export function EditorWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const editor = useEditor()
  const { selectedCount } = useSelectionState()

  useCanvas(canvasRef, editor, {
    onReady: () => {
      console.log('Canvas ready')
    }
  })

  return (
    <div className="grid h-full grid-rows-[1fr_auto]">
      <canvas ref={canvasRef} className="size-full" />
      <div className="border-t px-3 py-2 text-xs text-muted">Selected: {selectedCount}</div>
    </div>
  )
}
```

## Next steps

- [Architecture](./architecture)
- [API Reference](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
