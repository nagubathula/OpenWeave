---
title: Niestandardowa powłoka edytora
description: Zbuduj własną powłokę edytora z provideEditor, CanvasRoot, menu, panelami i paskami narzędzi.
---

# Niestandardowa powłoka edytora

Typowa aplikacja Vue z OpenWeave ma trzy warstwy:

1. `@openweave/core` tworzy edytor
2. `@openweave/react` adaptuje go do kompozytów Vue i bezstanowych prymitywów
3. twoja aplikacja renderuje powłokę, stylowanie i UX specyficzny dla produktu

## Dlaczego to ważne

Wbudowana aplikacja OpenWeave to tylko jedna możliwa powłoka.

Możesz zbudować zupełnie inną dla skupionego przepływu pracy: edytor wbudowany w inny produkt, wewnętrzne narzędzie do zasobów, edytor szablonów, UI do adnotacji lub powierzchnię edycji wspomaganą AI z niestandardowymi kontrolkami.

To główny powód, dla którego SDK istnieje.

## Zalecana kompozycja

Praktyczna powłoka często wygląda tak:

- dostawca na górze z `provideEditor()`
- kanvas w środku
- nawigacja strony/warstwy po jednej stronie
- właściwości po drugiej stronie
- menu i paski narzędzi napędzane przez kompozyty

## Przykład

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

        <aside className="border-l">Panel właściwości tutaj</aside>
      </div>
    </EditorProvider>
  )
}
```

## Dlaczego ten podział działa

- SDK odpowiada za integrację edytora i wielokrotnie używalną logikę bezstanową
- twoja aplikacja odpowiada za layout, stylowanie i akcje specyficzne dla produktu
- kompozyty mogą napędzać menu i panele bez dodatkowych komponentów opakowujących

## Powiązane API

- [provideEditor](../api/hooks/provide-editor)
- [useCanvas](../api/hooks/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
