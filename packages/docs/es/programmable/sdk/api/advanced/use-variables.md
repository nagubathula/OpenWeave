---
title: useVariables
description: Lee y muta colecciones de variables, variables y valores de variables.
---

# useVariables

`useVariables()` es el composable de variables de bajo nivel detrás de los helpers de editor de variables de más alto nivel.

Úsalo cuando quieras control directo sobre colecciones, modos activos, filtrado y operaciones CRUD sin tomar toda la abstracción de tabla/diálogo.

## Uso

```ts
import { useVariables } from '@openweave/react'

const variables = useVariables()
```

## Devuelve

- `collections`
- `activeCollectionId`
- `activeCollection`
- `activeModes`
- `variables`
- `searchTerm`
- `setSearchTerm()`
- `setActiveCollection()`
- `addCollection()`
- `renameCollection()`
- `addVariable()`
- `removeVariable()`
- `renameVariable()`
- `updateVariableValue()`
- `formatModeValue()`
- `parseVariableValue()`
- `shortName()`

## APIs relacionadas

- [useVariablesEditor](../hooks/use-variables-editor)
- [useVariablesDialogState](./use-variables-dialog-state)
- [useVariablesTable](./use-variables-table)
