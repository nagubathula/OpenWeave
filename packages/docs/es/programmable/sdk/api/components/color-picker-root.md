---
title: ColorPickerRoot
description: Primitivo headless de selector de color basado en popover.
---

# ColorPickerRoot

`ColorPickerRoot` es un primitivo headless de selector de color basado en popover.

Proporciona:

- un slot de trigger con estilos de fondo de muestra
- un trigger por defecto como fallback
- un slot de contenido con `color` y `update()`

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Valor de color actual.', required: true },
    { name: 'contentClass', type: 'string | undefined', description: 'Clase opcional para el contenido del popover.' },
    { name: 'swatchClass', type: 'string | undefined', description: 'Clase opcional para el botón trigger por defecto.' }
  ]"
/>

## Eventos

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Emitido cuando el color cambia.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ style: Record<string, string> }', description: 'Trigger personalizado con estilo de fondo de muestra.' },
    { name: 'default', props: '{ color: Color, update: (color: Color) => void }', description: 'Contenido principal del editor de color.' }
  ]"
/>

## Ejemplo

```tsx
<ColorPickerRoot
  color={color}
  onUpdate={setColor}
  trigger={({ style }) => <button className="size-6 rounded border" style={style} />}
>
  {({ color: currentColor }) => <MyColorEditor color={currentColor} onChange={setColor} />}
</ColorPickerRoot>
```

## APIs relacionadas

- [ColorInputRoot](./color-input-root)
