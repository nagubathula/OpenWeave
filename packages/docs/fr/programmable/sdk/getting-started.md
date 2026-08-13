---
title: Démarrage rapide SDK
description: Configurez @openweave/react avec createEditor, provideEditor et un canvas.
---

# Démarrage rapide SDK

## Installation

```bash
bun add @openweave/core @openweave/react canvaskit-wasm
```

Le SDK est hébergé dans le monorepo et également publié sous le nom `@openweave/react`.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/react'
```

## Modèle mental

Il y a trois couches :

1. `@openweave/core` — moteur d'édition indépendant du framework
2. `@openweave/react` — composables Vue et primitives headless
3. votre application — styles, routage, flux de fichiers, UI spécifique au produit

## Configuration minimale

### 1. Créer un éditeur

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Le fournir à Vue

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

Vous pouvez voir ceci comme la couche provider de l'arbre éditeur. La documentation préfère `provideEditor()` directement car c'est la vraie surface d'API actuelle.

### 3. Attacher un canvas

```tsx
import { useRef } from 'react'
import { useCanvas, useEditor } from '@openweave/react'

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const editor = useEditor()

  useCanvas(canvasRef, editor)

  return <canvas ref={canvasRef} className="size-full" />
}
```

## Utiliser les composables

Une fois l'éditeur fourni, les composants enfants peuvent lire la sélection et émettre des commandes :

```ts
import { useEditorCommands, useSelectionState } from '@openweave/react'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Exemple de base

```tsx
import { useRef } from 'react'
import { useCanvas, useEditor, useSelectionState } from '@openweave/react'

export function EditorWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const editor = useEditor()
  const { selectedCount } = useSelectionState()

  useCanvas(canvasRef, editor, {
    onReady: () => {
      console.log('Canvas prêt')
    }
  })

  return (
    <div className="grid h-full grid-rows-[1fr_auto]">
      <canvas ref={canvasRef} className="size-full" />
      <div className="border-t px-3 py-2 text-xs text-muted">Sélectionné : {selectedCount}</div>
    </div>
  )
}
```

## Étapes suivantes

- [Architecture](./architecture)
- [Référence API](./api/)
- [useEditor](./api/hooks/use-editor)
- [useCanvas](./api/hooks/use-canvas)
- [useI18n](./api/hooks/use-i18n)
