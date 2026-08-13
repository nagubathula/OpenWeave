---
title: ColorPickerRoot
description: Bezstanowy prymityw selektora kolorów oparty na popover.
---

# ColorPickerRoot

`ColorPickerRoot` to bezstanowy prymityw selektora kolorów oparty na popover.

Udostępnia:

- slot wyzwalacza ze stylowaniem tła próbki
- domyślny wyzwalacz zastępczy
- slot zawartości z `color` i `update()`

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Bieżąca wartość koloru.', required: true },
    { name: 'contentClass', type: 'string | undefined', description: 'Opcjonalna klasa dla zawartości popover.' },
    { name: 'swatchClass', type: 'string | undefined', description: 'Opcjonalna klasa dla domyślnego przycisku wyzwalacza.' }
  ]"
/>

## Zdarzenia

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Emitowane gdy kolor się zmienia.' }
  ]"
/>

## Sloty

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ style: Record<string, string> }', description: 'Niestandardowy wyzwalacz ze stylem tła próbki.' },
    { name: 'default', props: '{ color: Color, update: (color: Color) => void }', description: 'Główna zawartość edytora kolorów.' }
  ]"
/>

## Przykład

```tsx
<ColorPickerRoot
  color={color}
  onUpdate={setColor}
  trigger={({ style }) => <button className="size-6 rounded border" style={style} />}
>
  {({ color: currentColor }) => <MyColorEditor color={currentColor} onChange={setColor} />}
</ColorPickerRoot>
```

## Powiązane API

- [ColorInputRoot](./color-input-root)
