---
title: Eigenschafts-Panels
description: Eigenschafts-Panels mit Steuerelemente-Composables und headless Listen-Primitiven erstellen.
---

# Eigenschafts-Panels

Eigenschafts-Panels in `@openweave/react` sind bewusst composable-first gestaltet.

Wenn ein Panel hauptsächlich auswahlabgeleitete Werte und Aktualisierungsaktionen benötigt, bevorzugen Sie Composables.
Wenn ein Panel wiederverwendbare Array/Listen-Struktur benötigt, verwenden Sie ein headless Primitiv wie `PropertyListRoot`.

## Häufige Steuerelemente-Composables

Für Standard-Eigenschaftsbereiche beginnen Sie mit:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Für listenbasierte Panels verwenden Sie:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Beispiel: Positions-Panel

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

## Beispiel: Füllungen-Panel

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
          <button onClick={() => actions.add(fillControls.defaultFill)}>Füllung hinzufügen</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Faustregel

- Composables für direkte Kontrolllogik verwenden
- strukturelle Primitive verwenden, wenn wiederholte Listen/Baum/Slot-Koordination der schwierige Teil ist

## Verwandte APIs

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
