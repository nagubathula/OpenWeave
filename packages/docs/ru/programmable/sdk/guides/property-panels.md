---
title: Панели свойств
description: Создавайте панели свойств с компосаблами управления и headless-примитивами списков.
---

# Панели свойств

Панели свойств в `@openweave/react` намеренно ориентированы на компосаблы.

Если панель в основном нуждается в значениях, производных от выделения, и действиях по обновлению — предпочитайте компосаблы.
Если панели нужна переиспользуемая структура массива/списка — используйте headless-примитив вроде `PropertyListRoot`.

## Основные компосаблы управления

Для стандартных секций свойств начните с:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Для панелей в виде списков используйте:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Пример: панель позиции

```tsx
import { usePosition } from '@openweave/react'

export function PositionFields() {
  const { x, y, width, height, updateProp } = usePosition()

  return (
    <div className="grid grid-cols-2 gap-2">
      <input value={x} onChange={(event) => updateProp('x', Number(event.target.value))} />
      <input value={y} onChange={(event) => updateProp('y', Number(event.target.value))} />
      <input value={width} onChange={(event) => updateProp('width', Number(event.target.value))} />
      <input value={height} onChange={(event) => updateProp('height', Number(event.target.value))} />
    </div>
  )
}
```

## Пример: панель заливок

```tsx
import { PropertyListRoot, useEditorPropertyList, useFillControls } from '@openweave/react'

export function FillList() {
  const fillControls = useFillControls()
  const fills = useEditorPropertyList('fills')

  return (
    <PropertyListRoot
      propKey="fills"
      items={fills.items}
      mixed={fills.isMixed}
      onAdd={fills.actions.add}
      onRemove={fills.actions.remove}
    >
      {({ items, actions }) => (
        <>
          {items.map((fill, index) => (
            <div key={index}>
              {fill.type}
              <button onClick={() => actions.remove(index)}>Remove</button>
            </div>
          ))}
          <button onClick={() => actions.add(fillControls.defaultFill)}>Добавить заливку</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Правило

- используйте компосаблы для прямой логики управления
- используйте структурные примитивы, когда координация повторяющихся списков/деревьев/слотов — это самая сложная часть

## Связанные API

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
