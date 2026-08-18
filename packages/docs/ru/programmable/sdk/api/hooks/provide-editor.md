---
title: provideEditor
description: Передача экземпляра редактора OpenWeave в React-поддерево через context.
---

# provideEditor

`provideEditor(editor)` делает редактор OpenWeave доступным для дочерних компосаблов и headless-примитивов через React-контекст.

Это основа для `useEditor()`.

## Использование

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Базовый пример

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Примечания

Текущий SDK использует `provideEditor()` и `useEditor()` напрямую. Некоторые старые примеры и сообщения об ошибках ещё ссылаются на компонент `OpenWeaveProvider`, но модель инъекции — это реальная поверхность API, которую следует предпочитать в документации и коде приложения.

## Связанные API

- [useEditor](./use-editor)
