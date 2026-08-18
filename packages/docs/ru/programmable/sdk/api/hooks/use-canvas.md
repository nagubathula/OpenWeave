---
title: useCanvas
description: Подключение рендеринга на базе CanvasKit к элементу canvas для редактора OpenWeave.
---

# useCanvas

`useCanvas()` подключает редактор к реальному элементу `<canvas>`.

Обрабатывает:

- инициализацию CanvasKit
- создание поверхности
- планирование рендеринга
- обработку изменения размера
- опциональное отображение линеек
- коллбэк готовности рендерера

## Использование

```ts
import { useRef, useState } from 'react'

import { useCanvas, useEditor } from '@openweave/react'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Базовый пример

```tsx
import { useRef } from 'react'
import { useCanvas, useEditor } from '@openweave/react'

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const editor = useEditor()

  useCanvas(canvasRef, editor, {
    showRulers: true,
    onReady: () => {
      console.log('Renderer ready')
    }
  })

  return <canvas ref={canvasRef} className="size-full" />
}
```

## Практические примеры

### Отключить линейки для встроенного превью

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Сохранять буфер рисования для скриншотов

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Примечания

- `useCanvas()` работает с рендерером и на практике используется только в браузере
- отвечает за конвейер живого холста, а не за файловые потоки на уровне приложения
- обычно следует использовать вместе с `useCanvasInput()` для обработки взаимодействий

## Связанные API

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)

## Тип

```ts
interface UseCanvasOptions {
  showRulers?: boolean
  preserveDrawingBuffer?: boolean
  onReady?: () => void
}

function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions,
): void
```
