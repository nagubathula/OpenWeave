---
title: useCanvas
description: Podłącz renderowanie oparte na CanvasKit do elementu canvas dla edytora OpenWeave.
---

# useCanvas

`useCanvas()` łączy edytor z rzeczywistym elementem `<canvas>`.

Obsługuje:

- inicjalizację CanvasKit
- tworzenie powierzchni
- planowanie renderowania
- obsługę zmiany rozmiaru
- opcjonalną widoczność linijek
- wywołanie zwrotne gotowości renderera

## Użycie

```ts
import { ref } from 'vue'

import { useCanvas, useEditor } from '@openweave/react'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Podstawowy przykład

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

## Przykłady praktyczne

### Wyłącz linijki dla osadzonego podglądu

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Zachowaj bufor rysowania dla zrzutów ekranu

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Uwagi

- `useCanvas()` jest zorientowany na renderer i w praktyce działa tylko w przeglądarce
- odpowiada za aktywny potok kanvasu, a nie przepływy plików na poziomie aplikacji
- powinien być zazwyczaj parowany z `useCanvasInput()` do obsługi interakcji

## Powiązane API

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)

## Typ

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
