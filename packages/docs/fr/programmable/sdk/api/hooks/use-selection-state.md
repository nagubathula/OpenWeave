---
title: useSelectionState
description: "État réactif de l'éditeur dérivé de la sélection : nœud courant, nombre et type de sélection."
---

# useSelectionState

`useSelectionState()` expose un état réactif dérivé de la sélection depuis l'éditeur courant.

Utilisez-le quand vous avez besoin d'afficher une UI basée sur :

- si quelque chose est sélectionné
- combien de nœuds sont sélectionnés
- le nœud sélectionné principal
- si la sélection courante est une instance, un composant ou un groupe

## Utilisation

```ts
import { useSelectionState } from '@openweave/react'

const selection = useSelectionState()
```

## Exemple de base

```tsx
import { useSelectionState } from '@openweave/react'

export function SelectionSummary() {
  const { hasSelection, selectedCount, isInstance } = useSelectionState()

  if (!hasSelection) return <div className="text-xs text-muted">Aucune sélection</div>

  return (
    <div className="text-xs text-muted">
      {selectedCount} sélectionné(s)
      {isInstance && <span> · instance</span>}
    </div>
  )
}
```

## Ce qu'il retourne

Les valeurs utiles incluent :

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Exemples pratiques

### Afficher des actions réservées aux instances

```ts
const { isInstance } = useSelectionState()
```

### Activer l'UI de création de set de composants

```ts
const { canCreateComponentSet } = useSelectionState()
```

## API associées

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
