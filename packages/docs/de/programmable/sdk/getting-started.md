---
title: SDK – Erste Schritte
description: "@openweave/react mit createEditor, provideEditor und einem Canvas einrichten."
---

# SDK – Erste Schritte

## Installation

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

Das SDK befindet sich heute im Monorepo und wird auch als `@openweave/react` veröffentlicht.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Mentales Modell

Es gibt drei Schichten:

1. `@openweave/core` — framework-agnostische Editor-Engine
2. `@openweave/react` — Vue Composables und headless Primitive
3. Ihre App — Styling, Routing, Datei-Flows, produktspezifische UI

## Minimales Setup

### 1. Einen Editor erstellen

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Vue bereitstellen

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Diese Schicht fungiert als Provider für den Editor-Baum. Die Dokumentation bevorzugt `provideEditor()` direkt, da dies die aktuelle echte API-Oberfläche ist.

### 3. Einen Canvas anbinden

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

## Composables verwenden

Sobald der Editor bereitgestellt ist, können Kind-Komponenten die Auswahl lesen und Befehle ausgeben:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Einfaches Beispiel

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
      <div className="border-t px-3 py-2 text-xs text-muted">Ausgewählt: {selectedCount}</div>
    </div>
  )
}
```

## Nächste Schritte

- [Architektur](./architecture)
- [API-Referenz](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
