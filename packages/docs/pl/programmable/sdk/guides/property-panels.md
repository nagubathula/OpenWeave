---
title: Panele właściwości
description: Buduj panele właściwości z kompozytami kontrolek i bezstanowymi prymitywami list.
---

# Panele właściwości

Panele właściwości w `@openweave/react` są celowo oparte na kompozytach.

Jeśli panel potrzebuje głównie wartości pochodnych od selekcji i akcji aktualizacji, preferuj kompozyty.
Jeśli panel potrzebuje wielokrotnie używalnej struktury tablicowej/listowej, użyj bezstanowego prymitywu jak `PropertyListRoot`.

## Typowe kompozyty kontrolek

Dla standardowych sekcji właściwości zacznij od:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Dla paneli listowych użyj:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Przykład: panel pozycji

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

## Przykład: panel wypełnień

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
          <button onClick={() => actions.add(fillControls.defaultFill)}>Dodaj wypełnienie</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Zasada

- używaj kompozytów dla bezpośredniej logiki kontrolek
- używaj prymitywów strukturalnych, gdy powtarzalna koordynacja listy/drzewa/slotu jest trudną częścią

## Powiązane API

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
