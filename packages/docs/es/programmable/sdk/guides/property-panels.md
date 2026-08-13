---
title: Paneles de Propiedades
description: Construye paneles de propiedades con composables de control y primitivos de lista headless.
---

# Paneles de Propiedades

Los paneles de propiedades en `@openweave/react` están diseñados de forma intencionalmente composable primero.

Si un panel principalmente necesita valores derivados de la selección y acciones de actualización, prefiere composables.
Si un panel necesita estructura reutilizable de array/lista, usa un primitivo headless como `PropertyListRoot`.

## Composables de control habituales

Para secciones de propiedades estándar, empieza con:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Para paneles de tipo lista, usa:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Ejemplo: panel de posición

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

## Ejemplo: panel de rellenos

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
          <button onClick={() => actions.add(fillControls.defaultFill)}>Añadir relleno</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Regla práctica

- usa composables para la lógica de control directa
- usa primitivos estructurales cuando la coordinación repetida de lista/árbol/slot es la parte compleja

## APIs relacionadas

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
