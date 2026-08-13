---
title: ColorPickerRoot
description: Headless popover-basiertes Farbauswahl-Primitiv.
---

# ColorPickerRoot

`ColorPickerRoot` ist ein headless popover-basiertes Farbauswahl-Primitiv.

Es bietet:

- einen Trigger-Slot mit Farbmuster-Hintergrundstil
- einen Standard-Trigger-Fallback
- einen Inhalt-Slot mit `color` und `update()`

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Aktueller Farbwert.', required: true },
    { name: 'contentClass', type: 'string | undefined', description: 'Optionale Klasse für den Popover-Inhalt.' },
    { name: 'swatchClass', type: 'string | undefined', description: 'Optionale Klasse für die Standard-Trigger-Schaltfläche.' }
  ]"
/>

## Ereignisse

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Ausgelöst, wenn sich die Farbe ändert.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ style: Record<string, string> }', description: 'Benutzerdefinierter Trigger mit Farbmuster-Hintergrundstil.' },
    { name: 'default', props: '{ color: Color, update: (color: Color) => void }', description: 'Haupt-Farb-Editor-Inhalt.' }
  ]"
/>

## Beispiel

```tsx
<ColorPickerRoot
  color={color}
  onUpdate={setColor}
  trigger={({ style }) => <button className="size-6 rounded border" style={style} />}
>
  {({ color: currentColor }) => <MyColorEditor color={currentColor} onChange={setColor} />}
</ColorPickerRoot>
```

## Verwandte APIs

- [ColorInputRoot](./color-input-root)
