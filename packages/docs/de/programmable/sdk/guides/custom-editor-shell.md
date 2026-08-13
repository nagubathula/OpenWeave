---
title: Benutzerdefinierte Editor-Shell
description: Erstellen Sie Ihre eigene Editor-Shell mit provideEditor, CanvasRoot, Menüs, Panels und Toolbars.
---

# Benutzerdefinierte Editor-Shell

Eine typische OpenWeave Vue-App hat drei Schichten:

1. `@openweave/core` erstellt den Editor
2. `@openweave/react` passt ihn in Vue Composables und headless Primitive an
3. Ihre App rendert die Shell, das Styling und die produkt-spezifische UX

## Warum das wichtig ist

Die eingebaute OpenWeave-App ist nur eine mögliche Shell.

Sie können eine völlig andere für einen fokussierten Workflow erstellen: einen eingebetteten Editor innerhalb eines anderen Produkts, ein internes Asset-Tool, einen Template-Editor, eine Annotations-UI oder eine KI-gestützte Bearbeitungsoberfläche mit benutzerdefinierten Steuerelementen.

Das ist der Hauptgrund, warum das SDK existiert.

## Empfohlene Komposition

Eine praktische Shell sieht oft so aus:

- Provider an der Spitze mit `provideEditor()`
- Canvas in der Mitte
- Seiten-/Ebenennavigation auf einer Seite
- Eigenschaften auf der anderen Seite
- Menüs und Toolbars, gesteuert durch Composables

## Beispiel

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

        <aside className="border-l">Eigenschafts-Panel hier</aside>
      </div>
    </EditorProvider>
  )
}
```

## Warum diese Aufteilung funktioniert

- das SDK übernimmt Editor-Integration und wiederverwendbare headless Logik
- Ihre App übernimmt Layout, Styling und produktspezifische Aktionen
- Composables können Menüs und Panels ohne zusätzliche Wrapper-Komponenten antreiben

## Verwandte APIs

- [provideEditor](../api/hooks/provide-editor)
- [useCanvas](../api/hooks/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
