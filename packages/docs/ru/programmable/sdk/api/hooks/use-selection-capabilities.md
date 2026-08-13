---
title: useSelectionCapabilities
description: Реактивные булевы значения для UI и действий, зависящих от выделения.
---

# useSelectionCapabilities

`useSelectionCapabilities()` предоставляет реактивные булевы значения, указывающие, разрешены ли сейчас распространённые действия редактора.

Используйте при создании:

- меню
- тулбаров
- горячих клавиш
- кнопок действий
- контекстных панелей

## Использование

```ts
import { useSelectionCapabilities } from '@openweave/react'

const caps = useSelectionCapabilities()
```

## Базовый пример

```tsx
import { useSelectionCapabilities } from '@openweave/react'

export function SelectionActions() {
  const { canDelete, canDuplicate, canCreateComponent } = useSelectionCapabilities()

  return (
    <div className="flex gap-2">
      <button disabled={!canDuplicate}>Дублировать</button>
      <button disabled={!canDelete}>Удалить</button>
      <button disabled={!canCreateComponent}>Создать компонент</button>
    </div>
  )
}
```

## Практические примеры

### Управление доступностью пунктов меню

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Включать команды зума только когда это имеет смысл

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Связанные API

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
