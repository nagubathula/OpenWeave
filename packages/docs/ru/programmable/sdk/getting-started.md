---
title: Начало работы с SDK
description: Настройка @openweave/react с createEditor, provideEditor и холстом.
---

# Начало работы с SDK

## Установка

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

SDK находится в монорепозитории и также опубликован как `@openweave/react`.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Концептуальная модель

Три уровня:

1. `@openweave/core` — не зависящий от фреймворка движок редактора
2. `@openweave/react` — React-хуки и headless-примитивы
3. ваше приложение — стили, маршрутизация, файловые потоки, UI под конкретный продукт

## Минимальная настройка

### 1. Создайте редактор

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Передайте его в Vue

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Это слой-провайдер для дерева редактора. В документации предпочтителен вызов `provideEditor()` напрямую — это актуальная поверхность API.

### 3. Подключите холст

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

## Использование компосаблов

После того как редактор передан через провайдер, дочерние компоненты могут читать выделение и вызывать команды:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Базовый пример

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

## Следующие шаги

- [Архитектура](./architecture)
- [Справочник API](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
