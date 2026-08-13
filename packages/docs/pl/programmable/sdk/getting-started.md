---
title: Pierwsze kroki z SDK
description: Skonfiguruj @openweave/react z createEditor, provideEditor i kanwasem.
---

# Pierwsze kroki z SDK

## Instalacja

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

SDK mieszka dziś w monorepo i jest również publikowany jako `@openweave/react`.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Model mentalny

Są trzy warstwy:

1. `@openweave/core` — silnik edytora niezależny od frameworka
2. `@openweave/react` — kompozyty Vue i bezstanowe prymitywy
3. twoja aplikacja — stylowanie, routing, przepływy plików, UI specyficzne dla produktu

## Minimalna konfiguracja

### 1. Utwórz edytor

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Dostarcz go do Vue

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Możesz traktować to jako warstwę dostawcy dla drzewa edytora. Dokumentacja preferuje bezpośrednie użycie `provideEditor()`, ponieważ to jest rzeczywista powierzchnia API.

### 3. Podłącz kanvas

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

## Używanie kompozytów

Gdy edytor jest dostarczony, komponenty potomne mogą odczytywać selekcję i wydawać polecenia:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Podstawowy przykład

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
      <div className="border-t px-3 py-2 text-xs text-muted">Zaznaczono: {selectedCount}</div>
    </div>
  )
}
```

## Następne kroki

- [Architektura](./architecture)
- [Dokumentacja API](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
