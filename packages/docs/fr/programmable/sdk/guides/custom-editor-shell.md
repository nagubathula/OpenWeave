---
title: Shell d'éditeur personnalisé
description: Construisez votre propre shell d'éditeur avec provideEditor, CanvasRoot, menus, panneaux et barres d'outils.
---

# Shell d'éditeur personnalisé

Une application Vue OpenWeave typique comporte trois couches :

1. `@openweave/core` crée l'éditeur
2. `@openweave/react` l'adapte en composables Vue et primitives headless
3. votre application affiche le shell, les styles et l'UX du produit

## Pourquoi c'est important

L'application OpenWeave intégrée n'est qu'un shell possible parmi d'autres.

Vous pouvez en construire un très différent pour un flux de travail ciblé : un éditeur intégré dans un autre produit, un outil d'assets interne, un éditeur de templates, une interface d'annotation, ou une surface d'édition assistée par IA avec des contrôles personnalisés.

C'est la raison principale pour laquelle le SDK existe.

## Composition recommandée

Un shell pratique ressemble souvent à ceci :

- provider au sommet avec `provideEditor()`
- canvas au centre
- navigation pages/calques sur un côté
- propriétés de l'autre côté
- menus et barres d'outils pilotés par des composables

## Exemple

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

        <aside className="border-l">Panneau de propriétés ici</aside>
      </div>
    </EditorProvider>
  )
}
```

## Pourquoi cette séparation fonctionne

- le SDK possède l'intégration éditeur et la logique headless réutilisable
- votre application possède la mise en page, les styles et les actions spécifiques au produit
- les composables peuvent alimenter menus et panneaux sans composants wrapper supplémentaires

## API associées

- [provideEditor](../api/hooks/provide-editor)
- [useCanvas](../api/hooks/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
