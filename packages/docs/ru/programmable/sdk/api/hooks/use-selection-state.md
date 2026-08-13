---
title: useSelectionState
description: "Реактивное состояние редактора, производное от выделения: текущий узел, количество и тип выделения."
---

# useSelectionState

`useSelectionState()` предоставляет реактивное состояние, производное от выделения в текущем редакторе.

Используйте его, когда нужно рендерить UI на основе:

- наличия выделения
- количества выделенных узлов
- основного выделенного узла
- является ли текущее выделение экземпляром, компонентом или группой

## Использование

```ts
import { useSelectionState } from '@openweave/react'

const selection = useSelectionState()
```

## Базовый пример

```tsx
import { useSelectionState } from '@openweave/react'

export function SelectionSummary() {
  const { hasSelection, selectedCount, isInstance } = useSelectionState()

  if (!hasSelection) return <div className="text-xs text-muted">Нет выделения</div>

  return (
    <div className="text-xs text-muted">
      {selectedCount} выделено
      {isInstance && <span> · экземпляр</span>}
    </div>
  )
}
```

## Возвращаемые значения

Полезные значения:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Практические примеры

### Показывать действия только для экземпляров

```ts
const { isInstance } = useSelectionState()
```

### Активировать UI создания набора компонентов

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Связанные API

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
