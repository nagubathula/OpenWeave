---
title: useColorVariableBinding
description: Helper de liaison de variables pour les éditeurs de couleur de remplissage et de contour.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` expose des helpers de recherche, liaison et déliaison pour les variables de couleur utilisées par les éditeurs de remplissage et de contour.

Utilisez-le pour construire des interfaces de couleur qui ont besoin de connecter des remplissages ou des contours à des variables de design.

## Utilisation

```ts
import { useColorVariableBinding } from '@openweave/react'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## API associées

- [useFillControls](../hooks/use-fill-controls)
- [useStrokeControls](../hooks/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
