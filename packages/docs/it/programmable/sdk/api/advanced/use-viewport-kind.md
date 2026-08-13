---
title: useViewportKind
description: Leggi flag di viewport mobile e desktop per shell editor responsive.
---

# useViewportKind

`useViewportKind()` restituisce semplici flag responsive usati dalla UI dell'editor OpenWeave.

Usalo quando la tua shell ha bisogno di una leggera astrazione sui breakpoint invece di cablare direttamente `useBreakpoints()`.

## Utilizzo

```ts
import { useViewportKind } from '@openweave/react'

const { isMobile, isDesktop } = useViewportKind()
```

## Restituisce

- `isMobile`
- `isDesktop`

## API correlate

- [useCanvas](../hooks/use-canvas)
