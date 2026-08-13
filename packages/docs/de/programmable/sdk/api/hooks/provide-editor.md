---
title: provideEditor
description: Eine OpenWeave-Editor-Instanz über Injection einem Vue-Teilbaum bereitstellen.
---

# provideEditor

`provideEditor(editor)` macht einen OpenWeave-Editor für nachgelagerte Composables und headless Primitive über Vue-Injection verfügbar.

Dies ist die Grundlage für `useEditor()`.

## Verwendung

```ts
import { provideEditor } from '@openweave/react'

provideEditor(editor)
```

## Einfaches Beispiel

```tsx
import type { ReactNode } from 'react'
import { EditorProvider } from '@openweave/react'

import type { Editor } from '@openweave/core/editor'

export function EditorHost({ editor, children }: { editor: Editor; children: ReactNode }) {
  return <EditorProvider editor={editor}>{children}</EditorProvider>
}
```

## Hinweise

Das aktuelle SDK verwendet `provideEditor()` und `useEditor()` direkt. Einige ältere Beispiele und Fehlermeldungen verweisen noch auf eine `OpenWeaveProvider`-Komponente, aber das Injektionsmodell ist die eigentliche API-Oberfläche, die in Dokumentation und App-Code bevorzugt werden sollte.

## Verwandte APIs

- [useEditor](./use-editor)
