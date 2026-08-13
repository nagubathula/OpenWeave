---
title: Shell de Editor Personalizado
description: Construye tu propio shell de editor con provideEditor, CanvasRoot, menús, paneles y barras de herramientas.
---

# Shell de Editor Personalizado

Una app Vue típica de OpenWeave tiene tres capas:

1. `@openweave/core` crea el editor
2. `@openweave/react` lo adapta en composables de Vue y primitivos headless
3. tu app renderiza el shell, los estilos y la UX del producto

## Por qué esto importa

La app integrada de OpenWeave es solo un shell posible.

Puedes construir uno muy diferente para un flujo de trabajo enfocado: un editor integrado dentro de otro producto, una herramienta interna de recursos, un editor de plantillas, una interfaz de anotaciones, o una superficie de edición asistida por IA con controles personalizados.

Esa es la razón principal por la que existe el SDK.

## Composición recomendada

Un shell práctico a menudo tiene esta estructura:

- proveedor en lo alto con `provideEditor()`
- canvas en el centro
- navegación de páginas/capas en un lateral
- propiedades en el otro lateral
- menús y barras de herramientas impulsados por composables

## Ejemplo

```tsx
import { createEditor } from '@openweave/core/editor'
import {
  EditorProvider,
  CanvasRoot,
  CanvasSurface,
  ToolbarRoot,
  PageListRoot
} from '@openweave/react'

const editor = createEditor({ width: 1440, height: 900 })

export function EditorShell() {
  return (
    <EditorProvider editor={editor}>
      <div className="grid h-screen grid-cols-[240px_1fr_320px] grid-rows-[48px_1fr]">
        <ToolbarRoot>
          {({ tools, activeTool, setTool }) => (
            <header className="col-span-3 flex items-center gap-2 border-b px-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  data-active={activeTool === tool.id}
                  onClick={() => setTool(tool.id)}
                >
                  {tool.label}
                </button>
              ))}
            </header>
          )}
        </ToolbarRoot>

        <aside className="border-r">
          <PageListRoot>
            {({ pages, currentPageId, switchPage }) => (
              <nav>
                {pages.map((page) => (
                  <button
                    key={page.id}
                    data-active={page.id === currentPageId}
                    onClick={() => switchPage(page.id)}
                  >
                    {page.name}
                  </button>
                ))}
              </nav>
            )}
          </PageListRoot>
        </aside>

        <main>
          <CanvasRoot>
            <CanvasSurface className="size-full" />
          </CanvasRoot>
        </main>

        <aside className="border-l">Panel de propiedades aquí</aside>
      </div>
    </EditorProvider>
  )
}
```

## Por qué esta división funciona

- el SDK se encarga de la integración del editor y la lógica headless reutilizable
- tu app se encarga del layout, los estilos y las acciones específicas del producto
- los composables pueden impulsar menús y paneles sin componentes wrapper adicionales

## APIs relacionadas

- [provideEditor](../api/hooks/provide-editor)
- [useCanvas](../api/hooks/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
