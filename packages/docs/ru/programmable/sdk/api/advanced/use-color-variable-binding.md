---
title: useColorVariableBinding
description: Хелпер привязки переменных для редакторов цвета заливок и обводок.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` предоставляет хелперы поиска, привязки и отвязки переменных цвета, используемые в редакторах заливок и обводок.

Используйте его при создании UI цвета, которому нужно связывать заливки или обводки с переменными дизайна.

## Использование

```ts
import { useColorVariableBinding } from '@openweave/react'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Связанные API

- [useFillControls](../hooks/use-fill-controls)
- [useStrokeControls](../hooks/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
