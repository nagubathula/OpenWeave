---
title: SDK – Erste Schritte
description: "@openweave/vue mit createEditor, provideEditor und einem Canvas einrichten."
---

# SDK – Erste Schritte

## Installation

```bash
bun add @openweave/core @openweave/vue canvaskit-wasm
```

Das SDK befindet sich heute im Monorepo und wird auch als `@openweave/vue` veröffentlicht.

```ts
import { createEditor } from '@openweave/core/editor'
import { provideEditor, useCanvas } from '@openweave/vue'
```

## Mentales Modell

Es gibt drei Schichten:

1. `@openweave/core` — framework-agnostische Editor-Engine
2. `@openweave/vue` — Vue Composables und headless Primitive
3. Ihre App — Styling, Routing, Datei-Flows, produktspezifische UI

## Minimales Setup

### 1. Einen Editor erstellen

```ts
import { createEditor } from '@openweave/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Vue bereitstellen

```vue
<script setup lang="ts">
import { provideEditor } from '@openweave/vue'

import type { Editor } from '@openweave/core/editor'

const props = defineProps<{
  editor: Editor
}>()

provideEditor(props.editor)
</script>

<template>
  <slot />
</template>
```

Diese Schicht fungiert als Provider für den Editor-Baum. Die Dokumentation bevorzugt `provideEditor()` direkt, da dies die aktuelle echte API-Oberfläche ist.

### 3. Einen Canvas anbinden

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor } from '@openweave/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Composables verwenden

Sobald der Editor bereitgestellt ist, können Kind-Komponenten die Auswahl lesen und Befehle ausgeben:

```ts
import { useEditorCommands, useSelectionState } from '@openweave/vue'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Einfaches Beispiel

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor, useSelectionState } from '@openweave/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()
const { selectedCount } = useSelectionState()

useCanvas(canvasRef, editor, {
  onReady: () => {
    console.log('Canvas ready')
  },
})
</script>

<template>
  <div class="grid h-full grid-rows-[1fr_auto]">
    <canvas ref="canvasRef" class="size-full" />
    <div class="border-t px-3 py-2 text-xs text-muted">
      Ausgewählt: {{ selectedCount }}
    </div>
  </div>
</template>
```

## Nächste Schritte

- [Architektur](./architecture)
- [API-Referenz](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)
