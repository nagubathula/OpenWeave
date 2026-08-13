---
title: provideEditor
description: Fournit une instance d'éditeur OpenWeave à un sous-arbre Vue via l'injection.
---

# provideEditor

`provideEditor(editor)` rend un éditeur OpenWeave disponible aux composables descendants et aux primitives headless via l'injection Vue.

C'est le fondement de `useEditor()`.

## Utilisation

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Exemple de base

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Notes

Le SDK actuel utilise `provideEditor()` et `useEditor()` directement. Certains exemples plus anciens et messages d'erreur font encore référence à un composant `OpenWeaveProvider`, mais le modèle d'injection est la vraie surface d'API à privilégier dans les docs et le code applicatif.

## API associées

- [useEditor](./use-editor)
