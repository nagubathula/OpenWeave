---
title: ColorPickerRoot
description: Primitiva popover headless per la selezione del colore.
---

# ColorPickerRoot

`ColorPickerRoot` è una primitiva popover headless per la selezione del colore.

Fornisce:

- uno slot trigger con stile di sfondo campione
- un trigger predefinito di fallback
- uno slot contenuto con `color` e `update()`

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Valore colore corrente.', required: true },
    { name: 'contentClass', type: 'string | undefined', description: 'Classe opzionale per il contenuto del popover.' },
    { name: 'swatchClass', type: 'string | undefined', description: 'Classe opzionale per il pulsante trigger predefinito.' }
  ]"
/>

## Eventi

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Emesso quando il colore cambia.' }
  ]"
/>

## Slot

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ style: Record<string, string> }', description: 'Trigger personalizzato con stile di sfondo campione.' },
    { name: 'default', props: '{ color: Color, update: (color: Color) => void }', description: 'Contenuto principale dell\'editor del colore.' }
  ]"
/>

## Esempio

```tsx
<ColorPickerRoot
  color={color}
  onUpdate={setColor}
  trigger={({ style }) => <button className="size-6 rounded border" style={style} />}
>
  {({ color: currentColor }) => <MyColorEditor color={currentColor} onChange={setColor} />}
</ColorPickerRoot>
```

## API correlate

- [ColorInputRoot](./color-input-root)
