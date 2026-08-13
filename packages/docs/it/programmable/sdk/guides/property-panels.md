---
title: Pannelli Proprietà
description: Crea pannelli proprietà con composable di controllo e primitive di lista headless.
---

# Pannelli Proprietà

I pannelli proprietà in `@openweave/react` sono intenzionalmente progettati per essere composable-first.

Se un pannello ha principalmente bisogno di valori derivati dalla selezione e azioni di aggiornamento, preferisci i composable.
Se un pannello ha bisogno di struttura array/lista riutilizzabile, usa una primitiva headless come `PropertyListRoot`.

## Composable di controllo comuni

Per le sezioni proprietà standard, inizia con:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Per pannelli in stile lista, usa:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Esempio: pannello posizione

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

## Esempio: pannello riempimenti

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
          <button onClick={() => actions.add(fillControls.defaultFill)}>Aggiungi riempimento</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Regola pratica

- usa i composable per logica di controllo diretta
- usa le primitive strutturali quando la parte difficile è la coordinazione ripetuta di lista/albero/slot

## API correlate

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
