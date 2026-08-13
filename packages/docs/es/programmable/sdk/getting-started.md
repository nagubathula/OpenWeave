---
title: Primeros pasos con el SDK
description: Configura @openweave/react con createEditor, provideEditor y un canvas.
---

# Primeros pasos con el SDK

## Instalación

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

El SDK vive en el monorepo hoy en día y también se publica como `@openweave/react`.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Modelo mental

Hay tres capas:

1. `@openweave/core` — motor del editor independiente del framework
2. `@openweave/react` — composables de Vue y primitivos headless
3. tu app — estilos, enrutamiento, flujos de archivos, UI específica del producto

## Configuración mínima

### 1. Crear un editor

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Proporcionarlo a Vue

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Puedes pensar en esto como la capa proveedora del árbol del editor. La documentación prefiere usar `provideEditor()` directamente porque esa es la superficie de API real actual.

### 3. Adjuntar un canvas

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

## Usar composables

Una vez que el editor está disponible, los componentes hijo pueden leer la selección y emitir comandos:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Ejemplo básico

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
      <div className="border-t px-3 py-2 text-xs text-muted">Seleccionados: {selectedCount}</div>
    </div>
  )
}
```

## Siguientes pasos

- [Arquitectura](./architecture)
- [Referencia de API](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
