---
title: Panneaux de propriétés
description: Créez des panneaux de propriétés avec des composables de contrôle et des primitives de liste headless.
---

# Panneaux de propriétés

Les panneaux de propriétés dans `@openweave/react` sont intentionnellement axés sur les composables.

Si un panneau n'a besoin que de valeurs dérivées de la sélection et d'actions de mise à jour, préférez les composables.
Si un panneau nécessite une structure de tableau/liste réutilisable, utilisez une primitive headless comme `PropertyListRoot`.

## Composables de contrôle courants

Pour les sections de propriétés standard, commencez par :

- `usePosition()`
- `useLayout()`
- `useAppearance()`
- `useTypography()`
- `useExport()`

Pour les panneaux en forme de liste, utilisez :

- `useFillControls()`
- `useStrokeControls()`
- `useEffectsControls()`

## Exemple : panneau de position

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

## Exemple : panneau de remplissages

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
          <button onClick={() => actions.add(fillControls.defaultFill)}>Ajouter un remplissage</button>
        </>
      )}
    </PropertyListRoot>
  )
}
```

## Règle pratique

- utiliser les composables pour la logique de contrôle directe
- utiliser les primitives structurelles quand la coordination de liste/arbre/slot répétée est la partie complexe

## API associées

- [usePosition](../api/hooks/use-position)
- [useLayout](../api/hooks/use-layout)
- [useAppearance](../api/hooks/use-appearance)
- [useTypography](../api/hooks/use-typography)
- [useFillControls](../api/hooks/use-fill-controls)
- [useStrokeControls](../api/hooks/use-stroke-controls)
- [useEffectsControls](../api/hooks/use-effects-controls)
- [PropertyListRoot](../api/components/property-list-root)
