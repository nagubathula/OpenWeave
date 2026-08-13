---
title: GradientEditorBar
description: Headless-примитив перетаскиваемой полосы для точек градиента.
---

# GradientEditorBar

`GradientEditorBar` — примитив перетаскиваемой полосы, используемый внутри редакторов градиента.

## Props

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Текущие точки градиента.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Индекс активной точки.', required: true },
    { name: 'barBackground', type: 'string', description: 'CSS-строка фона полосы.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Генерируется при выборе точки.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Генерируется при перетаскивании точки.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'bar state + drag handlers', description: 'Полный контракт рендеринга полосы градиента.' }
  ]"
/>

### Пропы слота default

```ts
{
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  barRef: (el: unknown) => void
  onStopPointerDown: (index: number, event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: () => void
  draggingIndex: number | null
}
```

## Пример

```tsx
<GradientEditorBar
  stops={stops}
  activeStopIndex={activeStopIndex}
  barBackground={barBackground}
  onSelectStop={selectStop}
  onDragStop={dragStop}
>
  {(ctx) => <MyGradientBar {...ctx} />}
</GradientEditorBar>
```

## Связанные API

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)
