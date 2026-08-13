---
title: useOkHCL
description: Работа с цветовыми моделями RGBA и OkHCL для заливок и обводок.
---

# useOkHCL

`useOkHCL()` предоставляет хелперы для чтения, включения, отключения и обновления значений цвета OkHCL у заливок и обводок узлов.

Используйте его при создании продвинутых цветовых инструментов, которым нужно переключаться между стандартным редактированием RGBA и перцептивным редактированием OkHCL.

## Использование

```ts
import { useOkHCL } from '@openweave/react'

const okhcl = useOkHCL()
```

## Возвращает

- `getFillColorModel()`
- `getStrokeColorModel()`
- `getFillOkHCLColor()`
- `getStrokeOkHCLColor()`
- `enableFillOkHCL()`
- `disableFillOkHCL()`
- `enableStrokeOkHCL()`
- `disableStrokeOkHCL()`
- `updateFillOkHCL()`
- `updateStrokeOkHCL()`
- `modelOptions`

## Связанные API

- [useFillControls](../hooks/use-fill-controls)
- [useStrokeControls](../hooks/use-stroke-controls)
- [ColorPickerRoot](../components/color-picker-root)
