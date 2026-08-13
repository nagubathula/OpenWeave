---
title: ColorPickerRoot
description: Primitive headless de sélecteur de couleur basé sur un popover.
---

# ColorPickerRoot

`ColorPickerRoot` est une primitive headless de sélecteur de couleur basé sur un popover.

Elle fournit :

- un slot déclencheur avec le style de fond de l'échantillon
- un déclencheur par défaut de secours
- un slot de contenu avec `color` et `update()`

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Valeur de couleur courante.', required: true },
    { name: 'contentClass', type: 'string | undefined', description: 'Classe optionnelle pour le contenu du popover.' },
    { name: 'swatchClass', type: 'string | undefined', description: 'Classe optionnelle pour le bouton déclencheur par défaut.' }
  ]"
/>

## Événements

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Émis quand la couleur change.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ style: Record<string, string> }', description: 'Déclencheur personnalisé avec le style de fond de l\'échantillon.' },
    { name: 'default', props: '{ color: Color, update: (color: Color) => void }', description: 'Contenu principal de l\'éditeur de couleur.' }
  ]"
/>

## Exemple

```tsx
<ColorPickerRoot
  color={color}
  onUpdate={setColor}
  trigger={({ style }) => <button className="size-6 rounded border" style={style} />}
>
  {({ color: currentColor }) => <MyColorEditor color={currentColor} onChange={setColor} />}
</ColorPickerRoot>
```

## API associées

- [ColorInputRoot](./color-input-root)
