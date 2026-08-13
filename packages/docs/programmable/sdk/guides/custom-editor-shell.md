---
title: Custom Editor Shell
description: Build your own editor shell with provideEditor, CanvasRoot, menus, panels, and toolbars.
---

# Custom Editor Shell

A typical OpenWeave Vue app has three layers:

1. `@openweave/core` creates the editor
2. `@openweave/react` adapts it into Vue composables and headless primitives
3. your app renders the shell, styling, and product UX

## Why this matters

The built-in OpenWeave app is only one possible shell.

You can build a very different one for a focused workflow: an embedded editor inside another product, an internal asset tool, a template editor, an annotation UI, or an AI-assisted editing surface with custom controls.

That is the main reason the SDK exists.

## Recommended composition

A practical shell often looks like this:

- provider at the top with `provideEditor()`
- canvas in the center
- page/layer navigation on one side
- properties on the other side
- menus and toolbars driven by composables

## Example

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

        <aside className="border-l">Properties panel here</aside>
      </div>
    </EditorProvider>
  )
}
```

## Why this split works

- the SDK owns editor integration and reusable headless logic
- your app owns layout, styling, and product-specific actions
- composables can power menus and panels without extra wrapper components

## Related APIs

- [provideEditor](../api/hooks/provide-editor)
- [useCanvas](../api/hooks/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
