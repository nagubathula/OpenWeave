---
title: Property Panels
description: Build property panels with control composables and headless list primitives.
---

# Property Panels

Property panels in `@openweave/react` are intentionally composable-first.

If a panel mostly needs selection-derived values and update actions, prefer composables.
If a panel needs reusable array/list structure, use a headless primitive like `PropertyListRoot`.

## Common control composables

For standard property sections, start with:

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

For list-style panels, use:

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Binding-aware fields

Compose `BindableValueRoot` around fields that can reference variables or external design tokens.
The primitive is presentation-agnostic, but binding-aware interfaces should keep focus
non-destructive:

- Show variable identity while the field is idle; expose the resolved value in supporting UI such
  as a tooltip.
- Focusing or opening the picker must not detach a binding.
- Apply `detach-on-edit`, `readonly-when-bound`, or `edit-variable` only when the user actually
  changes the value.
- Put explicit detach actions in the picker rather than on a destructive one-click field icon.
- Keep binding replacement, detach-on-edit, and multi-target changes in one provider batch.

OpenWeave's app skin uses a violet variable-name pill at rest and reveals the resolved numeric
value when NumberField enters editing mode. Custom editor shells can present the same headless
state differently.

## Example: position panel

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

## Example: fills panel

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
          <button onClick={() => actions.add(fillControls.defaultFill)}>Add fill</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Rule of thumb

- use composables for direct control logic
- use structural primitives when repeated list/tree/slot coordination is the hard part

## Related APIs

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
