---
title: Per Iniziare con l'SDK
description: Configura @openweave/react con createEditor, provideEditor e un canvas.
---

# Per Iniziare con l'SDK

## Installazione

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

L'SDK risiede oggi nel monorepo ed è pubblicato anche come `@openweave/react`.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Modello concettuale

Ci sono tre livelli:

1. `@openweave/core` — motore editor indipendente dal framework
2. `@openweave/react` — composable Vue e primitive headless
3. la tua app — stile, routing, flussi di file, UI specifica del prodotto

## Configurazione minimale

### 1. Crea un editor

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Forniscilo a Vue

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Puoi considerarlo il livello provider per l'albero dell'editor. La documentazione preferisce `provideEditor()` direttamente perché è la vera superficie API attuale.

### 3. Collega un canvas

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

## Utilizzo dei composable

Una volta fornito l'editor, i componenti figli possono leggere la selezione e invocare comandi:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Esempio base

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

## Prossimi passi

- [Architettura](./architecture)
- [Riferimento API](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
