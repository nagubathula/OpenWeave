---
title: useColorVariableBinding
description: Variablen-Bindungs-Hilfsmittel für Füllungs- und Kontur-Farb-Editoren.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` gibt Such-, Bindungs- und Entbindungs-Hilfsmittel für Farbvariablen zurück, die von Füllungs- und Kontur-Editoren verwendet werden.

Verwenden Sie es beim Erstellen von Farb-UIs, die Füllungen oder Konturen mit Design-Variablen verbinden müssen.

## Verwendung

```ts
import { useColorVariableBinding } from '@openweave/react'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Verwandte APIs

- [useFillControls](../hooks/use-fill-controls)
- [useStrokeControls](../hooks/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
