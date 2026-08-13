---
title: useViewportKind
description: Грубые флаги мобильного и десктопного вьюпорта для адаптивных оболочек редактора.
---

# useViewportKind

`useViewportKind()` возвращает простые адаптивные флаги, используемые UI редактора OpenWeave.

Используйте его, когда оболочке нужна лёгкая абстракция поверх брейкпоинтов вместо прямого подключения `useBreakpoints()`.

## Использование

```ts
import { useViewportKind } from '@openweave/react'

const { isMobile, isDesktop } = useViewportKind()
```

## Возвращает

- `isMobile`
- `isDesktop`

## Связанные API

- [useCanvas](../hooks/use-canvas)
